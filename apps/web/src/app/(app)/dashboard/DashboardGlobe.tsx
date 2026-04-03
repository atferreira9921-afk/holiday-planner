"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { COUNTRIES } from "@/lib/data/geo";
import type { GlobeMarker } from "../wishlist/GlobeView";
import type { TripRow, FreeStayRow, WishlistRow } from "./DashboardClient";
import { CharacterAvatar } from "../family/FamilyMemberAvatarCard";

const GlobeView = dynamic(() => import("../wishlist/GlobeView"), { ssr: false });

// ─── Marker colours ───────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  planning:  "#60a5fa",
  suggested: "#a78bfa",
  booked:    "#34d399",
  completed: "#f59e0b",
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
  userName?:      string;
  userGender?:    string;
  userAvatarConfig?: { hair?: number; glasses?: number; face?: number; shirt?: number; bottom?: number; clothesColor?: number } | null;
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

// ─── Progress ring ────────────────────────────────────────────────────────────

function ProgressRing({ value, max, size = 72, isDark }: { value: number; max: number; size?: number; isDark: boolean }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? value / max : 0;
  const dash = circ * pct;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="7"/>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#ringGrad)" strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#a78bfa"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardGlobe({ activeTrips, completedTrips, freeStays, wishlist, userName, userGender, userAvatarConfig }: Props) {
  const [markers, setMarkers]     = useState<GlobeMarker[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [visited, setVisited]     = useState<Set<string>>(new Set());
  const [search, setSearch]       = useState("");
  const [showAll, setShowAll]     = useState(false);
  const [gridOpen, setGridOpen]   = useState(false);
  const [isDark, setIsDark]       = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setVisited(loadVisited()); }, []);

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

      for (const trip of activeTrips) {
        if (abortRef.current) break;
        if (!trip.destination_city) continue;
        const coords = await fetchCoords(trip.destination_city, "");
        if (!coords) continue;
        built.push({ lat: coords.lat, lng: coords.lng, label: `${trip.destination_city} (${trip.status})`, color: STATUS_COLOR[trip.status] ?? "#94a3b8", size: trip.status === "booked" ? 0.8 : 0.65 });
      }
      for (const trip of completedTrips) {
        if (abortRef.current) break;
        if (!trip.destination_city) continue;
        const coords = await fetchCoords(trip.destination_city, "");
        if (!coords) continue;
        built.push({ lat: coords.lat, lng: coords.lng, label: `${trip.destination_city} (completed)`, color: STATUS_COLOR.completed, size: 0.55 });
      }
      for (const w of wishlist) {
        if (abortRef.current) break;
        const coords = await fetchCoords(w.destination_city, w.destination_country);
        if (!coords) continue;
        built.push({ lat: coords.lat, lng: coords.lng, label: `${w.destination_city} (wishlist)`, color: "#94a3b8", size: 0.45 });
      }
      for (const fs of freeStays) {
        if (abortRef.current) break;
        const coords = await fetchCoords(fs.destination_city, fs.destination_country);
        if (!coords) continue;
        built.push({ lat: coords.lat, lng: coords.lng, label: `${fs.destination_city} (free stay)`, color: "#10b981", size: 0.55 });
      }

      if (!abortRef.current) setMarkers(built);
      setGeocoding(false);
    }

    build();
    return () => { abortRef.current = true; };
  }, [activeTrips, completedTrips, freeStays, wishlist]);

  function toggleVisited(code: string) {
    setVisited(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      saveVisited(next);
      return next;
    });
  }

  const filtered    = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );
  const visitedList = COUNTRIES.filter(c => visited.has(c.code));
  const displayed   = showAll ? filtered : filtered.slice(0, 60);

  const legend = [
    { color: STATUS_COLOR.planning,  label: "Planning"  },
    { color: STATUS_COLOR.suggested, label: "Suggested" },
    { color: STATUS_COLOR.booked,    label: "Booked"    },
    { color: STATUS_COLOR.completed, label: "Completed" },
    { color: "#94a3b8",              label: "Wishlist"  },
    { color: "#10b981",              label: "Free stay" },
  ];

  // ── Derived dark-mode-aware values ────────────────────────────────────────
  const cardBg      = isDark
    ? "linear-gradient(135deg, #1a2236 0%, #1e2a44 50%, #1a1f35 100%)"
    : "linear-gradient(135deg, #f8faff 0%, #f0f4ff 50%, #faf5ff 100%)";
  const dividerColor = isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.12)";
  const avatarBg     = isDark
    ? "linear-gradient(155deg, rgba(99,102,241,0.18) 0%, rgba(167,139,250,0.22) 100%)"
    : "linear-gradient(155deg, rgba(99,102,241,0.1) 0%, rgba(167,139,250,0.16) 100%)";
  const badgeBg      = isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)";
  const badgeBorder  = isDark ? "rgba(99,102,241,0.3)"  : "rgba(99,102,241,0.2)";
  const badgeColor   = isDark ? "#a5b4fc" : "#4f46e5";
  const addBtnBg     = isDark ? "#1e293b" : "#f1f5f9";
  const addBtnBorder = isDark ? "#334155" : "#e2e8f0";
  const addBtnColor  = isDark ? "#94a3b8" : "#64748b";
  const rowHoverBg   = isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)";
  const emptyColor   = isDark ? "#64748b" : "#94a3b8";

  return (
    <div className="card overflow-hidden" style={{ background: cardBg }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-0 flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900 text-lg">🌍 Your travel map</h2>
        {geocoding && (
          <span className="text-xs text-slate-400 animate-pulse">Locating destinations…</span>
        )}
      </div>

      {/* ── Main two-column body ────────────────────────────────────────────── */}
      <div
        className="flex flex-col lg:flex-row"
        style={{ borderTop: "none" }}
      >

        {/* ── LEFT: avatar + globe ─────────────────────────────────────────── */}
        <div className="flex-1 p-6 flex flex-col items-center min-w-0">

          {/* Avatar + globe row */}
          <div className="flex items-end justify-center gap-3 w-full mb-4">
            {userName && (
              <div className="hidden sm:flex flex-col items-center gap-1 flex-shrink-0 pb-2 -ml-4">
                <div
                  className="w-40 h-52"
                  style={{ filter: "drop-shadow(0 8px 24px rgba(99,102,241,0.22))" }}
                >
                  <CharacterAvatar
                    name={userName}
                    gender={userGender ?? "other"}
                    config={userAvatarConfig}
                    className="w-full h-full"
                  />
                </div>
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: badgeColor }}>{userName}</span>
              </div>
            )}
            <div className="flex-shrink-0">
              <GlobeView markers={markers} visitedCountryCodes={visited} />
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {legend.map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Trip pills */}
          {(activeTrips.some(t => t.destination_city) || completedTrips.some(t => t.destination_city)) && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {activeTrips.filter(t => t.destination_city).map(trip => (
                <div key={trip.id}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs"
                  style={{ borderColor: `${STATUS_COLOR[trip.status] ?? "#94a3b8"}40`, background: `${STATUS_COLOR[trip.status] ?? "#94a3b8"}${isDark ? "1a" : "10"}` }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[trip.status] ?? "#94a3b8" }} />
                  <span className="font-medium text-slate-700">{trip.destination_city}</span>
                  <span className="text-slate-400 capitalize">{trip.status}</span>
                </div>
              ))}
              {completedTrips.filter(t => t.destination_city).slice(0, 3).map(trip => (
                <div key={trip.id}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs"
                  style={{ borderColor: `${STATUS_COLOR.completed}40`, background: `${STATUS_COLOR.completed}${isDark ? "1a" : "10"}` }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR.completed }} />
                  <span className="font-medium text-slate-700">{trip.destination_city}</span>
                  <span className="text-slate-400">Done</span>
                </div>
              ))}
            </div>
          )}

          {markers.length === 0 && !geocoding && (
            <p className="text-xs text-center mt-3" style={{ color: emptyColor }}>
              No destinations yet. Plan a trip or add to your wishlist.
            </p>
          )}
        </div>

        {/* ── Vertical divider (desktop only) ─────────────────────────────── */}
        <div className="hidden lg:block w-px self-stretch my-5" style={{ background: dividerColor }} />
        {/* ── Horizontal divider (mobile only) ────────────────────────────── */}
        <div className="lg:hidden h-px mx-6" style={{ background: dividerColor }} />

        {/* ── RIGHT: visited countries ─────────────────────────────────────── */}
        <div className="lg:w-72 xl:w-80 flex flex-col p-6 gap-4 min-h-0">

          {/* Stat header */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <ProgressRing value={visited.size} max={COUNTRIES.length} size={72} isDark={isDark} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-indigo-600 leading-none">{visited.size}</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">of {COUNTRIES.length}</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 leading-tight">Visited countries</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {visited.size === 0
                  ? "Start marking where you've been"
                  : `${Math.round((visited.size / COUNTRIES.length) * 100)}% of the world explored`}
              </p>
            </div>
          </div>

          {/* Visited badges */}
          {visitedList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {visitedList.map(c => (
                <button
                  key={c.code}
                  onClick={() => toggleVisited(c.code)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition group"
                  style={{ background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor }}
                  title="Click to remove"
                >
                  {c.name}
                  <span className="opacity-0 group-hover:opacity-100 transition text-[9px] text-red-400">✕</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs italic" style={{ color: emptyColor }}>
              Search below and click a country to mark it visited.
            </p>
          )}

          {/* Divider */}
          <div className="h-px" style={{ background: dividerColor }} />

          {/* Search + expand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                className="input text-xs flex-1 py-1.5"
                placeholder="🔍 Search countries…"
                value={search}
                onChange={e => { setSearch(e.target.value); if (!gridOpen) setGridOpen(true); }}
              />
              <button
                onClick={() => setGridOpen(o => !o)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-semibold transition flex-shrink-0"
                style={gridOpen
                  ? { background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }
                  : { background: addBtnBg, color: addBtnColor, border: `1px solid ${addBtnBorder}` }}
              >
                {gridOpen ? "▲" : "+ Add"}
              </button>
            </div>

            {gridOpen && (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                {displayed.map(c => {
                  const isVisited = visited.has(c.code);
                  return (
                    <button
                      key={c.code}
                      onClick={() => toggleVisited(c.code)}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition"
                      style={isVisited
                        ? { background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor }
                        : { background: "transparent", border: "1px solid transparent", color: isDark ? "#94a3b8" : "#475569" }}
                      onMouseEnter={e => { if (!isVisited) (e.currentTarget as HTMLElement).style.background = rowHoverBg; }}
                      onMouseLeave={e => { if (!isVisited) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm flex-shrink-0 flex items-center justify-center text-[9px] font-bold transition-all"
                        style={isVisited
                          ? { background: "#6366f1", color: "white" }
                          : { background: isDark ? "#334155" : "#e2e8f0", color: "transparent" }}
                      >
                        {isVisited && "✓"}
                      </span>
                      <span className="truncate font-medium">{c.name}</span>
                    </button>
                  );
                })}
                {!showAll && filtered.length > 60 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 transition font-semibold pt-1"
                  >
                    Show all {filtered.length} →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
