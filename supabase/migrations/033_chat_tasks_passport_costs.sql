-- Migration 033: group chat, trip tasks, passport expiry, trip cost estimates

-- ── Group chat ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read messages" ON trip_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_messages.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages" ON trip_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_messages.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own messages" ON trip_messages
  FOR DELETE USING (user_id = auth.uid());

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE trip_messages;

-- ── Trip tasks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 300),
  due_date    DATE,
  is_done     BOOLEAN NOT NULL DEFAULT false,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trip_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view tasks" ON trip_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_tasks.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create tasks" ON trip_tasks
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_tasks.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can update tasks" ON trip_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_tasks.trip_id AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_tasks.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Task creator can delete task" ON trip_tasks
  FOR DELETE USING (created_by = auth.uid());

-- ── Passport expiry on user_preferences ──────────────────────────────────────
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS passport_expiry DATE;

-- ── Trip cost estimates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_cost_estimates (
  trip_id                     UUID PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
  flight_per_person_eur       NUMERIC(10, 2),
  hotel_per_night_eur         NUMERIC(10, 2),
  daily_budget_per_person_eur NUMERIC(10, 2),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trip_cost_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view cost estimates" ON trip_cost_estimates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_cost_estimates.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can upsert cost estimates" ON trip_cost_estimates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_cost_estimates.trip_id AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_cost_estimates.trip_id AND gm.user_id = auth.uid()
    )
  );
