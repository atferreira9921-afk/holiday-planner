import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Regex-based fallback parser (no AI needed) ────────────────────────────────

function parseReceiptText(text: string) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Find a total — look for "total", "amount", "sum" near a number
  let total: number | null = null;
  const totalRe = /(?:total|amount|sum|grand\s*total)[^\d]*([\d.,]+)/i;
  for (const line of lines) {
    const m = line.match(totalRe);
    if (m) { total = parseFloat(m[1].replace(",", ".")); break; }
  }
  // Fallback: largest number in the text
  if (total === null) {
    const nums = [...text.matchAll(/\b(\d{1,6}[.,]\d{2})\b/g)].map(m => parseFloat(m[1].replace(",", ".")));
    if (nums.length) total = Math.max(...nums);
  }

  // Detect currency
  let currency = "EUR";
  if (/\$/.test(text)) currency = "USD";
  else if (/£/.test(text)) currency = "GBP";
  else if (/¥/.test(text)) currency = "JPY";
  else if (/CHF/i.test(text)) currency = "CHF";

  // Detect category
  let category = "other";
  if (/hotel|inn|hostel|accommodation|lodg/i.test(text)) category = "hotel";
  else if (/flight|airline|airways/i.test(text)) category = "flight";
  else if (/restaurant|cafe|coffee|bar|bistro|menu|meal/i.test(text)) category = "food";
  else if (/taxi|uber|lyft|metro|train|bus|transport|rental/i.test(text)) category = "transport";
  else if (/museum|tour|ticket|entry|activity|excursion/i.test(text)) category = "activity";

  // Extract line items: lines that look like "Label   12.50"
  const itemRe = /^(.+?)\s+([\d.,]+)\s*$/;
  const items: { name: string; price: number }[] = [];
  for (const line of lines) {
    const m = line.match(itemRe);
    if (m && !totalRe.test(line)) {
      const price = parseFloat(m[2].replace(",", "."));
      if (!isNaN(price) && price > 0 && price < 100_000) {
        items.push({ name: m[1], price });
      }
    }
  }

  // Build description from first human-readable line
  const description = lines.find(l => /[a-zA-Z]{3}/.test(l) && !/^[\d.,\s]+$/.test(l)) ?? "Receipt";

  return {
    description: description.slice(0, 80),
    total_eur: total ?? 0,
    currency,
    items: items.slice(0, 10),
    category,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // satisfy Next.js dynamic params requirement
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Guard against oversized payloads (base64 images can be large; cap at ~4 MB decoded)
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const body = await req.json() as { text?: string; image_base64?: string; media_type?: string };

  // Enforce text length limit to reduce prompt injection surface
  if (body.text && body.text.length > 10_000) {
    body.text = body.text.slice(0, 10_000);
  }

  // ── Text-only regex fallback (AI disabled) ───────────────────────────────
  if (body.image_base64) {
    return NextResponse.json(
      { error: "Image scanning requires AI — temporarily unavailable." },
      { status: 422 }
    );
  }
  if (body.text) {
    return NextResponse.json(parseReceiptText(body.text));
  }
  return NextResponse.json({ error: "Provide text or image_base64" }, { status: 400 });
}
