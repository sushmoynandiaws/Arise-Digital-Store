# Design System Master File — Arise Digital Store

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Arise Digital Store
**Version:** 4.0 (Premium marketplace — restrained Apple-inspired surfaces)
**Category:** Independent Digital Goods, Tools & AI Subscriptions Marketplace (Bangladesh)

---

## 1. Aesthetic Identity & Subject Grounding

The marketplace combines its established local-commerce identity with restrained Apple-inspired materials:
- **Clear hierarchy:** Cool grey canvas, white surfaces, neutral hairlines and Royal Violet (`#6336d6`) reserved for actions and selected states.
- **Local Commerce Verification:** Show each seller’s connected payment methods. Payment verification remains authoritative in AriseSell.
- **Source-owned Information:** Product prices, stock and delivery details come from AriseSell. Do not invent sales counts, viewers, reviews or guarantees.
- **Bilingual & Regional Typography:** Contemporary geometric sans (**`Urbanist`**) coupled with clean Bengali typography (**`Hind Siliguri`**).

---

## 2. Global Design Tokens

### Color Palette

| Role | Hex | CSS Variable | Purpose |
|------|-----|--------------|---------|
| Primary / Brand | `#6336D6` | `--primary` | Royal Purple action buttons, active navigation, brand signature |
| Primary Deep | `#5128B8` | `--primary-dark` | Hover & active state on primary actions |
| Primary Surface | `#F2EEFC` | `--primary-light` | Category pills, active tabs, subtle highlights |
| Ground Canvas | `#F5F5F7` | `--surface-ground` | Cool grey-white marketplace canvas |
| Surface White | `#FFFFFF` | `--surface` | Pure white cards, forms, and product trays |
| Ink Primary | `#1D1D1F` | `--ink` | Neutral high-contrast headings & product titles |
| Ink Muted | `#626269` | `--muted` | Neutral secondary guidance, timestamps, and terms |
| Border Line | `rgba(0,0,0,0.07)` | `--line` | Neutral hairline surface boundaries |
| Border Strong | `#D2D2D7` | `--line-strong` | Input boundaries and hover card borders; focus uses the primary violet |
| Status Amber | `#8A5A0A` | `--amber` | Payment guidance, expiry and attention notices |
| Stock Emerald | `#10B981` | `--mint` | Source-confirmed availability indicators |
| Success Ink | `#08765B` | `--success` | Verified payment and source-confirmed delivery status |

---

### Typography

Use the role tokens in `web/src/styles.css`. Their rem values respect the browser's text size; the pixel equivalents below assume a 16px root. The mobile role changes apply at 600px and below. Do not add per-page overrides for values already represented by these tokens.

| Role | Token | Desktop | Mobile |
| --- | --- | --- | --- |
| General page title | `--title-page` | 28–32px fluid | 28px |
| Checkout / order status | `--title-status` | 32px | 26px |
| Product title | `--title-product` | 28px | 26px |
| Section title | `--title-section` | 22px | 20px |
| Subsection title | `--title-subsection` | 18px | 18px |
| Product / shop card title | `--title-card` | 16px | 16px |
| Body / essential instructions / form values | `--text-body` | 16px | 16px |
| Labels and buttons | `--text-label` | 14px | 14px |
| Supporting metadata | `--text-meta` / `--text-small` | 13px / 13px | 13px / 13px |
| Order totals | `--text-price` | 26px | 24px |

The homepage hero is the sole display-size exception (32–44px depending on viewport). Use `--line-body: 1.65` and `--line-heading: 1.2`; keep explanatory copy around 60–75 characters per line. Hierarchy also comes from weight and spacing, rather than enlarging every heading. Brand lettering, avatar initials, quantity symbols and the numeric review average have their own visual roles.

### Compact sizing

- The main header row is at least 60px and the desktop navigation row is 48px, about 21% shorter together than the previous 76px + 60px layout. Heights may grow for wrapped or enlarged text. On narrow screens, the header wraps its 44px search field beneath the brand and actions.
- `--control-height` is 44px, `--panel-padding` is 24px desktop / 20px mobile, and `--section-space` is 20–28px desktop / 20px mobile. Keep 16px form values and body text; reduce padding rather than essential reading size.
- The language switcher's visible track and selected pill are 32px high inside 44px buttons. Keep the full button focus ring and click target while using inset decorative surfaces for the slimmer appearance.
- Product card artwork is 168px desktop, 160px on small tablets and 184px on narrow single-column layouts. Detail artwork has its own responsive height and preserves the complete seller image. Keep card options, wishlist and seller links at least 44px.
- Apply the same density to checkout and purchase panels, tracking, seller setup, help, reviews, footer and admin. Do not use a global zoom, fixed content height or hidden overflow to make a page appear smaller.

Serve the existing font families from `web/public/fonts` using `fonts.css` and `font-display: swap`. Their original WOFF2 subsets, source manifest and OFL licenses are bundled there. Keep font loading local so a third-party stylesheet outage cannot block the interface.

Use [content-style-guide.md](content-style-guide.md) for wording and state-specific messages.

- **English interface:** native system UI stack. **English headings:** `Urbanist`. **Bangla:** `Hind Siliguri`.
  - Weights: `400`, `500`, `600`, `700`, `800`, `900`
  - Characteristics: High x-height, open apertures, geometric clarity in both English and Bengali.
- **Pricing & Figures:** native interface font with tabular numerals; `JetBrains Mono` for transaction references
  - Weights: `700`, `800`
  - Formatted prominently in BDT (`2,799.00 ৳` / `৳ 2,799`).
- **Codes & Credentials:** `JetBrains Mono`
  - Weights: `400`, `500`
  - For TrxID inputs, license keys, and transaction references.

---

### UI Components & Microinteractions

1. **Top Announcement Ticker:**
   - General marketplace shopping and private-delivery guidance.
   - Seller hours and guarantees must not be hardcoded across shops.
2. **Pill-Shaped Action Buttons:**
   - `border-radius: 999px` (`--radius-pill`) on all primary action buttons, search bars, and quick-buy chips.
   - Tactile `:active` compression (`scale(0.97)`).
3. **Product Purchase Controls:**
   - Source-owned options and stock, quantity controls and a live total.
   - Carry the selected quantity into checkout; use the source quote at review.
4. **Secure Delivery Vault:**
   - Browser-bound guest credentials presented in a dark, high-contrast vault (`pre[data-private]`) with one-click copy confirmation.

## 4. Premium surface and motion rules

- Use native system typography for English body text, Urbanist for English headings, and Hind Siliguri for Bangla. Preserve commerce wording, routes and data ownership. Apple inspiration changes materials and hierarchy, not the store identity.
- Independent image-led products use 18px cards. Grouped text and metrics share a white 22px panel with hairlines. Hero surfaces use 26px. Use `--shadow-sm`, `--shadow-panel` and `--shadow-overlay` for the three depth tiers.
- Category navigation, purchase history and help steps use unified surfaces. Seller guidance remains quieter than the editable workspace. Admin navigation uses a white structural sidebar with one violet selected state.
- Glass is limited to sticky navigation, menus and dialogs. The header gains a scroll-edge line once content moves beneath it. Plain content panels stay opaque.
- Shared glass uses separate frost and masked edge pseudo-layers; the text-bearing parent stays unfiltered so nested menus can sample page content. Navigation uses 72% white / 14px frost, menus 84% / 18px, and dialogs 88% / 20px. A 1px edge samples the live backdrop with restrained saturation/brightness. This is native CSS frosting and background-adaptive edge light, not spatial lens distortion.
- Mobile and category menus scroll their inner content; their outer material remains stationary. Keep the 8px desktop popup gap and viewport-safe alignment. Unsupported backdrop filtering falls back to opaque white. Reduced transparency, high contrast and forced colors remove decorative glass and preserve readable boundaries. Keep essential content, product artwork, forms and payment instructions on opaque surfaces.
- Use the shared spring/out-quart easing for press feedback and reversible dialog transitions. Static content renders immediately. Respect reduced motion, reduced transparency and increased contrast; retain opaque fallbacks.
- On mobile, product information and buying controls precede reviews. Reviews remain reachable by their existing control and anchor. Wishlist uses a native dialog with focus containment, Escape and trigger-focus restoration; saved state stays synchronized across cards, details and navigation.
- Delivery estimates and warranty text require source data. Never show invented completion rates, fixed fulfilment times or global support schedules.

Use the shared info, success, warning, error and inverse-surface tokens. Body-sized payment instructions stay at 16px; supporting copy stays at least 13px. Dark-surface secondary text uses `--inverse-muted`, not the light-surface muted color. Product art, payment-provider logos and social brands retain their own source/brand colors.
