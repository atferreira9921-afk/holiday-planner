"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FamilyMember } from "@holiday-planner/shared-types";
import { COUNTRIES, getAirports, getRegions } from "@/lib/data/geo";
import { getFuelPrice } from "@/lib/data/fuel-prices";
import FamilyMemberAvatarCard, { type AvatarConfig, DEFAULT_AVATAR_CONFIG } from "./FamilyMemberAvatarCard";
import FamilyLoading from "./loading";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  { id: "indigo",  dot: "#6366f1" },
  { id: "rose",    dot: "#f43f5e" },
  { id: "amber",   dot: "#f59e0b" },
  { id: "teal",    dot: "#14b8a6" },
  { id: "violet",  dot: "#8b5cf6" },
  { id: "orange",  dot: "#f97316" },
  { id: "cyan",    dot: "#06b6d4" },
  { id: "emerald", dot: "#10b981" },
];

const INTERESTS = ["beach", "mountains", "culture", "food", "nightlife", "nature", "city", "adventure", "relaxation", "history"];

const STYLES = [
  { value: "budget",    label: "Budget",    icon: "🎒" },
  { value: "mid-range", label: "Mid-range", icon: "✈️" },
  { value: "luxury",    label: "Luxury",    icon: "💎" },
];

const GENDERS = [
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "female",            label: "Female" },
  { value: "male",              label: "Male" },
  { value: "other",             label: "Other" },
];

const emptyForm: Omit<FamilyMember, "id" | "owner_user_id" | "linked_user_id" | "created_at"> = {
  display_name: "",
  home_country: "PT",
  home_city: "LIS",
  color: "rose",
  vacation_days_per_year: 22,
  gender: "prefer_not_to_say",
  birthday: null,
  birthday_is_vacation_day: false,
  on_parental_leave: false,
  parental_leave_end_date: null,
  travel_style: "mid-range",
  budget_min_eur: 300,
  budget_max_eur: 2000,
  interests: [],
  avoid_destinations: [],
  preferred_countries: [],
  home_region: null,
  home_city_name: null,
  loyalty_programs: [],
  avatar_config: { hair: 0, glasses: 0, face: 0, shirt: 0, bottom: 0, clothesColor: 0 },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Car {
  id: string;
  owner_user_id: string;
  family_member_id: string | null;
  name: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  fuel_consumption_per_100km: number;
  fuel_cost_per_liter: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);

  // My own cars (family_member_id = null)
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [showMyCarForm, setShowMyCarForm] = useState(false);
  const [savingMyCar, setSavingMyCar] = useState(false);
  const [deletingMyCarId, setDeletingMyCarId] = useState<string | null>(null);
  const [myCarForm, setMyCarForm] = useState({ make: "", model: "", year: "", name: "", fuel_consumption_per_100km: "", fuel_cost_per_liter: "" });
  const [myAiEstimate, setMyAiEstimate] = useState<{ l_per_100km: number; note: string } | null>(null);
  const [myAiLoading, setMyAiLoading] = useState(false);
  const [myAiError, setMyAiError] = useState<string | null>(null);

  // Loyalty programs (inline state for the edit form)
  const [newLoyaltyAirline, setNewLoyaltyAirline] = useState("");
  const [newLoyaltyNumber, setNewLoyaltyNumber] = useState("");

  // Cars (attached to a family member)
  const [memberCars, setMemberCars] = useState<Car[]>([]);
  const [showCarForm, setShowCarForm] = useState(false);
  const [savingCar, setSavingCar] = useState(false);
  const [deletingCarId, setDeletingCarId] = useState<string | null>(null);
  const [carForm, setCarForm] = useState({ make: "", model: "", year: "", name: "", fuel_consumption_per_100km: "", fuel_cost_per_liter: "" });
  const [aiEstimate, setAiEstimate] = useState<{ l_per_100km: number; note: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: membersData }, { data: carsData }] = await Promise.all([
      supabase.from("family_members").select("*").eq("owner_user_id", user.id).order("created_at"),
      supabase.from("user_cars").select("*").eq("owner_user_id", user.id).is("family_member_id", null).order("created_at"),
    ]);
    setMembers(membersData ?? []);
    setMyCars(carsData ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!editId) { setMemberCars([]); return; }
    const supabase = createClient();
    supabase.from("user_cars").select("*").eq("family_member_id", editId).order("created_at")
      .then(({ data }) => setMemberCars(data ?? []));
  }, [editId]);

  function setF<K extends keyof typeof emptyForm>(key: K, value: typeof emptyForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleInterest(v: string) {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(v) ? f.interests.filter(x => x !== v) : [...f.interests, v],
    }));
  }

  function handleCountryChange(code: string) {
    const airports = getAirports(code);
    setForm(f => ({
      ...f,
      home_country: code,
      home_city: airports[0]?.iata ?? f.home_city,
      home_region: null,
    }));
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!form.display_name.trim() || !form.home_country) {
      setError("Name and country are required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      ...form,
      display_name: form.display_name.trim(),
      home_country: form.home_country.toUpperCase(),
      home_city: form.home_city.toUpperCase() || "???",
      owner_user_id: user.id,
      avatar_config: avatarConfig,
    };

    if (editId) {
      await supabase.from("family_members").update(payload).eq("id", editId);
    } else {
      await supabase.from("family_members").insert(payload);
    }

    setForm(emptyForm);
    setAvatarConfig(DEFAULT_AVATAR_CONFIG);
    setEditId(null);
    setSaving(false);
    load();
  }

  function startEdit(m: FamilyMember) {
    setEditId(m.id);
    setNewLoyaltyAirline("");
    setNewLoyaltyNumber("");
    setForm({
      ...emptyForm,
      display_name: m.display_name,
      home_country: m.home_country,
      home_city: m.home_city,
      color: m.color,
      vacation_days_per_year: m.vacation_days_per_year ?? 22,
      gender: m.gender ?? "prefer_not_to_say",
      birthday: m.birthday ?? null,
      birthday_is_vacation_day: m.birthday_is_vacation_day ?? false,
      on_parental_leave: m.on_parental_leave ?? false,
      parental_leave_end_date: m.parental_leave_end_date ?? null,
      travel_style: m.travel_style ?? "mid-range",
      budget_min_eur: m.budget_min_eur ?? 300,
      budget_max_eur: m.budget_max_eur ?? 2000,
      interests: m.interests ?? [],
      avoid_destinations: m.avoid_destinations ?? [],
      preferred_countries: m.preferred_countries ?? [],
      home_region: m.home_region ?? null,
      home_city_name: m.home_city_name ?? null,
      loyalty_programs: m.loyalty_programs ?? [],
      avatar_config: m.avatar_config ?? DEFAULT_AVATAR_CONFIG,
    });
    setAvatarConfig(m.avatar_config ?? DEFAULT_AVATAR_CONFIG);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("family_members").delete().eq("id", id);
    load();
  }

  function cancelEdit() { setEditId(null); setForm(emptyForm); setAvatarConfig(DEFAULT_AVATAR_CONFIG); setError(null); setShowCarForm(false); setMemberCars([]); setNewLoyaltyAirline(""); setNewLoyaltyNumber(""); }

  function addLoyalty() {
    const airline = newLoyaltyAirline.trim();
    const number  = newLoyaltyNumber.trim();
    if (!airline || !number) return;
    setF("loyalty_programs", [...(form.loyalty_programs ?? []), { airline, number }]);
    setNewLoyaltyAirline("");
    setNewLoyaltyNumber("");
  }

  function removeLoyalty(idx: number) {
    setF("loyalty_programs", (form.loyalty_programs ?? []).filter((_, i) => i !== idx));
  }

  async function saveMycar(e: React.FormEvent) {
    e.preventDefault();
    if (!myCarForm.make || !myCarForm.model || !myCarForm.fuel_consumption_per_100km) return;
    setSavingMyCar(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingMyCar(false); return; }
    const displayName = myCarForm.name.trim() || `${myCarForm.make} ${myCarForm.model}${myCarForm.year ? ` (${myCarForm.year})` : ""}`;
    const { data } = await supabase.from("user_cars").insert({
      owner_user_id: user.id,
      family_member_id: null,
      make: myCarForm.make.trim(),
      model: myCarForm.model.trim(),
      year: myCarForm.year ? parseInt(myCarForm.year) : null,
      name: displayName,
      fuel_consumption_per_100km: parseFloat(myCarForm.fuel_consumption_per_100km),
      fuel_cost_per_liter: parseFloat(myCarForm.fuel_cost_per_liter || "1.70"),
    }).select("*").single();
    if (data) setMyCars(prev => [...prev, data as Car]);
    setMyCarForm({ make: "", model: "", year: "", name: "", fuel_consumption_per_100km: "", fuel_cost_per_liter: "" });
    setMyAiEstimate(null);
    setShowMyCarForm(false);
    setSavingMyCar(false);
  }

  async function deleteMycar(id: string) {
    setDeletingMyCarId(id);
    const supabase = createClient();
    await supabase.from("user_cars").delete().eq("id", id);
    setMyCars(prev => prev.filter(c => c.id !== id));
    setDeletingMyCarId(null);
  }

  async function estimateMyCons() {
    if (!myCarForm.make || !myCarForm.model) return;
    setMyAiLoading(true); setMyAiError(null); setMyAiEstimate(null);
    try {
      const res = await fetch("/api/cars/estimate-consumption", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make: myCarForm.make, model: myCarForm.model, year: myCarForm.year ? parseInt(myCarForm.year) : undefined }),
      });
      const data = await res.json();
      if (data.error) setMyAiError(data.error);
      else { setMyAiEstimate(data); setMyCarForm(f => ({ ...f, fuel_consumption_per_100km: String(data.l_per_100km) })); }
    } catch { setMyAiError("Request failed"); }
    setMyAiLoading(false);
  }

  async function saveCar(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !carForm.make || !carForm.model || !carForm.fuel_consumption_per_100km) return;
    setSavingCar(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingCar(false); return; }
    const displayName = carForm.name.trim() || `${carForm.make} ${carForm.model}${carForm.year ? ` (${carForm.year})` : ""}`;
    const { data } = await supabase.from("user_cars").insert({
      owner_user_id: user.id,
      family_member_id: editId,
      make: carForm.make.trim(),
      model: carForm.model.trim(),
      year: carForm.year ? parseInt(carForm.year) : null,
      name: displayName,
      fuel_consumption_per_100km: parseFloat(carForm.fuel_consumption_per_100km),
      fuel_cost_per_liter: parseFloat(carForm.fuel_cost_per_liter || String(getFuelPrice(form.home_country) ?? 1.70)),
    }).select("*").single();
    if (data) setMemberCars(prev => [...prev, data as Car]);
    const countryAvg = getFuelPrice(form.home_country);
    setCarForm({ make: "", model: "", year: "", name: "", fuel_consumption_per_100km: "", fuel_cost_per_liter: countryAvg ? String(countryAvg) : "1.70" });
    setAiEstimate(null);
    setShowCarForm(false);
    setSavingCar(false);
  }

  async function deleteCar(id: string) {
    setDeletingCarId(id);
    const supabase = createClient();
    await supabase.from("user_cars").delete().eq("id", id);
    setMemberCars(prev => prev.filter(c => c.id !== id));
    setDeletingCarId(null);
  }

  async function estimateCons() {
    if (!carForm.make || !carForm.model) return;
    setAiLoading(true); setAiError(null); setAiEstimate(null);
    try {
      const res = await fetch("/api/cars/estimate-consumption", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make: carForm.make, model: carForm.model, year: carForm.year ? parseInt(carForm.year) : undefined }),
      });
      const data = await res.json();
      if (data.error) setAiError(data.error);
      else { setAiEstimate(data); setCarForm(f => ({ ...f, fuel_consumption_per_100km: String(data.l_per_100km) })); }
    } catch { setAiError("Request failed"); }
    setAiLoading(false);
  }

  const colorDot = (id: string) => COLORS.find(c => c.id === id)?.dot ?? "#6366f1";

  const leaveLabel = (gender: string) =>
    gender === "female" ? "Maternity leave" : gender === "male" ? "Paternity leave" : "Parental leave";

  const formAirports = getAirports(form.home_country);
  const formRegions = getRegions(form.home_country);
  const countryName = (code: string) => COUNTRIES.find(c => c.code === code)?.name ?? code;

  const avatarColorDot = COLORS.find(c => c.id === form.color)?.dot ?? "#6366f1";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Family & Friends</h1>
        <p className="text-slate-500 text-sm mt-1">
          Each person has their own profile — vacation days, interests, travel style, and parental leave — so trip planning accounts for everyone.
        </p>
      </div>

      {/* Members list */}
      {loading ? (
        <FamilyLoading />
      ) : members.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 text-sm">
          No one added yet. Use the form below to add a family member or travel companion.
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {members.map(m => (
            <div key={m.id}>
              {/* Summary row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: colorDot(m.color) }}>
                  {m.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{m.display_name}</p>
                    {m.on_parental_leave && (
                      <span className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full">
                        {leaveLabel(m.gender)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {countryName(m.home_country)} · {m.home_city} · {m.vacation_days_per_year ?? 22} days/yr · {m.travel_style ?? "mid-range"}
                    {(m.interests ?? []).length > 0 && ` · ${m.interests.slice(0, 2).join(", ")}${m.interests.length > 2 ? "…" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-slate-400 text-xs">{expanded === m.id ? "▲" : "▼"}</span>
                  <button onClick={e => { e.stopPropagation(); startEdit(m); }}
                    className="btn-ghost text-xs px-3 py-1.5">Edit</button>
                  <button onClick={e => { e.stopPropagation(); remove(m.id); }}
                    className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition">Remove</button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === m.id && (
                <div className="px-5 pb-4 grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-2 text-sm bg-slate-50 border-t border-slate-100">
                  <Detail label="Base city" value={(() => {
                    const airportList = getAirports(m.home_country);
                    const city = m.home_city_name ?? airportList.find(a => a.iata === m.home_city)?.city ?? m.home_city;
                    const country = countryName(m.home_country);
                    return `${city}, ${country}`;
                  })()} />
                  {m.home_region && (
                    <Detail label="Region" value={(() => {
                      const r = getRegions(m.home_country).find(r => r.code === m.home_region);
                      return r ? `${r.name} (${r.code})` : m.home_region ?? "—";
                    })()} />
                  )}
                  <Detail label="Gender" value={GENDERS.find(g => g.value === m.gender)?.label ?? "—"} />
                  <Detail label="Vacation days/yr" value={String(m.vacation_days_per_year ?? 22)} />
                  <Detail label="Travel style" value={STYLES.find(s => s.value === m.travel_style)?.label ?? "—"} />
                  <Detail label="Budget" value={`€${m.budget_min_eur ?? 300}–€${m.budget_max_eur ?? 2000}`} />
                  {m.on_parental_leave && (
                    <Detail label={leaveLabel(m.gender)} value={m.parental_leave_end_date ? `until ${m.parental_leave_end_date}` : "yes"} />
                  )}
                  {(m.interests ?? []).length > 0 && (
                    <div className="col-span-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Interests</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.interests.map(i => (
                          <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full capitalize">{i}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(m.avoid_destinations ?? []).length > 0 && (
                    <Detail label="Avoid" value={m.avoid_destinations.join(", ")} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form — two-column on large screens */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* Avatar preview — sticky on desktop */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-[88px]">
          <FamilyMemberAvatarCard
            name={form.display_name}
            gender={form.gender ?? "prefer_not_to_say"}
            country={form.home_country}
            cityName={form.home_city_name}
            travelStyle={form.travel_style ?? "mid-range"}
            interests={form.interests ?? []}
            colorId={form.color}
            colorDot={avatarColorDot}
            config={avatarConfig}
            onConfigChange={setAvatarConfig}
          />
        </div>

        {/* Form */}
        <div className="flex-1 card p-6 space-y-6">
        <h2 className="font-bold text-slate-900 text-lg">{editId ? "Edit person" : "Add a person"}</h2>

        <form onSubmit={handleSave} className="space-y-6">

          {/* ── Identity ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Identity</h3>

            <div>
              <label className="label">Name</label>
              <input className="input" value={form.display_name}
                onChange={e => setF("display_name", e.target.value)} placeholder="e.g. Sarah" required />
            </div>

            <div>
              <label className="label">Calendar colour</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {COLORS.map(c => (
                  <button key={c.id} type="button" onClick={() => setF("color", c.id)}
                    className={`w-8 h-8 rounded-full border-2 transition ${form.color === c.id ? "border-slate-700 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c.dot }} />
                ))}
              </div>
            </div>
          </section>

          {/* ── Home base ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Home base</h3>

            <div>
              <label className="label">Country</label>
              <select
                className="input"
                value={form.home_country}
                onChange={e => handleCountryChange(e.target.value)}
                required
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Home airport</label>
              {formAirports.length > 0 ? (
                <select
                  className="input"
                  value={form.home_city}
                  onChange={e => setF("home_city", e.target.value)}
                >
                  {formAirports.map(a => (
                    <option key={a.iata} value={a.iata}>
                      {a.city} — {a.name} ({a.iata})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-1">
                  <input className="input" value={form.home_city}
                    onChange={e => setF("home_city", e.target.value.toUpperCase().slice(0, 3))}
                    placeholder="IATA code, e.g. LHR" maxLength={3} />
                  <p className="text-xs text-slate-400">No airports listed for this country. Enter IATA code manually.</p>
                </div>
              )}
            </div>

            {/* Region + city of residence */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Region / province</label>
                {formRegions.length > 0 ? (
                  <select
                    className="input"
                    value={form.home_region ?? ""}
                    onChange={e => setF("home_region", e.target.value || null)}
                  >
                    <option value="">— Any / whole country —</option>
                    {formRegions.map(r => (
                      <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input"
                    value={form.home_region ?? ""}
                    onChange={e => setF("home_region", e.target.value || null)}
                    placeholder="ISO 3166-2, e.g. PT-06"
                  />
                )}
                <p className="text-xs text-slate-400 mt-1">For regional holiday filtering.</p>
              </div>

              <div>
                <label className="label">City of residence</label>
                <input
                  className="input"
                  value={form.home_city_name ?? ""}
                  onChange={e => setF("home_city_name", e.target.value || null)}
                  placeholder="e.g. Coimbra"
                />
                <p className="text-xs text-slate-400 mt-1">May differ from airport city.</p>
              </div>
            </div>

            <div>
              <label className="label">Vacation days per year</label>
              <div className="flex items-center gap-2">
                <input className="input" type="number" style={{ maxWidth: 100 }}
                  value={form.vacation_days_per_year}
                  onChange={e => setF("vacation_days_per_year", parseInt(e.target.value) || 22)}
                  min={1} max={60} />
                <span className="text-sm text-slate-500">days</span>
              </div>
            </div>
          </section>

          {/* ── Personal ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Personal</h3>

            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender}
                onChange={e => setF("gender", e.target.value as typeof form.gender)}>
                {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Birthday</label>
              <input className="input" type="date" value={form.birthday ?? ""} onChange={e => setF("birthday", e.target.value || null)} />
              <p className="text-xs text-slate-400 mt-1">Shown on calendar. Trip suggestions near their birthday get special ideas.</p>
            </div>

            {form.birthday && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Birthday is a vacation day</p>
                  <p className="text-xs text-slate-400 mt-0.5">Count birthday as a taken vacation day each year</p>
                </div>
                <button type="button"
                  onClick={() => setF("birthday_is_vacation_day", !form.birthday_is_vacation_day)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.birthday_is_vacation_day ? "bg-indigo-500" : "bg-slate-200"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.birthday_is_vacation_day ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-slate-700">{leaveLabel(form.gender)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Dates up to end date will be blocked from trip planning</p>
              </div>
              <button type="button"
                onClick={() => setF("on_parental_leave", !form.on_parental_leave)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.on_parental_leave ? "bg-indigo-500" : "bg-slate-200"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.on_parental_leave ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {form.on_parental_leave && (
              <div>
                <label className="label">Leave end date</label>
                <input className="input" type="date"
                  value={form.parental_leave_end_date ?? ""}
                  onChange={e => setF("parental_leave_end_date", e.target.value || null)} />
              </div>
            )}
          </section>

          {/* ── Travel style ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Travel style</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STYLES.map(s => (
                <button key={s.value} type="button"
                  onClick={() => setF("travel_style", s.value as typeof form.travel_style)}
                  className={`p-3 rounded-xl border-2 text-center transition ${form.travel_style === s.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="text-xs font-semibold text-slate-700">{s.label}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Min budget (€)</label>
                <input className="input" type="number" value={form.budget_min_eur}
                  onChange={e => setF("budget_min_eur", parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label">Max budget (€)</label>
                <input className="input" type="number" value={form.budget_max_eur}
                  onChange={e => setF("budget_max_eur", parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </section>

          {/* ── Interests ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => {
                const active = form.interests.includes(interest);
                return (
                  <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition capitalize ${active ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-200 text-slate-600 hover:border-indigo-300"}`}>
                    {interest}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Holiday countries ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Holiday countries</h3>
            <p className="text-xs text-slate-400">Countries whose public holidays to track for this person.</p>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
                {form.home_country} <span className="text-indigo-400">home</span>
              </span>
              {form.preferred_countries.filter(c => c !== form.home_country).map(c => (
                <span key={c} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                  {COUNTRIES.find(x => x.code === c)?.name ?? c} ({c})
                  <button type="button"
                    onClick={() => setF("preferred_countries", form.preferred_countries.filter(x => x !== c))}
                    className="text-slate-400 hover:text-red-500 transition leading-none">×</button>
                </span>
              ))}
            </div>
            <select className="input" value=""
              onChange={e => {
                const code = e.target.value;
                if (!code || code === form.home_country || form.preferred_countries.includes(code)) return;
                setF("preferred_countries", [...form.preferred_countries, code]);
              }}>
              <option value="">+ Add a country…</option>
              {COUNTRIES
                .filter(c => c.code !== form.home_country && !form.preferred_countries.includes(c.code))
                .map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
          </section>

          {/* ── Avoid destinations ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Avoid destinations</h3>
            <p className="text-xs text-slate-400">Cities or countries this person prefers not to visit.</p>
            <div className="flex flex-wrap gap-2">
              {form.avoid_destinations.map(d => (
                <span key={d} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                  {d}
                  <button type="button"
                    onClick={() => setF("avoid_destinations", form.avoid_destinations.filter(x => x !== d))}
                    className="text-red-400 hover:text-red-600 transition leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="e.g. Dubai or AE"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val && !form.avoid_destinations.includes(val)) {
                      setF("avoid_destinations", [...form.avoid_destinations, val]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}/>
            </div>
          </section>

          {/* ── Loyalty programs ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Loyalty & Frequent Flyer</h3>
            <p className="text-xs text-slate-400">Airline loyalty / frequent flyer numbers for this person.</p>
            <div className="space-y-2">
              {(form.loyalty_programs ?? []).map((lp, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="text-lg">✈️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{lp.airline}</p>
                    <p className="text-xs text-slate-500 font-mono">{lp.number}</p>
                  </div>
                  <button type="button" onClick={() => removeLoyalty(idx)}
                    className="text-xs text-red-400 hover:text-red-600 transition">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="label">Airline</label>
                <input className="input" value={newLoyaltyAirline} onChange={e => setNewLoyaltyAirline(e.target.value)} placeholder="e.g. TAP Air Portugal" />
              </div>
              <div className="flex-1">
                <label className="label">Number / ID</label>
                <input className="input" value={newLoyaltyNumber} onChange={e => setNewLoyaltyNumber(e.target.value)} placeholder="e.g. TP123456789" />
              </div>
              <button type="button" onClick={addLoyalty} className="btn-ghost text-sm mb-0.5" disabled={!newLoyaltyAirline.trim() || !newLoyaltyNumber.trim()}>
                + Add
              </button>
            </div>
          </section>

          {/* ── Cars (only shown when editing an existing member) ── */}
          {editId && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Cars 🚗</h3>
                <button type="button" onClick={() => {
                  if (!showCarForm) {
                    const avg = getFuelPrice(form.home_country);
                    setCarForm(f => ({ ...f, fuel_cost_per_liter: avg ? String(avg) : "1.70" }));
                  }
                  setShowCarForm(f => !f); setAiEstimate(null); setAiError(null);
                }} className="btn-ghost text-xs px-2 py-1">
                  {showCarForm ? "Cancel" : "+ Add car"}
                </button>
              </div>

              {memberCars.length === 0 && !showCarForm && (
                <p className="text-xs text-slate-400">No cars yet.</p>
              )}
              <div className="space-y-2">
                {memberCars.map(car => {
                  const costPer100 = (car.fuel_consumption_per_100km * car.fuel_cost_per_liter).toFixed(2);
                  return (
                    <div key={car.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <span className="text-xl">🚗</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{car.make} {car.model}{car.year && <span className="text-slate-400 font-normal ml-1">({car.year})</span>}</p>
                        <p className="text-xs text-slate-500">{car.fuel_consumption_per_100km}L/100km · €{car.fuel_cost_per_liter}/L · <span className="text-amber-700 font-semibold">~€{costPer100}/100km</span></p>
                      </div>
                      <button type="button" onClick={() => deleteCar(car.id)} disabled={deletingCarId === car.id}
                        className="text-xs text-red-400 hover:text-red-600 transition">{deletingCarId === car.id ? "…" : "✕"}</button>
                    </div>
                  );
                })}
              </div>

              {showCarForm && (
                <form onSubmit={saveCar} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div><label className="label">Make *</label><input className="input" value={carForm.make} onChange={e => setCarForm(f => ({ ...f, make: e.target.value }))} placeholder="Volkswagen" required/></div>
                    <div><label className="label">Model *</label><input className="input" value={carForm.model} onChange={e => setCarForm(f => ({ ...f, model: e.target.value }))} placeholder="Golf" required/></div>
                    <div><label className="label">Year</label><input className="input" type="number" value={carForm.year} onChange={e => setCarForm(f => ({ ...f, year: e.target.value }))} placeholder="2021" min={1990} max={2030}/></div>
                  </div>
                  <div><label className="label">Nickname</label><input className="input" value={carForm.name} onChange={e => setCarForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. My daily driver"/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label mb-0">Consumption (L/100km) *</label>
                        <button type="button" onClick={estimateCons} disabled={!carForm.make || !carForm.model || aiLoading}
                          className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 transition">
                          {aiLoading ? "⏳ Estimating…" : "🤖 AI estimate"}
                        </button>
                      </div>
                      <input className="input" type="number" step="0.1" min="1" max="30" value={carForm.fuel_consumption_per_100km}
                        onChange={e => setCarForm(f => ({ ...f, fuel_consumption_per_100km: e.target.value }))} placeholder="6.5" required/>
                      {aiEstimate && <p className="text-xs text-indigo-600 mt-1">🤖 {aiEstimate.l_per_100km}L/100km — {aiEstimate.note}</p>}
                      {aiError && <p className="text-xs text-red-500 mt-1">⚠️ {aiError}</p>}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label mb-0">Fuel cost (€/L)</label>
                        {(() => { const avg = getFuelPrice(form.home_country); return avg ? (
                          <button type="button" onClick={() => setCarForm(f => ({ ...f, fuel_cost_per_liter: String(avg) }))}
                            className="text-xs text-slate-500 hover:text-indigo-600 transition">⛽ €{avg.toFixed(2)} use</button>
                        ) : null; })()}
                      </div>
                      <input className="input" type="number" step="0.01" min="0" value={carForm.fuel_cost_per_liter}
                        onChange={e => setCarForm(f => ({ ...f, fuel_cost_per_liter: e.target.value }))} placeholder="1.70"/>
                      {carForm.fuel_consumption_per_100km && carForm.fuel_cost_per_liter && (
                        <p className="text-xs text-amber-700 font-semibold mt-1">
                          ~€{(parseFloat(carForm.fuel_consumption_per_100km) * parseFloat(carForm.fuel_cost_per_liter)).toFixed(2)}/100km
                        </p>
                      )}
                    </div>
                  </div>
                  <button type="submit" disabled={savingCar} className="btn-primary text-sm">{savingCar ? "Saving…" : "Save car"}</button>
                </form>
              )}
            </section>
          )}

        </form>

        {/* ── My Cars ── */}
        <section className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">My Cars 🚗</h3>
              <p className="text-xs text-slate-400 mt-0.5">Your own vehicles used for road trip cost estimates.</p>
            </div>
            <button type="button" onClick={() => {
              if (!showMyCarForm) {
                const avg = getFuelPrice("PT");
                setMyCarForm(f => ({ ...f, fuel_cost_per_liter: avg ? String(avg) : "1.70" }));
              }
              setShowMyCarForm(f => !f); setMyAiEstimate(null); setMyAiError(null);
            }} className="btn-ghost text-xs px-2 py-1">
              {showMyCarForm ? "Cancel" : "+ Add car"}
            </button>
          </div>

          {myCars.length === 0 && !showMyCarForm && (
            <p className="text-xs text-slate-400">No cars added yet.</p>
          )}

          <div className="space-y-2">
            {myCars.map(car => {
              const costPer100 = (car.fuel_consumption_per_100km * car.fuel_cost_per_liter).toFixed(2);
              return (
                <div key={car.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="text-xl">🚗</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{car.make} {car.model}{car.year && <span className="text-slate-400 font-normal ml-1">({car.year})</span>}</p>
                    {car.name && car.name !== `${car.make} ${car.model}` && car.name !== `${car.make} ${car.model} (${car.year})` && (
                      <p className="text-xs text-slate-400 italic">{car.name}</p>
                    )}
                    <p className="text-xs text-slate-500">{car.fuel_consumption_per_100km}L/100km · €{car.fuel_cost_per_liter}/L · <span className="text-amber-700 font-semibold">~€{costPer100}/100km</span></p>
                  </div>
                  <button type="button" onClick={() => deleteMycar(car.id)} disabled={deletingMyCarId === car.id}
                    className="text-xs text-red-400 hover:text-red-600 transition">{deletingMyCarId === car.id ? "…" : "✕"}</button>
                </div>
              );
            })}
          </div>

          {showMyCarForm && (
            <form onSubmit={saveMycar} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div><label className="label">Make *</label><input className="input" value={myCarForm.make} onChange={e => setMyCarForm(f => ({ ...f, make: e.target.value }))} placeholder="Volkswagen" required /></div>
                <div><label className="label">Model *</label><input className="input" value={myCarForm.model} onChange={e => setMyCarForm(f => ({ ...f, model: e.target.value }))} placeholder="Golf" required /></div>
                <div><label className="label">Year</label><input className="input" type="number" value={myCarForm.year} onChange={e => setMyCarForm(f => ({ ...f, year: e.target.value }))} placeholder="2021" min={1990} max={2030} /></div>
              </div>
              <div><label className="label">Nickname</label><input className="input" value={myCarForm.name} onChange={e => setMyCarForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. My daily driver" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">Consumption (L/100km) *</label>
                    <button type="button" onClick={estimateMyCons} disabled={!myCarForm.make || !myCarForm.model || myAiLoading}
                      className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 transition">
                      {myAiLoading ? "⏳ Estimating…" : "🤖 AI estimate"}
                    </button>
                  </div>
                  <input className="input" type="number" step="0.1" min="1" max="30" value={myCarForm.fuel_consumption_per_100km}
                    onChange={e => setMyCarForm(f => ({ ...f, fuel_consumption_per_100km: e.target.value }))} placeholder="6.5" required />
                  {myAiEstimate && <p className="text-xs text-indigo-600 mt-1">🤖 {myAiEstimate.l_per_100km}L/100km — {myAiEstimate.note}</p>}
                  {myAiError && <p className="text-xs text-red-500 mt-1">⚠️ {myAiError}</p>}
                </div>
                <div>
                  <label className="label">Fuel cost (€/L)</label>
                  <input className="input" type="number" step="0.01" min="0" value={myCarForm.fuel_cost_per_liter}
                    onChange={e => setMyCarForm(f => ({ ...f, fuel_cost_per_liter: e.target.value }))} placeholder="1.70" />
                  {myCarForm.fuel_consumption_per_100km && myCarForm.fuel_cost_per_liter && (
                    <p className="text-xs text-amber-700 font-semibold mt-1">
                      ~€{(parseFloat(myCarForm.fuel_consumption_per_100km) * parseFloat(myCarForm.fuel_cost_per_liter)).toFixed(2)}/100km
                    </p>
                  )}
                </div>
              </div>
              <button type="submit" disabled={savingMyCar} className="btn-primary text-sm">{savingMyCar ? "Saving…" : "Save car"}</button>
            </form>
          )}
        </section>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : editId ? "Save changes" : "Add person"}
          </button>
          {editId && (
            <button type="button" onClick={cancelEdit} className="btn-ghost">Cancel</button>
          )}
        </div>

        </div> {/* end form card */}
      </div> {/* end two-column */}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1.5">
      <span className="text-xs text-slate-400">{label}: </span>
      <span className="text-xs font-medium text-slate-700">{value}</span>
    </div>
  );
}
