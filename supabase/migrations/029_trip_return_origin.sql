-- Add optional return-from-different-city fields to trips.
-- Supports open-jaw itineraries (fly out to city A, return from city B).
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS return_origin_city    TEXT,
  ADD COLUMN IF NOT EXISTS return_origin_country CHAR(2);
