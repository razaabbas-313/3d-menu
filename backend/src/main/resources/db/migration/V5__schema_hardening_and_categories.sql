-- V5: Schema Hardening (Foreign Keys, ON DELETE rules, Indexing) and Dish Categories Persistence

-- 1. Purge any orphaned rows in existing databases before applying foreign key constraints
DELETE FROM menu_events WHERE restaurant_id NOT IN (SELECT id FROM restaurants);
UPDATE menu_events SET item_id = NULL WHERE item_id IS NOT NULL AND item_id NOT IN (SELECT id FROM menu_items);
DELETE FROM menu_items WHERE restaurant_id NOT IN (SELECT id FROM restaurants);
UPDATE restaurants SET owner_id = NULL WHERE owner_id IS NOT NULL AND owner_id NOT IN (SELECT id FROM app_users);

-- 2. Add Foreign Key Constraints with Referential Actions
ALTER TABLE restaurants
    ADD CONSTRAINT fk_restaurants_owner
    FOREIGN KEY (owner_id) REFERENCES app_users(id) ON DELETE SET NULL;

ALTER TABLE menu_items
    ADD CONSTRAINT fk_menu_items_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE menu_events
    ADD CONSTRAINT fk_menu_events_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE menu_events
    ADD CONSTRAINT fk_menu_events_item
    FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE SET NULL;

-- 3. High-Performance Index on menu_events.item_id for item analytics queries
CREATE INDEX IF NOT EXISTS idx_menu_events_item_id ON menu_events (item_id);

-- 4. Persistent Categories on Restaurants (survives browser resets & syncs across devices)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS categories VARCHAR(2000);
