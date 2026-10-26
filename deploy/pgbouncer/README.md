# Marketplace database access from Vercel

The production pooler listens on `187.53.134.195:6432`. Its only database mapping is `arisesell_db`; its authentication file contains only `arise_marketplace_runtime`. PostgreSQL remains unpublished on the existing `backend_default` Docker network. The pooler limits backend connections to 12 and uses session pooling so SQLx's search path remains bound to its session.

The marketplace runtime role has PostgreSQL `idle_session_timeout = '30s'` for `arisesell_db`. This releases idle sessions held by frozen serverless instances; SQLx checks pooled connections before reuse and reconnects when an idle connection has closed. The timeout excludes open transactions and applies only to the marketplace role. PgBouncer's client idle timeout does not release server-linked clients in session pooling, so the limit belongs on the database role. See [PostgreSQL idle session timeout](https://www.postgresql.org/docs/16/runtime-config-client.html#GUC-IDLE-SESSION-TIMEOUT).

Both client certificate verification and SCRAM-SHA-256 authentication are required. The server certificate has the VPS IP in its subject alternative names. SQLx verifies the server against the dedicated CA through `PGSSLROOTCERT`; never replace `sslmode=verify-full` with `require` or `disable`.

## Provision and start

Run as root on this VPS after checking out the marketplace into `/opt/arise-digital-store`:

```bash
python3 /opt/arise-digital-store/deploy/pgbouncer/provision.py
chown -R root:10001 /root/.arise-marketplace/pgbouncer
chmod 750 /root/.arise-marketplace/pgbouncer
chmod 640 /root/.arise-marketplace/pgbouncer/*
cd /opt/arise-digital-store/deploy/pgbouncer
docker compose up -d --build --wait
```

Provisioning applies the additive migrations through `005_admin_console.sql`, creates the restricted role, and verifies it has no role memberships or commerce-table privileges. Existing credentials and certificates are retained on repeated runs. Do not recreate a missing `database-password` file when the role already exists: recover it from the private backup or deliberately rotate the role and Vercel configuration together.

Private credentials and the CA signing key live under `/root/.arise-marketplace` (root access only). The container receives only its server certificate/key, public CA, and the runtime role's SCRAM verifier. Preserve an encrypted, access-controlled backup of this directory. No private certificates, passwords, keys, or complete connection URLs belong in Git.

Set these variables in Vercel **Production**, then redeploy:

- `MARKETPLACE_DATABASE_URL`: PostgreSQL URI using `arise_marketplace_runtime`, its password, `187.53.134.195:6432/arisesell_db`, and `sslmode=verify-full`.
- `PGSSLROOTCERT`: PEM contents of `/root/.arise-marketplace/pgbouncer/ca.crt`.
- `PGSSLCERT`: PEM contents of `/root/.arise-marketplace/client.crt`.
- `PGSSLKEY`: PEM contents of `/root/.arise-marketplace/client.key`, stored as sensitive.

## Verification and renewal

Check `/health`, `/api/session`, and `/api/catalog` through the production Vercel domain. A database client without a client certificate must be refused even if its password is correct. The runtime role must be able to use `arise_marketplace` tables and must have no commerce-table access.

Leaf certificates are valid for one year; the dedicated CA is valid for ten years. Record their actual expiration dates and renew before expiry:

```bash
openssl x509 -in /root/.arise-marketplace/pgbouncer/server.crt -noout -enddate
openssl x509 -in /root/.arise-marketplace/client.crt -noout -enddate
```

Issue replacement leaf certificates with the same CA, IP subject alternative name, and client role common name. Update the Vercel client certificate/key together, redeploy, and reload/recreate only the pooler after replacing its server certificate. Do not regenerate the CA during normal leaf renewal.
