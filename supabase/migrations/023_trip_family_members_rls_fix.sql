-- Fix: INSERT and DELETE policies must also verify the family_member belongs to auth.uid()
-- Previously, any group member could tag/untag any family member (even ones they don't own).

DROP POLICY IF EXISTS "trip_family_members_insert" ON trip_family_members;
DROP POLICY IF EXISTS "trip_family_members_delete" ON trip_family_members;

CREATE POLICY "trip_family_members_insert" ON trip_family_members
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT t.id FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE gm.user_id = auth.uid()
    )
    AND family_member_id IN (
      SELECT id FROM family_members WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "trip_family_members_delete" ON trip_family_members
  FOR DELETE USING (
    trip_id IN (
      SELECT t.id FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE gm.user_id = auth.uid()
    )
    AND family_member_id IN (
      SELECT id FROM family_members WHERE owner_user_id = auth.uid()
    )
  );
