"use client";

import { useState } from "react";

interface Flight {
  price?: number;
  duration?: number;
  airline?: string;
  from?: string;
  to?: string;
  departs?: string;
  arrives?: string;
}

interface Props {
  fromIata: string;
  toIata: string | null;
  toCity: string;
  outbound: string;
  ret: string;
  fallbackUrl: string;
}

function fmtDuration(mins?: number) {
  if (!mins) return "";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtTime(dt?: string) {
  if (!dt) return "";
  return dt.slice(11, 16);
}

export default function FlightSearchPanel({ fromIata, toIata, toCity, outbound, ret, fallbackUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<Flight[] | null>(null);
  const [searchUrl, setSearchUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dest = toIata ?? toCity;

  async function search() {
    if (open && flights) { setOpen(false); return; }
    if (!open) setOpen(true);
    if (flights) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/flights/search?from=${encodeURIComponent(fromIata)}&to=${encodeURIComponent(dest)}&outbound=${outbound}&return=${ret}`
      );
      const data = await res.json();
      if (res.status === 503) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        setOpen(false);
        setLoading(false);
        return;
      }
      if (!res.ok || data.error) setError(data.error ?? "Search failed");
      else { setFlights(data.flights); setSearchUrl(data.searchUrl); }
    } catch { setError("Request failed"); }
    setLoading(false);
  }

  return (
    <div className="w-full mt-3 border-t border-slate-100 pt-3">
      <button onClick={search} className="btn-ghost text-sm">
        ✈️ {open ? "Hide flights" : "Search flights"}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-400">{fromIata.toUpperCase()} → {dest.toUpperCase()} · {outbound} → {ret}</p>

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          {flights && flights.length === 0 && (
            <p className="text-xs text-slate-400 py-2">No flights found.</p>
          )}

          {flights && flights.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">{f.airline}</span>
                  {f.duration && <span className="text-xs text-slate-400">{fmtDuration(f.duration)}</span>}
                </div>
                {f.departs && f.arrives && (
                  <p className="text-xs text-slate-500 mt-0.5">{fmtTime(f.departs)} → {fmtTime(f.arrives)}</p>
                )}
              </div>
              {f.price != null && (
                <span className="text-base font-bold text-blue-700 flex-shrink-0">€{f.price}</span>
              )}
            </div>
          ))}

          {(flights || error) && (
            <a href={searchUrl ?? fallbackUrl} target="_blank" rel="noopener noreferrer"
              className="btn-primary text-xs inline-block mt-1">
              View all on {searchUrl ? "Google Flights" : "Skyscanner"} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
