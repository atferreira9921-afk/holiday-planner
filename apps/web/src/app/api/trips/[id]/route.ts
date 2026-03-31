import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    title?: string;
    earliest_departure?: string;
    latest_return?: string;
    desired_duration_days?: number;
    budget_per_person_eur?: number | null;
    destination_hint?: string | null;
    status?: string;
  };

  // Verify the user has access to this trip via group membership
  const { data: trip } = await supabase
    .from("trips")
    .select("group_id")
    .eq("id", tripId)
    .single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const db = await createServiceClient();

  // Build update payload from provided fields
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.earliest_departure !== undefined) updates.earliest_departure = body.earliest_departure;
  if (body.latest_return !== undefined) updates.latest_return = body.latest_return;
  if (body.desired_duration_days !== undefined) updates.desired_duration_days = body.desired_duration_days;
  if (body.budget_per_person_eur !== undefined) updates.budget_per_person_eur = body.budget_per_person_eur;
  if (body.destination_hint !== undefined) updates.destination_hint = body.destination_hint;
  if (body.status !== undefined) updates.status = body.status;

  const { data: updated, error } = await db
    .from("trips")
    .update(updates)
    .eq("id", tripId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ trip: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the user is a member of the trip's group
  const { data: trip } = await supabase
    .from("trips")
    .select("group_id")
    .eq("id", tripId)
    .single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const db = await createServiceClient();

  const { data: membership } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", trip.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await db.from("trips").delete().eq("id", tripId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
