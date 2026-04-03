-- Allow cars to be associated with a family member
ALTER TABLE user_cars
  ADD COLUMN IF NOT EXISTS family_member_id uuid REFERENCES family_members(id) ON DELETE CASCADE;
