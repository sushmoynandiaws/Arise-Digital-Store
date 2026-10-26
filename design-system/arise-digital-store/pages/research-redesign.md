# Task-first marketplace redesign — 26 October 2026

This is a design review and implementation based on the existing code, localhost inspection and the published research below. It is not a usability study with this marketplace's customers, and no conversion improvements are claimed.

## Evidence and decisions

- [Baymard: Form design](https://baymard.com/blog/form-design): persistent labels and guidance above/next to fields. The tracking form now has a full-width email field with a separate label and hint, one primary action and explicit request/verification errors.
- [GOV.UK: Confirm an email address](https://design-system.service.gov.uk/patterns/confirm-an-email-address/): make email verification understandable and keep the return path clear. Tracking shows the destination address, preserves typed values on failure, supports changing email, and distinguishes verification from results.
- [GOV.UK: Check answers](https://design-system.service.gov.uk/patterns/check-answers/): keep an explicit review before final submission. The existing checkout quote/review/accept sequence is retained, with a compact adjacent summary.
- [Apple: Materials](https://developer.apple.com/design/human-interface-guidelines/materials): material and contrast communicate structure. Content uses opaque white surfaces; navigation and overlays retain restrained glass.
- [Baymard: Homepage and category navigation](https://baymard.com/research-articles/ecommerce-navigation-best-practice): make catalog discovery and browsing clear. Homepage search suggestions now use actual catalog categories, and the catalog has its own clearly labelled search control next to category and availability filters.

## Page hierarchy

| Area | Primary task | Placement |
| --- | --- | --- |
| Header | Find products and return to orders | Brand and search first; Products, Shops and My purchases are the primary destinations. Categories are attached to Products. Help groups tracking, buying guidance and contact. Seller action stays distinct. Seller storefronts use Products, Reviews and About this shop, with seller contact. |
| Homepage | Discover products | Short intro and search alongside actual artwork previews; visual categories, product grid, order-recovery shortcuts, shops, then seller invitation. |
| Catalog / shop | Narrow the choices | Visible catalog search above category chips, sorting and stock filter; results immediately below. |
| Product | Understand the offer and buy | Artwork alongside seller, price, short description, source-owned availability and purchase controls; reviews follow purchase controls on mobile. |
| Checkout | Review and confirm | Contact/payment form beside a compact source-owned order summary; existing review and consent remain before confirmation. |
| Tracking | Find an existing order | One email/verification/results surface; existing browser purchases and seller support guidance beside it, underneath on mobile. |
| Purchases / delivery | Check status and access owned items | Status first, then payment or private access as permitted by the existing source state. |
| Seller | Publish and maintain a shop | Editable profile/catalog lead; secondary setup guidance stays in a quieter adjacent column. |
| Admin | Resolve the current operational task | Existing permission-aware navigation; each destination now explains its own purpose instead of a repeated generic sentence. |
| Help / policies / footer | Get help or read terms | Grouped buying steps, readable policy column, actual catalog links and the requested vertically stacked platform links. |

## Tracking limitation found during review

The frontend references `/api/orders/track/request-otp` and `/api/orders/track/verify-otp`, but those routes are absent from this checkout's Rust router. This redesign does not add a backend email recovery system. It removes the old failure path that fabricated a demo code and the fallback that presented browser orders as if email verification had succeeded. Requests now show their real failure without claiming verification. My purchases remains the existing browser/account-owned recovery path. Browser fixtures separately exercise successful, invalid-code and empty-results states; they do not prove production email delivery.

## Navigation reconstruction

The product is a multi-seller digital marketplace, rather than a single seller's company website. Discovery, owned purchases and seller publishing are separate tasks.

- Marketplace primary navigation: Products, Shops, My purchases. Product categories are a disclosure attached to Products, avoiding the old All Categories / All products duplication.
- Help disclosure: Track order, Buying guide, Contact. Tracking is a recovery task, rather than a competing product category. About, company information and policies remain in the footer.
- Seller storefront primary navigation: Products, Reviews, About this shop. Seller contact stays scoped to the current shop. Category links filter only that shop's catalog.
- Desktop My purchases appears once in the main navigation. Mobile keeps an order icon and exposes all routes in the labelled Browse / Orders & help menu, rather than a clipped horizontal tab strip.
- Disclosures support pointer dismissal, Tab and Escape with focus return. Route/query changes close them. Active links identify the current area.
- The review route now resolves its seller through the shared route helper, preserving the same branding, footer and navigation as product and information pages.

## Marketplace reference review and implementation

Reviewed the public Amazon homepage in a real browser, Etsy homepage content, Creative Market homepage in a browser and its product page content. These are observations of currently served pages, not claims about conversion performance. Page content can vary by location and session.

| Reference | Observed pattern | Adaptation here |
| --- | --- | --- |
| [Amazon](https://www.amazon.com/) | Prominent search, distinct orders entry, image-led category collections and short browse links. | Preserve global search and My purchases, put real catalog imagery into discovery and category tiles, move order-recovery guidance after the product grid. |
| [Etsy](https://www.etsy.com/) | Visual interests and themed collections, image-first cards, favorites and visible prices. | Categories come only from published catalog entries; tiles show real product artwork and actual product counts. Wishlist remains on product images. |
| [Creative Market](https://creativemarket.com/) | Clear asset categories, compact product rows, product title, creator and price together. | Shared cards across homepage, catalog and seller pages show category, title, seller, delivery status and price, plus an accessible product-options link. |
| [Creative Market product detail](https://creativemarket.com/alonahaidash/292431849-Nagomi-Japanese-Paper-Textures), [Amazon product listings](https://sell.amazon.com/blog/amazon-product-listings) | Artwork, source-owned options, pricing and purchase controls are distinct from longer descriptions. | Retain the existing two-column product and purchase layout, accurate option prices and stock, accessible details dialog, and one Buy now action. |

The redesign uses the marketplace's own artwork, never reference-site product images. Covers use contain rather than crop, so embedded labels remain legible. Missing/failed images retain the shared category fallback. Previews prioritize purchasable offers, then supplied artwork; the main catalog retains its original source order. Category counts include published catalog entries, including sold-out items, and match the linked category results. Paused offers now say Purchases paused even when source stock is nonzero. On narrow screens the persistent header search serves the homepage too, avoiding a duplicate search form before product artwork. No popularity rankings, fabricated reviews, discounts, cart, new payment methods or extra dependencies were introduced.

Homepage states remain explicit: loading, failed catalog with retry, and empty catalog. Platform-managed hero copy still takes precedence over defaults. Responsive, keyboard, wishlist, checkout, seller, reviews, payment expiry and admin checks run against isolated API fixtures; localhost visual inspection uses read-only catalog data. This does not verify a real payment or production email delivery.

## Compact sizing refinement

The main header row is reduced from 76px to 60px and desktop navigation from 60px to 48px. Shared sizing tokens now set 44px controls, 24/20px panel padding and 20–28px section spacing. Product artwork, card headings, purchase controls, catalog tools, tracking steps, help rows, reviews, footer gaps and admin headings use the same compact scale. Body instructions and form values stay at 16px, and interactive targets remain at least 44px. Header rows can grow for wrapped content; no global zoom or clipped fixed-height content is used. New browser checks cover marketplace and seller header bounds and search/card sizing at 320, 768, 1024 and 1440px alongside the existing route matrix.

## Glass layering correction

The previous header applied backdrop filtering to the entire text-bearing ancestor, restricting nested popovers' backdrop sampling. The material is now a separate stationary pseudo-layer, with a masked edge that responds to the actual background. See [MDN's backdrop root description](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) for this browser behavior. Header, category/help menus, mobile drawer, product details dialog, wishlist and admin overlays share the material tokens. Menu scrolling moves an inner wrapper rather than the frost itself. Content panels remain white to keep commerce information legible.

Chromium verification changes only a temporary isolated test backdrop between blue/orange and a two-pixel stripe pattern. Screenshot pixels establish color response at the rim and removal of fine background detail in the frost; a CSS-property check alone is insufficient. Tests also cover reduced transparency, high contrast, system forced colors, popup geometry, Escape focus return and portrait/short-landscape menu scrolling. Test backdrops are removed before capturing real content. Safari and Firefox are not verified by these Chromium checks.
