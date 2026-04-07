"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  tripId: string;
  currentStatus: string;
  selectedSuggestionId: string | null;
}

const statusStyles: Record<string, string> = {
  planning:  "bg-yellow-100 text-yellow-800",
  suggested: "bg-violet-100 text-violet-700",
  booked:    "bg-green-100 text-green-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function TripStatusControl({ tripId, currentStatus, selectedSuggestionId }: Props) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const statusCls = statusStyles[currentStatus] ?? statusStyles.planning;

  async function updateStatus(newStatus: string) {
    setSaving(true);
    await supabase.from("trips").update({ status: newStatus }).eq("id", tripId);
    setSaving(false);
    router.refresh();
  }

  const isTerminal = currentStatus === "completed" || currentStatus === "cancelled";

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-slate-600">Status:</span>
        <span
          className={`badge ${statusCls}`}
        >
          {currentStatus}
        </span>

        {isTerminal && (
          <span className="text-sm text-slate-400">Trip is {currentStatus}</span>
        )}

        {!isTerminal && (
          <>
            {(currentStatus === "planning" && selectedSuggestionId) && (
              <button
                className="btn-primary text-sm"
                onClick={() => updateStatus("booked")}
                disabled={saving}
              >
                ✅ Mark as Booked
              </button>
            )}

            {currentStatus === "suggested" && (
              <button
                className="btn-primary text-sm"
                onClick={() => updateStatus("booked")}
                disabled={saving}
              >
                ✅ Mark as Booked
              </button>
            )}

            {currentStatus === "booked" && (
              <button
                className="btn-primary text-sm"
                onClick={() => updateStatus("completed")}
                disabled={saving}
              >
                🏁 Mark as Completed
              </button>
            )}

            {(currentStatus === "planning" || currentStatus === "booked") && (
              <button
                className="btn-ghost text-sm"
                onClick={() => updateStatus("cancelled")}
                disabled={saving}
              >
                Cancel trip
              </button>
            )}
          </>
        )}

        {saving && <span className="text-xs text-slate-400">Saving…</span>}
      </div>
    </div>
  );
}
