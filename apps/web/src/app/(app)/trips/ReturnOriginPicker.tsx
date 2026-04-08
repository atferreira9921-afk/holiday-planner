"use client";
import { useState, useEffect } from "react";
import { COUNTRIES, AIRPORTS_BY_COUNTRY } from "@/lib/data/geo";

interface Props {
  vehicleType: "flight" | "car" | "bus";
  city: string;
  country: string;
  onChange: (city: string, country: string) => void;
}

export default function ReturnOriginPicker({ vehicleType, city, country, onChange }: Props) {
  const [enabled, setEnabled] = useState(!!(city || country));
  const [selectedCountry, setSelectedCountry] = useState(country || "");
  const [selectedAirport, setSelectedAirport] = useState(city || "");
  const [freeCity, setFreeCity] = useState(city || "");

  // When toggled off, clear the values
  function toggle(on: boolean) {
    setEnabled(on);
    if (!on) {
      setSelectedCountry("");
      setSelectedAirport("");
      setFreeCity("");
      onChange("", "");
    }
  }

  // Sync airport picker when country changes
  useEffect(() => {
    if (vehicleType !== "car" && selectedCountry) {
      const airports = AIRPORTS_BY_COUNTRY[selectedCountry] ?? [];
      // If currently selected airport (IATA) is not in new country, reset
      const stillValid = airports.some(a => a.iata === selectedAirport);
      if (!stillValid) {
        const first = airports[0];
        const newIata = first?.iata ?? "";
        setSelectedAirport(newIata);
        onChange(newIata, selectedCountry);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, vehicleType]);

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => toggle(true)}
        className="text-sm text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1.5 transition"
      >
        <span>＋</span> Return from a different city
      </button>
    );
  }

  const isCar = vehicleType === "car";
  const airports = AIRPORTS_BY_COUNTRY[selectedCountry] ?? [];
  const hasAirports = airports.length > 0;

  return (
    <div className="space-y-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">🔀 Return from a different city</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isCar
              ? "Type the city name where your trip ends."
              : "Select the country and departure airport for your return leg."}
          </p>
        </div>
        <button type="button" onClick={() => toggle(false)} className="text-xs text-slate-400 hover:text-slate-600 transition">
          Remove
        </button>
      </div>

      {isCar ? (
        /* Car: free text city */
        <input
          className="input"
          type="text"
          placeholder="e.g. Seville"
          value={freeCity}
          onChange={e => {
            setFreeCity(e.target.value);
            onChange(e.target.value, selectedCountry);
          }}
        />
      ) : (
        /* Flight / Bus: country → airport */
        <div className="flex gap-2">
          <select
            className="input flex-1"
            value={selectedCountry}
            onChange={e => {
              setSelectedCountry(e.target.value);
              // city will be reset in the useEffect above
              if (!AIRPORTS_BY_COUNTRY[e.target.value]?.length) {
                // No airports in list — will fall back to city text input below
                setSelectedAirport("");
                onChange("", e.target.value);
              }
            }}
          >
            <option value="">Country…</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>

          {selectedCountry && (
            hasAirports ? (
              <select
                className="input flex-1"
                value={selectedAirport}
                onChange={e => {
                  setSelectedAirport(e.target.value);
                  onChange(e.target.value, selectedCountry);
                }}
              >
                <option value="">Airport…</option>
                {airports.map(a => (
                  <option key={a.iata} value={a.iata}>
                    {a.city} ({a.iata}) — {a.name}
                  </option>
                ))}
              </select>
            ) : (
              /* Country not in airport list (e.g. small country) — allow free text */
              <input
                className="input flex-1"
                type="text"
                placeholder="City name"
                value={selectedAirport}
                onChange={e => {
                  setSelectedAirport(e.target.value);
                  onChange(e.target.value, selectedCountry);
                }}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
