import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import { createNotification } from "@/lib/notifications";
import type { MemberCalendar, UserPreferences } from "@holiday-planner/shared-types";

// Helper to encode an SSE event
function sse(data: object) {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

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

        const db = await createServiceClient();

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
        const [membersWithPrefs, { data: allBookings }, { data: rawFreeStays }] =
          await Promise.all([
            Promise.all(
              members.map(async (m) => {
                const { data: prefs } = await db
                  .from("user_preferences").select("*").eq("user_id", m.user_id).single();
                return { user_id: m.user_id, preferences: prefs };
              })
            ),
            db.from("booked_holidays")
              .select("owner_user_id, start_date, end_date")
              .in("owner_user_id", memberUserIds)
              .is("family_member_id", null)
              .lte("start_date", trip.latest_return)
              .gte("end_date", trip.earliest_departure),
            db.from("free_stays")
              .select("destination_city, destination_country, host_name, owner_user_id")
              .in("owner_user_id", memberUserIds),
          ]);

        // ── Build calendar objects ──────────────────────────────────────────
        const tripYear = new Date(trip.earliest_departure + "T00:00:00").getFullYear();

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

          return {
            user_id: m.user_id,
            home_country: prefs?.home_country ?? "PT",
            home_city: prefs?.home_city ?? "LIS",
            vacation_days_remaining: Math.max(0, (prefs?.vacation_days_per_year ?? 22) - usedVacationDays),
            blocked_dates: [...new Set(blockedDates)],
            public_holidays: [],
            preferences: prefs ?? defaultPreferences(),
          };
        });

        const freeStays = (rawFreeStays ?? []).map(fs => ({
          destination_city: fs.destination_city,
          destination_country: fs.destination_country,
          host_name: fs.host_name ?? null,
        }));

        // ── Build prompt ────────────────────────────────────────────────────
        send({ progress: 40, stage: "Asking Claude for suggestions…" });

        const membersContext = groupMembers.map((m, i) => {
          const p = m.preferences;
          return `Member ${i + 1}: home=${m.home_country}/${m.home_city}, vacation_days_left=${m.vacation_days_remaining}, blocked=${m.blocked_dates.length} days, style=${p.travel_style}, budget=${p.budget_min_eur}-${p.budget_max_eur}EUR, interests=${(p.interests ?? []).join(",") || "general"}, avoid=${(p.avoid_destinations ?? []).join(",") || "none"}`;
        }).join("\n");

        const freeStaysCtx = freeStays.length > 0
          ? `Free stays: ${freeStays.map(f => `${f.destination_city}, ${f.destination_country}${f.host_name ? ` (${f.host_name})` : ""}`).join("; ")}`
          : "No free stays.";

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

Return ONLY a JSON array of 3 suggestions (no markdown, no explanation):
[{"rank":1,"destination_city":"City","destination_country":"XX","destination_iata":"XXX","suggested_departure":"YYYY-MM-DD","suggested_return":"YYYY-MM-DD","total_days":7,"vacation_days_used":5,"overlap_score":0.9,"estimated_flight_price_eur":150,"estimated_hotel_price_eur":400,"estimated_total_price_eur":600,"reasoning":"2-3 sentences why","highlights":["h1","h2","h3"],"trade_offs":["t1"]}]`;

        // ── Stream Claude response ──────────────────────────────────────────
        let accumulated = "";
        const claudeStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        // Estimate ~800 tokens for the response; map to 40-80% progress range
        let inputTokensSeen = 0;
        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            accumulated += event.delta.text;
            inputTokensSeen += event.delta.text.length;
            // Rough: 800 chars ≈ full response; clamp to 80%
            const claudeProgress = Math.min(40 + Math.floor((inputTokensSeen / 800) * 40), 80);
            send({ progress: claudeProgress, stage: "Claude is writing suggestions…" });
          }
        }

        // ── Parse + save ────────────────────────────────────────────────────
        send({ progress: 85, stage: "Processing suggestions…" });

        const raw = accumulated.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
        const suggestions: Record<string, unknown>[] = JSON.parse(raw);

        send({ progress: 90, stage: "Saving to database…" });

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
        console.error("AI suggestions error:", err instanceof Error ? err.message : String(err));
        send({ error: "Failed to generate suggestions. Please try again." });
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
    home_region: null,
    home_city_name: null,
    updated_at: new Date().toISOString(),
  };
}
