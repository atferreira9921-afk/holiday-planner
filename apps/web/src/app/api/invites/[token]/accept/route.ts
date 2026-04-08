import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();

  // Validate invite
  const { data: invite } = await db
    .from("group_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (!invite) {
    console.error(`[accept-invite] Invite not found for token ${token}`);
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.accepted_at) return NextResponse.json({ error: "Invite already used" }, { status: 400 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 400 });

  // If the invite was scoped to a specific email, verify the logged-in user matches
  if (invite.invited_email && invite.invited_email.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: "This invite was sent to a different email address" }, { status: 403 });
  }

  // Check not already a member
  const { data: existing } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", invite.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    // Ensure user_profiles row exists (group_members.user_id FK references user_profiles.id)
    const { data: existingProfile } = await db
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await db.from("user_profiles").insert({
        id: user.id,
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (profileError) {
        console.error("user_profiles insert failed:", profileError.message);
        return NextResponse.json({ error: "Failed to set up profile. Please try again." }, { status: 500 });
      }
    }

    const { error: insertError } = await db.from("group_members").insert({
      group_id: invite.group_id,
      user_id: user.id,
      role: "member",
    });
    if (insertError) {
      console.error("group_members insert failed:", insertError.message);
      return NextResponse.json({ error: "Failed to join group. Please try again." }, { status: 500 });
    }
  }

  // Mark invite as accepted
  await db.from("group_invites").update({
    accepted_at: new Date().toISOString(),
    accepted_by: user.id,
  }).eq("token", token);

  // ── Notify the person who created the invite ──────────────────────────────
  if (invite.invited_by && invite.invited_by !== user.id) {
    // Get the accepter's display name
    const { data: accepterProfile } = await db
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const accepterName =
      (accepterProfile as { full_name?: string; email?: string } | null)?.full_name
      ?? (accepterProfile as { full_name?: string; email?: string } | null)?.email?.split("@")[0]
      ?? "Someone";

    await createNotification(
      db,
      invite.invited_by,
      "invite_accepted",
      `${accepterName} joined your group`,
      "Your invite link was used to join the travel group.",
      `/trips`
    );
  }

  return NextResponse.json({ group_id: invite.group_id });
}
