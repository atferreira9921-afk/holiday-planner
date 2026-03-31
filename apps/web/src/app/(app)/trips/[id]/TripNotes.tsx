"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TripNotes({
  tripId,
  currentUserId,
  initialContent,
  updatedBy,
  updatedAt,
  memberNames,
}: {
  tripId: string;
  currentUserId: string;
  initialContent: string;
  updatedBy: string | null;
  updatedAt: string | null;
  memberNames: Record<string, string>;
}) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState(updatedBy);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(updatedAt);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleBlur() {
    if (content === initialContent && lastUpdatedBy === updatedBy) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("trip_notes").upsert({
      trip_id: tripId,
      content,
      updated_by: currentUserId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "trip_id" });
    setSaving(false);
    setLastUpdatedBy(currentUserId);
    setLastUpdatedAt(new Date().toISOString());
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const editorName = lastUpdatedBy
    ? (memberNames[lastUpdatedBy] ?? "Someone")
    : null;

  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 text-lg">📝 Trip notes</h2>
        {saving && (
          <span className="text-xs text-slate-400 animate-pulse">Saving…</span>
        )}
        {!saving && saved && (
          <span className="text-xs text-emerald-500 font-medium transition-opacity">
            ✓ Saved
          </span>
        )}
      </div>

      <textarea
        className="input w-full resize-y text-sm leading-relaxed"
        rows={6}
        value={content}
        onChange={e => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="Shared notes for the group — restaurants to try, tips, reminders…"
      />

      {editorName && lastUpdatedAt && (
        <p className="text-xs text-slate-400">
          Last edited by{" "}
          <span className="font-medium text-slate-500">{editorName}</span>
          {" "}on {formatDate(lastUpdatedAt)}
        </p>
      )}
    </div>
  );
}
