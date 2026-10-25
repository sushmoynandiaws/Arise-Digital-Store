PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS auth_requests (
    state_hash TEXT PRIMARY KEY,
    verifier TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    source_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS moderation (
    kind TEXT NOT NULL CHECK(kind IN ('shop','product')),
    target_id TEXT NOT NULL,
    hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)),
    reason TEXT NOT NULL,
    actor TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY(kind,target_id)
);
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    reporter_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0 CHECK(resolved IN (0,1))
);
CREATE TABLE IF NOT EXISTS rate_limits (
    bucket TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    attempts INTEGER NOT NULL
);
INSERT OR IGNORE INTO schema_version VALUES (1);
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, product_id TEXT NOT NULL, shop_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 2 AND 60),
    comment TEXT NOT NULL CHECK(length(comment) BETWEEN 10 AND 2000), created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reviews_product_date ON reviews(product_id, created_at DESC, id DESC);
INSERT OR IGNORE INTO schema_version VALUES (2);
