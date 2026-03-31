CREATE TABLE IF NOT EXISTS trip_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  name         TEXT NOT NULL,
  doc_type     TEXT NOT NULL DEFAULT 'other',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trip_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members manage documents" ON trip_documents
  USING (EXISTS (
    SELECT 1 FROM trips t JOIN group_members gm ON gm.group_id = t.group_id
    WHERE t.id = trip_documents.trip_id AND gm.user_id = auth.uid()
  ));
