-- ─────────────────────────────────────────────────────────────────────────────
-- Holiday Planner — Booked holidays + Birthday
-- Run AFTER 005_family_member_preferences.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Booked holidays ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booked_holidays (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id  UUID REFERENCES family_members(id) ON DELETE CASCADE,
  -- NULL family_member_id = applies to the owner themselves
  title             TEXT NOT NULL DEFAULT 'Holiday',
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE booked_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own booked holidays"
  ON booked_holidays FOR ALL
  USING  (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ─── Birthday ─────────────────────────────────────────────────────────────────
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS birthday date;

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS birthday date;
