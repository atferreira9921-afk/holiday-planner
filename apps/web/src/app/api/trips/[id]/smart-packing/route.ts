import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";

export async function POST(
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

  const body = await req.json() as { destinationCountry?: string | null; tripType?: string };
  const tripType = body.tripType ?? "flight";
  const destination = body.destinationCountry ?? "unknown destination";

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

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const suggestions = JSON.parse(text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, ""));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("Smart packing AI error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 502 });
  }
}
