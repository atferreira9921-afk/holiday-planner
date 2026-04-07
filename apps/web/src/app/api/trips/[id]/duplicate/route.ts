import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).single();
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("group_members").select("user_id").eq("group_id", trip.group_id).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: newTrip, error } = await supabase.from("trips").insert({
    group_id: trip.group_id,
    created_by: user.id,
    title: `${trip.title} (copy)`,
    status: "planning",
    desired_duration_days: trip.desired_duration_days,
    earliest_departure: trip.earliest_departure,
    latest_return: trip.latest_return,
    budget_per_person_eur: trip.budget_per_person_eur,
    destination_hint: trip.destination_hint,
    planning_mode: trip.planning_mode,
    destination_city: trip.destination_city,
    destination_country: trip.destination_country,
    vehicle_type: trip.vehicle_type,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: newTrip.id });
}
