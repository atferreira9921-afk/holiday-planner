"use client";

import { useState } from "react";
import { AIRPORTS_BY_COUNTRY, COUNTRIES } from "@/lib/data/geo";

// Build lookup maps from the geo data
const cityToIata = new Map<string, string>();
const iataToCity = new Map<string, string>();
for (const airports of Object.values(AIRPORTS_BY_COUNTRY)) {
  for (const a of airports) {
    cityToIata.set(a.city.toLowerCase(), a.iata);
    iataToCity.set(a.iata.toUpperCase(), a.city);
  }
}

/** Resolve a city name or IATA string to a valid IATA code, or null if unknown */
function resolveIata(value: string): string | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  // Already looks like an IATA code
  if (/^[A-Z]{3}$/.test(upper) || /^[A-Z0-9]{2,4}$/.test(upper)) return upper;
  // Try city name lookup
  return cityToIata.get(value.trim().toLowerCase()) ?? null;
}

/** Display label for an airport value (IATA or city name) */
function airportLabel(value: string): string {
  const upper = value.trim().toUpperCase();
  const city = iataToCity.get(upper);
  return city ? `${city} (${upper})` : value;
}

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
  toCountry?: string | null;
  outbound: string;
  ret: string;
  fallbackUrl: string;
  returnFromCity?: string | null;
}

function fmtDuration(mins?: number) {
  if (!mins) return "";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtTime(dt?: string) {
  if (!dt) return "";
  return dt.slice(11, 16);
}

function FlightList({ flights, searchUrl, fallbackUrl, error, loading }: {
  flights: Flight[] | null;
  searchUrl: string | null;
  fallbackUrl: string;
  error: string | null;
  loading: boolean;
}) {
  return (
    <div className="mt-3 space-y-2">
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
  );
}

/** Inline airport picker used when we don't have an IATA code for the destination */
function AirportPicker({ defaultCountry, onSelect }: {
  defaultCountry?: string | null;
  onSelect: (iata: string, label: string) => void;
}) {
  const [country, setCountry] = useState(defaultCountry ?? "");
  const airports = AIRPORTS_BY_COUNTRY[country] ?? [];

  return (
    <div className="flex gap-2 flex-wrap mt-2">
      <select
        className="input flex-1 text-xs"
        value={country}
        onChange={e => setCountry(e.target.value)}
      >
        <option value="">Select country…</option>
        {COUNTRIES.map(c => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
      {country && airports.length > 0 && (
        <select
          className="input flex-1 text-xs"
          defaultValue=""
          onChange={e => {
            const a = airports.find(a => a.iata === e.target.value);
            if (a) onSelect(a.iata, `${a.city} (${a.iata})`);
          }}
        >
          <option value="">Select airport…</option>
          {airports.map(a => (
            <option key={a.iata} value={a.iata}>{a.city} ({a.iata}) — {a.name}</option>
          ))}
        </select>
      )}
      {country && airports.length === 0 && (
        <p className="text-xs text-slate-400 self-center">No airports in list for this country.</p>
      )}
    </div>
  );
}

export default function FlightSearchPanel({ fromIata, toIata, toCity, toCountry, outbound, ret, fallbackUrl, returnFromCity }: Props) {
  // Outbound destination IATA — use prop or let user pick
  const [resolvedIata, setResolvedIata] = useState<string | null>(toIata);
  const [resolvedLabel, setResolvedLabel] = useState<string>(toIata ? `${toCity} (${toIata})` : toCity);

  // Return origin IATA — resolve from stored value (IATA or legacy city name)
  const returnIataResolved = returnFromCity ? resolveIata(returnFromCity) : null;
  const [returnOriginIata, setReturnOriginIata] = useState<string | null>(returnIataResolved);
  const returnOriginLabel = returnFromCity
    ? (returnOriginIata ? airportLabel(returnOriginIata) : returnFromCity)
    : null;

  const [outboundOpen, setOutboundOpen] = useState(false);
  const [outboundLoading, setOutboundLoading] = useState(false);
  const [outboundFlights, setOutboundFlights] = useState<Flight[] | null>(null);
  const [outboundSearchUrl, setOutboundSearchUrl] = useState<string | null>(null);
  const [outboundError, setOutboundError] = useState<string | null>(null);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnFlights, setReturnFlights] = useState<Flight[] | null>(null);
  const [returnSearchUrl, setReturnSearchUrl] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  const isOpenJaw = !!returnFromCity && returnFromCity.trim().toLowerCase() !== toCity.trim().toLowerCase();

  async function searchOutbound() {
    if (!resolvedIata) return;
    if (outboundOpen && outboundFlights) { setOutboundOpen(false); return; }
    if (!outboundOpen) setOutboundOpen(true);
    if (outboundFlights) return;
    setOutboundLoading(true);
    setOutboundError(null);
    try {
      const res = await fetch(
        `/api/flights/search?from=${encodeURIComponent(fromIata)}&to=${encodeURIComponent(resolvedIata)}&outbound=${outbound}&return=${ret}`
      );
      const data = await res.json();
      if (res.status === 503) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        setOutboundOpen(false);
        setOutboundLoading(false);
        return;
      }
      if (!res.ok || data.error) setOutboundError(data.error ?? "Search failed");
      else { setOutboundFlights(data.flights); setOutboundSearchUrl(data.searchUrl); }
    } catch { setOutboundError("Request failed"); }
    setOutboundLoading(false);
  }

  async function searchReturn() {
    if (!returnOriginIata) return;
    if (returnOpen && returnFlights) { setReturnOpen(false); return; }
    if (!returnOpen) setReturnOpen(true);
    if (returnFlights) return;
    setReturnLoading(true);
    setReturnError(null);
    try {
      const res = await fetch(
        `/api/flights/search?from=${encodeURIComponent(returnOriginIata)}&to=${encodeURIComponent(fromIata)}&outbound=${ret}&oneway=1`
      );
      const data = await res.json();
      if (res.status === 503) {
        const q = encodeURIComponent(`one way flight from ${returnFromCity} to ${fromIata} on ${ret}`);
        window.open(`https://www.google.com/travel/flights?q=${q}`, "_blank", "noopener,noreferrer");
        setReturnOpen(false);
        setReturnLoading(false);
        return;
      }
      if (!res.ok || data.error) setReturnError(data.error ?? "Search failed");
      else { setReturnFlights(data.flights); setReturnSearchUrl(data.searchUrl); }
    } catch { setReturnError("Request failed"); }
    setReturnLoading(false);
  }

  return (
    <div className="w-full mt-3 border-t border-slate-100 pt-3 space-y-3">

      {isOpenJaw && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <span>🔀</span>
          <span>
            <strong>Open-jaw itinerary:</strong> outbound to <strong>{toCity}</strong>, return from <strong>{returnOriginLabel ?? returnFromCity}</strong>.
          </span>
        </div>
      )}

      {/* Outbound */}
      <div>
        {/* Airport picker — shown when no IATA is known */}
        {!resolvedIata && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-medium text-amber-800 mb-1">
              Select the arrival airport to search flights to <strong>{toCity}</strong>:
            </p>
            <AirportPicker
              defaultCountry={toCountry ?? undefined}
              onSelect={(iata, label) => {
                setResolvedIata(iata);
                setResolvedLabel(label);
              }}
            />
          </div>
        )}

        {resolvedIata && (
          <>
            {!toIata && (
              <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                <span>✈️ Searching via <strong>{resolvedLabel}</strong></span>
                <button
                  className="text-indigo-500 hover:underline"
                  onClick={() => { setResolvedIata(null); setOutboundFlights(null); setOutboundOpen(false); }}
                >
                  Change
                </button>
              </div>
            )}
            <button onClick={searchOutbound} className="btn-ghost text-sm">
              ✈️ {outboundOpen ? "Hide outbound flights" : isOpenJaw ? "Search outbound flights" : "Search flights"}
            </button>
          </>
        )}

        {outboundOpen && resolvedIata && (
          <>
            <p className="text-xs text-slate-400 mt-3">
              {fromIata.toUpperCase()} → {resolvedIata.toUpperCase()} · {outbound}
              {!isOpenJaw && ` → ${ret}`}
            </p>
            <FlightList
              flights={outboundFlights}
              searchUrl={outboundSearchUrl}
              fallbackUrl={fallbackUrl}
              error={outboundError}
              loading={outboundLoading}
            />
          </>
        )}
      </div>

      {/* Return leg — open-jaw only */}
      {isOpenJaw && (
        <div className="border-t border-slate-100 pt-3">
          {/* If we couldn't resolve the return city to an IATA, ask the user to pick */}
          {!returnOriginIata && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-medium text-amber-800 mb-1">
                Select the departure airport for your return from <strong>{returnFromCity}</strong>:
              </p>
              <AirportPicker
                onSelect={(iata) => setReturnOriginIata(iata)}
              />
            </div>
          )}

          {returnOriginIata && (
            <>
              <button onClick={searchReturn} className="btn-ghost text-sm">
                ✈️ {returnOpen ? "Hide return flights" : `Search return from ${returnOriginLabel}`}
              </button>
              {returnOpen && (
                <>
                  <p className="text-xs text-slate-400 mt-3">
                    {returnOriginIata} → {fromIata.toUpperCase()} · {ret} · one-way
                  </p>
                  <FlightList
                    flights={returnFlights}
                    searchUrl={returnSearchUrl}
                    fallbackUrl={`https://www.google.com/travel/flights?q=${encodeURIComponent(`one way flight from ${returnFromCity} to ${fromIata} on ${ret}`)}`}
                    error={returnError}
                    loading={returnLoading}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
