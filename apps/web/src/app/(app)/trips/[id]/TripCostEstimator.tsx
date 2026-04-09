"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface Props {
  tripId: string;
  tripDays: number;
  memberCount: number;
  initialEstimate: {
    flight_per_person_eur: number | null;
    hotel_per_night_eur: number | null;
    daily_budget_per_person_eur: number | null;
  } | null;
}

export default function TripCostEstimator({ tripId, tripDays, memberCount, initialEstimate }: Props) {
  const t = useTranslations("costEstimator");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    flight: initialEstimate?.flight_per_person_eur?.toString() ?? "",
    hotel:  initialEstimate?.hotel_per_night_eur?.toString() ?? "",
    daily:  initialEstimate?.daily_budget_per_person_eur?.toString() ?? "",
  });

  const flight = parseFloat(form.flight) || 0;
  const hotel  = parseFloat(form.hotel)  || 0;
  const daily  = parseFloat(form.daily)  || 0;
  const nights = Math.max(tripDays - 1, 1);

  // Hotel cost split equally among members
  const hotelPerPerson = memberCount > 0 ? (hotel * nights) / memberCount : hotel * nights;
  const totalPerPerson = flight + hotelPerPerson + (daily * tripDays);
  const totalGroup     = totalPerPerson * memberCount;

  const hasValues = flight > 0 || hotel > 0 || daily > 0;

  const save = useCallback(async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("trip_cost_estimates").upsert({
      trip_id: tripId,
      flight_per_person_eur: flight || null,
      hotel_per_night_eur: hotel || null,
      daily_budget_per_person_eur: daily || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "trip_id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [tripId, flight, hotel, daily]);

  // Show summary even when collapsed if values exist
  const summaryLine = hasValues
    ? t("totalPp", { pp: Math.round(totalPerPerson), total: Math.round(totalGroup) })
    : null;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">🧮 {t("title")}</h2>
          {summaryLine && (
            <p className="text-xs text-slate-400 mt-0.5">{summaryLine}</p>
          )}
        </div>
        <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm flex-shrink-0">
          {open ? tc("hide") : t("editButton")}
        </button>
      </div>

      {/* Always show totals if values set */}
      {hasValues && !open && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {flight > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">✈️ {t("flights")}</p>
              <p className="text-lg font-bold text-blue-600">€{Math.round(flight)}</p>
              <p className="text-xs text-blue-400">{t("perPerson")}</p>
            </div>
          )}
          {hotel > 0 && (
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">🏨 {t("hotel")}</p>
              <p className="text-lg font-bold text-purple-600">€{Math.round(hotelPerPerson)}</p>
              <p className="text-xs text-purple-400">{t("hotelLine", { amount: Math.round(hotelPerPerson), nights })}</p>
            </div>
          )}
          {daily > 0 && (
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">🍽️ {t("daily")}</p>
              <p className="text-lg font-bold text-green-600">€{Math.round(daily * tripDays)}</p>
              <p className="text-xs text-green-400">{t("dailyLine", { amount: Math.round(daily * tripDays), days: tripDays })}</p>
            </div>
          )}
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{t("totalPp")}</p>
            <p className="text-xl font-bold text-indigo-600">€{Math.round(totalPerPerson)}</p>
            {memberCount > 1 && <p className="text-xs text-indigo-400">{t("forGroup", { total: Math.round(totalGroup), count: memberCount })}</p>}
          </div>
        </div>
      )}

      {open && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">✈️ {t("flights")}</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="1"
                placeholder={t("flightsPlaceholder")}
                value={form.flight}
                onChange={e => setForm(f => ({ ...f, flight: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">🏨 {t("hotel")}</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="1"
                placeholder={t("hotelPlaceholder")}
                value={form.hotel}
                onChange={e => setForm(f => ({ ...f, hotel: e.target.value }))}
              />
              {hotel > 0 && memberCount > 1 && (
                <p className="text-xs text-slate-400 mt-1">{t("splitHint", { count: memberCount, amount: (hotel / memberCount).toFixed(0) })}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">🍽️ {t("daily")}</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="1"
                placeholder={t("dailyPlaceholder")}
                value={form.daily}
                onChange={e => setForm(f => ({ ...f, daily: e.target.value }))}
              />
            </div>
          </div>

          {/* Live total */}
          {hasValues && (
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{t("estimatedTotal")}</p>
                <p className="text-2xl font-bold text-indigo-700">€{Math.round(totalPerPerson)} <span className="text-sm font-normal text-indigo-400">{t("perPerson")}</span></p>
                {memberCount > 1 && (
                  <p className="text-sm text-indigo-500">{t("forGroup", { total: Math.round(totalGroup), count: memberCount })}</p>
                )}
              </div>
              <div className="text-right text-xs text-indigo-400 space-y-0.5">
                {flight > 0 && <p>{t("flightLine", { amount: Math.round(flight) })}</p>}
                {hotel > 0 && <p>{t("hotelLine", { amount: Math.round(hotelPerPerson), nights })}</p>}
                {daily > 0 && <p>{t("dailyLine", { amount: Math.round(daily * tripDays), days: tripDays })}</p>}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? tc("saving") : saved ? tc("saved") : t("save")}
            </button>
            <button onClick={() => setOpen(false)} className="btn-ghost text-sm">{tc("cancel")}</button>
          </div>
        </div>
      )}

      {!hasValues && !open && (
        <p className="text-sm text-slate-400 text-center py-2">
          {t("noValues")}
        </p>
      )}
    </div>
  );
}
