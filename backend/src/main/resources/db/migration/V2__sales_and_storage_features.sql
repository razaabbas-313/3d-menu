-- V2: Schema Additions for WhatsApp Ordering, Multi-Language Menus, and Lead Generation

-- 1. WhatsApp Ordering Preferences on Restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_order_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_message_template VARCHAR(500) DEFAULT 'Hello, I would like to order {dish} for Table {table}.';

-- 2. Multi-Language Translations (Urdu & Arabic) on Menu Items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name_ur VARCHAR(140);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description_ur VARCHAR(700);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name_ar VARCHAR(140);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description_ar VARCHAR(700);

-- 3. Lead Inquiries from Public Landing Page
CREATE TABLE IF NOT EXISTS lead_inquiries (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    restaurant_name VARCHAR(140) NOT NULL,
    phone VARCHAR(60) NOT NULL,
    email VARCHAR(160),
    notes VARCHAR(500),
    ip_address VARCHAR(60),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON lead_inquiries (created_at);
