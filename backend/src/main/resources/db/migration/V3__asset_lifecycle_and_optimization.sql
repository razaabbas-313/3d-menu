-- V3: Asset Lifecycle, 3D Optimization Metadata, Thumbnails, and Status Tracking

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS original_model_url VARCHAR(500);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS model_status VARCHAR(20) DEFAULT 'READY';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS model_file_size BIGINT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS original_model_file_size BIGINT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS model_optimization_notes VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_menu_items_model_status ON menu_items (model_status);
