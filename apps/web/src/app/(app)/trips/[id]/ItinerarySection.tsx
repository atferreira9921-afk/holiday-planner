"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAiEnabled } from "@/lib/config";
import { useTranslations } from "next-intl";

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

const TIME_SLOT_DEFS = [
  { key: "morning",   emoji: "🌅", color: "#f59e0b", bg: "#fffbeb" },
  { key: "afternoon", emoji: "☀️", color: "#f97316", bg: "#fff7ed" },
  { key: "evening",   emoji: "🌆", color: "#8b5cf6", bg: "#f5f3ff" },
  { key: "night",     emoji: "🌙", color: "#1e40af", bg: "#eff6ff" },
];

function slotMeta(key: string) {
  return TIME_SLOT_DEFS.find(s => s.key === key) ?? TIME_SLOT_DEFS[0];
}

interface AiSuggestion {
  day: number;
  time_slot: string;
  title: string;
  description: string | null;
  location: string | null;
  cost_eur: number | null;
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
  const t  = useTranslations("itinerary");
  const tc = useTranslations("common");
  const TIME_SLOTS = TIME_SLOT_DEFS.map(s => ({ ...s, label: t(s.key) }));

  const [open, setOpen]     = useState(true);
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

  // AI suggestions state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [addedSet, setAddedSet]   = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);

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

  async function fetchAiSuggestions() {
    setAiLoading(true);
    setAiError(null);
    setSuggestions(null);
    setAddedSet(new Set());
    try {
      const res = await fetch(`/api/trips/${tripId}/itinerary-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? "Failed to generate itinerary"); }
      else { setSuggestions(data.items ?? []); }
    } catch {
      setAiError("Network error. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function suggestionKey(s: AiSuggestion) {
    return `${s.day}-${s.time_slot}-${s.title}`;
  }

  async function addSuggestion(s: AiSuggestion) {
    const key = suggestionKey(s);
    if (addedSet.has(key)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("trip_itinerary_items").insert({
      trip_id: tripId,
      day_number: s.day,
      time_slot: s.time_slot,
      title: s.title,
      description: s.description,
      location: s.location,
      cost_eur: s.cost_eur,
      sort_order: items.filter(i => i.day_number === s.day && i.time_slot === s.time_slot).length,
      created_by: user.id,
    }).select("*").single();
    if (data) {
      setItems(prev => [...prev, data as ItineraryItem]);
      setAddedSet(prev => new Set([...prev, key]));
    }
  }

  async function addAllSuggestions() {
    if (!suggestions) return;
    setAddingAll(true);
    for (const s of suggestions) {
      await addSuggestion(s);
    }
    setAddingAll(false);
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
          <h2 className="font-bold text-slate-900 text-lg">{t("title")}</h2>
          {!isEmpty && (
            <p className="text-xs text-slate-400 mt-0.5">
              {t("activities", { count: items.length })} · {totalCost > 0 ? t("costPlanned", { cost: totalCost.toFixed(0) }) : t("noCosts")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {!isEmpty && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
              <button onClick={() => setView("list")}
                className={`px-2.5 py-1.5 transition ${view === "list" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-500 hover:bg-slate-50"}`}>
                {t("listView")}
              </button>
              <button onClick={() => setView("timeline")}
                className={`px-2.5 py-1.5 border-l border-slate-200 transition ${view === "timeline" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-500 hover:bg-slate-50"}`}>
                {t("timelineView")}
              </button>
            </div>
          )}
          {isAiEnabled && !suggestions && (
            <button
              onClick={fetchAiSuggestions}
              disabled={aiLoading}
              className="btn-ghost text-sm flex items-center gap-1.5"
            >
              {aiLoading
                ? <><span className="animate-spin inline-block text-xs">⏳</span> {t("generating")}</>
                : <><span>🤖</span> {t("aiSuggest")}</>}
            </button>
          )}
          {suggestions && (
            <button onClick={() => { setSuggestions(null); setAddedSet(new Set()); }} className="btn-ghost text-sm text-slate-400">
              {t("closeAi")}
            </button>
          )}
          {open && <button onClick={() => setShowForm(f => !f)} className="btn-ghost text-sm">
            {showForm ? tc("cancel") : t("addButton")}
          </button>}
          <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm">{open ? tc("hide") : tc("show")}</button>
        </div>
      </div>

      {open && <>
      {/* Add form */}
      {showForm && (
        <form onSubmit={addItem} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{t("day")}</label>
              <select className="input text-sm" value={form.day_number}
                onChange={e => setForm(f => ({ ...f, day_number: parseInt(e.target.value) }))}>
                {days.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t("time")}</label>
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
            <label className="label">{t("activityLabel")} <span className="text-red-400">*</span></label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={t("titlePlaceholder")} required autoFocus />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{t("location")}</label>
              <input className="input text-sm" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder={t("locationPlaceholder")} />
            </div>
            <div>
              <label className="label">{t("cost")}</label>
              <input className="input text-sm" type="number" step="0.01" min="0" value={form.cost_eur}
                onChange={e => setForm(f => ({ ...f, cost_eur: e.target.value }))}
                placeholder={t("costPlaceholder")} />
            </div>
          </div>
          <div>
            <label className="label">{t("notesLabel")}</label>
            <input className="input text-sm" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={t("notesPlaceholder")} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? t("adding") : t("addTitle")}
          </button>
        </form>
      )}

      {/* AI error */}
      {aiError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <span>{aiError}</span>
          <button onClick={() => setAiError(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* AI suggestions panel */}
      {suggestions && suggestions.length > 0 && (
        <div className="border border-indigo-200 rounded-xl overflow-hidden">
          <div className="bg-indigo-50 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-indigo-800">{t("aiPanelTitle")}</p>
              <p className="text-xs text-indigo-500 mt-0.5">
                {t("activities", { count: suggestions.length })} · {t("aiPanelAdded", { added: addedSet.size })}
              </p>
            </div>
            <button
              onClick={addAllSuggestions}
              disabled={addingAll || addedSet.size === suggestions.length}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {addingAll ? t("adding") : addedSet.size === suggestions.length ? t("allAdded") : t("addAll")}
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {Array.from({ length: tripDays }, (_, i) => i + 1).map(day => {
              const dayItems = suggestions.filter(s => s.day === day);
              if (dayItems.length === 0) return null;
              return (
                <div key={day} className="px-4 py-3 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{dayLabel(day)}</p>
                  {dayItems.map(s => {
                    const key = suggestionKey(s);
                    const added = addedSet.has(key);
                    const slot = slotMeta(s.time_slot);
                    return (
                      <div key={key} className={`flex items-start gap-3 p-2.5 rounded-xl transition ${added ? "opacity-50 bg-emerald-50" : "bg-white border border-slate-100 hover:border-indigo-200"}`}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                          style={{ background: isDark ? `${slot.color}26` : slot.bg, color: slot.color }}>
                          {slot.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                          {s.location && <p className="text-xs text-slate-400">📍 {s.location}</p>}
                          {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
                          {s.cost_eur != null && s.cost_eur > 0 && (
                            <p className="text-xs text-indigo-500 mt-0.5 font-semibold">~€{s.cost_eur}</p>
                          )}
                          {s.cost_eur === 0 && <p className="text-xs text-emerald-500 mt-0.5">Free</p>}
                        </div>
                        <button
                          onClick={() => addSuggestion(s)}
                          disabled={added}
                          className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition ${added ? "text-emerald-600 bg-emerald-100" : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"}`}
                        >
                          {added ? "✓" : t("addButton")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !showForm && !suggestions && (
        <div className="py-6 text-center">
          <p className="text-slate-400 text-sm">{t("noActivities")}</p>
          <p className="text-xs text-slate-400 mt-1">{t("noActivitiesHint")}</p>
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
      </>}
    </div>
  );
}
