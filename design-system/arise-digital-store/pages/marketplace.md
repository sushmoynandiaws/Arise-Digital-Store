# Marketplace implementation decisions

The verified e-commerce skill search supplies the starting point. Apply these product-specific overrides across the storefront, seller and checkout pages.

- Use a calm emerald accent (#08704f), warm white canvas (#fafbf8), charcoal text (#172b25), and restrained pale green surfaces. White text on the darker primary replaces the generated black-on-bright-green combination.
- Use Rubik headings and Nunito Sans body with system sans-serif fallbacks; use fluid headings and at least 16px mobile form inputs.
- Lead with useful catalog search, categories and actual products. Do not invent testimonials, sales counters, reviews, discounts, trust/verification badges or customer logos.
- Product tiles are distinct, decorative geometric artwork with text labels, not imitation brand logos. Real seller artwork is shown when present.
- All key actions have visible labels, 44px targets, keyboard focus, descriptive errors and retained form inputs. Respect reduced motion; no rotating carousels.
- Customer shopping and seller setup use separate routes. One shop per checkout; payment and item delivery stay authoritative in AriseSell.
- Shared `/shops/:slug` links open a seller-branded storefront. Keep search, category breadcrumbs and checkout navigation with that seller; expose the copyable link in seller setup. Marketplace discovery stays on the main homepage.
- Development fixture data is labeled prominently. No demo purchase is presented as real payment verification.
- Verify desktop, 375px portrait, landscape and 200% zoom. Light theme only for this release.
