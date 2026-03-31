import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AcceptButton from "./AcceptButton";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase  = await createClient();
  const db        = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  // Look up invite (service client bypasses RLS)
  const { data: invite } = await db
    .from("group_invites")
    .select("id, group_id, expires_at, accepted_at, travel_groups(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return <ErrorPage message="This invite link is invalid or has been removed." />;
  }
  if (invite.accepted_at) {
    return <ErrorPage message="This invite link has already been used." />;
  }
  if (new Date(invite.expires_at) < new Date()) {
    return <ErrorPage message="This invite link has expired. Ask the trip owner to generate a new one." />;
  }

  const groupName = (invite.travel_groups as { name: string } | null)?.name ?? "a travel group";

  // If already a member, redirect to dashboard
  const { data: existing } = await db
    .from("group_members")
    .select("user_id")
    .eq("group_id", invite.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--bg)" }}>
      <div className="max-w-md w-full card p-10 text-center space-y-6">
        <div className="text-5xl">✈️</div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">You&apos;re invited!</h1>
          <p className="text-slate-500 text-sm mt-2">
            You&apos;ve been invited to join <strong>{groupName}</strong> on Holiday Planner
            and collaborate on trip planning.
          </p>
        </div>

        <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700 text-left space-y-1.5">
          <p><span className="font-semibold">Group:</span> {groupName}</p>
          <p>
            <span className="font-semibold">Expires:</span>{" "}
            {new Date(invite.expires_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>

        <AcceptButton token={token} />

        <p className="text-xs text-slate-400">
          Joining as <strong>{user.email}</strong>.
        </p>
      </div>
    </div>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--bg)" }}>
      <div className="max-w-md w-full card p-10 text-center space-y-4">
        <div className="text-5xl">😕</div>
        <h1 className="text-xl font-bold text-slate-900">Invalid invite</h1>
        <p className="text-slate-500 text-sm">{message}</p>
        <Link href="/dashboard" className="btn-primary text-sm inline-block">Go to dashboard</Link>
      </div>
    </div>
  );
}
