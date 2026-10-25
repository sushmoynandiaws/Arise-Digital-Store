# Marketplace Implementation Decisions — Arise Digital Store

Overrides and standards applied across the storefront, seller, checkout, and purchase history interfaces:

- **Palette:** Violet (`#683DE6`) as primary brand accent, dark slate (`#0F172A`) for primary type, pale violet canvas (`#FAF9FE`), and emerald (`#10B981`) for stock indicators.
- **Typography:** Follow the semantic scale in `../MASTER.md`: Urbanist/Hind Siliguri, 32/26px transaction titles, 28–36px general titles, 20–24px section titles, 16px body/instructions and mobile form values. Reserve display sizes for the homepage. Use JetBrains Mono for private codes and transaction input.
- **Catalog Navigation:** Lead with instant catalog search, responsive category chips, and verified listings. No fake reviews, sales counters, or manufactured urgency tickers.
- **Product Artwork:** Seller-provided images take priority. Missing or failed images use a simple category emblem on a token-colored surface, alongside the actual delivery mode. The homepage discovery shelf uses actual catalog products and prices.
- **Accessibility & Touch:** All actionable buttons and links maintain minimum 44px hit targets, visible 2px keyboard focus rings, descriptive inline errors, and persistent form inputs. Reduced-motion preferences are strictly respected.
- **Single-Shop Checkout & Direct Links:** One shop per checkout transaction. Payment verification and license delivery remain authoritative in AriseSell. Shared `/shops/:slug` links open a seller-branded storefront preserving that seller's context throughout discovery and checkout.
- **Development Preview Transparency:** Sample fixtures and demo data are clearly flagged. No test purchase is misrepresented as a live transaction.
- **Viewport Resilience:** Verify every route at 320px, 768px, 1024px and 1440px, plus the existing 375px portrait and 812px landscape purchase regressions. Pages must not overflow horizontally (`document.documentElement.scrollWidth <= window.innerWidth`).

The complete UI refresh contract, screen hierarchy and interaction patterns are recorded in [ui-refresh.md](ui-refresh.md).

Final wording follows [the content style guide](../content-style-guide.md). Its payment and delivery state rules and the current master typography scale take precedence over earlier copy or heading examples in the initial UI refresh contract.
