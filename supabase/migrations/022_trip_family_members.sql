-- Trip ↔ Family Member association
-- Tracks which family members are going on each trip

CREATE TABLE IF NOT EXISTS trip_family_members (
  trip_id           UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  family_member_id  UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  added_at          TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (trip_id, family_member_id)
);

ALTER TABLE trip_family_members ENABLE ROW LEVEL SECURITY;

-- Users can manage trip_family_members for trips they own (via group membership)
CREATE POLICY "trip_family_members_select" ON trip_family_members
  FOR SELECT USING (
    trip_id IN (
      SELECT t.id FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_family_members_insert" ON trip_family_members
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT t.id FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_family_members_delete" ON trip_family_members
  FOR DELETE USING (
    trip_id IN (
      SELECT t.id FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE gm.user_id = auth.uid()
    )
  );
