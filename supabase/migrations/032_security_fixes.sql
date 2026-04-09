-- Security fixes:
-- 1. trip_predeparture_checks: enable RLS + add policies
-- 2. trip_packing_items: restrict UPDATE/DELETE to item owner
-- 3. trip_expenses: add WITH CHECK to prevent paid_by/split_with forgery
-- 4. trip_documents: restrict DELETE to uploader
-- 5. ai_usage: atomic increment function to prevent race condition
-- 6. group_invites: allow any group member (not just creator) to create invites

-- ── trip_predeparture_checks RLS ──────────────────────────────────────────────
ALTER TABLE trip_predeparture_checks ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rows OR rows from shared items of group co-members
CREATE POLICY "Users manage own predeparture checks" ON trip_predeparture_checks
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Read shared checks from group co-members
CREATE POLICY "Group members can read shared predeparture checks" ON trip_predeparture_checks
  FOR SELECT
  USING (
    is_shared = true
    AND EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_predeparture_checks.trip_id
        AND gm.user_id = auth.uid()
    )
  );

-- ── trip_packing_items: per-user ownership enforcement ────────────────────────
-- Drop the old broad UPDATE/DELETE policies and replace with ownership-aware ones
DROP POLICY IF EXISTS "Group members manage packing items" ON trip_packing_items;

CREATE POLICY "Group members can view packing items" ON trip_packing_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_packing_items.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can insert own packing items" ON trip_packing_items
  FOR INSERT
  WITH CHECK (
    (owner_user_id = auth.uid() OR owner_user_id IS NULL)
    AND EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_packing_items.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own packing items" ON trip_packing_items
  FOR UPDATE
  USING (owner_user_id = auth.uid() OR owner_user_id IS NULL)
  WITH CHECK (owner_user_id = auth.uid() OR owner_user_id IS NULL);

CREATE POLICY "Users can delete own packing items" ON trip_packing_items
  FOR DELETE
  USING (owner_user_id = auth.uid() OR owner_user_id IS NULL);

-- ── trip_expenses: WITH CHECK to prevent paid_by forgery ─────────────────────
DROP POLICY IF EXISTS "trip_expenses_update" ON trip_expenses;
CREATE POLICY "trip_expenses_update" ON trip_expenses
  FOR UPDATE
  USING (paid_by = auth.uid())
  WITH CHECK (paid_by = auth.uid());

-- ── trip_documents: separate DELETE policy restricted to uploader ─────────────
-- The FOR ALL policy in 025 allows any group member to DELETE (USING only checks group membership for DELETE).
-- Replace with split SELECT/INSERT/UPDATE/DELETE policies.
DROP POLICY IF EXISTS "Group members manage documents" ON trip_documents;

CREATE POLICY "Group members can view documents" ON trip_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_documents.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can upload documents" ON trip_documents
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_documents.trip_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Uploaders can delete own documents" ON trip_documents
  FOR DELETE
  USING (uploaded_by = auth.uid());

-- ── group_invites: allow any group member (not just creator) to invite ────────
DROP POLICY IF EXISTS "Group creator can create invites" ON group_invites;
CREATE POLICY "Group members can create invites" ON group_invites
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- ── ai_usage: atomic increment to prevent TOCTOU race condition ───────────────
CREATE OR REPLACE FUNCTION consume_ai_limit(
  p_user_id uuid,
  p_date    date,
  p_limit   int
)
RETURNS TABLE(allowed boolean, used int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- Atomic upsert: insert 1 or increment by 1, only if current count < limit
  INSERT INTO ai_usage (user_id, usage_date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET count = ai_usage.count + 1
    WHERE ai_usage.count < p_limit
  RETURNING ai_usage.count INTO v_count;

  IF v_count IS NULL THEN
    -- UPDATE WHERE clause blocked the increment — already at limit
    SELECT count INTO v_count FROM ai_usage
    WHERE user_id = p_user_id AND usage_date = p_date;
    RETURN QUERY SELECT false, v_count;
  ELSE
    RETURN QUERY SELECT true, v_count;
  END IF;
END;
$$;
