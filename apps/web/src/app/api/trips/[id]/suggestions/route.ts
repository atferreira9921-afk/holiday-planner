import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
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

  // Verify the authenticated user is a member of this trip's group
  const { data: membership } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", trip.group_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  // Build context for Claude
  const membersContext = groupMembers.map((m, i) => {
    const prefs = m.preferences;
    return `Member ${i + 1}: home=${m.home_country}/${m.home_city}, vacation_days_left=${m.vacation_days_remaining}, blocked=${m.blocked_dates.length} days, style=${prefs.travel_style}, budget=${prefs.budget_min_eur}-${prefs.budget_max_eur}EUR, interests=${(prefs.interests ?? []).join(",")||"general"}, avoid=${(prefs.avoid_destinations ?? []).join(",")||"none"}`;
  }).join("\n");

  const freeStaysContext = freeStays.length > 0
    ? `Free stays available: ${freeStays.map(f => `${f.destination_city}, ${f.destination_country}${f.host_name ? ` (host: ${f.host_name})` : ""}`).join("; ")}`
    : "No free stays available.";

  const prompt = `You are a travel planning AI. Generate 3 ranked trip destination suggestions based on this data.

Trip constraints:
- Duration: ${trip.desired_duration_days ?? "flexible"} days
- Window: ${trip.earliest_departure} to ${trip.latest_return}
- Budget per person: ${trip.budget_per_person_eur ?? "flexible"} EUR
- Destination hint: ${trip.destination_hint ?? "none"}
- Mode: ${trip.planning_mode ?? "days_first"}
${trip.destination_city ? `- Fixed destination: ${trip.destination_city}, ${trip.destination_country}` : ""}

Group members:
${membersContext}

${freeStaysContext}

Return ONLY a JSON array of 3 suggestions (no markdown):
[
  {
    "rank": 1,
    "destination_city": "City",
    "destination_country": "XX",
    "destination_iata": "XXX",
    "suggested_departure": "YYYY-MM-DD",
    "suggested_return": "YYYY-MM-DD",
    "total_days": <number>,
    "vacation_days_used": <number, exclude weekends and public holidays>,
    "overlap_score": <0.0-1.0, how well calendars align>,
    "estimated_flight_price_eur": <number or null>,
    "estimated_hotel_price_eur": <total for stay or null>,
    "estimated_total_price_eur": <per person total or null>,
    "reasoning": "2-3 sentence explanation of why this is a good choice",
    "highlights": ["highlight 1", "highlight 2", "highlight 3"],
    "trade_offs": ["trade-off 1"]
  }
]`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "[]";
    const suggestions: Record<string, unknown>[] = JSON.parse(
      raw.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "")
    );

    // Delete old suggestions for this trip, then insert new ones
    await db.from("trip_suggestions").delete().eq("trip_id", tripId);

    const now = new Date().toISOString();
    const rows = suggestions.map(s => ({
      trip_id: tripId,
      rank: s.rank,
      destination_city: s.destination_city,
      destination_country: s.destination_country,
      destination_iata: s.destination_iata ?? "",
      suggested_departure: s.suggested_departure,
      suggested_return: s.suggested_return,
      total_days: s.total_days,
      vacation_days_used: s.vacation_days_used,
      overlap_score: s.overlap_score,
      estimated_flight_price_eur: s.estimated_flight_price_eur ?? null,
      estimated_hotel_price_eur: s.estimated_hotel_price_eur ?? null,
      estimated_total_price_eur: s.estimated_total_price_eur ?? null,
      flight_data: null,
      hotel_data: null,
      reasoning: s.reasoning,
      highlights: s.highlights,
      trade_offs: s.trade_offs,
      ai_model_version: "claude-sonnet-4-6",
      created_at: now,
    }));

    await db.from("trip_suggestions").insert(rows);

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

    return NextResponse.json({ trip_id: tripId, suggestions: rows, generated_at: now });
  } catch (err) {
    console.error("AI suggestions error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Failed to generate suggestions. Please try again." },
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
