"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface LoyaltyNumber {
  id: string;
  user_id: string;
  programme: string;
  programme_type: "airline" | "hotel" | "car_rental";
  membership_number: string;
  tier: string | null;
  notes: string | null;
}

const TYPE_OPTIONS = [
  { value: "airline",     label: "✈️ Airline",      icon: "✈️" },
  { value: "hotel",       label: "🏨 Hotel",         icon: "🏨" },
  { value: "car_rental",  label: "🚗 Car rental",    icon: "🚗" },
];

const POPULAR_PROGRAMMES: Record<string, string[]> = {
  airline:    ["TAP Miles&Go", "Iberia Plus", "Air France-KLM Flying Blue", "British Airways Executive Club", "Lufthansa Miles & More", "Ryanair Cash", "EasyJet loyalty", "United MileagePlus", "Delta SkyMiles", "Emirates Skywards", "Qatar Airways Privilege Club", "Singapore Airlines KrisFlyer", "Oneworld", "Star Alliance"],
  hotel:      ["Marriott Bonvoy", "Hilton Honors", "IHG One Rewards", "World of Hyatt", "Accor Live Limitless", "Wyndham Rewards", "Best Western Rewards"],
  car_rental: ["Hertz Gold Plus", "Avis Preferred", "Enterprise Plus", "Europcar", "SIXT loyalty", "Budget Fastbreak"],
};

export default function LoyaltySection() {
  const [entries, setEntries]   = useState<LoyaltyNumber[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm]         = useState({
    programme: "", programme_type: "airline" as LoyaltyNumber["programme_type"],
    membership_number: "", tier: "", notes: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_loyalty_numbers")
        .select("*").eq("user_id", user.id).order("created_at");
      if (data) setEntries(data as LoyaltyNumber[]);
      setLoading(false);
    }
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.programme || !form.membership_number) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data } = await supabase.from("user_loyalty_numbers").insert({
      user_id: user.id,
      programme: form.programme.trim(),
      programme_type: form.programme_type,
      membership_number: form.membership_number.trim(),
      tier: form.tier.trim() || null,
      notes: form.notes.trim() || null,
    }).select("*").single();
    if (data) setEntries(prev => [...prev, data as LoyaltyNumber]);
    setForm({ programme: "", programme_type: "airline", membership_number: "", tier: "", notes: "" });
    setShowForm(false);
    setSaving(false);
  }

  async function remove(id: string) {
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("user_loyalty_numbers").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
    setDeleting(null);
  }

  const byType = TYPE_OPTIONS.map(t => ({
    ...t,
    entries: entries.filter(e => e.programme_type === t.value),
  })).filter(t => t.entries.length > 0 || showForm);

  if (loading) return null;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-2">🎫 Loyalty & frequent flyer numbers</h2>
          <p className="text-xs text-slate-400 mt-0.5">Stored securely — never shared with anyone.</p>
        </div>
        <button type="button" onClick={() => setShowForm(f => !f)} className="btn-ghost text-sm">
          {showForm ? "Cancel" : "+ Add programme"}
        </button>
      </div>

      {/* Existing entries */}
      {entries.length === 0 && !showForm && (
        <p className="text-sm text-slate-400 text-center py-3">No loyalty numbers saved yet.</p>
      )}

      {TYPE_OPTIONS.map(type => {
        const typeEntries = entries.filter(e => e.programme_type === type.value);
        if (typeEntries.length === 0) return null;
        return (
          <div key={type.value}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{type.label}</p>
            <div className="space-y-2">
              {typeEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{entry.programme}</p>
                    <p className="text-sm font-mono text-indigo-600 mt-0.5">{entry.membership_number}</p>
                    {entry.tier && <p className="text-xs text-amber-600 mt-0.5">⭐ {entry.tier}</p>}
                    {entry.notes && <p className="text-xs text-slate-400 mt-0.5">{entry.notes}</p>}
                  </div>
                  <button type="button" onClick={() => remove(entry.id)}
                    disabled={deleting === entry.id}
                    className="text-xs text-red-400 hover:text-red-600 transition px-1 flex-shrink-0">
                    {deleting === entry.id ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add form */}
      {showForm && (
        <form onSubmit={save} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Add loyalty number</p>

          {/* Type selector */}
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(t => (
              <button key={t.value} type="button"
                onClick={() => setForm(f => ({ ...f, programme_type: t.value as LoyaltyNumber["programme_type"], programme: "" }))}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition ${
                  form.programme_type === t.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Programme <span className="text-red-400">*</span></label>
              <input className="input text-sm" list={`programmes-${form.programme_type}`}
                value={form.programme}
                onChange={e => setForm(f => ({ ...f, programme: e.target.value }))}
                placeholder="e.g. TAP Miles&Go" required />
              <datalist id={`programmes-${form.programme_type}`}>
                {POPULAR_PROGRAMMES[form.programme_type]?.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Membership number <span className="text-red-400">*</span></label>
              <input className="input text-sm font-mono" value={form.membership_number}
                onChange={e => setForm(f => ({ ...f, membership_number: e.target.value }))}
                placeholder="e.g. TP123456789" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status / tier (optional)</label>
              <input className="input text-sm" value={form.tier}
                onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
                placeholder="e.g. Gold, Platinum" />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input text-sm" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Expires Dec 2025" />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </div>
  );
}
