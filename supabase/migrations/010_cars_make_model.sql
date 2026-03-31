-- Add make, model, year columns to user_cars
ALTER TABLE user_cars
  ADD COLUMN IF NOT EXISTS make  TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS year  SMALLINT;
