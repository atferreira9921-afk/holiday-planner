import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { suggestion_id } = await req.json() as { suggestion_id: string | null };

  // Verify the user is in this trip's group
  const { data: trip } = await supabase
    .from("trips").select("group_id").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const db = await createServiceClient();

  if (!suggestion_id) {
    // Deselect: clear selected_suggestion_id, revert status to suggested
    await db.from("trips").update({
      selected_suggestion_id: null,
      status: "suggested",
    }).eq("id", tripId);
    return NextResponse.json({ ok: true });
  }

  // Verify suggestion belongs to this trip
  const { data: suggestion } = await db
    .from("trip_suggestions")
    .select("id")
    .eq("id", suggestion_id)
    .eq("trip_id", tripId)
    .single();
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

  // Select: update trip (keep other suggestions — they're shown collapsed/greyed in the UI)
  await db.from("trips").update({
    selected_suggestion_id: suggestion_id,
    status: "booked",
  }).eq("id", tripId);

  return NextResponse.json({ ok: true });
}
