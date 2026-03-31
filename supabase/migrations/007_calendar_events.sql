-- ── Calendar Events ───────────────────────────────────────────────────────────
-- Stores concerts, games, visits, parties and other personal events that
-- appear on the calendar as reminders. They do NOT consume vacation days
-- and do NOT block trip planning windows.

CREATE TABLE IF NOT EXISTS calendar_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  event_kind       TEXT NOT NULL DEFAULT 'event-other',
  -- Valid values: 'concert', 'game', 'visit', 'party', 'event-other'
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calendar events"
  ON calendar_events
  USING  (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE INDEX idx_calendar_events_owner ON calendar_events (owner_user_id, start_date);
