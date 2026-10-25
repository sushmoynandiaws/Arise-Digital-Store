-- Additive public shop metadata; apply with the migration role before deployment.
BEGIN;
CREATE TABLE IF NOT EXISTS arise_marketplace.shop_pages (
    shop_id TEXT PRIMARY KEY,
    content TEXT NOT NULL
);
INSERT INTO arise_marketplace.schema_version VALUES (3) ON CONFLICT DO NOTHING;
COMMIT;
