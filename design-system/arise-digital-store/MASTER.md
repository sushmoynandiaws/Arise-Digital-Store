# Design System Master File — Arise Digital Store

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Arise Digital Store
**Version:** 3.0 (Commercial Digital Goods & Subscription Marketplace — Subscriptions BD Inspired)
**Category:** Independent Digital Goods, Tools & AI Subscriptions Marketplace (Bangladesh)

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
| Border Strong | `#DDD6FE` | `--line-strong` | Input focus outlines and hover card borders |
| Accent Orange | `#FF6B00` | `--accent-orange` | Urgency badges, live alerts, and sale tags |
| Verification Emerald | `#10B981` | `--mint` | Instant delivery confirmed, active stock, secure badges |

---

### Typography

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
