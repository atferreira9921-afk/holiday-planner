"use client";

import { useState, useEffect, useCallback } from "react";
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
    ? `~€${Math.round(totalPerPerson)} pp · €${Math.round(totalGroup)} total`
    : null;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">🧮 Cost estimator</h2>
          {summaryLine && (
            <p className="text-xs text-slate-400 mt-0.5">{summaryLine}</p>
          )}
        </div>
        <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm flex-shrink-0">
          {open ? "Hide" : "Edit"}
        </button>
      </div>

      {/* Always show totals if values set */}
      {hasValues && !open && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {flight > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">✈️ Flights</p>
              <p className="text-lg font-bold text-blue-600">€{Math.round(flight)}</p>
              <p className="text-xs text-blue-400">per person</p>
            </div>
          )}
          {hotel > 0 && (
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">🏨 Hotel</p>
              <p className="text-lg font-bold text-purple-600">€{Math.round(hotelPerPerson)}</p>
              <p className="text-xs text-purple-400">per person · {nights} nights</p>
            </div>
          )}
          {daily > 0 && (
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">🍽️ Daily</p>
              <p className="text-lg font-bold text-green-600">€{Math.round(daily * tripDays)}</p>
              <p className="text-xs text-green-400">per person · {tripDays} days</p>
            </div>
          )}
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Total pp</p>
            <p className="text-xl font-bold text-indigo-600">€{Math.round(totalPerPerson)}</p>
            {memberCount > 1 && <p className="text-xs text-indigo-400">€{Math.round(totalGroup)} for {memberCount}</p>}
          </div>
        </div>
      )}

      {open && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">✈️ Flights (€ per person)</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 180"
                value={form.flight}
                onChange={e => setForm(f => ({ ...f, flight: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">🏨 Hotel (€ per room/night)</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 120"
                value={form.hotel}
                onChange={e => setForm(f => ({ ...f, hotel: e.target.value }))}
              />
              {hotel > 0 && memberCount > 1 && (
                <p className="text-xs text-slate-400 mt-1">÷{memberCount} = €{(hotel / memberCount).toFixed(0)}/person/night</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">🍽️ Daily budget (€ per person)</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 60"
                value={form.daily}
                onChange={e => setForm(f => ({ ...f, daily: e.target.value }))}
              />
            </div>
          </div>

          {/* Live total */}
          {hasValues && (
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Estimated total</p>
                <p className="text-2xl font-bold text-indigo-700">€{Math.round(totalPerPerson)} <span className="text-sm font-normal text-indigo-400">per person</span></p>
                {memberCount > 1 && (
                  <p className="text-sm text-indigo-500">€{Math.round(totalGroup)} for the whole group ({memberCount} people)</p>
                )}
              </div>
              <div className="text-right text-xs text-indigo-400 space-y-0.5">
                {flight > 0 && <p>Flights: €{Math.round(flight)}</p>}
                {hotel > 0 && <p>Hotel: €{Math.round(hotelPerPerson)} ({nights} nights)</p>}
                {daily > 0 && <p>Daily: €{Math.round(daily * tripDays)} ({tripDays} days)</p>}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save estimate"}
            </button>
            <button onClick={() => setOpen(false)} className="btn-ghost text-sm">Close</button>
          </div>
        </div>
      )}

      {!hasValues && !open && (
        <p className="text-sm text-slate-400 text-center py-2">
          Add flight, hotel and daily budget to estimate your trip cost.
        </p>
      )}
    </div>
  );
}
