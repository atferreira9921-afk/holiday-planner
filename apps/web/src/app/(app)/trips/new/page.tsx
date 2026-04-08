"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/data/geo";
import ReturnOriginPicker from "../ReturnOriginPicker";

type PlanningMode = "days_first" | "destination_first";
type VehicleType = "flight" | "car" | "bus";

interface BookedHoliday {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

interface Car {
  id: string;
  name: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  fuel_consumption_per_100km: number;
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function NewTripPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Planning options
  const [mode, setMode] = useState<PlanningMode>("days_first");
  const [vehicleType, setVehicleType] = useState<VehicleType>("flight");
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [useBookedDays, setUseBookedDays] = useState<boolean | null>(null);
  const [selectedHolidayId, setSelectedHolidayId] = useState<string>("");

  // Fetched data
  const [bookedHolidays, setBookedHolidays] = useState<BookedHoliday[]>([]);
  const [cars, setCars] = useState<Car[]>([]);

  const [form, setForm] = useState({
    title: "",
    desired_duration_days: 7,
    earliest_departure: "",
    latest_return: "",
    budget_per_person_eur: "",
    destination_hint: "",
    destination_city: "",
    destination_country: "",
    return_origin_city: "",
    return_origin_country: "",
  });

  // Load booked holidays and cars
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: holidays }, { data: carsData }] = await Promise.all([
        supabase.from("booked_holidays").select("id, title, start_date, end_date")
          .eq("owner_user_id", user.id)
          .is("family_member_id", null)
          .gte("start_date", today)
          .order("start_date"),
        supabase.from("user_cars").select("id, name, make, model, year, fuel_consumption_per_100km")
          .eq("owner_user_id", user.id)
          .order("created_at"),
      ]);
      if (holidays) setBookedHolidays(holidays as BookedHoliday[]);
      if (carsData) setCars(carsData as Car[]);
      setDataLoading(false);
    }
    load();
  }, []);

  // Pre-fill dates from calendar "Plan trip →" link
  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const days = searchParams.get("days");
    if (from || to || days) {
      setForm(f => ({
        ...f,
        earliest_departure: from ?? f.earliest_departure,
        latest_return: to ?? f.latest_return,
        desired_duration_days: days ? parseInt(days) : f.desired_duration_days,
      }));
      // Came from calendar — pre-select "based on booked days: no" since dates are already set
      setUseBookedDays(false);
    }
  }, [searchParams]);

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function selectHoliday(holiday: BookedHoliday) {
    setSelectedHolidayId(holiday.id);
    const days = daysBetween(holiday.start_date, holiday.end_date);
    setForm(f => ({
      ...f,
      earliest_departure: holiday.start_date,
      latest_return: holiday.end_date,
      desired_duration_days: days,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: group, error: groupError } = await supabase
      .from("travel_groups")
      .insert({ name: `${form.title} group`, created_by: user.id })
      .select().single();

    if (groupError || !group) {
      setError(`Failed to create group: ${groupError?.message ?? "no data returned"}`);
      setLoading(false);
      return;
    }

    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "owner" });

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        group_id: group.id,
        title: form.title,
        planning_mode: mode,
        desired_duration_days: form.desired_duration_days,
        earliest_departure: form.earliest_departure,
        latest_return: form.latest_return,
        budget_per_person_eur: form.budget_per_person_eur ? parseInt(form.budget_per_person_eur) : null,
        destination_hint: form.destination_hint || null,
        destination_city: mode === "destination_first" ? (form.destination_city || null) : null,
        destination_country: mode === "destination_first" ? (form.destination_country.toUpperCase() || null) : null,
        return_origin_city: form.return_origin_city || null,
        return_origin_country: form.return_origin_country ? form.return_origin_country.toUpperCase() : null,
        vehicle_type: vehicleType,
        vehicle_car_id: vehicleType === "car" && selectedCarId ? selectedCarId : null,
        created_by: user.id,
      })
      .select().single();

    if (tripError || !trip) { setError("Failed to create trip"); setLoading(false); return; }
    router.push(`/trips/${trip.id}`);
  }

  const selectedHoliday = bookedHolidays.find(h => h.id === selectedHolidayId) ?? null;
  const selectedCar = cars.find(c => c.id === selectedCarId) ?? null;
  const carLabel = (c: Car) => `${c.make ?? ""} ${c.model ?? c.name ?? "Car"}${c.year ? ` (${c.year})` : ""}`.trim();

  if (dataLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm">Loading…</div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <Link href="/trips" className="text-slate-400 text-sm hover:text-slate-600 transition flex items-center gap-1 mb-4">
          ← Back to trips
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Plan a new trip</h1>
        <p className="text-slate-500 text-sm mt-1">Fill in the details and we'll help you find the perfect trip.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Trip name */}
        <div className="card p-6">
          <Field label="Trip name" hint="Give it a fun name">
            <input className="input" type="text" value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Summer beach escape" required />
          </Field>
        </div>

        {/* Based on booked vacation days? */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-bold text-slate-900">📅 Dates</h2>
            <p className="text-xs text-slate-400 mt-0.5">Is this trip based on pre-booked vacation days?</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setUseBookedDays(true)}
              className={`p-4 rounded-xl border-2 text-left transition ${useBookedDays === true ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
              <div className="text-2xl mb-1">📋</div>
              <div className="text-sm font-bold text-slate-800">Yes — use my booked days</div>
              <div className="text-xs text-slate-500 mt-0.5">Choose from your planned vacations</div>
            </button>
            <button type="button" onClick={() => { setUseBookedDays(false); setSelectedHolidayId(""); }}
              className={`p-4 rounded-xl border-2 text-left transition ${useBookedDays === false ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
              <div className="text-2xl mb-1">✏️</div>
              <div className="text-sm font-bold text-slate-800">No — set dates manually</div>
              <div className="text-xs text-slate-500 mt-0.5">Pick any date range</div>
            </button>
          </div>

          {/* Booked holidays picker */}
          {useBookedDays === true && (
            bookedHolidays.length === 0 ? (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
                No upcoming booked vacation days found.{" "}
                <Link href="/holidays" className="underline">Add some in My Holidays</Link>
                {" "}first, or choose "set dates manually".
              </div>
            ) : (
              <div className="space-y-2">
                {bookedHolidays.map(h => {
                  const days = daysBetween(h.start_date, h.end_date);
                  const isActive = selectedHolidayId === h.id;
                  return (
                    <button key={h.id} type="button" onClick={() => selectHoliday(h)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${isActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-100"}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${isActive ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {isActive ? "✓" : "📅"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{h.title}</p>
                        <p className="text-xs text-slate-500">{fmt(h.start_date)} → {fmt(h.end_date)} · {days} day{days !== 1 ? "s" : ""}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {/* Manual date picker */}
          {useBookedDays === false && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Earliest departure">
                  <input className="input" type="date" value={form.earliest_departure}
                    onChange={e => set("earliest_departure", e.target.value)} required />
                </Field>
                <Field label="Latest return">
                  <input className="input" type="date" value={form.latest_return}
                    onChange={e => set("latest_return", e.target.value)} required />
                </Field>
              </div>
              <Field label="Trip duration" hint="How many days do you want to travel?">
                <div className="flex items-center gap-3">
                  <input className="input" style={{ maxWidth: 120 }} type="number"
                    value={form.desired_duration_days}
                    onChange={e => set("desired_duration_days", parseInt(e.target.value))}
                    min={1} max={90} required />
                  <span className="text-slate-500 text-sm">days</span>
                </div>
              </Field>
            </div>
          )}

          {/* Show selected holiday summary */}
          {useBookedDays === true && selectedHoliday && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
              <span className="text-lg">✅</span>
              <div>
                <p className="text-sm font-semibold text-indigo-800">{selectedHoliday.title}</p>
                <p className="text-xs text-indigo-600">{fmt(selectedHoliday.start_date)} → {fmt(selectedHoliday.end_date)} · {form.desired_duration_days} days</p>
              </div>
            </div>
          )}
        </div>

        {/* Vehicle */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-bold text-slate-900">🚗 How will you travel?</h2>
            <p className="text-xs text-slate-400 mt-0.5">Choose your main mode of transport to the destination.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { type: "flight" as VehicleType, icon: "✈️", label: "Flight" },
              { type: "car"    as VehicleType, icon: "🚗", label: "Road trip" },
              { type: "bus"    as VehicleType, icon: "🚌", label: "Bus / Train" },
            ]).map(v => (
              <button key={v.type} type="button" onClick={() => setVehicleType(v.type)}
                className={`p-4 rounded-xl border-2 text-center transition ${vehicleType === v.type ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="text-2xl mb-1">{v.icon}</div>
                <div className="text-sm font-semibold text-slate-700">{v.label}</div>
              </button>
            ))}
          </div>

          {vehicleType === "car" && (
            <div className="space-y-3">
              {cars.length === 0 ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
                  No cars saved yet.{" "}
                  <Link href="/preferences" className="underline">Add your car in Preferences</Link>
                  {" "}to get automatic fuel cost estimates.
                </div>
              ) : (
                <div>
                  <label className="label">Which car?</label>
                  <div className="space-y-2">
                    {cars.map(c => (
                      <button key={c.id} type="button" onClick={() => setSelectedCarId(c.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${selectedCarId === c.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}>
                        <span className="text-lg">🚗</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{carLabel(c)}</p>
                          <p className="text-xs text-slate-500">{c.fuel_consumption_per_100km}L/100km</p>
                        </div>
                        {selectedCarId === c.id && <span className="text-amber-500 text-sm">✓</span>}
                      </button>
                    ))}
                  </div>
                  {selectedCar && (
                    <p className="text-xs text-amber-700 mt-2">
                      Fuel cost will be calculated automatically when you add road trip expenses.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Destination / planning mode */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-bold text-slate-900">🌍 Destination</h2>
            <p className="text-xs text-slate-400 mt-0.5">Do you already know where you want to go?</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setMode("days_first")}
              className={`p-4 rounded-xl border-2 text-left transition ${mode === "days_first" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
              <div className="text-2xl mb-1">🤖</div>
              <div className="text-sm font-bold text-slate-800">Suggest for me</div>
              <div className="text-xs text-slate-500 mt-0.5">AI picks the best destinations for your dates</div>
            </button>
            <button type="button" onClick={() => setMode("destination_first")}
              className={`p-4 rounded-xl border-2 text-left transition ${mode === "destination_first" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
              <div className="text-2xl mb-1">📍</div>
              <div className="text-sm font-bold text-slate-800">I know where I'm going</div>
              <div className="text-xs text-slate-500 mt-0.5">Enter city and country manually</div>
            </button>
          </div>

          {mode === "destination_first" && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <Field label="City">
                <input className="input" type="text" value={form.destination_city}
                  onChange={e => set("destination_city", e.target.value)}
                  placeholder="e.g. Barcelona" required={mode === "destination_first"} />
              </Field>
              <Field label="Country">
                <select className="input" value={form.destination_country}
                  onChange={e => set("destination_country", e.target.value)}
                  required={mode === "destination_first"}>
                  <option value="">Select country…</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {mode === "days_first" && (
            <Field label="Hint (optional)" hint="Any preferences? e.g. warm beach, culture-rich city, short-haul Europe">
              <input className="input" type="text" value={form.destination_hint}
                onChange={e => set("destination_hint", e.target.value)}
                placeholder="e.g. warm beach, not too far from Lisbon..." />
            </Field>
          )}
        </div>

        {/* Return origin */}
        <div className="card p-6 space-y-3">
          <div>
            <h2 className="font-bold text-slate-900">🔀 Return journey</h2>
            <p className="text-xs text-slate-400 mt-0.5">Planning a multi-city itinerary? Set where you'll be flying/travelling back from.</p>
          </div>
          <ReturnOriginPicker
            vehicleType={vehicleType}
            city={form.return_origin_city}
            country={form.return_origin_country}
            onChange={(city, country) => setForm(f => ({ ...f, return_origin_city: city, return_origin_country: country }))}
          />
        </div>

        {/* Budget */}
        <div className="card p-6">
          <Field label="Budget per person (€)" hint="Optional — helps filter results">
            <input className="input" type="number" value={form.budget_per_person_eur}
              onChange={e => set("budget_per_person_eur", e.target.value)}
              placeholder="e.g. 1200" style={{ maxWidth: 160 }} />
          </Field>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading ||
          (useBookedDays === null) ||
          (useBookedDays === true && !selectedHolidayId && bookedHolidays.length > 0)
        }>
          {loading ? "Creating trip…" : mode === "days_first" ? "Create trip → Get AI suggestions" : "Create trip →"}
        </button>

        {useBookedDays === null && (
          <p className="text-center text-xs text-slate-400">Please choose whether this is based on booked vacation days above.</p>
        )}
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-2">{hint}</p>}
      {children}
    </div>
  );
}
