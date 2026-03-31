-- ── Packing list per trip ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_packing_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  item        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other',
  packed      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trip_packing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can manage packing items"
  ON trip_packing_items
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_packing_items.trip_id
        AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = trip_packing_items.trip_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE INDEX idx_trip_packing_trip ON trip_packing_items (trip_id);
