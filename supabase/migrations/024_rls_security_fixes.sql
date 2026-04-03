-- Security fixes for RLS policies
-- 1. trip_suggestion_votes INSERT must verify the suggestion belongs to a trip the user is in
-- 2. trip_itinerary_items, group_availability, trip_photos: add WITH CHECK so INSERT/UPDATE
--    are properly guarded (USING alone only guards SELECT/DELETE in FOR ALL policies)

-- ── trip_suggestion_votes ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "trip_suggestion_votes_insert" ON trip_suggestion_votes;
CREATE POLICY "trip_suggestion_votes_insert" ON trip_suggestion_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trip_suggestions ts
      JOIN trips t ON t.id = ts.trip_id
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE ts.id = trip_suggestion_votes.suggestion_id
        AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trip_suggestion_votes_update" ON trip_suggestion_votes;
CREATE POLICY "trip_suggestion_votes_update" ON trip_suggestion_votes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── trip_itinerary_items ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Group members manage itinerary" ON trip_itinerary_items;
CREATE POLICY "Group members manage itinerary" ON trip_itinerary_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_itinerary_items.trip_id AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_itinerary_items.trip_id AND gm.user_id = auth.uid()
    )
  );

-- ── group_availability ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Group members manage availability" ON group_availability;
CREATE POLICY "Group members manage availability" ON group_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = group_availability.trip_id AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = group_availability.trip_id AND gm.user_id = auth.uid()
    )
  );

-- ── trip_photos ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Group members manage photos" ON trip_photos;
CREATE POLICY "Group members manage photos" ON trip_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_photos.trip_id AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_photos.trip_id AND gm.user_id = auth.uid()
    )
  );
