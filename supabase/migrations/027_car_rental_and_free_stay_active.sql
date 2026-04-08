-- ─────────────────────────────────────────────────────────────────────────────
-- Holiday Planner — Car rental suggestions + free stay active/inactive toggle
-- ─────────────────────────────────────────────────────────────────────────────

-- ── free_stays: active/inactive toggle ────────────────────────────────────────
ALTER TABLE free_stays
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ── trip_suggestions: car rental fields ───────────────────────────────────────
ALTER TABLE trip_suggestions
  ADD COLUMN IF NOT EXISTS suggest_car_rental boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS car_rental_reasoning text,
  ADD COLUMN IF NOT EXISTS estimated_car_rental_price_eur numeric(10, 2);
