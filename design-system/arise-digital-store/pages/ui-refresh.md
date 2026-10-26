# Complete UI refresh

The screen's job is to help a Bangladeshi buyer find a useful digital product, understand the seller's terms, pay that seller, and return for private delivery. Sellers publish their existing AriseSell catalog; administrators review listings and reports.

## Design contract

- Retain the established palette: violet `#6336D6`, slate `#1D1D1F`, muted slate `#626269`, white `#FFFFFF`, pale violet `#F5F5F7`. Use semantic tokens throughout.
- Use the native system stack for English body text, Urbanist for headings and Hind Siliguri for Bangla. Mono is reserved for transaction references and private items. Headings use size, weight and spacing rather than colored words or uppercase labels.
- Use quiet bordered surfaces, 4px spacing increments, 12px controls, 22px panels, and 22px dialogs. Brand-primary actions remain pills. Use 16–24px panel padding and 48–64px section separation.
- Signature: actual catalog picks presented as a compact discovery shelf, clear source-owned prices, category artwork, shop identity, and a single purchasing action. No fabricated social proof or payment badges.
- Home: search first, actual product preview, category navigation, product catalog and independent shops. Catalog and shops: clear title, results and useful controls. Seller identity continues through product and checkout.
- Product: two columns for artwork and purchase controls, stacked on mobile with buying controls before reviews. Short description only; full description, delivery, terms and reviews use the native modal dialog.
- Checkout: readable details and payment controls alongside a compact order summary. Purchase history: a scannable shelf; order detail: payment/delivery status and private access. Seller: profile/catalog workspace with a quieter launch checklist. Admin: readable moderation rows and a focused confirmation dialog. Help: sequential buying steps and keyboard-operated FAQ. Not found: clear recovery action.
- Each control has a 44px minimum target, visible keyboard focus and labelled inputs. Mobile inputs stay 16px. Layouts work at 320, 768, 1024 and 1440px; tables/rows reflow. Respect reduced motion.
- Loading, empty, error, success and access states reuse the same visual system. Dialogs preserve focus trapping, Escape and focus return.

## References and assumptions

The existing marketplace, product purchase layout and seller workspace are the three reference screens. The established master file and AGENTS.md define the product identity; no external visual direction is required. Simplify their useful structures without changing the commerce model. Reject decorative security terminals, tiny uppercase labels, heavy gradients and duplicate CSS overrides.

## Scope

UI only. No new dependencies, backend changes, authentication changes, production configuration, schema changes or invented business facts. Browser fixtures are explicitly sample data and never part of the live catalog.
