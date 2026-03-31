import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "invite_accepted"
  | "invite_received"
  | "suggestion_ready"
  | "vote_cast"
  | "trip_update";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Insert a notification row.  Silently ignores errors (e.g. table doesn't
 * exist yet) so callers don't need try/catch.
 */
export async function createNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  link?: string
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    link: link ?? null,
  });
  // Errors intentionally swallowed — table may not exist yet
}
