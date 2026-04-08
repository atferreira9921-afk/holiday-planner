import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: suggestionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify suggestion exists and user is a member of its trip's group
  const db = createServiceClient();
  const { data: suggestion } = await db
    .from("trip_suggestions")
    .select("trip_id, trips(group_id)")
    .eq("id", suggestionId)
    .single();
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tripsData = suggestion.trips as { group_id: string }[] | { group_id: string } | null;
  const groupId = Array.isArray(tripsData) ? tripsData[0]?.group_id : tripsData?.group_id;
  if (groupId) {
    const { data: membership } = await db
      .from("group_members").select("user_id")
      .eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { vote: unknown };
  const vote = body.vote;

  if (vote !== "up" && vote !== "down" && vote !== null) {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  if (vote === null) {
    // Remove vote
    await supabase
      .from("trip_suggestion_votes")
      .delete()
      .eq("suggestion_id", suggestionId)
      .eq("user_id", user.id);
  } else {
    // Upsert vote
    await supabase
      .from("trip_suggestion_votes")
      .upsert(
        { suggestion_id: suggestionId, user_id: user.id, vote },
        { onConflict: "suggestion_id,user_id" }
      );
  }

  return NextResponse.json({ ok: true });
}
