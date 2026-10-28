# Shop assistant

Use the shared violet action color for a shop-branded header, with high-contrast
white text and a clear AI subtitle. Keep the dialog floating on desktop and inset
within the mobile viewport. Use the existing font roles, surface tokens, 44px
controls and safe-area padding. Avoid online-status or response-time promises.

Separate user and assistant bubbles. Reply text is a paragraph, never a database
field, boolean or internal enum. Source-owned product cards retain current prices,
stock and checkout actions. A contact link opens the actual shop contact page;
do not claim a human has joined. Never render legacy `information` cards.

Keep the composer compact: a labelled 16px textarea, microphone and circular send
arrow. Enter sends; Shift+Enter inserts a line; IME composition never submits.
Suggestions only fill the draft, voice remains editable, and neither spends a
message until submission. Use a short reduced-motion-aware typing state and keep
errors readable. Shop changes reset all conversation and product context.

Carry previously shown product IDs only after the Source v3 contract is advertised;
new named products replace old selection. Keep sold-out product information visible
and omit checkout for a zero-stock option. Long descriptions and source size charts
use a compact accessible disclosure. Never turn uncertain matching into a claim that
the shop has no stock or products.
