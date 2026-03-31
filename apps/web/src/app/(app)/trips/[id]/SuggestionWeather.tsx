"use client";

import { useEffect, useState } from "react";

interface WeatherData {
  avg_temp: number;
  rain_days: number;
}

export default function SuggestionWeather({
  city,
  country,
  fromDate,
  toDate,
}: {
  city: string;
  country: string;
  fromDate: string;
  toDate: string;
}) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch_() {
      try {
        const params = new URLSearchParams({ city, country, from: fromDate, to: toDate });
        const res = await fetch(`/api/weather?${params.toString()}`);
        if (!res.ok) throw new Error("weather fetch failed");
        const data = await res.json() as WeatherData;
        if (!cancelled) setWeather(data);
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetch_();
    return () => { cancelled = true; };
  }, [city, country, fromDate, toDate]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        {[...Array(3)].map((_, i) => (
          <span key={i} className="inline-block h-4 w-12 rounded-full bg-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!weather) return null;

  return (
    <p className="text-xs text-slate-500 mt-1">
      🌡️ {weather.avg_temp}°C · 🌧️ {weather.rain_days} rainy day{weather.rain_days !== 1 ? "s" : ""}
    </p>
  );
}
