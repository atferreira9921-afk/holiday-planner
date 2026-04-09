"use client";

import { useEffect, useState } from "react";

const COUNTRY_TZ: Record<string, string> = {
  PT: "Europe/Lisbon",   ES: "Europe/Madrid",    FR: "Europe/Paris",
  DE: "Europe/Berlin",   IT: "Europe/Rome",       NL: "Europe/Amsterdam",
  BE: "Europe/Brussels", CH: "Europe/Zurich",     AT: "Europe/Vienna",
  GB: "Europe/London",   IE: "Europe/Dublin",     GR: "Europe/Athens",
  TR: "Europe/Istanbul", PL: "Europe/Warsaw",     CZ: "Europe/Prague",
  HU: "Europe/Budapest", HR: "Europe/Zagreb",     RO: "Europe/Bucharest",
  SE: "Europe/Stockholm",NO: "Europe/Oslo",       DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki", SK: "Europe/Bratislava", SI: "Europe/Ljubljana",
  RS: "Europe/Belgrade", BG: "Europe/Sofia",      LT: "Europe/Vilnius",
  LV: "Europe/Riga",     EE: "Europe/Tallinn",    UA: "Europe/Kiev",
  RU: "Europe/Moscow",   US: "America/New_York",  CA: "America/Toronto",
  MX: "America/Mexico_City", BR: "America/Sao_Paulo",
  AR: "America/Argentina/Buenos_Aires",            CL: "America/Santiago",
  CO: "America/Bogota",  PE: "America/Lima",
  JP: "Asia/Tokyo",      CN: "Asia/Shanghai",     KR: "Asia/Seoul",
  IN: "Asia/Kolkata",    TH: "Asia/Bangkok",      VN: "Asia/Ho_Chi_Minh",
  ID: "Asia/Jakarta",    SG: "Asia/Singapore",    MY: "Asia/Kuala_Lumpur",
  PH: "Asia/Manila",     AE: "Asia/Dubai",        SA: "Asia/Riyadh",
  IL: "Asia/Jerusalem",  JO: "Asia/Amman",        LB: "Asia/Beirut",
  EG: "Africa/Cairo",    ZA: "Africa/Johannesburg",MA: "Africa/Casablanca",
  KE: "Africa/Nairobi",  NG: "Africa/Lagos",      GH: "Africa/Accra",
  AU: "Australia/Sydney",NZ: "Pacific/Auckland",  TW: "Asia/Taipei",
  HK: "Asia/Hong_Kong",  MO: "Asia/Macau",        MM: "Asia/Rangoon",
  PK: "Asia/Karachi",    LK: "Asia/Colombo",      NP: "Asia/Kathmandu",
  BD: "Asia/Dhaka",      KZ: "Asia/Almaty",       MV: "Indian/Maldives",
  CY: "Asia/Nicosia",    MT: "Europe/Malta",      IS: "Atlantic/Reykjavik",
  MK: "Europe/Skopje",   AL: "Europe/Tirane",     ME: "Europe/Podgorica",
};

export default function TimeWidget({ destinationCountry }: { destinationCountry: string }) {
  const tz = COUNTRY_TZ[destinationCountry];
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!tz || !now) return null;

  const destTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);

  const destDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short", day: "numeric", month: "short",
  }).format(now);

  const tzName = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, timeZoneName: "short",
  }).formatToParts(now).find(p => p.type === "timeZoneName")?.value ?? tz;

  // Offset vs local
  const localOffset  = -now.getTimezoneOffset();
  const destOffset   = (() => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(now);
    const raw = parts.find(p => p.type === "timeZoneName")?.value ?? "";
    const m = raw.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (!m) return 0;
    return (parseInt(m[1]) * 60) + (m[2] ? parseInt(m[2]) : 0);
  })();
  const diffMin = destOffset - localOffset;
  const diffH   = diffMin / 60;
  const diffStr = diffH === 0 ? "same time as you"
    : diffH > 0 ? `+${diffH}h ahead of you`
    : `${diffH}h behind you`;

  return (
    <div className="flex items-center gap-4 bg-indigo-50 rounded-xl px-4 py-3">
      <span className="text-2xl">🕐</span>
      <div className="min-w-0">
        <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Local time at destination</p>
        <p className="text-2xl font-bold text-indigo-700 tabular-nums leading-tight">{destTime}</p>
        <p className="text-xs text-indigo-400">{destDate} · {tzName} · {diffStr}</p>
      </div>
    </div>
  );
}
