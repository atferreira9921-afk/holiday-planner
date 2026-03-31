-- Add vehicle type and linked car to trips
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS vehicle_type    TEXT,         -- 'flight' | 'car' | 'bus'
  ADD COLUMN IF NOT EXISTS vehicle_car_id  UUID REFERENCES user_cars(id) ON DELETE SET NULL;
