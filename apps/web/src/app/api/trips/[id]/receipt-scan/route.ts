import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMediaType = typeof ALLOWED_MEDIA_TYPES[number];

const SCHEMA_PROMPT = `Extract the following fields from this receipt and return ONLY valid JSON (no markdown):
{
  "description": "short merchant or receipt description (max 80 chars)",
  "total_eur": <total amount as number, convert to EUR if needed>,
  "currency": "<original currency code: EUR|USD|GBP|JPY|CHF|etc>",
  "category": "<one of: hotel|flight|food|transport|activity|other>",
  "items": [{ "name": "item name", "price": <number> }]
}

Rules:
- total_eur: use the grand total; if currency is not EUR, leave as original value (caller will convert)
- category: infer from merchant type
- items: max 10 line items with prices, skip subtotals/taxes
- If a field cannot be determined, use null for numbers or "other"/"Receipt" for strings`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify group membership
  const { data: trip } = await supabase
    .from("trips").select("group_id").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const db = createServiceClient();
  const { data: membership } = await db
    .from("group_members").select("user_id")
    .eq("group_id", trip.group_id).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const body = await req.json() as { text?: string; image_base64?: string; media_type?: string };

  if (body.text && body.text.length > 10_000) {
    body.text = body.text.slice(0, 10_000);
  }

  try {
    let messageContent: Parameters<typeof anthropic.messages.create>[0]["messages"][0]["content"];

    if (body.image_base64) {
      const rawMediaType = body.media_type ?? "image/jpeg";
      const mediaType: AllowedMediaType = (ALLOWED_MEDIA_TYPES as readonly string[]).includes(rawMediaType)
        ? rawMediaType as AllowedMediaType
        : "image/jpeg";
      messageContent = [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: body.image_base64 },
        },
        { type: "text", text: SCHEMA_PROMPT },
      ];
    } else if (body.text) {
      messageContent = `Receipt text:\n\n${body.text}\n\n${SCHEMA_PROMPT}`;
    } else {
      return NextResponse.json({ error: "Provide text or image_base64" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: messageContent }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const result = JSON.parse(raw.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, ""));

    return NextResponse.json({
      description: result.description ?? "Receipt",
      total_eur: result.total_eur ?? 0,
      currency: result.currency ?? "EUR",
      category: result.category ?? "other",
      items: (result.items ?? []).slice(0, 10),
    });
  } catch (err) {
    console.error("Receipt scan error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to scan receipt" }, { status: 502 });
  }
}
