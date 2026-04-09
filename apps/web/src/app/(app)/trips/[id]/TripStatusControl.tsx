"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

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
  archived:  "bg-slate-200 text-slate-500",
};

export default function TripStatusControl({ tripId, currentStatus, selectedSuggestionId }: Props) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("tripActions");
  const tc = useTranslations("common");

  const statusCls = statusStyles[currentStatus] ?? statusStyles.planning;

  async function updateStatus(newStatus: string) {
    setSaving(true);
    await supabase.from("trips").update({ status: newStatus }).eq("id", tripId);
    setSaving(false);
    router.refresh();
  }

  const isTerminal = currentStatus === "completed";

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-slate-600">{t("status")}</span>
        <span
          className={`badge ${statusCls}`}
        >
          {currentStatus}
        </span>

        {currentStatus === "completed" && (
          <span className="text-sm text-slate-400">{t("tripCompleted")}</span>
        )}

        {currentStatus === "cancelled" && (
          <button
            className="btn-ghost text-sm"
            onClick={() => updateStatus("planning")}
            disabled={saving}
          >
            {t("reopenTrip")}
          </button>
        )}

        {currentStatus === "archived" && (
          <button className="btn-ghost text-sm" onClick={() => updateStatus("planning")} disabled={saving}>
            {t("unarchive")}
          </button>
        )}

        {!isTerminal && currentStatus !== "archived" && (
          <>
            {(currentStatus === "planning" && selectedSuggestionId) && (
              <button
                className="btn-primary text-sm"
                onClick={() => updateStatus("booked")}
                disabled={saving}
              >
                {t("markBooked")}
              </button>
            )}

            {currentStatus === "suggested" && (
              <button
                className="btn-primary text-sm"
                onClick={() => updateStatus("booked")}
                disabled={saving}
              >
                {t("markBooked")}
              </button>
            )}

            {currentStatus === "booked" && (
              <button
                className="btn-primary text-sm"
                onClick={() => updateStatus("completed")}
                disabled={saving}
              >
                {t("markCompleted")}
              </button>
            )}

            {(currentStatus === "planning" || currentStatus === "suggested" || currentStatus === "booked") && (
              <button
                className="btn-ghost text-sm"
                onClick={() => updateStatus("cancelled")}
                disabled={saving}
              >
                {t("cancelTrip")}
              </button>
            )}

            {(currentStatus === "planning" || currentStatus === "suggested" || currentStatus === "booked") && (
              <button className="btn-ghost text-sm text-slate-400" onClick={() => updateStatus("archived")} disabled={saving}>
                {t("archive")}
              </button>
            )}
          </>
        )}

        {saving && <span className="text-xs text-slate-400">{tc("saving")}</span>}
      </div>
    </div>
  );
}
