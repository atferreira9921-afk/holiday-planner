"use client";

import { useState, useEffect, useCallback } from "react";

// Common currencies users will encounter while travelling
const POPULAR_CURRENCIES = [
  { code: "EUR", name: "Euro",           symbol: "€" },
  { code: "USD", name: "US Dollar",      symbol: "$" },
  { code: "GBP", name: "British Pound",  symbol: "£" },
  { code: "JPY", name: "Japanese Yen",   symbol: "¥" },
  { code: "AUD", name: "Australian $",   symbol: "A$" },
  { code: "CAD", name: "Canadian $",     symbol: "C$" },
  { code: "CHF", name: "Swiss Franc",    symbol: "Fr" },
  { code: "CNY", name: "Chinese Yuan",   symbol: "¥" },
  { code: "INR", name: "Indian Rupee",   symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso",   symbol: "$" },
  { code: "TRY", name: "Turkish Lira",   symbol: "₺" },
  { code: "THB", name: "Thai Baht",      symbol: "฿" },
  { code: "SGD", name: "Singapore $",    symbol: "S$" },
  { code: "AED", name: "UAE Dirham",     symbol: "د.إ" },
  { code: "MAD", name: "Moroccan Dirham",symbol: "DH" },
  { code: "ZAR", name: "South African R",symbol: "R" },
  { code: "IDR", name: "Indonesian Rp",  symbol: "Rp" },
  { code: "PHP", name: "Philippine Peso",symbol: "₱" },
  { code: "KES", name: "Kenyan Shilling",symbol: "KSh" },
  { code: "SEK", name: "Swedish Krona",  symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone",symbol: "kr" },
  { code: "PLN", name: "Polish Złoty",   symbol: "zł" },
  { code: "CZK", name: "Czech Koruna",   symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint",symbol: "Ft" },
];

export default function CurrencyWidget({ destinationCountry }: { destinationCountry?: string }) {
  const [rates, setRates]       = useState<Record<string, number> | null>(null);
  const [amount, setAmount]     = useState("100");
  const [from, setFrom]         = useState("EUR");
  const [to, setTo]             = useState("USD");
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/exchange-rates")
      .then(r => r.json())
      .then(d => { setRates(d.rates); setLoading(false); });
  }, []);

  // Try to pre-select the destination currency
  useEffect(() => {
    if (!destinationCountry) return;
    const map: Record<string, string> = {
      GB: "GBP", US: "USD", JP: "JPY", AU: "AUD", CA: "CAD", CH: "CHF",
      CN: "CNY", IN: "INR", BR: "BRL", MX: "MXN", TR: "TRY", TH: "THB",
      SG: "SGD", AE: "AED", MA: "MAD", ZA: "ZAR", ID: "IDR", PH: "PHP",
      KE: "KES", SE: "SEK", NO: "NOK", PL: "PLN", CZ: "CZK", HU: "HUF",
    };
    if (map[destinationCountry]) setTo(map[destinationCountry]);
  }, [destinationCountry]);

  const convert = useCallback((val: number, fromCode: string, toCode: string) => {
    if (!rates) return null;
    const fromRate = rates[fromCode] ?? 1;
    const toRate   = rates[toCode] ?? 1;
    return (val / fromRate) * toRate;
  }, [rates]);

  const result = rates && amount ? convert(parseFloat(amount), from, to) : null;

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition px-3 py-2 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50">
        <span>💱</span>
        <span>Currency converter</span>
        {!loading && result && (
          <span className="text-slate-400 text-xs">
            1 {from} = {convert(1, from, to)?.toFixed(to === "JPY" || to === "IDR" || to === "HUF" ? 0 : 2)} {to}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">💱 Currency converter</h3>
        <button onClick={() => setExpanded(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading rates…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <input className="input w-24 flex-1 min-w-0" type="number" min="0" step="any"
              value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
            <select className="input w-24" value={from} onChange={e => setFrom(e.target.value)}>
              {POPULAR_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>
              ))}
            </select>
            <span className="text-slate-400 text-lg">→</span>
            <select className="input w-24" value={to} onChange={e => setTo(e.target.value)}>
              {POPULAR_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>
              ))}
            </select>
          </div>

          {result !== null && (
            <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-indigo-600">
                {parseFloat(amount).toLocaleString()} {from} =
              </span>
              <span className="text-2xl font-bold text-indigo-700">
                {result.toLocaleString("en", {
                  maximumFractionDigits: to === "JPY" || to === "IDR" || to === "HUF" ? 0 : 2,
                })} {to}
              </span>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Rate: 1 {from} = {convert(1, from, to)?.toFixed(4)} {to} · Source: European Central Bank
          </p>

          {/* Quick reference for common amounts */}
          {result !== null && (
            <div className="flex flex-wrap gap-1.5">
              {[5, 10, 20, 50, 100, 200, 500].map(v => {
                const r = convert(v, from, to);
                return (
                  <button key={v} type="button" onClick={() => setAmount(String(v))}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition">
                    {v} = {r?.toLocaleString("en", { maximumFractionDigits: to === "JPY" || to === "IDR" ? 0 : 1 })}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
