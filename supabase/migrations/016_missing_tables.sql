-- ============================================================
-- 016_missing_tables.sql
-- Creates tables that were referenced in the app but never
-- had a corresponding migration.
-- All policy/index creation is guarded so the migration is
-- safe to re-run on a database where some objects already exist.
-- ============================================================

-- ── trip_expenses ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  paid_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_eur   NUMERIC(10, 2) NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL DEFAULT 'other',
  split_with   UUID[] NOT NULL DEFAULT '{}',
  distance_km  NUMERIC(10, 2),
  car_id       UUID REFERENCES user_cars(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trip_expenses_select" ON trip_expenses;
CREATE POLICY "trip_expenses_select" ON trip_expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_expenses.trip_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trip_expenses_insert" ON trip_expenses;
CREATE POLICY "trip_expenses_insert" ON trip_expenses
  FOR INSERT WITH CHECK (
    paid_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_expenses.trip_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trip_expenses_update" ON trip_expenses;
CREATE POLICY "trip_expenses_update" ON trip_expenses
  FOR UPDATE USING (paid_by = auth.uid());

DROP POLICY IF EXISTS "trip_expenses_delete" ON trip_expenses;
CREATE POLICY "trip_expenses_delete" ON trip_expenses
  FOR DELETE USING (paid_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip    ON trip_expenses (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_paid_by ON trip_expenses (paid_by);

-- ── trip_suggestion_votes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_suggestion_votes (
  suggestion_id  UUID NOT NULL REFERENCES trip_suggestions(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote           TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (suggestion_id, user_id)
);

ALTER TABLE trip_suggestion_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trip_suggestion_votes_select" ON trip_suggestion_votes;
CREATE POLICY "trip_suggestion_votes_select" ON trip_suggestion_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_suggestions ts
      JOIN trips t ON t.id = ts.trip_id
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE ts.id = trip_suggestion_votes.suggestion_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trip_suggestion_votes_insert" ON trip_suggestion_votes;
CREATE POLICY "trip_suggestion_votes_insert" ON trip_suggestion_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "trip_suggestion_votes_update" ON trip_suggestion_votes;
CREATE POLICY "trip_suggestion_votes_update" ON trip_suggestion_votes
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "trip_suggestion_votes_delete" ON trip_suggestion_votes;
CREATE POLICY "trip_suggestion_votes_delete" ON trip_suggestion_votes
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_suggestion_votes_suggestion ON trip_suggestion_votes (suggestion_id);

-- ── away_periods ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS away_periods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id  UUID REFERENCES family_members(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE away_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own away periods" ON away_periods;
CREATE POLICY "Users manage own away periods"
  ON away_periods
  FOR ALL
  USING  (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_away_periods_owner ON away_periods (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_away_periods_dates ON away_periods (start_date, end_date);

-- ── free_stays ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS free_stays (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_city     TEXT NOT NULL,
  destination_country  CHAR(2) NOT NULL,
  host_name            TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE free_stays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own free stays" ON free_stays;
CREATE POLICY "Users manage own free stays"
  ON free_stays
  FOR ALL
  USING  (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_free_stays_owner ON free_stays (owner_user_id);

-- ── destination_wishlist ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS destination_wishlist (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_city     TEXT NOT NULL,
  destination_country  CHAR(2) NOT NULL,
  notes                TEXT,
  priority             SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE destination_wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wishlist" ON destination_wishlist;
CREATE POLICY "Users manage own wishlist"
  ON destination_wishlist
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON destination_wishlist (user_id, priority DESC);

-- ── family_members: missing home_region and home_city_name columns ────────────
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS home_region     TEXT,
  ADD COLUMN IF NOT EXISTS home_city_name  TEXT;

-- ── user_preferences: missing home_region and home_city_name columns ──────────
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS home_region     TEXT,
  ADD COLUMN IF NOT EXISTS home_city_name  TEXT;

-- ── Enable Realtime on new tables ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE trip_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_suggestion_votes;
