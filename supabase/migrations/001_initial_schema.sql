-- ─────────────────────────────────────────────────────────────────────────────
-- Holiday Planner — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for preference embeddings

-- ─── User Profiles ────────────────────────────────────────────────────────────
-- Mirrors Supabase auth.users; auto-populated via trigger below
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── User Preferences ─────────────────────────────────────────────────────────
CREATE TABLE user_preferences (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  home_country            CHAR(2) NOT NULL DEFAULT 'PT',
  home_city               TEXT NOT NULL DEFAULT 'LIS',
  vacation_days_per_year  INT NOT NULL DEFAULT 22,
  preferred_countries     TEXT[] DEFAULT '{}',
  travel_style            TEXT NOT NULL DEFAULT 'mid-range'
                            CHECK (travel_style IN ('budget', 'mid-range', 'luxury')),
  budget_min_eur          INT NOT NULL DEFAULT 300,
  budget_max_eur          INT NOT NULL DEFAULT 2000,
  accommodation_types     TEXT[] DEFAULT '{hotel}',
  interests               TEXT[] DEFAULT '{}',
  avoid_destinations      TEXT[] DEFAULT '{}',
  min_trip_days           INT NOT NULL DEFAULT 4,
  max_trip_days           INT NOT NULL DEFAULT 14,
  advance_booking_weeks   INT NOT NULL DEFAULT 8,
  -- pgvector: 1536-dim embedding of user's travel taste (updated on each feedback)
  preference_embedding    VECTOR(1536),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ─── Travel Groups ────────────────────────────────────────────────────────────
CREATE TABLE travel_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES user_profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
  group_id    UUID NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('owner', 'member')),
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_invites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  invited_email   TEXT NOT NULL,
  invited_by      UUID NOT NULL REFERENCES user_profiles(id),
  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Trips ────────────────────────────────────────────────────────────────────
CREATE TABLE trips (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id                UUID NOT NULL REFERENCES travel_groups(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'planning'
                            CHECK (status IN ('planning', 'suggested', 'booked', 'completed', 'cancelled')),
  desired_duration_days   INT NOT NULL,
  earliest_departure      DATE NOT NULL,
  latest_return           DATE NOT NULL,
  budget_per_person_eur   INT,
  destination_hint        TEXT,
  selected_suggestion_id  UUID,  -- FK added after trip_suggestions table exists
  created_by              UUID NOT NULL REFERENCES user_profiles(id),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ─── Public Holidays Cache ────────────────────────────────────────────────────
-- Cached from Nager.Date API — refreshed yearly
CREATE TABLE public_holidays (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code  CHAR(2) NOT NULL,
  year          INT NOT NULL,
  date          DATE NOT NULL,
  name          TEXT NOT NULL,
  local_name    TEXT NOT NULL,
  is_fixed      BOOLEAN NOT NULL DEFAULT false,
  fetched_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(country_code, date, name)
);
CREATE INDEX idx_holidays_country_year ON public_holidays(country_code, year);
CREATE INDEX idx_holidays_date ON public_holidays(date);

-- ─── Trip Suggestions (AI output) ────────────────────────────────────────────
CREATE TABLE trip_suggestions (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id                     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  rank                        INT NOT NULL DEFAULT 1,
  destination_city            TEXT NOT NULL,
  destination_country         CHAR(2) NOT NULL,
  destination_iata            CHAR(3),
  suggested_departure         DATE NOT NULL,
  suggested_return            DATE NOT NULL,
  total_days                  INT NOT NULL,
  vacation_days_used          INT NOT NULL DEFAULT 0,
  overlap_score               NUMERIC(3, 2) NOT NULL DEFAULT 0
                                CHECK (overlap_score BETWEEN 0 AND 1),
  estimated_flight_price_eur  NUMERIC(10, 2),
  estimated_hotel_price_eur   NUMERIC(10, 2),
  estimated_total_price_eur   NUMERIC(10, 2),
  flight_data                 JSONB,
  hotel_data                  JSONB,
  reasoning                   TEXT NOT NULL,
  highlights                  TEXT[] DEFAULT '{}',
  trade_offs                  TEXT[] DEFAULT '{}',
  ai_model_version            TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  created_at                  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_suggestions_trip ON trip_suggestions(trip_id, rank);

-- Add deferred FK from trips → trip_suggestions
ALTER TABLE trips
  ADD CONSTRAINT fk_selected_suggestion
  FOREIGN KEY (selected_suggestion_id)
  REFERENCES trip_suggestions(id)
  DEFERRABLE INITIALLY DEFERRED;

-- ─── Suggestion Feedback ──────────────────────────────────────────────────────
CREATE TABLE suggestion_feedback (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id    UUID NOT NULL REFERENCES trip_suggestions(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES user_profiles(id),
  rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  liked_aspects    TEXT[] DEFAULT '{}',
  disliked_aspects TEXT[] DEFAULT '{}',
  free_text        TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(suggestion_id, user_id)
);

-- ─── Indexes for performance ──────────────────────────────────────────────────
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_trips_group ON trips(group_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_feedback_suggestion ON suggestion_feedback(suggestion_id);

-- pgvector index for fast similarity search on preference embeddings
CREATE INDEX idx_preference_embedding ON user_preferences
  USING ivfflat (preference_embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─── Triggers ─────────────────────────────────────────────────────────────────

-- Auto-create user_profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
