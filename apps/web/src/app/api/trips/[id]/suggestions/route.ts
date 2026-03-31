import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { aiApi } from "@/lib/api/fastapi-client";
import { createNotification } from "@/lib/notifications";
import type { MemberCalendar, UserPreferences } from "@holiday-planner/shared-types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  // Auth check with regular client (respects RLS)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use service client for all DB reads (bypasses RLS safely on server)
  const db = await createServiceClient();

  // Load trip
  const { data: trip } = await db
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  // Load group members + their preferences
  const { data: members } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", trip.group_id);

  if (!members?.length) {
    return NextResponse.json({ error: "No group members found" }, { status: 400 });
  }

  // Load preferences for each member separately
  const membersWithPrefs = await Promise.all(
    members.map(async (m) => {
      const { data: prefs } = await db
        .from("user_preferences")
        .select("*")
        .eq("user_id", m.user_id)
        .single();
      return { user_id: m.user_id, preferences: prefs };
    })
  );

  // Load booked holidays for all members at once
  const memberUserIds = members.map(m => m.user_id);
  const { data: allBookings } = await db
    .from("booked_holidays")
    .select("owner_user_id, start_date, end_date")
    .in("owner_user_id", memberUserIds)
    .is("family_member_id", null)
    .lte("start_date", trip.latest_return)
    .gte("end_date", trip.earliest_departure);

  // Build member calendar objects
  const groupMembers: MemberCalendar[] = membersWithPrefs.map((m) => {
    const prefs = m.preferences;
    const blockedDates: string[] = [];

    // Block parental leave dates
    if (prefs?.on_parental_leave && prefs?.parental_leave_end_date) {
      let d = new Date(trip.earliest_departure + "T00:00:00");
      const end = new Date(prefs.parental_leave_end_date + "T00:00:00");
      while (d <= end) {
        blockedDates.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }
    }

    // Block already-booked holiday dates + count used vacation days
    const memberBookings = (allBookings ?? []).filter(b => b.owner_user_id === m.user_id);
    let usedVacationDays = 0;
    const tripYear = new Date(trip.earliest_departure + "T00:00:00").getFullYear();

    for (const booking of memberBookings) {
      let d = new Date(booking.start_date + "T00:00:00");
      const end = new Date(booking.end_date + "T00:00:00");
      while (d <= end) {
        const iso = d.toISOString().slice(0, 10);
        blockedDates.push(iso);
        // Count working days as used vacation (rough estimate, ignores public holidays)
        if (d.getFullYear() === tripYear && d.getDay() !== 0 && d.getDay() !== 6) {
          usedVacationDays++;
        }
        d.setDate(d.getDate() + 1);
      }
    }

    const totalVacationDays = prefs?.vacation_days_per_year ?? 22;
    const vacationDaysRemaining = Math.max(0, totalVacationDays - usedVacationDays);

    return {
      user_id: m.user_id,
      home_country: prefs?.home_country ?? "PT",
      home_city: prefs?.home_city ?? "LIS",
      vacation_days_remaining: vacationDaysRemaining,
      blocked_dates: [...new Set(blockedDates)], // deduplicate
      public_holidays: [],
      preferences: prefs ?? defaultPreferences(),
    };
  });

  // Load free stays for all members (hotel cost = €0 at these destinations)
  const { data: rawFreeStays } = await db
    .from("free_stays")
    .select("destination_city, destination_country, host_name, owner_user_id")
    .in("owner_user_id", memberUserIds);

  const freeStays = (rawFreeStays ?? []).map(fs => ({
    destination_city: fs.destination_city,
    destination_country: fs.destination_country,
    host_name: fs.host_name ?? null,
  }));

  // Call FastAPI
  try {
    const result = await aiApi.generateSuggestions({
      trip_id: tripId,
      group_members: groupMembers,
      trip_constraints: {
        desired_duration_days: trip.desired_duration_days,
        earliest_departure: trip.earliest_departure,
        latest_return: trip.latest_return,
        budget_per_person_eur: trip.budget_per_person_eur,
        destination_hint: trip.destination_hint,
        planning_mode: trip.planning_mode ?? "days_first",
        destination_city: trip.destination_city ?? null,
        destination_country: trip.destination_country ?? null,
      },
      free_stays: freeStays,
    });

    // Notify all group members that suggestions are ready
    await Promise.all(
      memberUserIds.map(uid =>
        createNotification(
          db,
          uid,
          "suggestion_ready",
          `Trip suggestions ready: ${trip.title}`,
          "The AI has generated travel suggestions for your trip. Vote on your favourites!",
          `/trips/${tripId}`
        )
      )
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("FastAPI error:", message);
    return NextResponse.json(
      { error: `FastAPI error: ${message}` },
      { status: 502 }
    );
  }
}

function defaultPreferences(): UserPreferences {
  return {
    id: "",
    user_id: "",
    home_country: "PT",
    home_city: "LIS",
    vacation_days_per_year: 22,
    preferred_countries: [],
    travel_style: "mid-range",
    budget_min_eur: 300,
    budget_max_eur: 2000,
    accommodation_types: ["hotel"],
    interests: [],
    avoid_destinations: [],
    min_trip_days: 4,
    max_trip_days: 14,
    advance_booking_weeks: 8,
    gender: "prefer_not_to_say",
    on_parental_leave: false,
    parental_leave_end_date: null,
    birthday: null,
    home_region: null,
    home_city_name: null,
    updated_at: new Date().toISOString(),
  };
}
