/**
 * NEXT_PUBLIC_AI_ENABLED — set to "false" to disable all AI features across the app.
 * Defaults to enabled. Works on both server and client (NEXT_PUBLIC_ prefix).
 */
export const isAiEnabled = process.env.NEXT_PUBLIC_AI_ENABLED !== "false";
