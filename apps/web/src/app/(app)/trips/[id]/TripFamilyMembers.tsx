"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface FamilyMember {
  id: string;
  display_name: string;
  color: string;
}

const COLOR_DOT: Record<string, string> = {
  indigo: "#6366f1", rose: "#f43f5e", amber: "#f59e0b", teal: "#14b8a6",
  violet: "#8b5cf6", orange: "#f97316", cyan: "#06b6d4", emerald: "#10b981",
};

export default function TripFamilyMembers({
  tripId,
  allFamilyMembers,
  initialTaggedIds,
}: {
  tripId: string;
  allFamilyMembers: FamilyMember[];
  initialTaggedIds: string[];
}) {
  const [taggedIds, setTaggedIds] = useState<Set<string>>(new Set(initialTaggedIds));
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (allFamilyMembers.length === 0) return null;

  async function toggle(memberId: string) {
    setSaving(memberId);
    setError(null);
    const supabase = createClient();
    const wasTagged = taggedIds.has(memberId);
    // Optimistic update
    setTaggedIds(prev => {
      const n = new Set(prev);
      wasTagged ? n.delete(memberId) : n.add(memberId);
      return n;
    });
    const { error: dbError } = wasTagged
      ? await supabase.from("trip_family_members").delete().eq("trip_id", tripId).eq("family_member_id", memberId)
      : await supabase.from("trip_family_members").insert({ trip_id: tripId, family_member_id: memberId });
    if (dbError) {
      // Roll back optimistic update
      setTaggedIds(prev => {
        const n = new Set(prev);
        wasTagged ? n.add(memberId) : n.delete(memberId);
        return n;
      });
      setError("Could not update traveller. Please try again.");
    }
    setSaving(null);
  }

  return (
    <div className="card p-5 space-y-3">
      <div>
        <h2 className="font-bold text-slate-900">👨‍👩‍👧 Travellers</h2>
        <p className="text-xs text-slate-400 mt-0.5">Select who is coming on this trip</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {allFamilyMembers.map(fm => {
          const tagged = taggedIds.has(fm.id);
          const dot = COLOR_DOT[fm.color] ?? "#6366f1";
          return (
            <button
              key={fm.id}
              onClick={() => toggle(fm.id)}
              disabled={saving === fm.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition"
              style={tagged
                ? { borderColor: dot, background: `${dot}18`, color: dot }
                : { borderColor: "#e2e8f0", background: "#f8fafc", color: "#64748b" }}
            >
              <span
                className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0"
                style={{ background: dot }}
              >
                {tagged ? "✓" : fm.display_name[0].toUpperCase()}
              </span>
              {fm.display_name}
              {saving === fm.id && <span className="animate-spin text-[10px]">⏳</span>}
            </button>
          );
        })}
      </div>
      {taggedIds.size > 0 && (
        <p className="text-xs text-slate-400">
          {taggedIds.size} traveller{taggedIds.size !== 1 ? "s" : ""} added
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
