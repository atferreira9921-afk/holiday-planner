-- ─────────────────────────────────────────────────────────────────────────────
-- Holiday Planner — Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays     ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_suggestions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_feedback ENABLE ROW LEVEL SECURITY;

-- ─── user_profiles ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── user_preferences ─────────────────────────────────────────────────────────
CREATE POLICY "Users manage own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── travel_groups ────────────────────────────────────────────────────────────
CREATE POLICY "Users can create groups"
  ON travel_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creator can view their groups"
  ON travel_groups FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Group members can view groups"
  ON travel_groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group creator can update group"
  ON travel_groups FOR UPDATE
  USING (created_by = auth.uid());

-- ─── group_members (no self-reference to avoid recursion) ─────────────────────
CREATE POLICY "Users can view own memberships"
  ON group_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Group creator can manage members"
  ON group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM travel_groups WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (user_id = auth.uid());

-- ─── trips ────────────────────────────────────────────────────────────────────
CREATE POLICY "Group members can view trips"
  ON trips FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create trips"
  ON trips FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Trip creator can update trip"
  ON trips FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Trip creator can delete trip"
  ON trips FOR DELETE USING (created_by = auth.uid());

-- ─── public_holidays ──────────────────────────────────────────────────────────
CREATE POLICY "Public holidays are public"
  ON public_holidays FOR SELECT USING (true);

CREATE POLICY "Service role manages holidays"
  ON public_holidays FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── trip_suggestions ─────────────────────────────────────────────────────────
CREATE POLICY "Group members can view suggestions"
  ON trip_suggestions FOR SELECT
  USING (
    trip_id IN (
      SELECT t.id FROM trips t
      WHERE t.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can insert suggestions"
  ON trip_suggestions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ─── suggestion_feedback ──────────────────────────────────────────────────────
CREATE POLICY "Users manage own feedback"
  ON suggestion_feedback FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
