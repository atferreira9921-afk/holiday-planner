import { NextResponse } from "next/server";

// Uses open-meteo climate API — free, no key required.
// Returns 30-year climate normals for a destination city and date range.

async function geocode(city: string, country: string): Promise<{ lat: number; lng: number; name: string } | null> {
  const q = encodeURIComponent(`${city} ${country}`);
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`, {
    next: { revalidate: 86400 },
  });
  const data = await res.json();
  const r = data.results?.[0];
  if (!r) return null;
  return { lat: r.latitude, lng: r.longitude, name: r.name };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city    = searchParams.get("city");
  const country = searchParams.get("country");
  const from    = searchParams.get("from"); // YYYY-MM-DD
  const to      = searchParams.get("to");   // YYYY-MM-DD

  if (!city || !country || !from || !to) {
    return NextResponse.json({ error: "city, country, from, to required" }, { status: 400 });
  }

  const geo = await geocode(city, country);
  if (!geo) return NextResponse.json({ error: "City not found" }, { status: 404 });

  // Climate API — monthly averages (1991–2020 normals)
  const url = new URL("https://climate-api.open-meteo.com/v1/climate");
  url.searchParams.set("latitude",  String(geo.lat));
  url.searchParams.set("longitude", String(geo.lng));
  url.searchParams.set("start_date", from);
  url.searchParams.set("end_date",   to);
  url.searchParams.set("models",     "EC_Earth3P_HR");
  url.searchParams.set("daily",      "temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_mean");

  try {
    const res  = await fetch(url.toString(), { next: { revalidate: 86400 * 7 } });
    const data = await res.json();

    if (!data.daily) return NextResponse.json({ error: "No climate data" }, { status: 502 });

    const temps: number[]  = data.daily.temperature_2m_mean ?? [];
    const maxes: number[]  = data.daily.temperature_2m_max ?? [];
    const mins: number[]   = data.daily.temperature_2m_min ?? [];
    const precip: number[] = data.daily.precipitation_sum ?? [];
    const wind: number[]   = data.daily.windspeed_10m_mean ?? [];

    const avg   = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const total = (arr: number[]) => Math.round(arr.reduce((a, b) => a + (b ?? 0), 0));
    const rainDays = precip.filter(p => p > 1).length;

    return NextResponse.json({
      city: geo.name,
      avg_temp_c:    avg(temps),
      max_temp_c:    avg(maxes),
      min_temp_c:    avg(mins),
      total_rain_mm: total(precip),
      rain_days:     rainDays,
      avg_wind_kmh:  avg(wind),
      days_sampled:  temps.length,
    });
  } catch {
    return NextResponse.json({ error: "Climate API unavailable" }, { status: 502 });
  }
}
