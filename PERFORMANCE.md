# Store loading review — 2026-10-30

Scope: public Store home, catalog, shared shop/product entry, JavaScript loading and its Source connection. These are bounded ordinary request samples, not a load test or a Lighthouse/Core Web Vitals score.

Before changes, from this workstation:

| Resource | Observation |
| --- | --- |
| Home HTML | 0.46 s, 751 bytes |
| Public catalog | 3.19 s, 44,704 bytes; another request returned 503 |
| Shared shop HTML | 3.13 s, before the browser requested catalog again |
| Main JavaScript | 565,778 bytes uncompressed |
| Two sampled product images | 126–133 KB each, 0.42–1.04 s |

The deployed function runs in `iad1`. Database/Source locality has not been independently established, so its region was not changed. Production logs showed failed TLS handshakes, not simply a slow frontend. Nested error classification now preserves the underlying reason without logging URLs or credentials; TLS verification remains enabled.

Changes:

- Start public Source feed, moderation and shop-page reads together, retaining fail-closed errors and the same moderation filters.
- Embed the already moderated public catalog as escaped inert JSON in shared shop/product HTML. The client reuses it instead of doing a duplicate initial catalog fetch. No account or purchase state is embedded. Existing refresh and checkout validation remain live.
- Load assistant and craft checkout JavaScript only on routes that use those features.

Checks so far: 48 frontend unit tests and TypeScript checks; 37 Rust tests pass with the disposable PostgreSQL test left for CI. Coverage includes public-bootstrap parsing/fallback, JSON escaping and round-trip, share metadata, moderation and auth/order handling. The new browser case checks initial catalog reuse and client navigation; CI also exercises craft checkout and assistant routes after code splitting.

Remaining limits: no field p75 LCP/INP/CLS, low-end device or throttled-mobile measurement; no high-concurrency or paid-provider traffic. Third-party product image availability remains source-owned. Connection failures may still dominate slow or failed requests until their underlying TLS cause is resolved.
