-- V6: Performance Indexes for Neon Serverless & Menu Query Optimization

-- Composite index on menu_items for restaurant dishes ordered by creation time (used in dashboard)
CREATE INDEX IF NOT EXISTS idx_menu_items_rest_created ON menu_items (restaurant_id, created_at DESC);

-- Composite index for published menu lookups with category ordering (used in guest menu)
CREATE INDEX IF NOT EXISTS idx_menu_items_published_lookup ON menu_items (restaurant_id, published, category, name);

-- Composite index for category lookups
CREATE INDEX IF NOT EXISTS idx_menu_items_rest_category ON menu_items (restaurant_id, category);

-- Index on restaurants for published slug lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_slug_published ON restaurants (slug, published);
