-- ── Fix group_invites ────────────────────────────────────────────────────────
-- invited_email was NOT NULL but invite generation doesn't collect an email
ALTER TABLE group_invites
  ALTER COLUMN invited_email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES user_profiles(id);

-- ── User Cars ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_cars (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                        TEXT NOT NULL,
  fuel_consumption_per_100km  NUMERIC(5, 2) NOT NULL,
  fuel_cost_per_liter         NUMERIC(6, 3) NOT NULL DEFAULT 1.70,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cars"
  ON user_cars
  USING  (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE INDEX idx_user_cars_owner ON user_cars (owner_user_id);

-- ── Extend trip_expenses for car trips ────────────────────────────────────────
ALTER TABLE trip_expenses
  ADD COLUMN IF NOT EXISTS distance_km  NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS car_id       UUID REFERENCES user_cars(id) ON DELETE SET NULL;
