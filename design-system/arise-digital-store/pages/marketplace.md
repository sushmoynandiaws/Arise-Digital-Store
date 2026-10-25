# Marketplace Implementation Decisions — Arise Digital Store

Overrides and standards applied across the storefront, seller, checkout, and purchase shelf interfaces:

- **Palette:** Violet (`#683DE6`) as primary brand accent, dark slate (`#0F172A`) for primary type, pale violet canvas (`#FAF9FE`), and emerald (`#10B981`) for stock indicators.
- **Typography:** `Urbanist` headings and body typography, with `Hind Siliguri` for Bangla and `JetBrains Mono` for license keys and payment transaction references. Fluid headings with minimum 16px mobile input font sizes to avoid iOS zoom.
- **Catalog Navigation:** Lead with instant catalog search, responsive category chips, and verified listings. No fake reviews, sales counters, or manufactured urgency tickers.
- **Digital Specimen Artwork:** Product tiles display distinct, precision-crafted technical specimens with category emblems and delivery metadata. Real seller-provided artwork displays cleanly when available.
- **Accessibility & Touch:** All actionable buttons and links maintain minimum 44px hit targets, visible 2px keyboard focus rings, descriptive inline errors, and persistent form inputs. Reduced-motion preferences are strictly respected.
- **Single-Shop Checkout & Direct Links:** One shop per checkout transaction. Payment verification and license delivery remain authoritative in AriseSell. Shared `/shops/:slug` links open a seller-branded storefront preserving that seller's context throughout discovery and checkout.
- **Development Preview Transparency:** Sample fixtures and demo data are clearly flagged. No test purchase is misrepresented as a live transaction.
- **Viewport Resilience:** Fully validated across 375px portrait mobile, 812px landscape mobile, and wide desktop displays without horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`).
