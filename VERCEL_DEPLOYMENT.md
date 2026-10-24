# Vercel Services deployment

Import this repository as **one Vercel project with Root Directory `.`**, not `web`. In the project settings, choose the **Services** framework so Vercel builds the two services declared in the root `vercel.json`; leave project-level build/output overrides unset. Services are currently in beta, so the Vercel account must have access enabled. This replaces the earlier frontend-on-Vercel / backend-on-VPS deployment suggestion.

## Services and public routing

| Service | Root | Runtime | Public paths |
|---|---|---|---|
| `app` | `.` | Native Rust, `api/app.rs` | `/api`, `/api/*`, `/health` |
| `web` | `web` | Vite static frontend | Remaining paths, including `/shops/:slug`, product/checkout/purchase pages and assets |

The most specific public rules come first. Vercel preserves the original API path while selecting the Rust service's single `/api/app` function. The web service has its own SPA fallback so refreshing a shared shop link works. Unknown API requests remain API 404 responses and never become storefront HTML.

There are **no internal service bindings** because neither service calls the other from a server function. The Vite bundle runs in the customer's browser and uses same-origin `/api/*`, reaching the public `app` route. Its build cannot read a runtime binding. Rust calls the existing, external AriseSell API using `ARISESELL_API_URL` and a bridge key; that API is not deployed from this repository. PostgreSQL is an external database connection, not a Vercel service. No unused service, proxy function, or browser-visible binding URL has been introduced.

These service names, public paths, and absence of private service-to-service calls must be confirmed before publishing the deployment.

## 1. Deploy the companion AriseSell integration

Review/deploy the companion source patch described in `README.md`. Set its backend's `MARKETPLACE_BRIDGE_KEY` and exact `MARKETPLACE_REDIRECT_URI=https://YOUR_STORE_DOMAIN/api/auth/callback`. Its existing Redis remains responsible for one-time authorization codes. Existing payment, inventory and order processing remains in AriseSell.

## 2. Prepare the existing PostgreSQL database

Use a migration/admin connection to the **existing AriseSell database** to apply `migrations/002_postgres.sql`, for example with `psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/002_postgres.sql`. Keep that connection secret in your shell environment; do not commit it.

The script adds only the `arise_marketplace` schema and its metadata tables. It does not read, alter, migrate or delete commerce tables, accounts, encrypted inventory or orders. Existing local SQLite metadata is not copied automatically; this first cloud deployment starts new sessions/moderation/reports. Keep any local database as a backup.

Create a dedicated runtime login using your normal database administration process. A typical permission setup, after creating `arise_marketplace_runtime` and setting its password privately, is:

```sql
GRANT CONNECT ON DATABASE arisesell TO arise_marketplace_runtime;
GRANT USAGE ON SCHEMA arise_marketplace TO arise_marketplace_runtime;
GRANT SELECT ON arise_marketplace.schema_version TO arise_marketplace_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  arise_marketplace.auth_requests,
  arise_marketplace.sessions,
  arise_marketplace.moderation,
  arise_marketplace.reports,
  arise_marketplace.rate_limits
TO arise_marketplace_runtime;
```

Replace `arisesell` if the existing database has another name. The runtime login must have no owner/superuser role, no migration privileges, and no inherited access to AriseSell commerce tables. Do not revoke existing grants from the production application's roles as part of this setup. Migrations are deliberate operator actions; the serverless function never creates schemas on cold starts.

Vercel needs a reachable PostgreSQL hostname and verified TLS certificate (`sslmode=verify-full`). A VPS Docker hostname or `localhost` cannot be reached from Vercel. Configure the appropriate network access without broadly exposing the production database. Each function instance uses a small pool of up to three connections; size database/pooler capacity for the deployment's concurrency.

## 3. Add Vercel environment variables

Use Production scope and the final storefront domain:

```dotenv
PUBLIC_ORIGIN=https://YOUR_STORE_DOMAIN
ARISESELL_API_URL=https://arisesell.com/api/v1
ARISESELL_WEB_URL=https://arisesell.com
ARISESELL_BRIDGE_KEY=<same dedicated secret as the AriseSell bridge>
SESSION_ENCRYPTION_KEY=<base64url encoding of 32 random bytes, no padding>
MARKETPLACE_DATABASE_URL=postgresql://arise_marketplace_runtime:ENCODED_PASSWORD@DATABASE_HOST:5432/arisesell?sslmode=verify-full
DEMO_MODE=false
```

Do not prefix secrets with `VITE_`, embed them in `vercel.json`, or set production `DATABASE_PATH`. Do not upload the local `.env`, `.tools` or demo database. The Vercel entrypoint refuses demo mode, non-HTTPS commerce origins, or missing/non-PostgreSQL persistent storage. `BIND_ADDRESS` is only for the standalone server, not the native Vercel function.

Use separate non-production credentials/data for preview deployments. The bridge currently registers one exact callback, and the application checks an exact `PUBLIC_ORIGIN`; arbitrary preview URLs are not automatically authorized for production login or checkout.

## 4. Verify locally with Vercel Services

Install Vercel CLI and Rust on the development OS. From the repository root, use `vercel dev` (linked project) or `vercel dev --local --listen 127.0.0.1:3099` (without creating/linking a project). Provide a local `.env.local` for that origin, a disposable PostgreSQL database with the schema applied, and a running staging/local AriseSell API. Bindings, if later needed, are injected by Vercel; do not invent their environment values.

The Rust service's `devCommand` starts the existing standalone server on Vercel's injected `PORT`; production uses the native `vercel_runtime` adapter. On Windows, WSL with Linux Node/Rust avoids the CLI's Unix-shell requirements. Keep Linux and Windows `node_modules` separate.

Check `/health`, `/api/session`, `/api/catalog`, `/api/not-found`, and a direct `/shops/YOUR_SLUG` refresh. Check Origin/CSRF and cookies across sign-in, logout and checkout. All payment verification and private delivery checks remain authoritative in AriseSell.

## 5. Deploy after configuration confirmation

Push the reviewed changes, import/redeploy the single Vercel project with root `.`, add the final domain and environment variables, and verify the exact callback on AriseSell. Check a fresh guest checkout, an unverified transaction ID remaining unpaid, verified payment and both delivery modes, seller isolation, restart/session persistence, and moderation before a public launch. Never use a development synthetic receipt with production accounts.

Schema references: [Services](https://vercel.com/docs/services), [routing](https://vercel.com/docs/services/routing), [bindings](https://vercel.com/docs/services/bindings), [Rust runtime](https://vercel.com/docs/functions/runtimes/rust). No production deployment or database migration is performed by merely adding this configuration.
