"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WishlistLoading from "./loading";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, getAirports } from "@/lib/data/geo";
import type { GlobeMarker } from "./GlobeView";

// Loaded client-side only (Three.js needs the browser)
const GlobeView = dynamic(() => import("./GlobeView"), { ssr: false });

interface WishlistItem {
  id: string;
  destination_city: string;
  destination_country: string;
  notes: string | null;
  priority: number;
  created_at: string;
}

interface FreeStay {
  id: string;
  destination_city: string;
  destination_country: string;
  host_name: string | null;
  notes: string | null;
  created_at: string;
}

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Someday",          color: "#94a3b8" },
  2: { label: "Would love to",    color: "#60a5fa" },
  3: { label: "Really want",      color: "#34d399" },
  4: { label: "Top of list",      color: "#f59e0b" },
  5: { label: "Dream destination",color: "#f43f5e" },
};

// Priority → globe dot color
const PRIORITY_COLORS: Record<number, string> = {
  1: "#94a3b8", 2: "#60a5fa", 3: "#34d399", 4: "#f59e0b", 5: "#f43f5e",
};

// ─── Geocoding via Nominatim (cached in localStorage) ─────────────────────────

async function geocodeCity(city: string, countryName: string): Promise<{ lat: number; lng: number } | null> {
  const key = `geocode::${city.toLowerCase()}::${countryName.toLowerCase()}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);

    const q = encodeURIComponent(`${city}, ${countryName}`);
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { "User-Agent": "HolidayPlanner/1.0" } }
    );
    const data = await r.json();
    if (!data[0]) return null;
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    localStorage.setItem(key, JSON.stringify(result));
    return result;
  } catch {
    return null;
  }
}

// Delay between uncached Nominatim requests (rate limit: 1 req/s)
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── City picker sub-component ─────────────────────────────────────────────────

function CityPicker({
  country, city, onCountryChange, onCityChange,
}: {
  country: string; city: string;
  onCountryChange: (code: string) => void;
  onCityChange: (city: string) => void;
}) {
  const airports = getAirports(country);
  const cities = [...new Map(airports.map(a => [a.city, a])).values()];
  const isCustom = city === "__custom" || (city && airports.length > 0 && !cities.some(a => a.city === city));

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="label">Country</label>
        <select className="input" value={country} onChange={e => onCountryChange(e.target.value)}>
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">City</label>
        {cities.length > 0 ? (
          <>
            <select className="input" value={isCustom ? "__custom" : city}
              onChange={e => onCityChange(e.target.value)}>
              <option value="">Choose a city…</option>
              {cities.map(a => <option key={a.city} value={a.city}>{a.city}</option>)}
              <option value="__custom">Other city…</option>
            </select>
            {isCustom && (
              <input className="input mt-2" placeholder="Enter city name"
                value={city === "__custom" ? "" : city}
                onChange={e => onCityChange(e.target.value)} />
            )}
          </>
        ) : (
          <input className="input" value={city}
            onChange={e => onCityChange(e.target.value)}
            placeholder="City name" />
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function WishlistPage() {
  const router = useRouter();

  // Wishlist
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(true);
  const [showWishlistForm, setShowWishlistForm] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [wishlistForm, setWishlistForm] = useState({
    destination_country: "PT", destination_city: "", notes: "", priority: 3,
  });

  // Free stays
  const [freeStays, setFreeStays] = useState<FreeStay[]>([]);
  const [loadingStays, setLoadingStays] = useState(true);
  const [showStayForm, setShowStayForm] = useState(false);
  const [savingStay, setSavingStay] = useState(false);
  const [stayForm, setStayForm] = useState({
    destination_country: "PT", destination_city: "", host_name: "", notes: "",
  });

  // Globe
  const [markers, setMarkers] = useState<GlobeMarker[]>([]);
  const [geocoding, setGeocoding] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  async function loadWishlist(uid: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("destination_wishlist").select("*").eq("user_id", uid)
      .order("priority", { ascending: false }).order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoadingWishlist(false);
    return data ?? [];
  }

  async function loadFreeStays(uid: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("free_stays").select("*").eq("owner_user_id", uid)
      .order("created_at", { ascending: false });
    setFreeStays(data ?? []);
    setLoadingStays(false);
    return data ?? [];
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [wishlist, stays] = await Promise.all([loadWishlist(user.id), loadFreeStays(user.id)]);
      geocodeCities(wishlist, stays);
    })();
  }, []);

  // ── Geocode + build globe markers ─────────────────────────────────────────

  async function geocodeCities(wishlist: WishlistItem[], stays: FreeStay[]) {
    setGeocoding(true);
    const built: GlobeMarker[] = [];
    let firstUncached = true;

    async function fetchCoords(city: string, countryCode: string): Promise<{ lat: number; lng: number } | null> {
      const cacheKey = `geocode::${city.toLowerCase()}::${countryCode.toLowerCase()}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
      if (!firstUncached) await sleep(1150); // Nominatim rate limit
      firstUncached = false;
      return geocodeCity(city, COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode);
    }

    for (const item of wishlist) {
      const coords = await fetchCoords(item.destination_city, item.destination_country);
      if (coords) {
        built.push({
          lat: coords.lat, lng: coords.lng,
          label: `⭐ ${item.destination_city}`,
          color: PRIORITY_COLORS[item.priority] ?? "#60a5fa",
          size: 0.45 + item.priority * 0.09,
        });
        setMarkers([...built]);
      }
    }

    for (const stay of stays) {
      const coords = await fetchCoords(stay.destination_city, stay.destination_country);
      if (coords) {
        built.push({
          lat: coords.lat, lng: coords.lng,
          label: `🏠 ${stay.destination_city}${stay.host_name ? ` (${stay.host_name})` : ""}`,
          color: "#10b981",
          size: 0.6,
        });
        setMarkers([...built]);
      }
    }

    setGeocoding(false);
  }

  // ── Wishlist handlers ──────────────────────────────────────────────────────

  async function handleAddWishlist(e: React.FormEvent) {
    e.preventDefault();
    if (!wishlistForm.destination_city.trim() || wishlistForm.destination_city === "__custom") return;
    setSavingWishlist(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("destination_wishlist").insert({
      user_id: user.id,
      destination_city: wishlistForm.destination_city.trim(),
      destination_country: wishlistForm.destination_country,
      notes: wishlistForm.notes.trim() || null,
      priority: wishlistForm.priority,
    });
    setWishlistForm({ destination_country: "PT", destination_city: "", notes: "", priority: 3 });
    setShowWishlistForm(false);
    setSavingWishlist(false);
    const wishlist = await loadWishlist(user.id);
    geocodeCities(wishlist, freeStays);
  }

  async function handleDeleteWishlist(id: string) {
    const supabase = createClient();
    await supabase.from("destination_wishlist").delete().eq("id", id);
    const next = items.filter(x => x.id !== id);
    setItems(next);
    geocodeCities(next, freeStays);
  }

  async function handlePriority(id: string, p: number) {
    const supabase = createClient();
    await supabase.from("destination_wishlist").update({ priority: p }).eq("id", id);
    const next = items.map(x => x.id === id ? { ...x, priority: p } : x);
    setItems(next);
    geocodeCities(next, freeStays);
  }

  // ── Free stay handlers ─────────────────────────────────────────────────────

  async function handleAddStay(e: React.FormEvent) {
    e.preventDefault();
    if (!stayForm.destination_city.trim() || stayForm.destination_city === "__custom") return;
    setSavingStay(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("free_stays").insert({
      owner_user_id: user.id,
      destination_city: stayForm.destination_city.trim(),
      destination_country: stayForm.destination_country,
      host_name: stayForm.host_name.trim() || null,
      notes: stayForm.notes.trim() || null,
    });
    setStayForm({ destination_country: "PT", destination_city: "", host_name: "", notes: "" });
    setShowStayForm(false);
    setSavingStay(false);
    const stays = await loadFreeStays(user.id);
    geocodeCities(items, stays);
  }

  async function handleDeleteStay(id: string) {
    const supabase = createClient();
    await supabase.from("free_stays").delete().eq("id", id);
    const next = freeStays.filter(x => x.id !== id);
    setFreeStays(next);
    geocodeCities(items, next);
  }

  const stayCountryName = (code: string) => COUNTRIES.find(c => c.code === code)?.name ?? code;
  const totalPins = markers.length;
  const hasAny = items.length > 0 || freeStays.length > 0;

  if (loadingWishlist && loadingStays) return <WishlistLoading />;

  return (
    // Wider container when globe is shown, normal otherwise
    <div className={hasAny ? "" : "max-w-2xl mx-auto"}>
      <div className={hasAny ? "flex flex-col lg:flex-row gap-8 items-start" : ""}>

        {/* ─── Left: all content ─── */}
        <div className="flex-1 min-w-0 space-y-10">

      {/* ─── Destination Wishlist ─── */}
      <section className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🌍 Destination Wishlist</h1>
            <p className="text-slate-500 text-sm mt-1">Places you dream of visiting. The AI will prioritise these when planning trips.</p>
          </div>
          <button onClick={() => setShowWishlistForm(f => !f)} className="btn-primary text-sm">
            {showWishlistForm ? "Cancel" : "+ Add destination"}
          </button>
        </div>

        {showWishlistForm && (
          <form onSubmit={handleAddWishlist} className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Add a dream destination</h2>
            <CityPicker
              country={wishlistForm.destination_country}
              city={wishlistForm.destination_city}
              onCountryChange={code => {
                const airports = getAirports(code);
                setWishlistForm(f => ({ ...f, destination_country: code, destination_city: airports[0]?.city ?? "" }));
              }}
              onCityChange={city => setWishlistForm(f => ({ ...f, destination_city: city }))}
            />
            <div>
              <label className="label">How much do you want to go?</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map(p => {
                  const pl = PRIORITY_LABELS[p];
                  return (
                    <button key={p} type="button" onClick={() => setWishlistForm(f => ({ ...f, priority: p }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition ${wishlistForm.priority === p ? "text-white border-transparent" : "border-slate-200 text-slate-600"}`}
                      style={wishlistForm.priority === p ? { background: pl.color, borderColor: pl.color } : {}}>
                      {"★".repeat(p)} {pl.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" value={wishlistForm.notes}
                onChange={e => setWishlistForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Always wanted to see the cherry blossoms" />
            </div>
            <button type="submit" className="btn-primary text-sm"
              disabled={savingWishlist || !wishlistForm.destination_city || wishlistForm.destination_city === "__custom"}>
              {savingWishlist ? "Saving…" : "Add to wishlist"}
            </button>
          </form>
        )}

        {loadingWishlist ? (
          <div className="text-slate-400 text-sm text-center py-8">Loading…</div>
        ) : items.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">Your wishlist is empty</h3>
            <p className="text-slate-500 text-sm">Add places you dream of visiting and the AI will factor them into your trip suggestions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const pl = PRIORITY_LABELS[item.priority] ?? PRIORITY_LABELS[3];
              const countryName = COUNTRIES.find(c => c.code === item.destination_country)?.name ?? item.destination_country;
              const hasFreeStay = freeStays.some(
                s => s.destination_city.toLowerCase() === item.destination_city.toLowerCase()
                  && s.destination_country === item.destination_country
              );
              return (
                <div key={item.id} className="card p-5 flex items-center gap-4">
                  <div className="text-center flex-shrink-0 w-10">
                    <div className="text-lg" style={{ color: pl.color }}>{"★".repeat(item.priority)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{item.destination_city}, {countryName}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: pl.color + "20", color: pl.color }}>{pl.label}</span>
                      {hasFreeStay && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          🏠 Free stay
                        </span>
                      )}
                    </div>
                    {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(p => (
                        <button key={p} type="button" onClick={() => handlePriority(item.id, p)}
                          className={`text-xs transition ${item.priority >= p ? "" : "opacity-30"}`}
                          style={{ color: PRIORITY_LABELS[p].color }}>★</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/trips/new?destination_city=${encodeURIComponent(item.destination_city)}&destination_country=${item.destination_country}`)}
                      className="btn-ghost text-xs px-3">Plan trip →</button>
                    <button onClick={() => handleDeleteWishlist(item.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition px-2">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Free Stays ─── */}
      <section className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">🏠 Free Stays</h2>
            <p className="text-slate-500 text-sm mt-1">
              Cities where you have someone to stay with — hotel cost drops to €0,
              making these destinations significantly cheaper in AI suggestions.
            </p>
          </div>
          <button onClick={() => setShowStayForm(f => !f)} className="btn-primary text-sm">
            {showStayForm ? "Cancel" : "+ Add free stay"}
          </button>
        </div>

        {showStayForm && (
          <form onSubmit={handleAddStay} className="card p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Add a free stay</h3>
            <CityPicker
              country={stayForm.destination_country}
              city={stayForm.destination_city}
              onCountryChange={code => {
                const airports = getAirports(code);
                setStayForm(f => ({ ...f, destination_country: code, destination_city: airports[0]?.city ?? "" }));
              }}
              onCityChange={city => setStayForm(f => ({ ...f, destination_city: city }))}
            />
            <div>
              <label className="label">Who are you staying with? (optional)</label>
              <input className="input" value={stayForm.host_name}
                onChange={e => setStayForm(f => ({ ...f, host_name: e.target.value }))}
                placeholder="e.g. Cousin João, University friend Ana" />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" value={stayForm.notes}
                onChange={e => setStayForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Spare room, available in summer" />
            </div>
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800">
              <span className="text-base flex-shrink-0">💡</span>
              <p>Hotel cost for this destination will be set to <strong>€0</strong> when generating AI trip suggestions.</p>
            </div>
            <button type="submit" className="btn-primary text-sm"
              disabled={savingStay || !stayForm.destination_city || stayForm.destination_city === "__custom"}>
              {savingStay ? "Saving…" : "Save free stay"}
            </button>
          </form>
        )}

        {loadingStays ? (
          <div className="text-slate-400 text-sm text-center py-4">Loading…</div>
        ) : freeStays.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-3">🛋️</div>
            <h3 className="font-bold text-slate-900 mb-1">No free stays saved</h3>
            <p className="text-slate-500 text-sm">
              Add cities where you can stay at a friend&apos;s or family&apos;s place — the AI will factor in the €0 hotel cost.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {freeStays.map(stay => {
              const countryName = stayCountryName(stay.destination_country);
              const inWishlist = items.some(
                w => w.destination_city.toLowerCase() === stay.destination_city.toLowerCase()
                  && w.destination_country === stay.destination_country
              );
              return (
                <div key={stay.id} className="card p-5 flex items-center gap-4" style={{ borderColor: "#a7f3d0" }}>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">🏠</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{stay.destination_city}, {countryName}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                        🏨 Hotel: €0
                      </span>
                    </div>
                    {stay.host_name && (
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">Staying with: {stay.host_name}</p>
                    )}
                    {stay.notes && <p className="text-xs text-slate-400 mt-0.5">{stay.notes}</p>}
                    {!inWishlist && (
                      <button
                        onClick={() => {
                          setWishlistForm(f => ({ ...f, destination_city: stay.destination_city, destination_country: stay.destination_country }));
                          setShowWishlistForm(true);
                        }}
                        className="text-xs text-indigo-500 hover:underline mt-1">
                        + Add to wishlist too
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/trips/new?destination_city=${encodeURIComponent(stay.destination_city)}&destination_country=${stay.destination_country}`)}
                      className="btn-ghost text-xs px-3">Plan trip →</button>
                    <button onClick={() => handleDeleteStay(stay.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition px-2">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
        {/* end left column */}
        </div>

        {/* ─── Right: sticky globe ─── */}
        {hasAny && (
          <div className="w-full lg:w-[440px] flex-shrink-0 lg:sticky lg:top-[88px] space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-700">Your travel map</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalPins} {totalPins === 1 ? "city" : "cities"} pinned
                {geocoding && <span className="text-indigo-500 ml-1">· locating…</span>}
              </p>
            </div>

            <GlobeView markers={markers} />

            {/* Legend */}
            <div className="card p-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Legend</p>
              {[5,4,3,2,1].map(p => {
                const pl = PRIORITY_LABELS[p];
                return (
                  <div key={p} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: pl.color }} />
                    {"★".repeat(p)} {pl.label}
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-xs text-slate-600 border-t border-slate-100 pt-1.5 mt-1">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
                🏠 Free stay
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">Drag to rotate · hover pins for city name</p>
          </div>
        )}

      </div>
    </div>
  );
}
