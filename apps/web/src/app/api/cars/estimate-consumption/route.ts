import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { make, model, year } = await req.json() as { make: string; model: string; year?: number };
  if (!make || !model) return NextResponse.json({ error: "make and model required" }, { status: 400 });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `What is the average real-world fuel consumption (litres per 100km) for a ${year ? year + " " : ""}${make} ${model}?

Reply ONLY with a JSON object in this exact format, no other text:
{"l_per_100km": 6.5, "note": "Mixed driving cycle estimate"}

The l_per_100km should be a realistic number (e.g. 5.0–8.0 for petrol, 4.0–6.5 for diesel, 15–25 kWh/100km for electric displayed as litres-equivalent).`,
      }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Could not estimate consumption" }, { status: 500 });
  }
}
