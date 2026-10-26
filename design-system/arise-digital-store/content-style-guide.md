# Content style guide

Write simple, direct English for people buying products in Bangladesh. Use the same terms across discovery, checkout and order support. This guide applies to app-owned UI text; seller content remains unchanged.

Shop category comes from AriseSell's `Business.kind`. Commerce mode is `standard` or `digital`; each product's `fulfilment_kind` determines checkout and delivery wording. Never label every shop digital or ask sellers to choose their category again. Unknown types show a neutral label and unavailable checkout.

Physical checkout requests the source-required delivery address, district, phone and optional seller-required landmark/alternative phone. Show source-quoted shipping and any required advance before consent. Physical orders show courier tracking, never private digital access. COD delivery does not prove payment settlement. Keep refund/cancellation messages ahead of fulfillment updates. Custom requirements or unsupported source payment capabilities must show an unavailable reason rather than a Buy now promise. Discounts, warranties and expiry dates require source data; browser settings cannot create them.

## Voice

- Name the task or current state in the heading. Explain the next step in one or two short sentences.
- Use sentence case. Omit final periods in short headings, labels and buttons; use punctuation in explanatory sentences.
- Keep transactional copy calm and factual. Reserve promotional language for the homepage, where it must still explain the marketplace.
- Prefer specific nouns and verbs. Avoid metaphors such as “good find,” “digital shelf,” “make it yours,” and “one last look.”
- Do not add a heading, eyebrow or paragraph that repeats adjacent text.
- Keep instructions visible. Place labels above fields; use placeholders for examples, never as the only label.
- Preserve seller names, descriptions, product options, prices, stock, terms, delivery notes and schedules exactly as supplied by AriseSell. Never invent business facts or guarantees.

## Terminology

| Term | Meaning and usage |
| --- | --- |
| Product | A listing the customer can browse and buy |
| Option | A seller-defined version of a product; do not rename its actual value |
| Shop | The seller's public storefront; use consistently in app labels |
| AriseSell | The service where the seller manages products, stock, payments and orders |
| Order | A particular checkout and its payment/delivery status |
| My purchases | The navigation destination for order history and private access |
| Digital items | The private content delivered for an order |
| Transaction ID / TrxID | The payment receipt identifier; submitting it does not verify payment |
| Automatic delivery | Source-configured automatic fulfilment after verified payment; avoid “instant access” |
| Seller-prepared delivery | Manual fulfilment by the seller after verified payment |
| Customer reviews | Actual stored reviews from eligible verified purchases |

## Payment and delivery messages

`purchaseMessage` in `web/src/api.ts` owns order heading/description selection. Payment labels and delivery labels remain separate. Keep its unit matrix and browser state cases in sync with wording changes.

| Source state | Heading | Next step |
| --- | --- | --- |
| Unpaid, active request | Complete your payment | Follow the seller's instructions, then enter the transaction ID |
| Pending verification | Checking your payment | Explain that the transaction ID was submitted and payment is not verified yet |
| Review required | Your payment needs review | Check transaction details or contact the seller |
| Expired, unpaid request | Payment request expired | Contact the seller if already paid; do not invite payment to expired details |
| Paid, manual preparation | Your order is being prepared | State that payment is verified and the seller is preparing the items |
| Paid, automatic preparation | Preparing your digital items | State that payment is verified and status updates automatically |
| Paid, delivery needs attention | Your delivery needs attention | Contact the seller |
| Paid, ready, not cancelled | Your order is ready | View your digital items below; use View my items to reveal them |
| Cancelled | Order cancelled | Explain that the order is inactive and direct paid customers to the seller |
| Refunded | Payment refunded | Contact the seller for refund questions |
| Partially refunded | Payment partially refunded | Contact the seller for details |
| Unknown payment or delivery status | Payment status unavailable / Status unavailable | Refresh or contact the seller; do not infer payment or delivery success |

Refund messages take priority over cancellation; cancellation takes priority over ready/preparation. A paid order does not become unpaid because its old payment request expired. Source-owned delivery estimates remain visible without rewriting them. Ready/access language requires verified payment and a ready, non-cancelled order.

## Actions, errors and empty states

- Name the actual action: Browse products, Review order, Confirm order, Check payment, View my items, Hide my items, Copy shop link, Save shop changes, Publish shop, Hide listing, Restore, Resolve report.
- Show payment instructions after Confirm order. Never use Pay now for an action that only creates an order.
- Use context for loading: Loading reviews, Checking price and availability, Creating your order, Saving review. Keep the current action disabled while pending.
- Describe moderation consequences before confirmation. Use the same action name on the confirmation button as on the initiating control.
- Errors explain what happened and how to recover without claiming an unknown cause. Preserve actionable source-service errors. For lost/unreadable responses, ask the customer to refresh and check the result before retrying a write.
- Empty states explain the absence and offer a next step: “No purchases yet” with Browse products; “No products found” with Clear filters; “No shops found” with Browse products.
- Review guidance states the payment/delivery eligibility and what becomes public: chosen public name, rating, comment and date. Keep payment information and private items out of reviews.

## Typography

Use the semantic CSS tokens documented in [MASTER.md](MASTER.md). Use native system typography for English body text, Urbanist for headings and Hind Siliguri for Bangla; use the shared brand and semantic color tokens. Status headings are 32px desktop / 26px mobile, body instructions are 16px, and mobile input/select/textarea text is always at least 16px. Do not shrink essential instructions into metadata.

## Examples

| Avoid | Prefer |
| --- | --- |
| Your good find is ready | Your order is ready |
| Your private items are waiting right here | View your digital items below. |
| Your digital shelf | My purchases |
| Your shelf is waiting | No purchases yet |
| One last look | Review your order |
| One more step to make it yours | Complete your payment (only when unpaid and active) |
| Confirm change | Hide listing / Hide shop / Restore |
| Invalid item identifier | This link is invalid. Return to the shop or My purchases and open the item again. |

## Maintenance

For new screens and states, reuse these terms and typography tokens. Update this guide, relevant copy assertions and the state matrix when the actual product behavior changes. Check rendered mobile and desktop layouts rather than relying on string length alone.
