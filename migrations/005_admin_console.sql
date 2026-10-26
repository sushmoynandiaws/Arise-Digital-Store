-- Additive marketplace administration metadata. Apply with the migration role.
BEGIN;
CREATE TABLE IF NOT EXISTS arise_marketplace.admin_documents (
    key TEXT PRIMARY KEY, content TEXT NOT NULL, revision BIGINT NOT NULL DEFAULT 0, updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS arise_marketplace.admin_roles (
    user_id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('owner','moderator','support','blocked'))
);
CREATE TABLE IF NOT EXISTS arise_marketplace.admin_activity (
    id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_activity_date ON arise_marketplace.admin_activity(created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS arise_marketplace.admin_notes (
    id TEXT PRIMARY KEY, target_type TEXT NOT NULL CHECK(target_type IN ('report','order')), target_id TEXT NOT NULL,
    actor TEXT NOT NULL, content TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS arise_marketplace.review_moderation (
    review_id TEXT PRIMARY KEY REFERENCES arise_marketplace.reviews(id), hidden BIGINT NOT NULL CHECK(hidden IN (0,1)), reason TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS arise_marketplace.ad_events (
    ad_id TEXT NOT NULL, visitor_hash TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('impression','click')), day BIGINT NOT NULL,
    PRIMARY KEY(ad_id,visitor_hash,kind,day)
);
INSERT INTO arise_marketplace.schema_version VALUES (4) ON CONFLICT DO NOTHING;
COMMIT;
