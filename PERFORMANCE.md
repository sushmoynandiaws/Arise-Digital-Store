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

At the initial review the function ran in `iad1`; the measured regional comparison and subsequent setting change are recorded below. Production logs showed failed TLS handshakes, not simply a slow frontend. Nested error classification now preserves the underlying reason without logging URLs or credentials; TLS verification remains enabled.

Changes:

- Start public Source feed, moderation and shop-page reads together, retaining fail-closed errors and the same moderation filters.
- Embed the already moderated public catalog as escaped inert JSON in shared shop/product HTML. The client reuses it instead of doing a duplicate initial catalog fetch. No account or purchase state is embedded. Existing refresh and checkout validation remain live.
- Load assistant and craft checkout JavaScript only on routes that use those features.
- Use long browser caching only for content-hashed `/assets/` output; API and HTML responses are excluded. Previously these assets required revalidation on every reload.

Checks: 49 frontend unit tests and TypeScript checks pass locally; 37 Rust tests pass locally. CI also passed the disposable PostgreSQL case and 57 existing browser cases. The added bootstrap browser case passed initial catalog reuse but had an incorrect expectation for shop-scoped navigation; it now uses the breadcrumb to leave the shop before opening global Products. The complete corrected browser run is required.

Remaining limits: no field p75 LCP/INP/CLS, low-end device or throttled-mobile measurement; no high-concurrency or paid-provider traffic. Third-party product image availability remains source-owned. Connection failures may still dominate slow or failed requests until their underlying TLS cause is resolved.

Production spot check after the first change: catalog TTFB 2.28 s / total 2.48 s; shared shop HTML TTFB 2.36 s / total 2.54 s with a valid bootstrap containing 3 shops and 14 products. These are individual samples, not a percentile or controlled causal comparison. The underlying Source TLS failure still appeared in logs.


## Follow-up: domain and region comparison

Both verified hostnames serve the same release with no redirect loop. A bounded
comparison observed homepage total 0.32 s on the custom domain and 0.26 s on the
old Vercel hostname. The custom product page was 2.77 s versus 4.06 s on the old
hostname; a catalog read on the old hostname also returned 503. These samples do
not establish a domain-change regression. Current DNS is the assigned Vercel CNAME
and the live auth-start URL requests the correct new callback.

An unaliased Mumbai deployment of the same code was compared with US East.
Mumbai catalog samples were 2.12 s and 1.88 s, versus 2.18 s and 2.56 s in US East.
Promotions were 0.93 s in Mumbai versus a 5.76 s US East outlier (earlier US East
sample 1.78 s). This supports pinning the service to `bom1`, while retaining the
same global static CDN, Source/database credentials, TLS and authentication.
No stable speed percentage or TLS-resolution claim is made from these samples.
