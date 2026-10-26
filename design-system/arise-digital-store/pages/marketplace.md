# Marketplace Implementation Decisions — Arise Store

Overrides and standards applied across the storefront, seller, checkout, and purchase history interfaces:

- **Palette:** Violet (`#6336D6`) as primary brand accent, dark slate (`#1D1D1F`) for primary type, cool grey canvas (`#F5F5F7`), and emerald (`#10B981`) for stock indicators.
- **Typography:** Follow the semantic scale in `../MASTER.md`: system body, Urbanist headings, Hind Siliguri Bangla, 32/26px transaction titles, 28–32px general titles, 20–22px section titles, 16px body/instructions and mobile form values. Reserve display sizes for the homepage. Use JetBrains Mono for private codes and transaction input.
- **Catalog Navigation:** Lead with instant catalog search, responsive category chips, and verified listings. No fake reviews, sales counters, or manufactured urgency tickers.
- **Product Artwork:** Seller-provided images take priority and fit fully within the preview. Missing or failed images use a simple category emblem on a token-colored surface, alongside the actual delivery mode. The homepage discovery shelf uses actual catalog products and prices, prioritizing purchasable offers and artwork. Visual category tiles show actual catalog counts. Product browsing comes before order-recovery guidance; the main catalog retains its source order.
- **Accessibility & Touch:** All actionable buttons and links maintain minimum 44px hit targets, visible 2px keyboard focus rings, descriptive inline errors, and persistent form inputs. Reduced-motion preferences are strictly respected.
- **Single-Shop Checkout & Direct Links:** One shop per checkout transaction. Payment verification, physical shipping and digital delivery remain authoritative in AriseSell. Shared `/shops/:slug` links open a seller-branded storefront preserving that seller's context throughout discovery and checkout.
- **Development Preview Transparency:** Sample fixtures and demo data are clearly flagged. No test purchase is misrepresented as a live transaction.
- **Viewport Resilience:** Verify every route at 320px, 768px, 1024px and 1440px, plus the existing 375px portrait and 812px landscape purchase regressions. Pages must not overflow horizontally (`document.documentElement.scrollWidth <= window.innerWidth`).

The complete UI refresh contract, screen hierarchy and interaction patterns are recorded in [ui-refresh.md](ui-refresh.md).

Final wording follows [the content style guide](../content-style-guide.md). Its payment and delivery state rules and the current master typography scale take precedence over earlier copy or heading examples in the initial UI refresh contract.
