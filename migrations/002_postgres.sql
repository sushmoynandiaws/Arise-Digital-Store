-- Apply once with a migration role to the existing AriseSell database.
-- Runtime credentials need access only to this schema, not commerce tables.
BEGIN;
CREATE SCHEMA IF NOT EXISTS arise_marketplace;
CREATE TABLE IF NOT EXISTS arise_marketplace.schema_version (version BIGINT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS arise_marketplace.auth_requests (
    state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS arise_marketplace.sessions (
    token_hash TEXT PRIMARY KEY, source_token TEXT NOT NULL, expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS arise_marketplace.moderation (
    kind TEXT NOT NULL CHECK(kind IN ('shop','product')),
    target_id TEXT NOT NULL,
    hidden BIGINT NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)),
    reason TEXT NOT NULL, actor TEXT NOT NULL, updated_at BIGINT NOT NULL,
    PRIMARY KEY(kind,target_id)
);
CREATE TABLE IF NOT EXISTS arise_marketplace.reports (
    id TEXT PRIMARY KEY, product_id TEXT NOT NULL, reason TEXT NOT NULL,
    reporter_hash TEXT NOT NULL, created_at BIGINT NOT NULL,
    resolved BIGINT NOT NULL DEFAULT 0 CHECK(resolved IN (0,1))
);
CREATE TABLE IF NOT EXISTS arise_marketplace.rate_limits (
    bucket TEXT PRIMARY KEY, window_start BIGINT NOT NULL, attempts BIGINT NOT NULL
);
INSERT INTO arise_marketplace.schema_version VALUES (1) ON CONFLICT DO NOTHING;
COMMIT;
