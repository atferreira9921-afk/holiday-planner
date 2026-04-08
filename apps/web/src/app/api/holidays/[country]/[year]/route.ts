import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ country: string; year: string }> }
) {
  const { country, year } = await params;

  if (!country || country.length !== 2 || !/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: "Invalid country or year" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${country.toUpperCase()}`,
      { next: { revalidate: 86400 } } // cache for 24h
    );
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
