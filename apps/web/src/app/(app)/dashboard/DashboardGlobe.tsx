"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { COUNTRIES } from "@/lib/data/geo";
import type { GlobeMarker } from "../wishlist/GlobeView";
import type { TripRow, FreeStayRow, WishlistRow } from "./DashboardClient";

const GlobeView = dynamic(() => import("../wishlist/GlobeView"), { ssr: false });

// ─── Marker colours ───────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  planning:  "#60a5fa", // blue
  suggested: "#a78bfa", // violet
  booked:    "#34d399", // green
  completed: "#f59e0b", // amber
};

// ─── Nominatim geocoding (cached in localStorage) ────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function geocodeCity(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  const key = `geocode::${city.toLowerCase()}::${country.toLowerCase()}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    const q = encodeURIComponent(`${city}, ${country}`);
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

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  activeTrips:    TripRow[];
  completedTrips: TripRow[];
  freeStays:      FreeStayRow[];
  wishlist:       WishlistRow[];
}

// ─── Visited countries localStorage key ──────────────────────────────────────
const VISITED_KEY = "hp::visited_countries";

function loadVisited(): Set<string> {
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveVisited(set: Set<string>) {
  try { localStorage.setItem(VISITED_KEY, JSON.stringify([...set])); } catch { /* noop */ }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardGlobe({ activeTrips, completedTrips, freeStays, wishlist }: Props) {
  const [markers, setMarkers]     = useState<GlobeMarker[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [visited, setVisited]     = useState<Set<string>>(new Set());
  const [search, setSearch]       = useState("");
  const [showAll, setShowAll]     = useState(false);
  const abortRef = useRef(false);

  // Load visited from localStorage (client-only)
  useEffect(() => {
    setVisited(loadVisited());
  }, []);

  // Build + geocode markers
  useEffect(() => {
    abortRef.current = false;
    let firstUncached = true;

    async function build() {
      setGeocoding(true);
      const built: GlobeMarker[] = [];

      async function fetchCoords(city: string, countryCode: string) {
        const cacheKey = `geocode::${city.toLowerCase()}::${countryCode.toLowerCase()}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached) as { lat: number; lng: number };
        if (!firstUncached) await sleep(1150);
        firstUncached = false;
        const countryName = COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode;
        return geocodeCity(city, countryName);
      }

      // Active trips (planning / suggested / booked)
      for (const trip of activeTrips) {
        if (abortRef.current) break;
        if (!trip.destination_city) continue;
        const coords = await fetchCoords(trip.destination_city, "");
        if (!coords) continue;
        built.push({
          lat: coords.lat, lng: coords.lng,
          label: `${trip.destination_city} (${trip.status})`,
          color: STATUS_COLOR[trip.status] ?? "#94a3b8",
          size: trip.status === "booked" ? 0.8 : 0.65,
        });
      }

      // Completed trips
      for (const trip of completedTrips) {
        if (abortRef.current) break;
        if (!trip.destination_city) continue;
        const coords = await fetchCoords(trip.destination_city, "");
        if (!coords) continue;
        built.push({
          lat: coords.lat, lng: coords.lng,
          label: `${trip.destination_city} (completed)`,
          color: STATUS_COLOR.completed,
          size: 0.55,
        });
      }

      // Wishlist
      for (const w of wishlist) {
        if (abortRef.current) break;
        const coords = await fetchCoords(w.destination_city, w.destination_country);
        if (!coords) continue;
        built.push({
          lat: coords.lat, lng: coords.lng,
          label: `${w.destination_city} (wishlist)`,
          color: "#94a3b8",
          size: 0.45,
        });
      }

      // Free stays
      for (const fs of freeStays) {
        if (abortRef.current) break;
        const coords = await fetchCoords(fs.destination_city, fs.destination_country);
        if (!coords) continue;
        built.push({
          lat: coords.lat, lng: coords.lng,
          label: `${fs.destination_city} (free stay)`,
          color: "#10b981",
          size: 0.55,
        });
      }

      if (!abortRef.current) setMarkers(built);
      setGeocoding(false);
    }

    build();
    return () => { abortRef.current = true; };
  }, [activeTrips, completedTrips, freeStays, wishlist]);

  // ── Visited countries handlers ───────────────────────────────────────────

  function toggleVisited(code: string) {
    setVisited(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      saveVisited(next);
      return next;
    });
  }

  // ── Filter countries list ────────────────────────────────────────────────
  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const visitedList  = COUNTRIES.filter(c => visited.has(c.code));
  const displayed    = showAll ? filtered : filtered.slice(0, 60);

  // ── Legend ───────────────────────────────────────────────────────────────
  const legend = [
    { color: STATUS_COLOR.planning,  label: "Planning" },
    { color: STATUS_COLOR.suggested, label: "Suggested" },
    { color: STATUS_COLOR.booked,    label: "Booked" },
    { color: STATUS_COLOR.completed, label: "Completed" },
    { color: "#94a3b8",              label: "Wishlist" },
    { color: "#10b981",              label: "Free stay" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Globe ───────────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-bold text-slate-900 text-lg">🌍 Your travel map</h2>
          {geocoding && (
            <span className="text-xs text-slate-400 animate-pulse">Locating destinations…</span>
          )}
        </div>

        {/* Globe centered */}
        <div className="flex justify-center mb-5">
          <GlobeView markers={markers} visitedCountryCodes={visited} />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
          {legend.map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
          {/* Visited indicator */}
          {visited.size > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-indigo-500 opacity-80" />
              Visited ({visited.size})
            </div>
          )}
        </div>

        {/* Trip destination pills */}
        {(activeTrips.some(t => t.destination_city) || completedTrips.some(t => t.destination_city)) && (
          <div className="flex flex-wrap justify-center gap-2">
            {activeTrips.filter(t => t.destination_city).map(trip => (
              <div
                key={trip.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[trip.status] ?? "#94a3b8" }} />
                <span className="font-medium text-slate-700">{trip.destination_city}</span>
                <span className="text-slate-400 capitalize">{trip.status}</span>
              </div>
            ))}
            {completedTrips.filter(t => t.destination_city).slice(0, 3).map(trip => (
              <div
                key={trip.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR.completed }} />
                <span className="font-medium text-slate-700">{trip.destination_city}</span>
                <span className="text-slate-400">Done</span>
              </div>
            ))}
          </div>
        )}

        {markers.length === 0 && !geocoding && (
          <p className="text-sm text-slate-400 text-center">No destinations yet. Plan a trip or add to your wishlist.</p>
        )}
      </div>

      {/* ── Visited countries checklist ──────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">🗺️ Visited countries</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {visited.size} / {COUNTRIES.length} countries visited
            </p>
          </div>
        </div>

        {/* Already visited badges */}
        {visitedList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
            {visitedList.map(c => (
              <button
                key={c.code}
                onClick={() => toggleVisited(c.code)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition group"
                title="Click to remove"
              >
                {c.name}
                <span className="opacity-0 group-hover:opacity-100 transition">✕</span>
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <input
          className="input text-sm w-full mb-4"
          placeholder="Search countries…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Country grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-72 overflow-y-auto pr-1">
          {displayed.map(c => {
            const isVisited = visited.has(c.code);
            return (
              <button
                key={c.code}
                onClick={() => toggleVisited(c.code)}
                className={[
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition border",
                  isVisited
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                    : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                <span className={["w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center text-[9px]",
                  isVisited ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300"].join(" ")}>
                  {isVisited && "✓"}
                </span>
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>

        {!showAll && filtered.length > 60 && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 transition"
          >
            Show all {filtered.length} countries
          </button>
        )}
      </div>
    </div>
  );
}
