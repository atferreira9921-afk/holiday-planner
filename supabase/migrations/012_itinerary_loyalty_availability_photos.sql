-- Itinerary items (day-by-day planner per trip)
CREATE TABLE IF NOT EXISTS trip_itinerary_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number  INTEGER NOT NULL,
  time_slot   TEXT NOT NULL DEFAULT 'morning', -- morning | afternoon | evening | night
  title       TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  cost_eur    NUMERIC(10,2),
  created_by  UUID REFERENCES auth.users(id),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE trip_itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members manage itinerary" ON trip_itinerary_items
  USING (EXISTS (
    SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id
    WHERE t.id = trip_itinerary_items.trip_id AND gm.user_id = auth.uid()
  ));

-- Group availability poll (per trip, per date, per user)
CREATE TABLE IF NOT EXISTS group_availability (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id   UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (trip_id, user_id, date)
);
ALTER TABLE group_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members manage availability" ON group_availability
  USING (EXISTS (
    SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id
    WHERE t.id = group_availability.trip_id AND gm.user_id = auth.uid()
  ));

-- Loyalty / frequent flyer numbers
CREATE TABLE IF NOT EXISTS user_loyalty_numbers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  programme         TEXT NOT NULL,
  programme_type    TEXT NOT NULL DEFAULT 'airline', -- airline | hotel | car_rental
  membership_number TEXT NOT NULL,
  tier              TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_loyalty_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own loyalty numbers" ON user_loyalty_numbers
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trip photos (storage_path points to Supabase Storage bucket "trip-photos")
CREATE TABLE IF NOT EXISTS trip_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  caption      TEXT,
  taken_date   DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members manage photos" ON trip_photos
  USING (EXISTS (
    SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id
    WHERE t.id = trip_photos.trip_id AND gm.user_id = auth.uid()
  ));

-- Add departure/arrival city coords to trip_suggestions for weather lookups
ALTER TABLE trip_suggestions
  ADD COLUMN IF NOT EXISTS destination_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS destination_lng NUMERIC(9,6);
