# Local verification — 25 October 2026

The application runs at `http://localhost:8088`. Its isolated development source runs the real AriseSell commerce services against sample data, not production accounts, payments or inventory.

## Passed

- Rust: 10 integration/security tests, `cargo fmt`, and `cargo clippy --all-targets -- -D warnings`.
- AriseSell backend: 88 tests across `test_marketplace.py` and the existing `test_digital_sales.py`.
- Marketplace frontend: TypeScript/Vite production build and 4 API/formatting/status tests.
- Browser: all 8 scenarios have passed, including the shared-store guest journey. In the latest full run 7 passed; the seller sharing scenario caught a missing accessible button name in the shared copy helper. Replacing its nested status role with a polite live region fixed the name, and that scenario passed on rerun with a real clipboard value assertion. The original preview startup connection-refused failures were also rerun successfully after health readiness.
- AriseSell frontend: full webpack production build, including existing prebuild language/theme/auth/commerce checks and the new marketplace consent page. Signup return-path and existing session checks also passed.
- The 15-file companion patch applies cleanly to the source revision recorded in `integration/manifest.json`, verified with a separate temporary Git index. The source checkout's normal index was unchanged.

## Coverage

Customer and seller isolation; live-session revocation; encrypted source tokens; single-use PKCE; approved sign-in destinations; cookie/Origin-bound CSRF; owner-only publication; authoritative prices and stock; duplicate checkout protection; last-unit protection; arbitrary transaction IDs remaining unpaid; matched sample receipts; automatic delivery; manual prepare-and-send; protected private delivery; account history across browsers; denied account access after logout; refunded purchase copy; moderation and mobile/landscape layouts.

Desktop, mobile, seller and purchase screenshots are in `artifacts/`.

## Seller storefront sharing follow-up

The seller's published store link can be copied from the dashboard. Browser checks cover copying the exact URL, direct guest navigation/reload, only that seller's products, shop-scoped search and category links, seller branding through checkout, and seller/storefront mobile overflow. `shared-store-desktop.png`, `shared-store-mobile.png` and `seller-dashboard.png` capture the resulting UI. The TypeScript/Vite production build passed after these changes. No backend, payment or source integration changes were needed for storefront sharing.

## Remaining deployment checks

The companion AriseSell changes are local and have not been pushed or deployed. Real AriseSell SSO, real provider receipts, production HTTPS/cookie configuration, the Docker image and deployment-specific load/concurrency behavior have not been exercised. Existing digital-sales regression tests use the project's isolated database fixtures; a production PostgreSQL smoke test remains part of rollout. See `README.md` for configuration and first-release scaling limits.
