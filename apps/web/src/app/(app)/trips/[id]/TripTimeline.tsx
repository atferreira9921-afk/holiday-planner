"use client";

import { useState } from "react";

interface ItineraryItem {
  id: string;
  day_number: number;
  time_slot: string;
  title: string;
  location: string | null;
  cost_eur: number | null;
}

interface Expense {
  id: string;
  description: string;
  amount_eur: number;
  category: string;
  created_at: string;
}

const SLOT_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2, night: 3 };
const SLOT_EMOJI: Record<string, string> = { morning: "🌅", afternoon: "☀️", evening: "🌆", night: "🌙" };

const CAT_EMOJI: Record<string, string> = {
  flight: "✈️", hotel: "🏨", "car-trip": "🚗", food: "🍽️",
  transport: "🚌", activity: "🎟️", other: "📦",
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function TripTimeline({
  tripDays,
  departureDate,
  itineraryItems,
  expenses,
}: {
  tripDays: number;
  departureDate: string;
  itineraryItems: ItineraryItem[];
  expenses: Expense[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasContent = itineraryItems.length > 0 || expenses.length > 0;
  if (!hasContent) return null;

  const days = Array.from({ length: tripDays }, (_, i) => i + 1);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">🗓️ Trip timeline</h2>
          <p className="text-xs text-slate-400 mt-0.5">{tripDays}-day overview</p>
        </div>
        <button onClick={() => setCollapsed(c => !c)} className="btn-ghost text-sm flex-shrink-0">
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!collapsed && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-slate-100" />

          <div className="space-y-6">
            {days.map(day => {
              const dayItems = itineraryItems
                .filter(i => i.day_number === day)
                .sort((a, b) => (SLOT_ORDER[a.time_slot] ?? 0) - (SLOT_ORDER[b.time_slot] ?? 0));

              if (dayItems.length === 0) return null;

              return (
                <div key={day} className="relative pl-8">
                  {/* Day dot */}
                  <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center z-10">
                    <span className="text-xs font-bold text-indigo-600">{day}</span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      {addDays(departureDate, day - 1)}
                    </p>
                    <div className="space-y-1.5">
                      {dayItems.map(item => (
                        <div key={item.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                          <span className="text-base flex-shrink-0 mt-0.5">{SLOT_EMOJI[item.time_slot] ?? "📍"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                            {item.location && (
                              <p className="text-xs text-slate-500 mt-0.5">📍 {item.location}</p>
                            )}
                          </div>
                          {item.cost_eur != null && (
                            <span className="text-xs font-semibold text-indigo-600 flex-shrink-0">
                              €{item.cost_eur.toFixed(0)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Expenses row */}
            {expenses.length > 0 && (
              <div className="relative pl-8">
                <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center z-10">
                  <span className="text-xs">💰</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Expenses logged</p>
                  <div className="flex flex-wrap gap-2">
                    {expenses.map(e => (
                      <div key={e.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-xs">
                        <span>{CAT_EMOJI[e.category] ?? "📦"}</span>
                        <span className="text-slate-700">{e.description}</span>
                        <span className="font-semibold text-emerald-700">€{e.amount_eur.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
