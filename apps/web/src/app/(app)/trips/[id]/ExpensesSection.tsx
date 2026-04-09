"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFuelPrice } from "@/lib/data/fuel-prices";
import { COUNTRIES } from "@/lib/data/geo";

interface Member { user_id: string; name: string; }

interface Car {
  id: string;
  owner_user_id: string;
  name: string;
  fuel_consumption_per_100km: number;
  fuel_cost_per_liter: number;
}

interface Expense {
  id: string;
  trip_id: string;
  paid_by: string;
  amount_eur: number;
  description: string;
  category: string;
  split_with: string[];
  distance_km: number | null;
  car_id: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "flight",    label: "✈️ Flight",      color: "#3b82f6", bg: "#eff6ff" },
  { value: "hotel",     label: "🏨 Hotel",        color: "#8b5cf6", bg: "#f5f3ff" },
  { value: "car-trip",  label: "🚗 Road trip",    color: "#f59e0b", bg: "#fffbeb" },
  { value: "food",      label: "🍽️ Food",         color: "#10b981", bg: "#ecfdf5" },
  { value: "transport", label: "🚌 Transport",     color: "#06b6d4", bg: "#ecfeff" },
  { value: "activity",  label: "🎟️ Activity",     color: "#f43f5e", bg: "#fff1f2" },
  { value: "other",     label: "📦 Other",         color: "#94a3b8", bg: "#f8fafc" },
];

function catMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

function name(uid: string, members: Member[]) {
  return members.find(m => m.user_id === uid)?.name ?? "Unknown";
}

function computeSettlement(expenses: Expense[], members: Member[]) {
  const balance: Record<string, number> = {};
  for (const m of members) balance[m.user_id] = 0;
  for (const e of expenses) {
    const split = e.split_with.length || 1;
    const share = e.amount_eur / split;
    for (const uid of e.split_with) {
      if (uid === e.paid_by) balance[uid] = (balance[uid] ?? 0) + e.amount_eur - share;
      else                   balance[uid] = (balance[uid] ?? 0) - share;
    }
  }
  const debtors   = Object.entries(balance).filter(([, b]) => b < -0.005).map(([uid, b]) => ({ uid, amount: -b }));
  const creditors = Object.entries(balance).filter(([, b]) => b > 0.005).map(([uid, b]) => ({ uid, amount: b }));
  const transfers: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.005) transfers.push({ from: debtors[i].uid, to: creditors[j].uid, amount });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return transfers;
}

export default function ExpensesSection({
  tripId, members, initialExpenses, initialCars, currentUserId, homeCountry,
}: {
  tripId: string;
  members: Member[];
  initialExpenses: Expense[];
  initialCars: Car[];
  currentUserId: string;
  homeCountry?: string;
}) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [cars, setCars]         = useState<Car[]>(initialCars);
  const [open, setOpen]         = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCarForm, setShowCarForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [savingCar, setSavingCar] = useState(false);

  const [form, setForm] = useState({
    description: "",
    amount_eur: "",
    category: "flight",
    paid_by: currentUserId,
    split_with: members.map(m => m.user_id),
    distance_km: "",
    car_id: "",
  });

  const countryFuelAvg = homeCountry ? (getFuelPrice(homeCountry) ?? 1.70) : 1.70;
  const [carForm, setCarForm] = useState({
    name: "",
    fuel_consumption_per_100km: "",
    fuel_cost_per_liter: String(countryFuelAvg),
  });

  // Auto-calculate car trip cost from distance
  const selectedCar = cars.find(c => c.id === form.car_id);
  const autoCarCost = (form.category === "car-trip" && selectedCar && form.distance_km)
    ? ((parseFloat(form.distance_km) / 100) * selectedCar.fuel_consumption_per_100km * selectedCar.fuel_cost_per_liter).toFixed(2)
    : null;

  function toggleSplit(uid: string) {
    setForm(f => ({
      ...f,
      split_with: f.split_with.includes(uid)
        ? f.split_with.filter(x => x !== uid)
        : [...f.split_with, uid],
    }));
  }

  function handleCategoryChange(cat: string) {
    setForm(f => ({ ...f, category: cat, car_id: "", distance_km: "", amount_eur: "" }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || form.split_with.length === 0) return;
    const amount = parseFloat(form.amount_eur || autoCarCost || "0");
    if (!amount) return;
    setSaving(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      trip_id: tripId,
      paid_by: form.paid_by,
      amount_eur: amount,
      description: form.description,
      category: form.category,
      split_with: form.split_with,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      car_id: form.car_id || null,
    };
    const { data } = await supabase.from("trip_expenses").insert(payload).select("*").single();
    if (data) setExpenses(prev => [...prev, data as Expense]);
    setShowForm(false);
    setForm({ description: "", amount_eur: "", category: "flight", paid_by: currentUserId, split_with: members.map(m => m.user_id), distance_km: "", car_id: "" });
    setSaving(false);
  }

  async function handleAddCar(e: React.FormEvent) {
    e.preventDefault();
    if (!carForm.name || !carForm.fuel_consumption_per_100km) return;
    setSavingCar(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("user_cars").insert({
      owner_user_id: user.id,
      name: carForm.name,
      fuel_consumption_per_100km: parseFloat(carForm.fuel_consumption_per_100km),
      fuel_cost_per_liter: parseFloat(carForm.fuel_cost_per_liter || "1.70"),
    }).select("*").single();
    if (data) {
      setCars(prev => [...prev, data as Car]);
      setForm(f => ({ ...f, car_id: (data as Car).id }));
    }
    setCarForm({ name: "", fuel_consumption_per_100km: "", fuel_cost_per_liter: String(countryFuelAvg) });
    setShowCarForm(false);
    setSavingCar(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("trip_expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const total      = expenses.reduce((s, e) => s + e.amount_eur, 0);
  const settlement = computeSettlement(expenses, members);

  // Category breakdown
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount_eur, 0),
  })).filter(c => c.total > 0);

  // Per-person totals
  const perPerson = members.map(m => {
    const paid = expenses.filter(e => e.paid_by === m.user_id).reduce((s, e) => s + e.amount_eur, 0);
    const owes = expenses
      .filter(e => e.split_with.includes(m.user_id))
      .reduce((s, e) => s + e.amount_eur / e.split_with.length, 0);
    return { ...m, paid, owes, net: paid - owes };
  });

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">💸 Trip costs</h2>
          {expenses.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              Total: <strong>€{total.toFixed(2)}</strong> · {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm">{open ? "Hide" : "Show"}</button>
          {open && <button onClick={() => setShowForm(f => !f)} className="btn-ghost text-sm">
            {showForm ? "Cancel" : "+ Add expense"}
          </button>}
        </div>
      </div>

      {/* Summary cards */}
      {open && <>
      {expenses.length > 0 && (
        <>
          {/* By category */}
          <div className="flex gap-2 flex-wrap">
            {byCategory.map(cat => (
              <div key={cat.value} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
                style={{ background: isDark ? `${cat.color}26` : cat.bg, color: cat.color }}>
                <span>{cat.label.split(" ")[0]}</span>
                <span>€{cat.total.toFixed(0)}</span>
              </div>
            ))}
          </div>

          {/* Per person */}
          {members.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Per person breakdown</p>
              <div className={`grid gap-2 grid-cols-2 sm:grid-cols-${Math.min(members.length, 3)}`}>
                {perPerson.map(m => (
                  <div key={m.user_id} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 truncate">{m.name}</p>
                    <p className="text-lg font-bold text-slate-800">€{m.owes.toFixed(0)}</p>
                    <p className="text-xs text-slate-400">their share</p>
                    {m.paid > 0 && <p className="text-xs text-emerald-600 mt-1 font-semibold">paid €{m.paid.toFixed(0)}</p>}
                    {m.net !== 0 && (
                      <p className={`text-xs mt-0.5 font-semibold ${m.net > 0 ? "text-green-600" : "text-red-500"}`}>
                        {m.net > 0 ? `+€${m.net.toFixed(0)} owed back` : `-€${Math.abs(m.net).toFixed(0)} to pay`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add expense form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-slate-50 rounded-xl p-5 space-y-4 border border-slate-200">
          {/* Category picker */}
          <div>
            <label className="label">Type</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => handleCategoryChange(c.value)}
                  className={[
                    "px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition",
                    form.category === c.value
                      ? "border-transparent text-white"
                      : "border-slate-200 text-slate-600 bg-white hover:border-slate-300",
                  ].join(" ")}
                  style={form.category === c.value ? { background: c.color, borderColor: c.color } : {}}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Car trip fields */}
          {form.category === "car-trip" && (
            <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Road trip details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Car</label>
                  <select className="input text-sm" value={form.car_id} onChange={e => setForm(f => ({ ...f, car_id: e.target.value }))}>
                    <option value="">Select a car…</option>
                    {cars.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.fuel_consumption_per_100km}L/100km · €{c.fuel_cost_per_liter}/L)
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowCarForm(f => !f)}
                    className="text-xs text-indigo-500 hover:underline mt-1">
                    {showCarForm ? "Cancel" : "+ Add car"}
                  </button>
                </div>
                <div>
                  <label className="label">Distance (km)</label>
                  <input className="input text-sm" type="number" min="0" value={form.distance_km}
                    onChange={e => setForm(f => ({ ...f, distance_km: e.target.value }))}
                    placeholder="e.g. 850" />
                </div>
              </div>

              {/* Inline add car form */}
              {showCarForm && (
                <form onSubmit={handleAddCar} className="bg-white rounded-xl p-3 space-y-3 border border-amber-200">
                  <p className="text-xs font-semibold text-slate-600">Add a car</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="label text-xs">Name</label>
                      <input className="input text-sm" value={carForm.name}
                        onChange={e => setCarForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. My VW Golf" required />
                    </div>
                    <div>
                      <label className="label text-xs">L/100km</label>
                      <input className="input text-sm" type="number" step="0.1" min="1" value={carForm.fuel_consumption_per_100km}
                        onChange={e => setCarForm(f => ({ ...f, fuel_consumption_per_100km: e.target.value }))}
                        placeholder="e.g. 6.5" required />
                    </div>
                    <div>
                      <label className="label text-xs">
                        €/litre
                        {homeCountry && getFuelPrice(homeCountry) && (
                          <span className="text-slate-400 font-normal ml-1">
                            ({COUNTRIES.find(c => c.code === homeCountry)?.name ?? homeCountry} avg: €{getFuelPrice(homeCountry)!.toFixed(2)})
                          </span>
                        )}
                      </label>
                      <input className="input text-sm" type="number" step="0.01" min="0" value={carForm.fuel_cost_per_liter}
                        onChange={e => setCarForm(f => ({ ...f, fuel_cost_per_liter: e.target.value }))}
                        placeholder={String(countryFuelAvg)} />
                    </div>
                  </div>
                  <button type="submit" disabled={savingCar} className="btn-primary text-xs px-4">
                    {savingCar ? "Saving…" : "Save car"}
                  </button>
                </form>
              )}

              {autoCarCost && (
                <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-100 rounded-lg px-3 py-2">
                  <span>⛽</span>
                  <span>Estimated fuel cost: <strong>€{autoCarCost}</strong></span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, amount_eur: autoCarCost! }))}
                    className="ml-auto text-xs underline text-amber-700">Use this</button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Description</label>
              <input className="input" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={form.category === "car-trip" ? "e.g. Fuel Lisbon–Madrid" : "e.g. Hotel deposit"}
                required />
            </div>
            <div>
              <label className="label">
                Amount (€)
                {form.category === "car-trip" && autoCarCost && (
                  <span className="text-xs text-slate-400 ml-1">or use calculated above</span>
                )}
              </label>
              <input className="input" type="number" step="0.01" min="0"
                value={form.amount_eur}
                onChange={e => setForm(f => ({ ...f, amount_eur: e.target.value }))}
                placeholder={autoCarCost ?? "0.00"}
                required={!autoCarCost} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Paid by</label>
              <select className="input" value={form.paid_by}
                onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Split with</label>
              <div className="flex flex-wrap gap-1.5">
                {members.map(m => (
                  <button key={m.user_id} type="button" onClick={() => toggleSplit(m.user_id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition ${form.split_with.includes(m.user_id) ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-200 text-slate-600"}`}>
                    {m.name}
                  </button>
                ))}
              </div>
              {form.split_with.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  €{((parseFloat(form.amount_eur || autoCarCost || "0")) / form.split_with.length).toFixed(2)} each
                </p>
              )}
            </div>
          </div>

          <button type="submit" className="btn-primary text-sm" disabled={saving}>
            {saving ? "Saving…" : "Add expense"}
          </button>
        </form>
      )}

      {/* Expense list */}
      {expenses.length > 0 ? (
        <div className="space-y-1">
          {expenses.map(e => {
            const cat  = catMeta(e.category);
            const share = (e.amount_eur / e.split_with.length).toFixed(2);
            const car  = e.car_id ? cars.find(c => c.id === e.car_id) : null;
            return (
              <div key={e.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: isDark ? `${cat.color}26` : cat.bg, color: cat.color }}>
                  {cat.label.split(" ")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{e.description}</p>
                  <p className="text-xs text-slate-400">
                    Paid by {name(e.paid_by, members)}
                    {" · "}€{share} each
                    {e.distance_km && ` · ${e.distance_km}km`}
                    {car && ` · ${car.name}`}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-700 flex-shrink-0">€{e.amount_eur.toFixed(2)}</span>
                <button onClick={() => handleDelete(e.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition px-1">
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-4">No expenses yet. Add flights, hotel, fuel and more above.</p>
      )}

      {/* Settlement */}
      {settlement.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Who owes who</p>
            <span className="text-xs text-slate-400">{settlement.length} payment{settlement.length !== 1 ? "s" : ""} needed</span>
          </div>
          {settlement.map((t, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb", border: `1px solid ${isDark ? "rgba(245,158,11,0.25)" : "#fde68a"}` }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800">{name(t.from, members)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">owes</span>
                  <span className="text-sm font-bold text-slate-800">{name(t.to, members)}</span>
                </div>
              </div>
              <span className="font-bold text-lg text-indigo-600 flex-shrink-0">€{t.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {expenses.length > 0 && settlement.length === 0 && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-semibold">
            <span>✓</span><span>All settled up!</span>
          </div>
        </div>
      )}

      {/* Cars list (shown if any cars added) */}
      {cars.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Your cars</p>
          <div className="flex flex-wrap gap-2">
            {cars.map(c => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                style={{ background: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb", border: `1px solid ${isDark ? "rgba(245,158,11,0.25)" : "#fde68a"}`, color: isDark ? "#fcd34d" : "#92400e" }}>
                <span>🚗</span>
                <span className="font-semibold">{c.name}</span>
                <span className="text-amber-500">{c.fuel_consumption_per_100km}L/100km · €{c.fuel_cost_per_liter}/L</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
