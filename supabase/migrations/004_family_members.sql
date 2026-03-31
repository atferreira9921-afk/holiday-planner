-- ─────────────────────────────────────────────────────────────────────────────
-- Holiday Planner — Family Members
-- Run AFTER 003_new_features.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS family_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT NOT NULL,
  home_country      TEXT NOT NULL DEFAULT 'PT',
  home_city         TEXT NOT NULL DEFAULT 'LIS',
  color             TEXT NOT NULL DEFAULT 'indigo',
  linked_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own family members"
  ON family_members FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
