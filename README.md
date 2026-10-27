# Arise Store

A Rust marketplace for independent AriseSell shops. Includes a responsive React/TypeScript storefront, seller onboarding, single-shop checkout, browser-bound guest purchases, physical delivery tracking, secure digital delivery access, and marketplace moderation.

## Store types and fulfillment

The storefront uses AriseSell's existing `Business.kind` and `commerce_mode` without a second category selection. All source store categories can publish products. Checkout follows each product's `fulfilment_kind`, not its shop label. Existing digital bridge responses remain compatible through their original automatic/manual delivery modes; unrecognized contracts cannot open checkout.

The companion source changes are in `integration/arisesell-all-store-types.patch`, based on source revision recorded in `integration/manifest.json`. The same changes are implemented in the companion AriseSell repository. Apply the companion patch only to a compatible checkout that does not already contain these changes, using `git apply --check` before applying it. The store-type extension itself needs no new environment variables or database migrations; the growth features below require migration 006. Roll out the source bridge before the storefront when deployment is separately authorized.

- Digital checkout retains AriseSell's reservation, payment verification and private fulfillment services.
- Physical checkout adapts AriseSell's existing order-confirmation service, including source prices, stock locks, shipping rates, discounts, address/KYC requirements, fraud/advance holds, order numbering and courier jobs. The browser never supplies order totals or delivery charges.
- Physical orders support source-configured COD; source-required advance is shown and remains seller-verified through AriseSell. This bridge does not create prepaid physical payment requests. Unsupported payment setups and custom product questions/design requirements show an explicit checkout-unavailable reason. Products remain browsable.
- The source currently models only physical and digital fulfillment, with standard and digital commerce modes. There is no service-booking contract to expose. Digital products inside standard shops remain unavailable for checkout until the source enables that flow.
- Purchases remain bound to their original customer/account. Physical orders show source courier tracking; shipped/delivered COD is not labeled paid without source payment evidence. Reviews still require verified payment and the existing eligible delivery state.
- Shop category search/filters use actual source values. Marketplace branding says Arise Store; internal audience/channel IDs, old shop links, source credentials and database names stay compatible.

The included local preview is explicitly labeled sample data and runs the real AriseSell digital commerce services against an isolated development database. It never sends money or uses real stock.

## Architecture

- **Rust / Axum:** public catalog gateway, PKCE sign-in callback, encrypted server-side sessions, CSRF protection, moderation, customer reports, and checkout/order API boundary.
- **React / TypeScript / Vite:** storefront, search and filters, shop pages, product details, checkout, purchase access, seller dashboard, and admin UI.
- **Marketplace metadata:** local standalone development uses SQLite and `migrations/001_marketplace.sql`; serverless deployments use the separate `arise_marketplace` schema in the existing AriseSell PostgreSQL database. Apply `migrations/002_postgres.sql` once with an admin connection, then give the app a least-privilege marketplace-only role. Commerce records remain owned by AriseSell.
- **AriseSell / existing PostgreSQL:** authoritative products, prices, private stock, payment receipts, reservations, orders and fulfilment. No second payment verifier or stock allocator exists in Rust.
- Catalog reads fetch current public data from AriseSell. The UI refreshes every 30 seconds while visible and on focus. Checkout rechecks current ownership, publication, price, terms and availability inside AriseSell transactions.
- AriseSell integration is opt-in and unavailable until its dedicated bridge key and exact callback are configured.

## Share a seller's own storefront

After connecting AriseSell and publishing, the seller dashboard shows **Share your store** with a read-only link and **Copy store link**. The address uses the existing AriseSell store slug: `https://your-marketplace.example/shops/your-store-slug`. Each connected store has its own link. Unpublished shops explain that publication is required before customers can use the link.

Owners can place the link in a Facebook/Instagram bio, a page button, or a customer message. It opens that seller's branded storefront directly, with only their products and shop-scoped search/category filters. The seller's identity and navigation continue on product and checkout pages; customers can check out as guests. Payment and orders still go to the correct AriseSell store. The homepage remains a marketplace for discovering all published shops.

## Start the local preview on this Windows machine

The existing AriseSell checkout is expected at `../next-product-2/backend`. Set `ARISESELL_SOURCE_PATH` if yours is elsewhere.

Requirements: Node.js 22.12+ and WSL Ubuntu with Python 3 and a C compiler. Rust and a private Python virtual environment have been installed for the current Ubuntu user; no Windows PATH or system Python was changed.

From PowerShell:

```powershell
cd 'E:\Ship Studio\Arise Digital Store'
# First-time setup, or on another machine:
wsl -d Ubuntu --cd 'E:\Ship Studio\Arise Digital Store' -- bash scripts/bootstrap.sh
# Build the frontend and start both local services:
.\scripts\dev.ps1
```

Visit **http://localhost:8088**. The isolated source runs on port 8111. Use **localhost**, matching `PUBLIC_ORIGIN`, rather than the 127.0.0.1 alias in the browser.

On Linux, run `bash scripts/bootstrap.sh`, then `cd web && npm ci && npm run build`, then `bash scripts/dev.sh` from the project root.

### Preview accounts and payment

- `Continue with AriseSell` opens a clearly labeled local consent fixture. Choose Demo Seller or Demo Administrator. Production uses the actual AriseSell sign-in/consent page and its verified login session.
- Twelve sample products across three fictional shops exercise both automatic and manual delivery. Sample receiving details must never be used to transfer money.
- A made-up TrxID remains unverified. To simulate a matched receipt, use the **DEMO…** transaction ID displayed on that order’s payment screen. Only the localhost development fixture creates that synthetic receipt.
- To prepare and send a sample manual order, the browser tests use the fixture-only `/demo/orders/{id}/prepare` endpoint with the local service key. That endpoint is not part of production AriseSell.
- The sample database persists in `data/demo-source.db`; browser tests consume its sample stock. To reset samples, stop both services, move `data/demo-source.db` to a backup filename, then restart. Never do this to an actual AriseSell database.

## Connect real AriseSell

The companion AriseSell checkout contains these local integration changes:

1. `backend/app/api/v1/marketplace.py`: code authorization/exchange, source-scoped shop publication, public feed, current quotes, checkout, verified-payment proof, order history and private delivery.
2. `backend/app/core/config.py` and `backend/app/main.py`: disabled-by-default configuration and route registration.
3. `digital_checkout.py` and `digital_fulfilment.py`: a specifically bound marketplace channel reuses reservation/payment transactions and exposes paid items through purchase access rather than sending them to a social network.
4. `frontend/app/marketplace/connect/page.tsx`: sign-in and consent inside AriseSell. Signup/verification preserve the local return path.
5. `backend/tests/test_marketplace.py`: integration regressions for ownership, PKCE/session revocation, payment proof, private delivery and stock protection.

Before deployment, review and deploy those AriseSell changes. No production deployment has been performed by this project setup.

The same changes are bundled in `integration/arisesell-marketplace.patch`. `integration/manifest.json` records the source revision and affected files. They are already applied to the current local AriseSell checkout; do not apply them twice. For a clean checkout at the recorded revision, run `git apply --check <path-to-patch>`, then `git apply <path-to-patch>`, review the changes, and run the source tests/build before deployment. Resolve newer source changes through normal code review rather than forcing the patch.

Configure the existing AriseSell backend:

```dotenv
MARKETPLACE_BRIDGE_KEY=<new dedicated secret of at least 32 characters>
MARKETPLACE_REDIRECT_URI=https://your-marketplace.example/api/auth/callback
```

Configure the new marketplace using `.env.example`: the same dedicated bridge key, your actual HTTPS origins, a separate random 32-byte base64url `SESSION_ENCRYPTION_KEY`, and `DEMO_MODE=false`. Do not reuse AriseSell’s JWT signing key as the bridge key.

AriseSell needs its existing Redis service for single-use authorization codes. Seller authorization tokens stay bound to an active AriseSell session and expire after 12 hours; reconnecting uses the existing AriseSell login. Source tokens and temporary PKCE verifiers are encrypted in the marketplace database. Logging out or signing in rotates the guest capability cookie; guest purchases do not automatically migrate to an account.

Signed-in purchases require that same authenticated AriseSell account, including when returning from another browser. A guest cookie alone cannot open an account-associated purchase after logout. The purchase-history sign-in button returns directly to purchase history.

For a single-instance standalone deployment, set `PUBLIC_ORIGIN` to the HTTPS domain serving this container, then run `docker compose up --build -d` and place it behind an HTTPS reverse proxy. An Nginx example is in [`deploy/nginx/store-api.conf.example`](deploy/nginx/store-api.conf.example). Replace `store-api.yourdomain.com` with your real domain before enabling it, point DNS to the VPS, and run `sudo certbot --nginx -d your-real-domain` to enable HTTPS. Set AriseSell's `MARKETPLACE_REDIRECT_URI` to `https://your-real-domain/api/auth/callback` so it exactly matches `PUBLIC_ORIGIN`. Back up the marketplace data volume and protect its encryption key. For Vercel multi-service deployment, follow [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md); serverless instances require shared PostgreSQL metadata storage. The Dockerfile has not been built on this machine; the local WSL build is the verified standalone runtime.

## Verified product reviews

Product pages expose a Reviews popup with the real rating average, count and paginated customer comments. Buyers can publish or edit one review per order from My purchases after AriseSell confirms paid and sent/delivered status. Guest purchase capabilities and signed-in ownership checks stay in AriseSell; the public feed never includes order IDs, payment details or private deliverables.

Apply `migrations/003_reviews.sql` with the migration role and grant SELECT, INSERT, UPDATE, DELETE on `arise_marketplace.reviews` to the existing marketplace runtime role before deploying this version. Fresh standalone SQLite databases apply the review table automatically. The AriseSell bridge must include the authoritative `product_id` in its owned purchase response. Its deployment workflow applies the same additive SQL on configured marketplace hosts.

## Shop information and policies

Sellers can edit Privacy policy, Returns & refund policy, Terms & conditions, About us and Contact us during setup or from Manage your shop. Each optional section accepts up to 3,000 characters in English or Bangla. Save shop changes / Publish shop saves them with the listing. Each footer link opens a separate page at `/shops/:slug/info/:section`, preserving shop branding and supporting direct links, refresh and browser Back. Marketplace footer links use `/info/:section`. Blank policies show an unavailable message; About us can reuse the existing shop description, and Contact us also shows source-owned contact details.

Shop pages are public marketplace metadata, stored separately from AriseSell inventory and payment settings. Writes require a successful source-authorized listing save. Before deploying this version, apply `migrations/004_shop_pages.sql` with the migration role and grant SELECT, INSERT, UPDATE, DELETE on `arise_marketplace.shop_pages` to the runtime role. Standalone SQLite creates the table automatically. No production migration is performed by editing these files.

## Tests

```powershell
wsl -d Ubuntu --cd 'E:\Ship Studio\Arise Digital Store' -- bash -lc '$HOME/.cargo/bin/cargo test --locked'
cd web
npm run build
npm test
# With both preview services running; uses installed Chrome on Windows:
npm run test:e2e
```

Source integration checks, from the existing AriseSell backend:

```powershell
.\.venv-next\Scripts\python.exe -m pytest tests/test_marketplace.py tests/test_digital_sales.py -q
```

Browser tests cover storefront filters, shop navigation, mobile/landscape reflow, copyable seller links, a shared link's branded guest journey through checkout, an arbitrary TrxID remaining unpaid, matched test receipts, private customer isolation, automatic and manually prepared delivery, seller connection/publication and moderation. Screenshots are written to `artifacts/`.

## Scope and practical limits

- One seller per checkout, BDT payments, and existing AriseSell delivery modes. Refund decisions and product management remain in AriseSell.
- Profiles and public product selection are stored in the original seller’s AriseSell business settings. Moderation hides marketplace visibility without deleting source inventory or purchases.
- Guest access is tied to a private HttpOnly cookie. Clearing cookies or signing in/out removes that guest access; sign in **before** checkout for account-associated purchase history.
- The interactive UI is client-rendered and light-theme only; shop and product URLs include server-rendered sharing metadata. No invented reviews, sales metrics or verification badges are shown.
- No commissions, platform wallet, subscription billing, or automated refund rules were added.
- The initial feed returns published public metadata as one bounded-per-shop selection (up to 500 selected products per shop). Large deployments need server-side catalog pagination/search and a deployment-specific load test before broad rollout. Multi-instance operation requires a shared marketplace database and distributed rate limiting.

Design decisions are in `design-system/arise-digital-store/`. Dependencies: [Axum](https://docs.rs/axum/latest/axum/), [SQLx](https://docs.rs/sqlx/latest/sqlx/), and the official [Rust installation guide](https://rust-lang.org/tools/install/).
"# Arise-Digital-Store" 

## Cart, offers and marketplace growth

- The accessible mini bag stores only product/variant IDs and quantities in this browser. It supports up to 20 options from one shop and one fulfillment type. AriseSell validates each published line, current stock and price, calculates a single shipping charge and creates one order/payment request. Digital automatic and seller-prepared items retain their individual fulfillment rules: paid items can be opened as soon as they are ready, while remaining items continue preparation in the same order. Physical and digital products cannot share one checkout.
- Recently viewed stores up to 12 product IDs locally, excludes unavailable catalog entries and has a Clear history action. No checkout details are stored with it.
- Shop/product URL responses include dynamic Open Graph title, description, source price, actual image and canonical URL before JavaScript runs. Missing source images cannot produce a product-photo preview. Vercel routes these exact public paths to Rust; other frontend routes and assets remain with Vite.
- `/track` shows courier status, tracking reference and last update for physical purchases already bound to this browser/account. It refreshes the source projection every minute while visible. AriseSell's existing courier webhooks/poller remain authoritative (its reconciliation sweep is about ten minutes); delayed updates retain the last confirmed status. No courier credentials are sent to browsers.
- Sellers manage product questions and source-owned coupons in their workspace. Questions publish only after a seller answer; contact/payment/private access information should not be posted. Admins with review permission can hide/restore Q&A with an audited reason. Questions paginate at 50 and guest submissions are rate-limited.
- `/admin/offers` manages source-owned scheduled coupons and flash offers for a chosen shop. Percentage/fixed BDT benefit, minimum spend, eligible products, active state and start/end dates are validated in AriseSell. Each edit uses an optimistic revision. Existing coupons remain unchanged until explicitly edited. A coupon scoped to products must apply to every cart line; no stacking or invented volume/renewal discounts. The flash deal shows its code and real deadline; the source validates eligibility again when accepting payment/order terms.
- `/admin/badges` grants/revokes manually reviewed Top Seller or Trusted Shop badges with private evidence and expiry (up to one year). Public badges are not automatic performance scores or delivery/payment guarantees.
- `/admin/analytics` shows 30 UTC reporting days of distinct browsers, deduplicated page visits, product-category interest, and source-aggregated orders/paid totals by shop and currency. Paid totals include shipping/discounts and exclude refunded/partially refunded orders; they are not a payout balance. Reports can be downloaded as JSON. Traffic event records expire after 90 days, never contain email/order/contact data, and browser collection respects Do Not Track/Global Privacy Control. Cookie resets and multiple devices affect counts.

Deployment requires the companion changes in `integration/arisesell-growth.patch` at the revision in `integration/manifest.json`. They are implemented in the companion source checkout; do not apply the patch twice. Apply `migrations/006_growth.sql` with the migration role and grant runtime CRUD on `arise_marketplace.product_questions` and `arise_marketplace.traffic_events`. Existing append-only audit permissions and commerce isolation remain intact. Standalone SQLite applies metadata automatically; production startup never performs this migration. The source VPS workflow and marketplace provisioning script include the additive migration and grants for the next authorized deployment. There are no new environment variables. Deploy the source bridge before the storefront (cart acceptance requires its bound checkout-scope endpoint).

Validation includes real SQLite/PostgreSQL cart, coupon, sales-report and buyer-isolation tests in source `tests/test_marketplace_growth.py`; Rust metadata/permissions/sharing tests; and `web/tests/growth.spec.ts` covering mobile multi-product checkout, mixed-shop prevention, recent products, Q&A, offer expiry, inline courier tracking, admin offers/badges/reports and 320px layouts. Live courier accounts, Facebook's preview cache and production rollout require deployment verification.
