-- V4: Reset any stuck 'PROCESSING' items back to 'READY' so they are not blocked in dashboard
UPDATE menu_items SET model_status = 'READY' WHERE model_status = 'PROCESSING';
