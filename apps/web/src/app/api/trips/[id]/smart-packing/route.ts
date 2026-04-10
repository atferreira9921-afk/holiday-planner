import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import { checkAndConsumeAiLimit } from "@/lib/ai-rate-limit";
import { isAiEnabled } from "@/lib/config";

export const maxDuration = 30;

const ALLOWED_TRIP_TYPES = ["flight", "road_trip", "train", "cruise", "backpacking", "city_break", "beach", "ski", "camping"];

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

  const { data: trip } = await supabase
    .from("trips").select("group_id").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  // Verify group membership
  const db = createServiceClient();
  const { data: membership } = await db
    .from("group_members").select("user_id")
    .eq("group_id", trip.group_id).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const aiLimit = await checkAndConsumeAiLimit(db, user.id);
  if (!aiLimit.allowed) {
    return NextResponse.json(
      { error: `Daily AI limit of ${aiLimit.limit} calls reached. Resets at midnight.` },
      { status: 429 }
    );
  }

  const body = await req.json() as { destinationCountry?: string | null; tripType?: string };
  const rawTripType = body.tripType ?? "flight";
  const tripType = ALLOWED_TRIP_TYPES.includes(rawTripType) ? rawTripType : "flight";
  const destination = (body.destinationCountry ?? "unknown destination").slice(0, 100);

  const prompt = `You are a travel packing expert. Generate 8 smart packing suggestions for a ${tripType.replace("_", " ")} trip to ${destination}.

Return ONLY a JSON array with exactly this structure (no markdown, no explanation):
[
  { "item": "item name", "category": "clothing|tech|toiletries|health|documents|activities|other", "reason": "brief reason why this is useful" },
  ...
]

Focus on items that are:
- Specific and useful for this destination/trip type
- Often forgotten or underestimated
- Practical and actionable`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    const suggestions = JSON.parse(arrayMatch ? arrayMatch[0] : text.replace(/^```json?\n?/, "").replace(/\n?```$/, ""));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("Smart packing AI error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 502 });
  }
}
