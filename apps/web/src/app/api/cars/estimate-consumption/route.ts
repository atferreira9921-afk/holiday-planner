import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_FIELD_LENGTH = 100;

// Static fallback estimates by common fuel type keywords.
// Returns litres/100km for petrol/diesel, kWh/100km for EV shown as l-equivalent.
function staticEstimate(make: string, model: string): { l_per_100km: number; note: string } {
  const text = `${make} ${model}`.toLowerCase();
  if (/electric|ev|tesla|ioniq|zoe|leaf|id\./.test(text)) {
    return { l_per_100km: 2.0, note: "Electric — approx 20 kWh/100km shown as litre-equivalent" };
  }
  if (/hybrid|prius|yaris hybrid|corolla hybrid/.test(text)) {
    return { l_per_100km: 4.5, note: "Hybrid — mixed driving estimate" };
  }
  if (/diesel/.test(text)) {
    return { l_per_100km: 5.5, note: "Diesel — mixed driving estimate" };
  }
  // Default petrol estimate
  return { l_per_100km: 7.0, note: "Petrol — mixed driving estimate" };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { make, model, year } = await req.json() as { make: string; model: string; year?: number };
  if (!make || !model) return NextResponse.json({ error: "make and model required" }, { status: 400 });

  const safeMake  = String(make).replace(/[^\w\s\-]/g, "").slice(0, MAX_FIELD_LENGTH);
  const safeModel = String(model).replace(/[^\w\s\-]/g, "").slice(0, MAX_FIELD_LENGTH);

  return NextResponse.json(staticEstimate(safeMake, safeModel));
}
