-- ─── Notifications ────────────────────────────────────────────────────────────
-- In-app notification feed.  Rows are inserted by API routes when events
-- occur (invite accepted, suggestions generated, etc.).
-- The client subscribes via Supabase Realtime to get live updates.

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL,   -- invite_accepted | invite_received | suggestion_ready | vote_cast | trip_update
  title      text        NOT NULL,
  body       text,
  link       text,                   -- app-relative path to navigate to on click
  read_at    timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own notifications
CREATE POLICY "notifications: own rows only"
  ON notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert on behalf of any user (used by API routes)
-- (service role bypasses RLS by default — no extra policy needed)

-- Enable Realtime for live bell updates
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
