-- Custom items + ability to hide standard items per user
ALTER TABLE trip_predeparture_checks
  ADD COLUMN IF NOT EXISTS label      TEXT,           -- non-null = custom item added by user
  ADD COLUMN IF NOT EXISTS is_removed BOOLEAN NOT NULL DEFAULT false; -- hides a standard item
