## Visual language

The current storefront uses the tokens in `web/src/styles.css`: violet `--primary`, neutral ink `--ink`, muted grey `--muted`, white `--surface`, and a cool grey canvas. Use the premium surface and motion rules in the design-system master: glass only on navigation/overlays, unified panels for related information, restrained violet actions. English body text uses the native system font, headings use Urbanist, and Bangla uses Hind Siliguri. The document language tracks the language switcher; never apply negative tracking to Bangla headings. Use the existing tokens and 44px minimum touch targets; keep mobile inputs at 16px.

For all UI copy, follow `design-system/arise-digital-store/content-style-guide.md`. Use the semantic typography scale in `design-system/arise-digital-store/MASTER.md`; status headings are 32px desktop / 26px mobile, and essential instructions use 16px body text. Keep order wording tied to actual payment, delivery, expiry and refund states; reuse `purchaseMessage` for the order-page message.

Product pages follow a two-column image and purchase layout, with a short seller description, source-owned options and stock, quantity controls, a live total, and a single Buy now action. On mobile, stack these regions. Full description, delivery details and purchase terms open in an accessible modal dialog when clicked; do not add large information panels below the product. Prices, payment methods, delivery promises and stock come from AriseSell. Do not invent sales counts, viewers, discounts or reviews.

Reviews are stored in marketplace metadata and are allowed only for an owned AriseSell purchase with verified payment and sent/delivered status. Keep one editable review per order; publish only the chosen public name, rating, comment and date. Review averages/counts must come from the actual stored reviews. Never import or invent third-party testimonials without a configured source.

## Execution & Communication Style

During any coding task, command execution, or debugging workflow, provide real-time, concise step-by-step progress notes, architectural decisions, and findings in Bengali before and between tool executions (Codex-style execution updates). Explain what you are checking, what you discovered, the reasoning behind changes, and file edits/commands executed, keeping the user continuously informed of every step in clear, short notes.


Phone/email OTP order recovery is unavailable. Keep Track order on existing
browser/account-owned My purchases and courier tracking; never fabricate or display
recovery codes or add a proxy to the retired Source recovery endpoints.

Shop assistant layout follows `design-system/arise-digital-store/pages/assistant.md`.
Render checked conversational replies, never raw knowledge fields or legacy
`information` cards. Keep AI identity, Send/Enter/IME behavior, shop isolation and
source-owned product facts; contact links must not imply a completed human handoff.

Purchase pages/history are keyed by route, account ID and buyer CSRF identity.
Successful logout clears local identity before refreshing it; stale session responses
cannot restore it. Abort private-page requests on unmount and preserve the API's
abort checks before fetch and after body decoding. Keep guest purchases supported.
Run auth-state/API unit tests and purchase-privacy browser cases; browser fixtures
mock the server and do not establish real cookie/session deletion. Previously copied
clipboard data is outside this UI-state cleanup.

A failed public catalog refresh keeps the last loaded public page visible with a
stale-data notice and retry. Pause Buy now/Add to bag and new quotes until refresh
succeeds; a successful catalog response removing a product must still remove it.
Never apply this public snapshot behavior to account or private delivery state.
Source read retries use a fresh HTTP/TLS client within the existing one-retry limit;
keep exact auth headers, certificate verification and the prohibition on write replay.
