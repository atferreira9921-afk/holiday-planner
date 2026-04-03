export const C = {
  primary: "#6366f1",
  primaryBg: "#eef2ff",
  emerald: "#10b981",
  emeraldBg: "#ecfdf5",
  amber: "#f59e0b",
  amberBg: "#fffbeb",
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  light: "#94a3b8",
  header: "#1e1b4b",
};

export const STATUS: Record<string, { bg: string; color: string; label: string; emoji: string }> = {
  planning:  { bg: "#fef9c3", color: "#854d0e", label: "Planning",  emoji: "🗓️" },
  suggested: { bg: "#ede9fe", color: "#5b21b6", label: "Suggested", emoji: "✨" },
  booked:    { bg: "#dcfce7", color: "#166534", label: "Booked",    emoji: "✅" },
  completed: { bg: "#f1f5f9", color: "#475569", label: "Done",      emoji: "🏁" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled", emoji: "✕"  },
};

export const EVENT: Record<string, { emoji: string; color: string; bg: string }> = {
  holiday:       { emoji: "🏖️", color: "#6366f1", bg: "#eef2ff" },
  work:          { emoji: "💼", color: "#94a3b8", bg: "#f1f5f9" },
  personal:      { emoji: "🏠", color: "#94a3b8", bg: "#f1f5f9" },
  "away-other":  { emoji: "📌", color: "#94a3b8", bg: "#f1f5f9" },
  concert:       { emoji: "🎵", color: "#c026d3", bg: "#fdf4ff" },
  game:          { emoji: "⚽", color: "#16a34a", bg: "#f0fdf4" },
  visit:         { emoji: "🤝", color: "#0ea5e9", bg: "#f0f9ff" },
  party:         { emoji: "🎉", color: "#f59e0b", bg: "#fffbeb" },
  "event-other": { emoji: "⭐", color: "#6366f1", bg: "#eef2ff" },
};

export function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fmtMed(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function daysUntil(iso: string) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00").getTime() - t.getTime()) / 86400000);
}

export function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
