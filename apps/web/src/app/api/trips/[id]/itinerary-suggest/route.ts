import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import { checkAndConsumeAiLimit } from "@/lib/ai-rate-limit";
import { isAiEnabled } from "@/lib/config";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAiEnabled) return NextResponse.json({ error: "AI features are disabled." }, { status: 503 });
  return _POST(req, { params });
}

async function _POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();

  // Fetch trip details
  const { data: trip } = await db
    .from("trips")
    .select("group_id, destination_city, destination_country, desired_duration_days, planning_mode, selected_suggestion_id")
    .eq("id", tripId)
    .single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  // Verify group membership
  const { data: membership } = await db
    .from("group_members").select("user_id")
    .eq("group_id", trip.group_id).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Resolve destination
  let destinationCity: string | null = trip.destination_city as string | null;
  let destinationCountry: string | null = trip.destination_country as string | null;

  if (!destinationCity && trip.selected_suggestion_id) {
    const { data: suggestion } = await db
      .from("trip_suggestions")
      .select("destination_city, destination_country")
      .eq("id", trip.selected_suggestion_id)
      .single();
    if (suggestion) {
      destinationCity = suggestion.destination_city;
      destinationCountry = suggestion.destination_country;
    }
  }

  if (!destinationCity) {
    return NextResponse.json({ error: "No destination set. Select a destination first." }, { status: 400 });
  }

  const aiLimit = await checkAndConsumeAiLimit(db, user.id);
  if (!aiLimit.allowed) {
    return NextResponse.json(
      { error: `Daily AI limit of ${aiLimit.limit} calls reached. Resets at midnight.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({})) as { interests?: string };
  const interests = body.interests?.trim().slice(0, 200) ?? "";
  const tripDays = Math.min(Math.max(trip.desired_duration_days ?? 7, 1), 21);

  const prompt = `You are an expert travel guide. Create a detailed day-by-day itinerary for a ${tripDays}-day trip to ${destinationCity}, ${destinationCountry}.${interests ? `\n\nTravel interests/style: ${interests}` : ""}

Rules:
- Generate 3 activities per day (morning, afternoon, evening). For trips ≥5 days you may skip evening on some days.
- Keep suggestions realistic, varied, and local.
- Include a mix of: sightseeing, food, culture, local experiences.
- Spread popular attractions across different days to avoid fatigue.
- Include practical tips in the description (book in advance, best time, etc.).
- Estimate realistic costs in EUR (0 for free activities).

Return ONLY a JSON array with NO markdown fences, NO explanation — just the raw JSON array:
[
  {
    "day": 1,
    "time_slot": "morning",
    "title": "Activity name",
    "description": "Brief description with a practical tip",
    "location": "Neighbourhood or address",
    "cost_eur": 0
  }
]

time_slot must be one of: "morning", "afternoon", "evening"
Generate items for all ${tripDays} days.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
    // Extract JSON array robustly — find the first [...] block even if surrounded by text/fences
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    const json = arrayMatch ? arrayMatch[0] : raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const items = JSON.parse(json) as {
      day: number;
      time_slot: string;
      title: string;
      description?: string;
      location?: string;
      cost_eur?: number;
    }[];

    const VALID_SLOTS = ["morning", "afternoon", "evening", "night"];
    const sanitized = items
      .filter(i => i.title && i.day >= 1 && i.day <= tripDays)
      .map((i, idx) => ({
        day: i.day,
        time_slot: VALID_SLOTS.includes(i.time_slot) ? i.time_slot : "morning",
        title: String(i.title).slice(0, 200),
        description: i.description ? String(i.description).slice(0, 500) : null,
        location: i.location ? String(i.location).slice(0, 200) : null,
        cost_eur: typeof i.cost_eur === "number" && i.cost_eur >= 0 ? Math.round(i.cost_eur) : null,
      }));

    return NextResponse.json({ items: sanitized, city: destinationCity, country: destinationCountry });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Itinerary AI error:", msg);
    return NextResponse.json({ error: `Failed to generate itinerary: ${msg}` }, { status: 502 });
  }
}
