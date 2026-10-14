-- V1: Baseline Initial Schema for Atelier AR

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY,
    owner_id UUID,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    tagline VARCHAR(500),
    city VARCHAR(120),
    currency VARCHAR(8) DEFAULT 'PKR',
    accent VARCHAR(20) DEFAULT 'cobalt',
    instagram VARCHAR(120),
    whatsapp VARCHAR(60),
    phone VARCHAR(60),
    tiktok VARCHAR(120),
    facebook VARCHAR(120),
    website VARCHAR(255),
    google_maps_url VARCHAR(500),
    wifi_name VARCHAR(100),
    wifi_password VARCHAR(100),
    theme VARCHAR(30) DEFAULT 'dark',
    cover_url VARCHAR(500),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    name VARCHAR(140) NOT NULL,
    category VARCHAR(60) NOT NULL,
    description VARCHAR(700),
    price NUMERIC(10, 2) NOT NULL,
    image_url VARCHAR(500),
    model_url VARCHAR(500),
    model_file_name VARCHAR(255),
    tags VARCHAR(300),
    model_scale DOUBLE PRECISION DEFAULT 1.0,
    model_placement VARCHAR(40) DEFAULT 'plate',
    featured BOOLEAN DEFAULT FALSE,
    available BOOLEAN DEFAULT TRUE,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_rest_cat ON menu_items (restaurant_id, category);

CREATE TABLE IF NOT EXISTS menu_events (
    id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    item_id UUID,
    type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_events_restaurant_created ON menu_events (restaurant_id, created_at);
