-- Add avatar_config column to family_members
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS avatar_config jsonb DEFAULT NULL;
