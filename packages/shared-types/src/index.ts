// ─── Users & Auth ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string; // UUID, matches Supabase auth.users.id
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export interface UserPreferences {
  id: string;
  user_id: string;
  home_country: string; // ISO 3166-1 alpha-2, e.g. "PT"
  home_city: string; // IATA code, e.g. "LIS"
  vacation_days_per_year: number;
  preferred_countries: string[]; // countries to watch for public holidays
  travel_style: TravelStyle;
  budget_min_eur: number;
  budget_max_eur: number;
  accommodation_types: AccommodationType[];
  interests: string[]; // ["beach", "mountains", "culture", "food", "nightlife"]
  avoid_destinations: string[];
  min_trip_days: number;
  max_trip_days: number;
  advance_booking_weeks: number;
  // Personal details
  gender: Gender;
  birthday: string | null; // ISO date, year-agnostic stored as full date
  birthday_is_vacation_day: boolean;
  on_parental_leave: boolean;
  parental_leave_end_date: string | null; // ISO date
  // Residential location (may differ from airport city)
  home_region: string | null; // ISO 3166-2, e.g. "PT-06" for Coimbra
  home_city_name: string | null; // human-readable city name, e.g. "Coimbra"
  // Avatar customization
  avatar_config: { hair: number; glasses: number; face: number; shirt: number; bottom: number; clothesColor: number } | null;
  updated_at: string;
}

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export type TravelStyle = "budget" | "mid-range" | "luxury";
export type AccommodationType = "hotel" | "airbnb" | "hostel" | "resort";

// ─── Travel Groups ─────────────────────────────────────────────────────────────

export interface TravelGroup {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  // Joined from user_profiles
  profile?: UserProfile;
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  group_id: string;
  title: string;
  status: TripStatus;
  planning_mode: PlanningMode;
  desired_duration_days: number;
  earliest_departure: string; // ISO date
  latest_return: string; // ISO date
  budget_per_person_eur: number | null;
  destination_hint: string | null;
  // Destination-first mode
  destination_city: string | null;
  destination_country: string | null; // ISO alpha-2
  selected_suggestion_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type PlanningMode = "days_first" | "destination_first";

export type TripStatus =
  | "planning"
  | "suggested"
  | "booked"
  | "completed"
  | "cancelled";

// ─── AI Suggestions ───────────────────────────────────────────────────────────

export interface TripSuggestion {
  id: string;
  trip_id: string;
  rank: number;
  destination_city: string;
  destination_country: string;
  destination_iata: string;
  suggested_departure: string; // ISO date
  suggested_return: string; // ISO date
  total_days: number;
  vacation_days_used: number; // actual vacation days consumed (public holidays don't count)
  overlap_score: number; // 0-1, how well all members' calendars align
  estimated_flight_price_eur: number | null;
  estimated_hotel_price_eur: number | null;
  estimated_total_price_eur: number | null;
  flight_data: FlightOption | null;
  hotel_data: HotelOption | null;
  reasoning: string; // Claude's explanation
  highlights: string[]; // e.g. ["Uses 3 public holidays", "Cheapest window found"]
  trade_offs: string[]; // e.g. ["Peak tourist season"]
  ai_model_version: string;
  created_at: string;
}

export interface FlightOption {
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  return_date: string;
  price_eur: number;
  airline: string;
  stops: number;
  booking_url: string | null;
  fetched_at: string;
}

export interface HotelOption {
  name: string;
  stars: number;
  price_per_night_eur: number;
  total_price_eur: number;
  rating: number;
  review_count: number;
  booking_url: string | null;
  fetched_at: string;
}

// ─── Feedback & Learning ──────────────────────────────────────────────────────

export interface SuggestionFeedback {
  id: string;
  suggestion_id: string;
  user_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  liked_aspects: FeedbackAspect[];
  disliked_aspects: FeedbackAspect[];
  free_text: string | null;
  created_at: string;
}

export type FeedbackAspect =
  | "destination"
  | "timing"
  | "price"
  | "hotel"
  | "flight"
  | "duration"
  | "weather";

// ─── Voting ───────────────────────────────────────────────────────────────────

export interface TripSuggestionVote {
  id: string;
  suggestion_id: string;
  user_id: string;
  vote: "up" | "down";
  created_at: string;
}

// ─── Free Stays ───────────────────────────────────────────────────────────────

export interface FreeStay {
  id: string;
  owner_user_id: string;
  destination_city: string;
  destination_country: string; // ISO2
  host_name: string | null; // e.g. "Cousin João"
  notes: string | null;
  created_at: string;
}

// ─── Destination Wishlist ─────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  user_id: string;
  destination_city: string;
  destination_country: string; // ISO2
  notes: string | null;
  priority: 1 | 2 | 3 | 4 | 5;
  created_at: string;
}

// ─── Away Periods ─────────────────────────────────────────────────────────────

export interface AwayPeriod {
  id: string;
  owner_user_id: string;
  family_member_id: string | null;
  title: string;
  start_date: string;
  end_date: string;
  reason: "work" | "personal" | "other";
  created_at: string;
}

// ─── Group Invites ────────────────────────────────────────────────────────────

export interface GroupInvite {
  id: string;
  group_id: string;
  invited_by: string;
  invited_email?: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
}

// ─── Trip Expenses ────────────────────────────────────────────────────────────

export interface TripExpense {
  id: string;
  trip_id: string;
  paid_by: string; // user_id
  amount_eur: number;
  description: string;
  category: "flight" | "hotel" | "food" | "transport" | "activity" | "other";
  split_with: string[]; // array of user_ids
  created_at: string;
}

// ─── Booked Holidays ──────────────────────────────────────────────────────────

export interface BookedHoliday {
  id: string;
  owner_user_id: string;
  family_member_id: string | null;
  title: string;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  created_at: string;
}

// ─── Family Members ───────────────────────────────────────────────────────────

export interface FamilyMember {
  id: string;
  owner_user_id: string;
  display_name: string;
  home_country: string;
  home_city: string;
  color: string;
  linked_user_id: string | null;
  created_at: string;
  // Preference profile
  vacation_days_per_year: number;
  gender: Gender;
  birthday: string | null;
  on_parental_leave: boolean;
  parental_leave_end_date: string | null;
  travel_style: TravelStyle;
  budget_min_eur: number;
  budget_max_eur: number;
  interests: string[];
  avoid_destinations: string[];
  preferred_countries: string[];
  // Residential location (may differ from airport city)
  home_region: string | null; // ISO 3166-2, e.g. "PT-06" for Coimbra
  home_city_name: string | null; // human-readable city name, e.g. "Coimbra"
  // Avatar customization
  avatar_config: { hair: number; glasses: number; face: number; shirt: number; bottom: number } | null;
}

// ─── Public Holidays ──────────────────────────────────────────────────────────

export interface PublicHoliday {
  country_code: string;
  year: number;
  date: string; // ISO date
  name: string;
  local_name: string;
  is_fixed: boolean;
}

// ─── Calendar (computed) ──────────────────────────────────────────────────────

export interface CalendarWindow {
  start_date: string;
  end_date: string;
  total_days: number;
  vacation_days_used: number;
  public_holiday_bridges: PublicHoliday[];
  overlap_score: number; // 1.0 = all members free
}

export interface MemberCalendar {
  user_id: string;
  home_country: string;
  home_city: string;
  vacation_days_remaining: number;
  blocked_dates: string[];
  public_holidays: PublicHoliday[];
  preferences: UserPreferences;
}

// ─── API Request / Response shapes ───────────────────────────────────────────

export interface GenerateSuggestionsRequest {
  trip_id: string;
  group_members: MemberCalendar[];
  trip_constraints: {
    desired_duration_days: number;
    earliest_departure: string;
    latest_return: string;
    budget_per_person_eur: number | null;
    destination_hint: string | null;
    planning_mode: PlanningMode;
    destination_city: string | null;
    destination_country: string | null;
  };
  free_stays: { destination_city: string; destination_country: string; host_name: string | null }[];
}

export interface GenerateSuggestionsResponse {
  trip_id: string;
  suggestions: TripSuggestion[];
  generated_at: string;
}

export interface SubmitFeedbackRequest {
  suggestion_id: string;
  // user_id is passed via X-User-Id header by the Next.js backend, not in the body
  rating: 1 | 2 | 3 | 4 | 5;
  liked_aspects: FeedbackAspect[];
  disliked_aspects: FeedbackAspect[];
  free_text?: string;
}
