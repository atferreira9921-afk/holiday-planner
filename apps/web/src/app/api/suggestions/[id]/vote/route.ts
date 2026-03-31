import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: suggestionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vote } = await req.json() as { vote: "up" | "down" | null };

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
