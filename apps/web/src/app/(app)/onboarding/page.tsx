"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, getAirports } from "@/lib/data/geo";

const STEPS = [
  { id: 1, title: "Your vacation budget", subtitle: "How many vacation days do you get per year, and where are you based?" },
  { id: 2, title: "Your travel style",    subtitle: "Help us personalise trip suggestions for you." },
  { id: 3, title: "You're all set!",      subtitle: "Head to the calendar to book your first vacation window." },
];

const STYLES = [
  { value: "budget",    label: "Budget", icon: "🎒", desc: "Hostels, budget airlines, street food" },
  { value: "mid-range", label: "Mid-range", icon: "✈️", desc: "3-star hotels, direct flights where possible" },
  { value: "luxury",    label: "Luxury", icon: "💎", desc: "5-star resorts, business class, fine dining" },
];

const INTERESTS = ["beach", "mountains", "culture", "food", "nightlife", "nature", "city", "adventure", "relaxation", "history"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [vacDays, setVacDays]         = useState(22);
  const [country, setCountry]         = useState("PT");
  const [travelStyle, setTravelStyle] = useState("mid-range");
  const [interests, setInterests]     = useState<string[]>([]);

  function toggleInterest(v: string) {
    setInterests(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  async function saveAndContinue() {
    if (step < 2) { setStep(s => s + 1); return; }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const airports = getAirports(country);
    const homeCity = airports[0]?.city ?? "";
    const homeIata = airports[0]?.iata ?? null;

    await supabase.from("user_preferences").upsert({
      user_id: user.id,
      vacation_days_per_year: vacDays,
      home_country: country,
      home_city: homeIata,
      home_city_name: homeCity,
      travel_style: travelStyle,
      interests,
      budget_min_eur: travelStyle === "budget" ? 200 : travelStyle === "luxury" ? 1000 : 400,
      budget_max_eur: travelStyle === "budget" ? 800 : travelStyle === "luxury" ? 5000 : 2000,
    }, { onConflict: "user_id" });

    setStep(3);
    setSaving(false);
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Setup</span>
          <span className="text-xs text-slate-400">Step {step} of {STEPS.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="card p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{STEPS[step - 1].title}</h1>
          <p className="text-slate-500 text-sm mt-1">{STEPS[step - 1].subtitle}</p>
        </div>

        {/* Step 1: Vacation days + country */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="label">Vacation days per year</label>
              <div className="flex items-center gap-4">
                <input type="range" min={5} max={40} value={vacDays}
                  onChange={e => setVacDays(Number(e.target.value))}
                  className="flex-1 accent-indigo-600" />
                <span className="text-2xl font-bold text-indigo-600 w-12 text-right">{vacDays}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                This is how many vacation days you have to allocate each year (not counting public holidays).
              </p>
            </div>

            <div>
              <label className="label">Home country</label>
              <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Used to pull your public holidays and find smart bridge-day opportunities.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Travel style + interests */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="label">Travel style</label>
              <div className="grid grid-cols-3 gap-3">
                {STYLES.map(s => (
                  <button key={s.value} type="button" onClick={() => setTravelStyle(s.value)}
                    className={[
                      "p-4 rounded-xl border-2 text-left transition",
                      travelStyle === s.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300",
                    ].join(" ")}>
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="font-semibold text-slate-900 text-sm">{s.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Interests (optional)</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(i => (
                  <button key={i} type="button" onClick={() => toggleInterest(i)}
                    className={[
                      "px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition capitalize",
                      interests.includes(i)
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-300",
                    ].join(" ")}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="text-6xl">🎉</div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Your profile is set up! Next, head to the <strong>Holiday Calendar</strong> to book your first vacation window.
              Once you have vacation days booked, the Trips page will suggest smart trip options.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <a href="/holidays" className="btn-primary text-sm">🗓️ Book vacation days →</a>
              <a href="/dashboard" className="btn-ghost text-sm">Skip for now</a>
            </div>
          </div>
        )}

        {step < 3 && (
          <button onClick={saveAndContinue} disabled={saving} className="btn-primary w-full">
            {saving ? "Saving…" : step === 2 ? "Save & finish" : "Continue →"}
          </button>
        )}
      </div>

      {step < 3 && (
        <p className="text-center text-xs text-slate-400 mt-4">
          You can change all of this later in <a href="/preferences" className="text-indigo-500 hover:underline">Preferences</a>.
        </p>
      )}
    </div>
  );
}
