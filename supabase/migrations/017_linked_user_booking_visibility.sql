-- ============================================================
-- 017_linked_user_booking_visibility.sql
-- Allow a user to READ calendar entries from family members
-- who are linked to a real account (linked_user_id IS NOT NULL).
--
-- Rather than replacing existing policies, we ADD a new SELECT
-- policy on each table. PostgreSQL permissive policies use OR
-- logic — if any policy allows the row, it is visible.
--
-- All statements are guarded with DROP IF EXISTS so the migration
-- is safe to re-run.
-- ============================================================

-- ── booked_holidays ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'booked_holidays'
  ) THEN
    RAISE EXCEPTION 'Table booked_holidays does not exist. Run migration 006 first.';
  END IF;
END $$;

DROP POLICY IF EXISTS "linked_family_member_booked_holidays_select" ON booked_holidays;
CREATE POLICY "linked_family_member_booked_holidays_select"
  ON booked_holidays FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.owner_user_id        = auth.uid()
        AND fm.linked_user_id       = booked_holidays.owner_user_id
        AND booked_holidays.family_member_id IS NULL
    )
  );

-- ── away_periods ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'away_periods'
  ) THEN
    RAISE EXCEPTION 'Table away_periods does not exist. Run migration 016 first.';
  END IF;
END $$;

DROP POLICY IF EXISTS "linked_family_member_away_periods_select" ON away_periods;
CREATE POLICY "linked_family_member_away_periods_select"
  ON away_periods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.owner_user_id  = auth.uid()
        AND fm.linked_user_id = away_periods.owner_user_id
        AND away_periods.family_member_id IS NULL
    )
  );

-- ── calendar_events ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'calendar_events'
  ) THEN
    RAISE EXCEPTION 'Table calendar_events does not exist. Run migration 007 first.';
  END IF;
END $$;

DROP POLICY IF EXISTS "linked_family_member_calendar_events_select" ON calendar_events;
CREATE POLICY "linked_family_member_calendar_events_select"
  ON calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.owner_user_id  = auth.uid()
        AND fm.linked_user_id = calendar_events.owner_user_id
        AND calendar_events.family_member_id IS NULL
    )
  );
