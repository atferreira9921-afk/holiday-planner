-- ─────────────────────────────────────────────────────────────────────────────
-- Holiday Planner — New Features: Planning Mode + Parental Leave + Gender
-- Run AFTER 002_rls_policies.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── user_preferences additions ───────────────────────────────────────────────
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS gender text DEFAULT 'prefer_not_to_say'
    CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS on_parental_leave boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parental_leave_end_date date;

-- ─── trips additions ──────────────────────────────────────────────────────────
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS planning_mode text DEFAULT 'days_first'
    CHECK (planning_mode IN ('days_first', 'destination_first')),
  ADD COLUMN IF NOT EXISTS destination_city text,
  ADD COLUMN IF NOT EXISTS destination_country text;  -- ISO alpha-2 e.g. "ES"
