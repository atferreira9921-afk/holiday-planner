import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const city     = searchParams.get("city");
  const country  = searchParams.get("country");
  const checkin  = searchParams.get("checkin");
  const checkout = searchParams.get("checkout");
  const adults   = searchParams.get("adults") ?? "2";

  if (!city || !checkin || !checkout) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "SERPAPI_KEY not configured" }, { status: 503 });

  const q = country ? `Hotels in ${city}, ${country}` : `Hotels in ${city}`;

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine",          "google_hotels");
  url.searchParams.set("q",               q);
  url.searchParams.set("check_in_date",   checkin);
  url.searchParams.set("check_out_date",  checkout);
  url.searchParams.set("adults",          adults);
  url.searchParams.set("currency",        "EUR");
  url.searchParams.set("hl",              "en");
  url.searchParams.set("api_key",         apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return NextResponse.json({ error: "SerpApi request failed" }, { status: 502 });

  const data = await res.json();

  const hotels = (data.properties ?? []).slice(0, 6).map((h: {
    name?: string;
    description?: string;
    overall_rating?: number;
    reviews?: number;
    rate_per_night?: { lowest?: string };
    total_rate?: { lowest?: string };
    link?: string;
    images?: { thumbnail?: string }[];
    amenities?: string[];
    type?: string;
  }) => ({
    name:        h.name,
    description: h.description,
    rating:      h.overall_rating,
    reviews:     h.reviews,
    pricePerNight: h.rate_per_night?.lowest,
    totalPrice:  h.total_rate?.lowest,
    link:        h.link,
    thumbnail:   h.images?.[0]?.thumbnail,
    amenities:   (h.amenities ?? []).slice(0, 4),
    type:        h.type,
  }));

  const nights = Math.round(
    (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000
  );

  return NextResponse.json({ hotels, nights });
}
