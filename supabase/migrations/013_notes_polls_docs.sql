-- ============================================================
-- 013_notes_polls_docs.sql
-- Shared trip notes + group polls (polls, options, votes)
-- ============================================================

-- Helper: returns true if auth.uid() is a member of the group that owns the trip
-- Usage: EXISTS (SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id WHERE t.id = <trip_id_col> AND gm.user_id = auth.uid())

-- ------------------------------------------------------------
-- 1. trip_notes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_notes (
  trip_id    UUID PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
  content    TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trip_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_notes_select" ON trip_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_notes.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_notes_insert" ON trip_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_notes.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_notes_update" ON trip_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_notes.trip_id AND gm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 2. trip_polls
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at   TIMESTAMPTZ
);

ALTER TABLE trip_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_polls_select" ON trip_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_polls.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_polls_insert" ON trip_polls
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_polls.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_polls_update" ON trip_polls
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "trip_polls_delete" ON trip_polls
  FOR DELETE USING (created_by = auth.uid());

-- ------------------------------------------------------------
-- 3. trip_poll_options
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_poll_options (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID NOT NULL REFERENCES trip_polls(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE trip_poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_poll_options_select" ON trip_poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_polls p
      JOIN trips t ON t.id = p.trip_id
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE p.id = trip_poll_options.poll_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_poll_options_insert" ON trip_poll_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_polls
      WHERE trip_polls.id = trip_poll_options.poll_id
        AND trip_polls.created_by = auth.uid()
    )
  );

CREATE POLICY "trip_poll_options_delete" ON trip_poll_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trip_polls
      WHERE trip_polls.id = trip_poll_options.poll_id
        AND trip_polls.created_by = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 4. trip_poll_votes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_poll_votes (
  poll_id   UUID NOT NULL REFERENCES trip_polls(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES trip_poll_options(id) ON DELETE CASCADE,
  PRIMARY KEY (poll_id, user_id)
);

ALTER TABLE trip_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_poll_votes_select" ON trip_poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_polls p
      JOIN trips t ON t.id = p.trip_id
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE p.id = trip_poll_votes.poll_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_poll_votes_insert" ON trip_poll_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trip_polls p
      JOIN trips t ON t.id = p.trip_id
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE p.id = trip_poll_votes.poll_id
        AND gm.user_id = auth.uid()
        AND p.closed_at IS NULL
    )
  );

CREATE POLICY "trip_poll_votes_update" ON trip_poll_votes
  FOR UPDATE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trip_polls
      WHERE trip_polls.id = trip_poll_votes.poll_id
        AND trip_polls.closed_at IS NULL
    )
  );

CREATE POLICY "trip_poll_votes_delete" ON trip_poll_votes
  FOR DELETE USING (user_id = auth.uid());
