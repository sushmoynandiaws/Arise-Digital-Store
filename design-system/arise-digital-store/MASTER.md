# Design System Master File — Arise Store

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Arise Store
**Version:** 3.0 (Independent Shops Marketplace)
**Category:** AriseSell Storefront Marketplace (Bangladesh)

---

## 1. Aesthetic Identity & Subject Grounding

Inspired by top-tier Bangladeshi digital product platforms like **Subscriptions BD**, the design prioritizes:
- **Instant Confidence:** Bold, vibrant Royal Violet theme (`#683de6`) paired with high-converting pill CTAs.
- **Local Commerce Verification:** Show each seller’s connected payment methods. Payment verification remains authoritative in AriseSell.
- **Source-owned Information:** Product prices, stock and delivery details come from AriseSell. Do not invent sales counts, viewers, reviews or guarantees.
- **Bilingual & Regional Typography:** Contemporary geometric sans (**`Urbanist`**) coupled with clean Bengali typography (**`Hind Siliguri`**).

---

## 2. Global Design Tokens

### Color Palette

| Role | Hex | CSS Variable | Purpose |
|------|-----|--------------|---------|
| Primary / Brand | `#683DE6` | `--primary` | Royal Purple action buttons, active navigation, brand signature |
| Primary Deep | `#562EC2` | `--primary-dark` | Hover & active state on primary actions |
| Primary Surface | `#F5F3FF` | `--primary-light` | Category pills, active tabs, subtle highlights |
| Ground Canvas | `#FAF9FE` | `--surface-ground` | Clean, subtle violet-tinted e-commerce canvas |
| Surface White | `#FFFFFF` | `--surface` | Pure white cards, forms, and product trays |
| Ink Primary | `#0F172A` | `--ink` | Slate 900 high-contrast headings & product titles |
| Ink Muted | `#64748B` | `--muted` | Slate 500 secondary guidance, timestamps, and terms |
| Border Line | `#EDE9FE` | `--line` | Clean violet-slate structural card boundaries |
| Border Strong | `#CCC6DF` | `--line-strong` | Input boundaries and hover card borders; focus uses the primary violet |
| Status Amber | `#8A5A0A` | `--amber` | Payment guidance, expiry and attention notices |
| Stock Emerald | `#10B981` | `--mint` | Source-confirmed availability indicators |
| Success Ink | `#08765B` | `--success` | Verified payment and source-confirmed delivery status |

---

### Typography

Use the role tokens in `web/src/styles.css`. Their rem values respect the browser's text size; the pixel equivalents below assume a 16px root. The mobile role changes apply at 600px and below. Do not add per-page overrides for values already represented by these tokens.

| Role | Token | Desktop | Mobile |
| --- | --- | --- | --- |
| General page title | `--title-page` | 28–36px fluid | 28px |
| Checkout / order status | `--title-status` | 32px | 26px |
| Product title | `--title-product` | 32px | 28px |
| Section title | `--title-section` | 24px | 22px |
| Subsection title | `--title-subsection` | 20px | 20px |
| Product / shop card title | `--title-card` | 18px | 18px |
| Body / essential instructions / form values | `--text-body` | 16px | 16px |
| Labels and buttons | `--text-label` | 14px | 14px |
| Supporting metadata | `--text-meta` / `--text-small` | 13px / 12px | 13px / 12px |
| Order totals | `--text-price` | 28px | 26px |

The homepage hero is the sole display-size exception (40–66px depending on viewport). Use `--line-body: 1.65` and `--line-heading: 1.2`; keep explanatory copy around 60–75 characters per line. Hierarchy also comes from weight and spacing, rather than enlarging every heading. Brand lettering, avatar initials, quantity symbols and the numeric review average have their own visual roles.

Serve the existing font families from `web/public/fonts` using `fonts.css` and `font-display: swap`. Their original WOFF2 subsets, source manifest and OFL licenses are bundled there. Keep font loading local so a third-party stylesheet outage cannot block the interface.

Use [content-style-guide.md](content-style-guide.md) for wording and state-specific messages.

- **Interface & Headings:** `Urbanist`, `Hind Siliguri`, system-ui, sans-serif
  - Weights: `400`, `500`, `600`, `700`, `800`, `900`
  - Characteristics: High x-height, open apertures, geometric clarity in both English and Bengali.
- **Pricing & Figures:** `Urbanist`, `JetBrains Mono`
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
