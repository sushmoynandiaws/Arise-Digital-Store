-- Additive marketplace metadata migration; run with the migration role.
BEGIN;
CREATE TABLE IF NOT EXISTS arise_marketplace.reviews (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    rating BIGINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
    display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 2 AND 60),
    comment TEXT NOT NULL CHECK(length(comment) BETWEEN 10 AND 2000),
    created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS reviews_product_date ON arise_marketplace.reviews(product_id, created_at DESC, id DESC);
INSERT INTO arise_marketplace.schema_version VALUES (2) ON CONFLICT DO NOTHING;
COMMIT;
