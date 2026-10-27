-- Marketplace conversation and anonymous daily traffic metadata only.
BEGIN;
CREATE TABLE IF NOT EXISTS arise_marketplace.product_questions (
    id TEXT PRIMARY KEY, product_id TEXT NOT NULL, shop_id TEXT NOT NULL,
    visitor_hash TEXT NOT NULL, display_name TEXT NOT NULL, question TEXT NOT NULL,
    answer TEXT NOT NULL DEFAULT '', hidden BIGINT NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)),
    created_at BIGINT NOT NULL, answered_at BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS product_questions_product ON arise_marketplace.product_questions(product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS product_questions_shop ON arise_marketplace.product_questions(shop_id,created_at DESC);
CREATE TABLE IF NOT EXISTS arise_marketplace.traffic_events (
    day BIGINT NOT NULL, visitor_hash TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('home','listing','shop','product')),
    target_id TEXT NOT NULL, PRIMARY KEY(day,visitor_hash,kind,target_id)
);
INSERT INTO arise_marketplace.schema_version VALUES (5) ON CONFLICT DO NOTHING;
COMMIT;
