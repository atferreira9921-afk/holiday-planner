import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import { createNotification } from "@/lib/notifications";
import type { MemberCalendar, UserPreferences } from "@holiday-planner/shared-types";

export const maxDuration = 60; // Vercel: allow up to 60s for AI generation

// Fail fast if the Anthropic key is missing — gives a clear error instead of a
// cryptic SDK throw buried in the stream.
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set — AI suggestions will not work");
}

// Helper to encode an SSE event
function sse(data: object) {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const body = await req.json().catch(() => ({})) as { userPrompt?: string | null };
  const userPrompt = body.userPrompt?.trim().slice(0, 500) || null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sse(data));

      try {
        // ── Auth ────────────────────────────────────────────────────────────
        send({ progress: 5, stage: "Authenticating…" });
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          send({ error: "Unauthorized" });
          controller.close();
          return;
        }

        const db = createServiceClient();

        // ── Trip + membership (parallel) ────────────────────────────────────
        send({ progress: 10, stage: "Loading trip…" });
        const [{ data: trip }, ] = await Promise.all([
          db.from("trips").select("*").eq("id", tripId).single(),
        ]);

        if (!trip) {
          send({ error: "Trip not found" });
          controller.close();
          return;
        }

        const { data: membership } = await db
          .from("group_members").select("user_id")
          .eq("group_id", trip.group_id).eq("user_id", user.id).maybeSingle();
        if (!membership) {
          send({ error: "Forbidden" });
          controller.close();
          return;
        }

        // ── Rate limiting ───────────────────────────────────────────────────
        const { data: rateLimitRows, count: suggestionCount } = await db
          .from("trip_suggestions")
          .select("created_at", { count: "exact" })
          .eq("trip_id", tripId)
          .order("created_at", { ascending: false })
          .limit(1);

        // Max 15 suggestions per trip (5 generations × 3)
        if ((suggestionCount ?? 0) >= 15) {
          send({ error: "This trip has reached the maximum of 15 suggestions. Delete some before generating more." });
          controller.close();
          return;
        }

        // 5-minute cooldown between generations per trip
        if (rateLimitRows?.[0]?.created_at) {
          const lastGenMs = new Date(rateLimitRows[0].created_at).getTime();
          const cooldownMs = 5 * 60 * 1000;
          const waitSecs = Math.ceil((cooldownMs - (Date.now() - lastGenMs)) / 1000);
          if (waitSecs > 0) {
            send({ error: `Please wait ${waitSecs}s before generating more suggestions.` });
            controller.close();
            return;
          }
        }

        // ── Group members ───────────────────────────────────────────────────
        send({ progress: 20, stage: "Loading group calendars…" });
        const { data: members } = await db
          .from("group_members").select("user_id").eq("group_id", trip.group_id);

        if (!members?.length) {
          send({ error: "No group members found" });
          controller.close();
          return;
        }

        const memberUserIds = members.map(m => m.user_id);

        // ── Preferences + bookings + free stays (all parallel) ──────────────
        send({ progress: 30, stage: "Fetching calendars and preferences…" });
        const [{ data: allPrefs }, { data: allBookings }, { data: rawFreeStays }, { data: existingSuggestions }] =
          await Promise.all([
            db.from("user_preferences").select("*").in("user_id", memberUserIds),
            db.from("booked_holidays")
              .select("owner_user_id, start_date, end_date")
              .in("owner_user_id", memberUserIds)
              .is("family_member_id", null)
              .lte("start_date", trip.latest_return)
              .gte("end_date", trip.earliest_departure),
            db.from("free_stays")
              .select("destination_city, destination_country, host_name, owner_user_id")
              .in("owner_user_id", memberUserIds)
              .eq("is_active", true),
            db.from("trip_suggestions")
              .select("destination_city, destination_country, rank")
              .eq("trip_id", tripId),
          ]);

        // ── Map prefs by user_id for O(1) lookup ───────────────────────────
        const prefsMap = new Map((allPrefs ?? []).map(p => [p.user_id, p]));
        const membersWithPrefs = members.map(m => ({ user_id: m.user_id, preferences: prefsMap.get(m.user_id) ?? null }));

        // ── Fetch public holidays for all member countries ──────────────────
        const tripYear = new Date(trip.earliest_departure + "T00:00:00").getFullYear();
        const memberCountries = [...new Set(membersWithPrefs.map(m => m.preferences?.home_country ?? "PT"))];
        const { data: allPublicHolidays } = await db
          .from("public_holidays")
          .select("country_code, date, name")
          .in("country_code", memberCountries)
          .eq("year", tripYear)
          .gte("date", trip.earliest_departure)
          .lte("date", trip.latest_return);

        // ── Build calendar objects ──────────────────────────────────────────
        const groupMembers: MemberCalendar[] = membersWithPrefs.map((m) => {
          const prefs = m.preferences;
          const blockedDates: string[] = [];

          if (prefs?.on_parental_leave && prefs?.parental_leave_end_date) {
            let d = new Date(trip.earliest_departure + "T00:00:00");
            const end = new Date(prefs.parental_leave_end_date + "T00:00:00");
            while (d <= end) {
              blockedDates.push(d.toISOString().slice(0, 10));
              d.setDate(d.getDate() + 1);
            }
          }

          const memberBookings = (allBookings ?? []).filter(b => b.owner_user_id === m.user_id);
          let usedVacationDays = 0;
          for (const booking of memberBookings) {
            let d = new Date(booking.start_date + "T00:00:00");
            const end = new Date(booking.end_date + "T00:00:00");
            while (d <= end) {
              const iso = d.toISOString().slice(0, 10);
              blockedDates.push(iso);
              if (d.getFullYear() === tripYear && d.getDay() !== 0 && d.getDay() !== 6) {
                usedVacationDays++;
              }
              d.setDate(d.getDate() + 1);
            }
          }

          const memberCountry = prefs?.home_country ?? "PT";
          const memberHolidays = (allPublicHolidays ?? [])
            .filter(h => h.country_code === memberCountry)
            .map(h => ({
              country_code: h.country_code,
              year: tripYear,
              date: h.date,
              name: h.name,
              local_name: h.name,
              is_fixed: false,
            }));

          return {
            user_id: m.user_id,
            home_country: memberCountry,
            home_city: prefs?.home_city ?? "LIS",
            vacation_days_remaining: Math.max(0, (prefs?.vacation_days_per_year ?? 22) - usedVacationDays),
            blocked_dates: [...new Set(blockedDates)],
            public_holidays: memberHolidays,
            preferences: prefs ?? defaultPreferences(),
          };
        });

        const freeStays = (rawFreeStays ?? []).map(fs => ({
          destination_city: fs.destination_city,
          destination_country: fs.destination_country,
          host_name: fs.host_name ?? null,
        }));

        // ── Build prompt ────────────────────────────────────────────────────
        send({ progress: 40, stage: "Claude is thinking… (this takes ~15s)" });

        const membersContext = groupMembers.map((m, i) => {
          const p = m.preferences;
          const holidaysStr = m.public_holidays.length > 0
            ? `, public_holidays=[${m.public_holidays.map(h => `${h.date}:${h.name}`).join(",")}]`
            : ", public_holidays=none";
          return `Member ${i + 1}: home=${m.home_country}/${m.home_city}, vacation_days_left=${m.vacation_days_remaining}, blocked=${m.blocked_dates.length} days, style=${p.travel_style}, budget=${p.budget_min_eur}-${p.budget_max_eur}EUR, interests=${(p.interests ?? []).join(",") || "general"}, avoid=${(p.avoid_destinations ?? []).join(",") || "none"}${holidaysStr}`;
        }).join("\n");

        const freeStaysCtx = freeStays.length > 0
          ? `Free stays: ${freeStays.map(f => `${f.destination_city}, ${f.destination_country}${f.host_name ? ` (${f.host_name})` : ""}`).join("; ")}`
          : "No free stays.";

        const alreadySuggested = (existingSuggestions ?? []);
        const alreadySuggestedCtx = alreadySuggested.length > 0
          ? `Already suggested (do NOT repeat these): ${alreadySuggested.map(s => `${s.destination_city}, ${s.destination_country}`).join("; ")}`
          : "";

        const prompt = `You are a travel planning AI. Generate 3 ranked trip destination suggestions.

Trip constraints:
- Duration: ${trip.desired_duration_days ?? "flexible"} days
- Window: ${trip.earliest_departure} to ${trip.latest_return}
- Budget per person: ${trip.budget_per_person_eur ?? "flexible"} EUR
- Destination hint: ${trip.destination_hint ?? "none"}
- Mode: ${trip.planning_mode ?? "days_first"}
${trip.destination_city ? `- Fixed: ${trip.destination_city}, ${trip.destination_country}` : ""}

Group:
${membersContext}

${freeStaysCtx}
${alreadySuggestedCtx ? `\n${alreadySuggestedCtx}\n` : ""}${userPrompt ? `\nAdditional preferences from the group: ${userPrompt}\n` : ""}
For each suggestion, also decide whether renting a car is recommended (e.g. rural areas, islands, destinations with poor public transport). Set suggest_car_rental to true/false, provide a brief car_rental_reasoning (1 sentence), and estimate estimated_car_rental_price_eur for the trip duration if applicable (null otherwise).

Return ONLY a JSON array of 3 suggestions (no markdown, no explanation):
[{"rank":1,"destination_city":"City","destination_country":"XX","destination_iata":"XXX","suggested_departure":"YYYY-MM-DD","suggested_return":"YYYY-MM-DD","total_days":7,"vacation_days_used":5,"overlap_score":0.9,"estimated_flight_price_eur":150,"estimated_hotel_price_eur":400,"estimated_total_price_eur":600,"reasoning":"2-3 sentences why","highlights":["h1","h2","h3"],"trade_offs":["t1"],"suggest_car_rental":false,"car_rental_reasoning":"Good public transport, no car needed.","estimated_car_rental_price_eur":null}]`;

        // ── Call Claude (non-streaming for proxy compatibility) ─────────────
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        send({ progress: 82, stage: "Processing suggestions…" });

        const rawText = message.content[0].type === "text" ? message.content[0].text : "";
        const raw = rawText.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");

        let parsed: Record<string, unknown>[];
        try {
          parsed = JSON.parse(raw);
        } catch {
          send({ error: `Claude returned invalid JSON: ${raw.slice(0, 200)}` });
          controller.close();
          return;
        }

        send({ progress: 90, stage: "Saving to database…" });

        // Deduplicate: skip any city+country already in the DB for this trip
        const existingKeys = new Set(
          (existingSuggestions ?? []).map(s =>
            `${s.destination_city.toLowerCase()}|${s.destination_country.toLowerCase()}`
          )
        );
        const deduped = parsed.filter(s =>
          !existingKeys.has(`${String(s.destination_city ?? "").toLowerCase()}|${String(s.destination_country ?? "").toLowerCase()}`)
        );

        if (deduped.length === 0) {
          send({ error: "All generated suggestions were duplicates. Try again for fresh ideas." });
          controller.close();
          return;
        }

        // Find the current max rank so new suggestions are appended, not replacing old ones
        const rankOffset = alreadySuggested.length > 0
          ? Math.max(...alreadySuggested.map(s => (s as { rank: number }).rank))
          : 0;

        const now = new Date().toISOString();
        const rows = deduped.map(s => ({
          trip_id: tripId,
          rank: rankOffset + (Number(s.rank) || 1),
          destination_city: String(s.destination_city ?? ""),
          destination_country: String(s.destination_country ?? "").slice(0, 2),
          destination_iata: s.destination_iata && String(s.destination_iata).length <= 3 ? String(s.destination_iata) : null,
          suggested_departure: String(s.suggested_departure ?? ""),
          suggested_return: String(s.suggested_return ?? ""),
          total_days: Number(s.total_days) || 7,
          vacation_days_used: Number(s.vacation_days_used) || 0,
          overlap_score: Math.min(1, Math.max(0, Number(s.overlap_score) || 0)),
          estimated_flight_price_eur: s.estimated_flight_price_eur ? Number(s.estimated_flight_price_eur) : null,
          estimated_hotel_price_eur: s.estimated_hotel_price_eur ? Number(s.estimated_hotel_price_eur) : null,
          estimated_total_price_eur: s.estimated_total_price_eur ? Number(s.estimated_total_price_eur) : null,
          flight_data: null,
          hotel_data: null,
          reasoning: String(s.reasoning ?? ""),
          highlights: Array.isArray(s.highlights) ? s.highlights.map(String) : [],
          trade_offs: Array.isArray(s.trade_offs) ? s.trade_offs.map(String) : [],
          suggest_car_rental: s.suggest_car_rental === true,
          car_rental_reasoning: s.car_rental_reasoning ? String(s.car_rental_reasoning) : null,
          estimated_car_rental_price_eur: s.estimated_car_rental_price_eur ? Number(s.estimated_car_rental_price_eur) : null,
          ai_model_version: "claude-sonnet-4-6",
          created_at: now,
        }));

        const { error: insertError } = await db.from("trip_suggestions").insert(rows);
        if (insertError) {
          send({ error: `Failed to save suggestions: ${insertError.message}` });
          controller.close();
          return;
        }

        send({ progress: 95, stage: "Notifying group members…" });
        await Promise.all(
          memberUserIds.map(uid =>
            createNotification(db, uid, "suggestion_ready",
              `Trip suggestions ready: ${trip.title}`,
              "The AI has generated travel suggestions for your trip. Vote on your favourites!",
              `/trips/${tripId}`)
          )
        );

        send({ progress: 100, stage: "Done!" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("AI suggestions error:", msg);
        // Surface the real error in dev / staging so it's visible in the UI;
        // in production keep it brief but still actionable.
        const userMsg = process.env.NODE_ENV === "production"
          ? `Failed to generate suggestions (${msg.slice(0, 120)})`
          : `Error: ${msg}`;
        send({ error: userMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
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
    birthday_is_vacation_day: false,
    home_region: null,
    home_city_name: null,
    updated_at: new Date().toISOString(),
  };
}
