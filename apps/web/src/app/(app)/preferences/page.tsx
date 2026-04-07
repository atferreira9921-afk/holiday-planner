"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserPreferences } from "@holiday-planner/shared-types";
import { COUNTRIES, getAirports, getRegions } from "@/lib/data/geo";
import { getFuelPrice } from "@/lib/data/fuel-prices";
import LoyaltySection from "./LoyaltySection";
import FamilyMemberAvatarCard, { type AvatarConfig, DEFAULT_AVATAR_CONFIG } from "@/app/(app)/family/FamilyMemberAvatarCard";
import PreferencesLoading from "./loading";

const INTERESTS = ["beach", "mountains", "culture", "food", "nightlife", "nature", "city", "adventure", "relaxation", "history"];
const STYLES: { value: string; label: string; icon: string }[] = [
  { value: "budget", label: "Budget", icon: "🎒" },
  { value: "mid-range", label: "Mid-range", icon: "✈️" },
  { value: "luxury", label: "Luxury", icon: "💎" },
];
const GENDERS: { value: string; label: string }[] = [
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

interface Car {
  id: string;
  owner_user_id: string;
  name: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  fuel_consumption_per_100km: number;
  fuel_cost_per_liter: number;
}

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<Partial<UserPreferences>>({
    home_country: "PT", home_city: "LIS", vacation_days_per_year: 22,
    travel_style: "mid-range", budget_min_eur: 300, budget_max_eur: 2000,
    accommodation_types: ["hotel"], interests: [], avoid_destinations: [],
    min_trip_days: 4, max_trip_days: 14, advance_booking_weeks: 8, preferred_countries: [],
    gender: "prefer_not_to_say", birthday: null, birthday_is_vacation_day: false, on_parental_leave: false, parental_leave_end_date: null,
    home_region: null, home_city_name: null,
  });

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);

  // Cars
  const [cars, setCars] = useState<Car[]>([]);
  const [showCarForm, setShowCarForm] = useState(false);
  const [savingCar, setSavingCar] = useState(false);
  const [deletingCarId, setDeletingCarId] = useState<string | null>(null);
  const [carForm, setCarForm] = useState({
    make: "", model: "", year: "", name: "",
    fuel_consumption_per_100km: "", fuel_cost_per_liter: "",
  });
  const [aiEstimate, setAiEstimate] = useState<{ l_per_100km: number; note: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: prefsData }, { data: carsData }] = await Promise.all([
        supabase.from("user_preferences").select("*").eq("user_id", user.id).single(),
        supabase.from("user_cars").select("*").eq("owner_user_id", user.id).order("created_at"),
      ]);
      if (prefsData) {
        setPrefs(prefsData);
        if (prefsData.avatar_config) setAvatarConfig(prefsData.avatar_config);
      }
      if (carsData) setCars(carsData as Car[]);
      setLoading(false);
    }
    load();
  }, []);

  function toggleInterest(v: string) {
    setPrefs(p => {
      const arr = p.interests ?? [];
      return { ...p, interests: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_preferences").upsert({ ...prefs, user_id: user.id, avatar_config: avatarConfig }, { onConflict: "user_id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function estimateConsumption() {
    if (!carForm.make || !carForm.model) return;
    setAiLoading(true);
    setAiError(null);
    setAiEstimate(null);
    try {
      const res = await fetch("/api/cars/estimate-consumption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make: carForm.make, model: carForm.model, year: carForm.year ? parseInt(carForm.year) : undefined }),
      });
      const data = await res.json();
      if (data.error) setAiError(data.error);
      else {
        setAiEstimate(data);
        setCarForm(f => ({ ...f, fuel_consumption_per_100km: String(data.l_per_100km) }));
      }
    } catch {
      setAiError("Request failed");
    }
    setAiLoading(false);
  }

  async function saveCar(e: React.FormEvent) {
    e.preventDefault();
    if (!carForm.make || !carForm.model || !carForm.fuel_consumption_per_100km) return;
    setSavingCar(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingCar(false); return; }
    const displayName = carForm.name.trim() || `${carForm.make} ${carForm.model}${carForm.year ? ` (${carForm.year})` : ""}`;
    const { data } = await supabase.from("user_cars").insert({
      owner_user_id: user.id,
      make: carForm.make.trim(),
      model: carForm.model.trim(),
      year: carForm.year ? parseInt(carForm.year) : null,
      name: displayName,
      fuel_consumption_per_100km: parseFloat(carForm.fuel_consumption_per_100km),
      fuel_cost_per_liter: parseFloat(carForm.fuel_cost_per_liter || String(getFuelPrice(homeCountry) ?? 1.70)),
    }).select("*").single();
    if (data) setCars(prev => [...prev, data as Car]);
    const countryAvg = getFuelPrice(homeCountry);
    setCarForm({ make: "", model: "", year: "", name: "", fuel_consumption_per_100km: "", fuel_cost_per_liter: countryAvg ? String(countryAvg) : "1.70" });
    setAiEstimate(null);
    setShowCarForm(false);
    setSavingCar(false);
  }

  async function deleteCar(id: string) {
    setDeletingCarId(id);
    const supabase = createClient();
    await supabase.from("user_cars").delete().eq("id", id);
    setCars(prev => prev.filter(c => c.id !== id));
    setDeletingCarId(null);
  }

  const homeCountry = prefs.home_country ?? "PT";
  const airports = getAirports(homeCountry);
  const regions = getRegions(homeCountry);

  if (loading) return <PreferencesLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Config</h1>
        <p className="text-slate-500 text-sm mt-1">These help the AI personalise suggestions just for you.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Avatar preview — sticky */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-[88px]">
          <FamilyMemberAvatarCard
            name={prefs.home_city_name ?? "You"}
            gender={prefs.gender ?? "prefer_not_to_say"}
            country={prefs.home_country ?? "PT"}
            cityName={prefs.home_city_name ?? null}
            travelStyle={prefs.travel_style ?? "mid-range"}
            interests={prefs.interests ?? []}
            colorId="indigo"
            colorDot="#6366f1"
            config={avatarConfig}
            onConfigChange={setAvatarConfig}
          />
        </div>

        {/* Form */}
        <div className="flex-1">
      <form onSubmit={handleSave} className="space-y-5">

        {/* Home base */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">🏠 Home base</h2>

          <div>
            <label className="label">Country</label>
            <select
              className="input"
              value={homeCountry}
              onChange={e => {
                const code = e.target.value;
                const airportList = getAirports(code);
                setPrefs(p => ({ ...p, home_country: code, home_city: airportList[0]?.iata ?? "" }));
              }}
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Home airport</label>
            {airports.length > 0 ? (
              <select
                className="input"
                value={prefs.home_city ?? ""}
                onChange={e => setPrefs(p => ({ ...p, home_city: e.target.value }))}
              >
                {airports.map(a => (
                  <option key={a.iata} value={a.iata}>{a.city} — {a.name} ({a.iata})</option>
                ))}
              </select>
            ) : (
              <div className="space-y-1">
                <input
                  className="input"
                  value={prefs.home_city ?? ""}
                  onChange={e => setPrefs(p => ({ ...p, home_city: e.target.value.toUpperCase().slice(0, 3) }))}
                  placeholder="IATA code, e.g. LIS"
                  maxLength={3}
                />
                <p className="text-xs text-slate-400">No airports listed for this country. Enter IATA code manually.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Region / province</label>
              {regions.length > 0 ? (
                <select
                  className="input"
                  value={prefs.home_region ?? ""}
                  onChange={e => setPrefs(p => ({ ...p, home_region: e.target.value || null }))}
                >
                  <option value="">— Any / whole country —</option>
                  {regions.map(r => (
                    <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  value={prefs.home_region ?? ""}
                  onChange={e => setPrefs(p => ({ ...p, home_region: e.target.value || null }))}
                  placeholder="ISO 3166-2, e.g. PT-06"
                />
              )}
              <p className="text-xs text-slate-400 mt-1">Used to show only your region's public holidays.</p>
            </div>
            <div>
              <label className="label">City of residence</label>
              <input
                className="input"
                value={prefs.home_city_name ?? ""}
                onChange={e => setPrefs(p => ({ ...p, home_city_name: e.target.value || null }))}
                placeholder="e.g. Coimbra"
              />
              <p className="text-xs text-slate-400 mt-1">May differ from your nearest airport city.</p>
            </div>
          </div>

          <div>
            <label className="label">Vacation days per year</label>
            <input className="input" type="number" value={prefs.vacation_days_per_year ?? 22}
              onChange={e => setPrefs(p => ({ ...p, vacation_days_per_year: parseInt(e.target.value) }))}
              min={1} max={60} style={{ maxWidth: 120 }} />
          </div>
        </div>

        {/* Travel style */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">🎯 Travel style</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STYLES.map(s => (
              <button key={s.value} type="button" onClick={() => setPrefs(p => ({ ...p, travel_style: s.value as UserPreferences["travel_style"] }))}
                className={`p-4 rounded-xl border-2 text-center transition ${prefs.travel_style === s.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-sm font-semibold text-slate-700">{s.label}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="label">Min budget (€ total)</label>
              <input className="input" type="number" value={prefs.budget_min_eur ?? 300}
                onChange={e => setPrefs(p => ({ ...p, budget_min_eur: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Max budget (€ total)</label>
              <input className="input" type="number" value={prefs.budget_max_eur ?? 2000}
                onChange={e => setPrefs(p => ({ ...p, budget_max_eur: parseInt(e.target.value) }))} />
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">❤️ Interests</h2>
          <p className="text-xs text-slate-400">Select everything that excites you about travel.</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => {
              const active = (prefs.interests ?? []).includes(interest);
              return (
                <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition capitalize ${active ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-200 text-slate-600 hover:border-indigo-300"}`}>
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        {/* Public holiday countries */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">🌍 Holiday countries</h2>
          <p className="text-xs text-slate-400">Add countries whose public holidays you want to track in your calendar.</p>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold border border-indigo-200">
              {homeCountry}
              <span className="text-indigo-400 text-xs">home</span>
            </span>
            {(prefs.preferred_countries ?? []).map(c => {
              const cname = COUNTRIES.find(x => x.code === c)?.name ?? c;
              return (
                <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold border border-slate-200">
                  {cname} ({c})
                  <button type="button"
                    onClick={() => setPrefs(p => ({ ...p, preferred_countries: (p.preferred_countries ?? []).filter(x => x !== c) }))}
                    className="text-slate-400 hover:text-red-500 transition leading-none" title="Remove">×</button>
                </span>
              );
            })}
          </div>
          <div className="flex gap-2">
            <select className="input" value=""
              onChange={e => {
                const code = e.target.value;
                if (!code || code === homeCountry) return;
                if ((prefs.preferred_countries ?? []).includes(code)) return;
                setPrefs(p => ({ ...p, preferred_countries: [...(p.preferred_countries ?? []), code] }));
              }}
            >
              <option value="">+ Add a country…</option>
              {COUNTRIES
                .filter(c => c.code !== homeCountry && !(prefs.preferred_countries ?? []).includes(c.code))
                .map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
          </div>
        </div>

        {/* Personal details */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">👤 Personal details</h2>
          <p className="text-xs text-slate-400">Used to calculate parental leave entitlements and personalise suggestions.</p>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-lg">📍</span>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {prefs.home_city_name ?? airports.find(a => a.iata === (prefs.home_city ?? ""))?.city ?? prefs.home_city ?? "—"}
                {prefs.home_city && <span className="text-slate-400 font-normal ml-1">({prefs.home_city})</span>}
                {", "}
                {COUNTRIES.find(c => c.code === homeCountry)?.name ?? homeCountry}
              </p>
              {prefs.home_region && (
                <p className="text-xs text-slate-500">{regions.find(r => r.code === prefs.home_region)?.name ?? prefs.home_region}</p>
              )}
              <p className="text-xs text-slate-400">Your base city — edit above in Home base</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Gender</label>
              <select className="input" value={prefs.gender ?? "prefer_not_to_say"}
                onChange={e => setPrefs(p => ({ ...p, gender: e.target.value as UserPreferences["gender"] }))}>
                {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Birthday</label>
              <input className="input" type="date" value={prefs.birthday ?? ""}
                onChange={e => setPrefs(p => ({ ...p, birthday: e.target.value || null }))} />
              <p className="text-xs text-slate-400 mt-1">Marked on your calendar.</p>
            </div>
            <div className="flex items-start gap-3 pt-1">
              <input
                id="birthday-vacation"
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-indigo-600 cursor-pointer"
                checked={prefs.birthday_is_vacation_day ?? false}
                onChange={e => setPrefs(p => ({ ...p, birthday_is_vacation_day: e.target.checked }))}
              />
              <label htmlFor="birthday-vacation" className="cursor-pointer">
                <span className="text-sm font-medium text-slate-700">🎂 Birthday is a vacation day</span>
                <p className="text-xs text-slate-400 mt-0.5">Adds +1 to your total vacation days per year.</p>
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="label mb-0">Currently on parental leave</label>
                <p className="text-xs text-slate-400 mt-0.5">
                  {prefs.gender === "female" ? "Maternity leave" : prefs.gender === "male" ? "Paternity leave" : "Parental leave"} — blocked dates will be excluded from trip planning.
                </p>
              </div>
              <button type="button"
                onClick={() => setPrefs(p => ({ ...p, on_parental_leave: !p.on_parental_leave }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.on_parental_leave ? "bg-indigo-500" : "bg-slate-200"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prefs.on_parental_leave ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {prefs.on_parental_leave && (
              <div className="mt-4">
                <label className="label">Leave end date</label>
                <input className="input" type="date" value={prefs.parental_leave_end_date ?? ""}
                  onChange={e => setPrefs(p => ({ ...p, parental_leave_end_date: e.target.value || null }))} />
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={saving}>
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save preferences"}
        </button>
      </form>

      {/* Loyalty numbers */}
      <LoyaltySection />

      {/* My Cars — managed separately from the form */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 flex items-center gap-2">🚗 My Cars</h2>
            <p className="text-xs text-slate-400 mt-0.5">Used to auto-calculate fuel costs on road trips.</p>
          </div>
          <button type="button" onClick={() => {
              if (!showCarForm) {
                // Pre-fill fuel price from user's home country
                const countryAvg = getFuelPrice(homeCountry);
                setCarForm(f => ({ ...f, fuel_cost_per_liter: countryAvg ? String(countryAvg) : "1.70" }));
              }
              setShowCarForm(f => !f);
              setAiEstimate(null);
              setAiError(null);
            }}
            className="btn-ghost text-sm">
            {showCarForm ? "Cancel" : "+ Add car"}
          </button>
        </div>

        {/* Cars list */}
        {cars.length === 0 && !showCarForm && (
          <p className="text-sm text-slate-400 text-center py-3">No cars added yet.</p>
        )}
        <div className="space-y-2">
          {cars.map(car => {
            const costPer100 = (car.fuel_consumption_per_100km * car.fuel_cost_per_liter).toFixed(2);
            return (
              <div key={car.id} className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-2xl">🚗</span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">
                    {car.make} {car.model}
                    {car.year && <span className="text-slate-400 font-normal text-sm ml-1">({car.year})</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {car.fuel_consumption_per_100km}L/100km ·{" "}
                    €{car.fuel_cost_per_liter}/L ·{" "}
                    <span className="text-amber-700 font-semibold">~€{costPer100}/100km</span>
                  </p>
                  {car.name && car.name !== `${car.make} ${car.model}` && (
                    <p className="text-xs text-slate-400 mt-0.5">"{car.name}"</p>
                  )}
                </div>
                <button type="button" onClick={() => deleteCar(car.id)}
                  disabled={deletingCarId === car.id}
                  className="text-xs text-red-400 hover:text-red-600 transition px-1">
                  {deletingCarId === car.id ? "…" : "✕"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add car form */}
        {showCarForm && (
          <form onSubmit={saveCar} className="bg-slate-50 rounded-xl p-5 space-y-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Add a car</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Make <span className="text-red-400">*</span></label>
                <input className="input" value={carForm.make}
                  onChange={e => setCarForm(f => ({ ...f, make: e.target.value }))}
                  placeholder="e.g. Volkswagen" required />
              </div>
              <div>
                <label className="label">Model <span className="text-red-400">*</span></label>
                <input className="input" value={carForm.model}
                  onChange={e => setCarForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="e.g. Golf" required />
              </div>
              <div>
                <label className="label">Year</label>
                <input className="input" type="number" value={carForm.year}
                  onChange={e => setCarForm(f => ({ ...f, year: e.target.value }))}
                  placeholder="e.g. 2021" min={1990} max={2030} />
              </div>
            </div>

            <div>
              <label className="label">Nickname (optional)</label>
              <input className="input" value={carForm.name}
                onChange={e => setCarForm(f => ({ ...f, name: e.target.value }))}
                placeholder={carForm.make && carForm.model ? `e.g. ${carForm.make} ${carForm.model}` : "e.g. My daily driver"} />
              <p className="text-xs text-slate-400 mt-1">If blank, defaults to Make + Model.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Consumption (L/100km) <span className="text-red-400">*</span></label>
                  <button type="button" onClick={estimateConsumption}
                    disabled={!carForm.make || !carForm.model || aiLoading}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 transition">
                    {aiLoading ? (
                      <><span className="animate-spin inline-block">⏳</span> Estimating…</>
                    ) : (
                      <><span>🤖</span> AI estimate</>
                    )}
                  </button>
                </div>
                <input className="input" type="number" step="0.1" min="1" max="30"
                  value={carForm.fuel_consumption_per_100km}
                  onChange={e => setCarForm(f => ({ ...f, fuel_consumption_per_100km: e.target.value }))}
                  placeholder="e.g. 6.5" required />
                {aiEstimate && (
                  <p className="text-xs text-indigo-600 mt-1">
                    🤖 AI estimate: <strong>{aiEstimate.l_per_100km}L/100km</strong> — {aiEstimate.note}
                  </p>
                )}
                {aiError && <p className="text-xs text-red-500 mt-1">⚠️ {aiError}</p>}
                {!carForm.make || !carForm.model ? (
                  <p className="text-xs text-slate-400 mt-1">Enter make &amp; model to enable AI estimate.</p>
                ) : null}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Fuel cost (€/litre)</label>
                  {(() => {
                    const avg = getFuelPrice(homeCountry);
                    const countryName = COUNTRIES.find(c => c.code === homeCountry)?.name ?? homeCountry;
                    if (!avg) return null;
                    return (
                      <button type="button"
                        onClick={() => setCarForm(f => ({ ...f, fuel_cost_per_liter: String(avg) }))}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition"
                        title={`Use ${countryName} average`}>
                        <span>⛽</span>
                        <span>{countryName}: €{avg.toFixed(2)}/L</span>
                        <span className="text-indigo-400 underline ml-0.5">use</span>
                      </button>
                    );
                  })()}
                </div>
                <input className="input" type="number" step="0.01" min="0"
                  value={carForm.fuel_cost_per_liter}
                  onChange={e => setCarForm(f => ({ ...f, fuel_cost_per_liter: e.target.value }))}
                  placeholder={(() => {
                    const avg = getFuelPrice(homeCountry);
                    return avg ? avg.toFixed(2) : "1.70";
                  })()} />
                <p className="text-xs text-slate-400 mt-1">
                  Enter your local pump price, or use the country average above.
                </p>
                {carForm.fuel_consumption_per_100km && carForm.fuel_cost_per_liter && (
                  <p className="text-xs text-amber-700 font-semibold mt-1">
                    ~€{(parseFloat(carForm.fuel_consumption_per_100km) * parseFloat(carForm.fuel_cost_per_liter)).toFixed(2)}/100km
                  </p>
                )}
              </div>
            </div>

            <button type="submit" disabled={savingCar} className="btn-primary text-sm">
              {savingCar ? "Saving…" : "Save car"}
            </button>
          </form>
        )}
      </div>
      </div> {/* end flex-1 */}
      </div> {/* end two-column */}
    </div>
  );
}
