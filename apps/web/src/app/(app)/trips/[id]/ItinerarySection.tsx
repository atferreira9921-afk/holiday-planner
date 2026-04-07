"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  time_slot: "morning" | "afternoon" | "evening" | "night";
  title: string;
  description: string | null;
  location: string | null;
  cost_eur: number | null;
  sort_order: number;
  created_at: string;
}

const TIME_SLOTS = [
  { key: "morning",   label: "Morning",   emoji: "🌅", color: "#f59e0b", bg: "#fffbeb" },
  { key: "afternoon", label: "Afternoon", emoji: "☀️", color: "#f97316", bg: "#fff7ed" },
  { key: "evening",   label: "Evening",   emoji: "🌆", color: "#8b5cf6", bg: "#f5f3ff" },
  { key: "night",     label: "Night",     emoji: "🌙", color: "#1e40af", bg: "#eff6ff" },
];

function slotMeta(key: string) {
  return TIME_SLOTS.find(s => s.key === key) ?? TIME_SLOTS[0];
}

export default function ItinerarySection({
  tripId,
  initialItems,
  tripDays,
  departureDate,
}: {
  tripId: string;
  initialItems: ItineraryItem[];
  tripDays: number;
  departureDate: string;
}) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const [items, setItems]   = useState<ItineraryItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView]     = useState<"list" | "timeline">("list");
  const [form, setForm]     = useState({
    day_number: 1, time_slot: "morning" as ItineraryItem["time_slot"],
    title: "", description: "", location: "", cost_eur: "",
  });

  const days = Array.from({ length: Math.max(tripDays, 1) }, (_, i) => i + 1);

  function dayLabel(n: number) {
    if (!departureDate) return `Day ${n}`;
    const d = new Date(departureDate);
    d.setDate(d.getDate() + n - 1);
    return `Day ${n} — ${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
  }

  function itemsForDay(day: number) {
    return items
      .filter(i => i.day_number === day)
      .sort((a, b) => {
        const order = ["morning", "afternoon", "evening", "night"];
        const diff = order.indexOf(a.time_slot) - order.indexOf(b.time_slot);
        return diff !== 0 ? diff : a.sort_order - b.sort_order;
      });
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("trip_itinerary_items").insert({
      trip_id: tripId,
      day_number: form.day_number,
      time_slot: form.time_slot,
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      cost_eur: form.cost_eur ? parseFloat(form.cost_eur) : null,
      sort_order: items.filter(i => i.day_number === form.day_number && i.time_slot === form.time_slot).length,
      created_by: user.id,
    }).select("*").single();
    if (data) setItems(prev => [...prev, data as ItineraryItem]);
    setForm({ day_number: form.day_number, time_slot: "morning", title: "", description: "", location: "", cost_eur: "" });
    setShowForm(false);
    setSaving(false);
  }

  async function deleteItem(id: string) {
    const supabase = createClient();
    await supabase.from("trip_itinerary_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const totalCost = items.reduce((s, i) => s + (i.cost_eur ?? 0), 0);
  const isEmpty   = items.length === 0;

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-lg">🗓️ Itinerary</h2>
          {!isEmpty && (
            <p className="text-xs text-slate-400 mt-0.5">
              {items.length} activities · {totalCost > 0 ? `€${totalCost.toFixed(0)} planned` : "no costs added"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isEmpty && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
              <button onClick={() => setView("list")}
                className={`px-2.5 py-1.5 transition ${view === "list" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-500 hover:bg-slate-50"}`}>
                List
              </button>
              <button onClick={() => setView("timeline")}
                className={`px-2.5 py-1.5 border-l border-slate-200 transition ${view === "timeline" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-500 hover:bg-slate-50"}`}>
                Timeline
              </button>
            </div>
          )}
          <button onClick={() => setShowForm(f => !f)} className="btn-ghost text-sm">
            {showForm ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addItem} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Day</label>
              <select className="input text-sm" value={form.day_number}
                onChange={e => setForm(f => ({ ...f, day_number: parseInt(e.target.value) }))}>
                {days.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Time</label>
              <div className="flex gap-1.5 flex-wrap">
                {TIME_SLOTS.map(s => (
                  <button key={s.key} type="button"
                    onClick={() => setForm(f => ({ ...f, time_slot: s.key as ItineraryItem["time_slot"] }))}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border-2 transition ${
                      form.time_slot === s.key ? "border-transparent text-white" : "border-slate-200 text-slate-600 bg-white"
                    }`}
                    style={form.time_slot === s.key ? { background: s.color } : {}}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label">Activity / title <span className="text-red-400">*</span></label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Visit Sagrada Família" required autoFocus />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Location (optional)</label>
              <input className="input text-sm" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Eixample, Barcelona" />
            </div>
            <div>
              <label className="label">Cost (€, optional)</label>
              <input className="input text-sm" type="number" step="0.01" min="0" value={form.cost_eur}
                onChange={e => setForm(f => ({ ...f, cost_eur: e.target.value }))}
                placeholder="e.g. 26" />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input text-sm" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Book in advance, wear comfortable shoes…" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? "Adding…" : "Add to itinerary"}
          </button>
        </form>
      )}

      {/* Empty state */}
      {isEmpty && !showForm && (
        <div className="py-6 text-center">
          <p className="text-slate-400 text-sm">No activities planned yet.</p>
          <p className="text-xs text-slate-400 mt-1">Add restaurants, sights, tours, and activities day by day.</p>
        </div>
      )}

      {/* List view */}
      {!isEmpty && view === "list" && (
        <div className="space-y-5">
          {days.map(day => {
            const dayItems = itemsForDay(day);
            if (dayItems.length === 0) return null;
            return (
              <div key={day}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{dayLabel(day)}</p>
                <div className="space-y-1.5">
                  {dayItems.map(item => {
                    const slot = slotMeta(item.time_slot);
                    return (
                      <div key={item.id}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition group">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{ background: isDark ? `${slot.color}26` : slot.bg, color: slot.color }}>
                          {slot.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                          {item.location && <p className="text-xs text-slate-400">📍 {item.location}</p>}
                          {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.cost_eur != null && (
                            <span className="text-xs font-semibold text-slate-600">€{item.cost_eur.toFixed(0)}</span>
                          )}
                          <button onClick={() => deleteItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition px-1">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline view */}
      {!isEmpty && view === "timeline" && (
        <div className="relative">
          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-slate-100" />
          <div className="space-y-5">
            {days.map(day => {
              const dayItems = itemsForDay(day);
              if (dayItems.length === 0) return null;
              return (
                <div key={day} className="relative pl-8">
                  <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center z-10">
                    <span className="text-xs font-bold text-indigo-600">{day}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">{dayLabel(day)}</p>
                  <div className="space-y-1.5">
                    {dayItems.map(item => {
                      const slot = slotMeta(item.time_slot);
                      return (
                        <div key={item.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg group">
                          <span className="text-base flex-shrink-0 mt-0.5">{slot.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                            {item.location && <p className="text-xs text-slate-500 mt-0.5">📍 {item.location}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {item.cost_eur != null && (
                              <span className="text-xs font-semibold text-indigo-600">€{item.cost_eur.toFixed(0)}</span>
                            )}
                            <button onClick={() => deleteItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition px-1">✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
