-- ─────────────────────────────────────────────────────────────────────────────
-- Holiday Planner — Full preference profile for family members
-- Run AFTER 004_family_members.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS vacation_days_per_year  integer  DEFAULT 22,
  ADD COLUMN IF NOT EXISTS gender                  text     DEFAULT 'prefer_not_to_say'
    CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS on_parental_leave        boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS parental_leave_end_date  date,
  ADD COLUMN IF NOT EXISTS travel_style             text     DEFAULT 'mid-range'
    CHECK (travel_style IN ('budget', 'mid-range', 'luxury')),
  ADD COLUMN IF NOT EXISTS budget_min_eur           integer  DEFAULT 300,
  ADD COLUMN IF NOT EXISTS budget_max_eur           integer  DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS interests                text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avoid_destinations       text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_countries      text[]   DEFAULT '{}';
