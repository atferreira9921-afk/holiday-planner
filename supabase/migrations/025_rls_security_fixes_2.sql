-- Security fixes batch 2
-- 1. trip_documents: add WITH CHECK enforcing uploaded_by = auth.uid()
-- 2. trip_notes_update: add WITH CHECK
-- 3. group_invites: add missing RLS policies (table had RLS enabled but zero policies)
-- 4. user_profiles: allow group co-members to view each other's profiles

-- ── trip_documents ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Group members manage documents" ON trip_documents;
CREATE POLICY "Group members manage documents" ON trip_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_documents.trip_id AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_documents.trip_id AND gm.user_id = auth.uid()
    )
  );

-- ── trip_notes UPDATE ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "trip_notes_update" ON trip_notes;
CREATE POLICY "trip_notes_update" ON trip_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_notes.trip_id AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_notes.trip_id AND gm.user_id = auth.uid()
    )
  );

-- ── group_invites: add missing policies ───────────────────────────────────────
-- Previously RLS was enabled but no policies existed — table was wide open to anon key.
DROP POLICY IF EXISTS "Invite creator can view own invites" ON group_invites;
CREATE POLICY "Invite creator can view own invites"
  ON group_invites FOR SELECT
  USING (invited_by = auth.uid());

DROP POLICY IF EXISTS "Group creator can create invites" ON group_invites;
CREATE POLICY "Group creator can create invites"
  ON group_invites FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND group_id IN (
      SELECT id FROM travel_groups WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Invite creator can delete own invites" ON group_invites;
CREATE POLICY "Invite creator can delete own invites"
  ON group_invites FOR DELETE
  USING (invited_by = auth.uid());

-- ── user_profiles: allow co-members to view each other ───────────────────────
-- Without this, displaying group member names requires the service client everywhere.
DROP POLICY IF EXISTS "Group co-members can view profiles" ON user_profiles;
CREATE POLICY "Group co-members can view profiles"
  ON user_profiles FOR SELECT
  USING (
    id IN (
      SELECT gm2.user_id
      FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
    )
  );
