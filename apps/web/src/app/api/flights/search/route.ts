import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from       = searchParams.get("from");
  const to         = searchParams.get("to");
  const outbound   = searchParams.get("outbound");
  const ret        = searchParams.get("return");

  if (!from || !to || !outbound || !ret) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!/^[A-Za-z0-9]{2,4}$/.test(from) || !/^[A-Za-z0-9]{2,4}$/.test(to)) {
    return NextResponse.json({ error: "Invalid airport code" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(outbound) || !/^\d{4}-\d{2}-\d{2}$/.test(ret)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "SERPAPI_KEY not configured" }, { status: 503 });

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine",         "google_flights");
  url.searchParams.set("departure_id",   from.toUpperCase());
  url.searchParams.set("arrival_id",     to.toUpperCase());
  url.searchParams.set("outbound_date",  outbound);
  url.searchParams.set("return_date",    ret);
  url.searchParams.set("currency",       "EUR");
  url.searchParams.set("hl",             "en");
  url.searchParams.set("type",           "1"); // round trip
  url.searchParams.set("api_key",        apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) return NextResponse.json({ error: "SerpApi request failed" }, { status: 502 });

  const data = await res.json();

  // Extract best_flights and other_flights, cap at 5 results each
  const flights = [
    ...(data.best_flights   ?? []).slice(0, 3),
    ...(data.other_flights  ?? []).slice(0, 2),
  ].slice(0, 5).map((f: {
    price?: number;
    total_duration?: number;
    flights?: { airline?: string; departure_airport?: { id?: string }; arrival_airport?: { id?: string }; departure_time?: string; arrival_time?: string }[];
    booking_token?: string;
  }) => ({
    price:     f.price,
    duration:  f.total_duration,
    airline:   f.flights?.[0]?.airline,
    from:      f.flights?.[0]?.departure_airport?.id,
    to:        f.flights?.[f.flights.length - 1]?.arrival_airport?.id,
    departs:   f.flights?.[0]?.departure_time,
    arrives:   f.flights?.[f.flights.length - 1]?.arrival_time,
    bookingToken: f.booking_token,
  }));

  const searchUrl = data.search_metadata?.google_flights_url ?? null;

  return NextResponse.json({ flights, searchUrl });
}
