-- Per-user packing items: add owner + visibility
ALTER TABLE trip_packing_items
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;

-- Pre-departure checklist: store per-user checked state in DB (replacing localStorage)
CREATE TABLE IF NOT EXISTS trip_predeparture_checks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id      TEXT        NOT NULL,
  is_checked   BOOLEAN     NOT NULL DEFAULT false,
  is_shared    BOOLEAN     NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id, item_id)
);
