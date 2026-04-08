import type { SupabaseClient } from "@supabase/supabase-js";

export const DAILY_AI_LIMIT = 6;

/**
 * Checks whether the user has remaining AI calls today.
 * If yes, increments the counter and returns allowed=true.
 * If no, returns allowed=false without incrementing.
 */
export async function checkAndConsumeAiLimit(
  db: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await db
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  const current = data?.count ?? 0;

  if (current >= DAILY_AI_LIMIT) {
    return { allowed: false, used: current, limit: DAILY_AI_LIMIT };
  }

  if (data) {
    await db
      .from("ai_usage")
      .update({ count: current + 1 })
      .eq("user_id", userId)
      .eq("usage_date", today);
  } else {
    await db
      .from("ai_usage")
      .insert({ user_id: userId, usage_date: today, count: 1 });
  }

  return { allowed: true, used: current + 1, limit: DAILY_AI_LIMIT };
}
