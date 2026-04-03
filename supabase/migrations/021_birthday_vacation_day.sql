ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS birthday_is_vacation_day BOOLEAN NOT NULL DEFAULT FALSE;
