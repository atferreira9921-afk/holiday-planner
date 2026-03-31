import { NextResponse } from "next/server";

// European Central Bank — free, no key, daily updated XML feed.
// We cache for 6 hours.

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

let cache: { rates: Record<string, number>; ts: number } | null = null;

async function getRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.ts < 6 * 3600 * 1000) return cache.rates;

  try {
    const res  = await fetch(ECB_URL, { next: { revalidate: 21600 } });
    const text = await res.text();
    const rates: Record<string, number> = { EUR: 1 };
    const matches = text.matchAll(/currency='([A-Z]+)' rate='([0-9.]+)'/g);
    for (const [, cur, rate] of matches) rates[cur] = parseFloat(rate);
    cache = { rates, ts: Date.now() };
    return rates;
  } catch {
    // Fallback approximate rates if ECB is unreachable
    return {
      EUR: 1, USD: 1.08, GBP: 0.85, JPY: 160, AUD: 1.65, CAD: 1.48,
      CHF: 0.96, SEK: 11.2, NOK: 11.8, DKK: 7.46, PLN: 4.25, CZK: 25.1,
      HUF: 390, RON: 4.97, BGN: 1.96, HRK: 7.53, TRY: 35, CNY: 7.8,
      INR: 90, BRL: 5.5, MXN: 18.5, ZAR: 20, SGD: 1.45, THB: 38,
      AED: 3.97, MAD: 10.8, EGP: 52, KES: 140, IDR: 17500, PHP: 60,
    };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from   = searchParams.get("from") ?? "EUR";
  const to     = searchParams.get("to");
  const amount = parseFloat(searchParams.get("amount") ?? "1");

  const rates = await getRates();

  if (to) {
    // Single conversion
    const fromRate = rates[from.toUpperCase()] ?? 1;
    const toRate   = rates[to.toUpperCase()];
    if (!toRate) return NextResponse.json({ error: `Unknown currency: ${to}` }, { status: 400 });
    const result = (amount / fromRate) * toRate;
    return NextResponse.json({ from, to, amount, result: Math.round(result * 100) / 100, rate: toRate / fromRate });
  }

  // Return all rates relative to EUR
  return NextResponse.json({ base: "EUR", rates });
}
