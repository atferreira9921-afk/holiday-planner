import type { SupabaseClient } from "@supabase/supabase-js";

export const DAILY_AI_LIMIT = 6;

/**
 * Atomically checks and increments the AI usage counter.
 * Uses a DB-level upsert with a conditional WHERE to eliminate
 * the TOCTOU race condition that existed with the previous
 * SELECT → check → UPDATE pattern.
 */
export async function checkAndConsumeAiLimit(
  db: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await db.rpc("consume_ai_limit", {
    p_user_id: userId,
    p_date: today,
    p_limit: DAILY_AI_LIMIT,
  }).single();

  // If the RPC isn't deployed yet, fall back gracefully (deny, don't crash)
  if (error) {
    console.error("consume_ai_limit RPC error:", error.message);
    return { allowed: false, used: 0, limit: DAILY_AI_LIMIT };
  }

  const row = data as { allowed: boolean; used: number };
  return { allowed: row.allowed, used: row.used, limit: DAILY_AI_LIMIT };
}
