-- Add avatar_config column to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS avatar_config jsonb DEFAULT NULL;
