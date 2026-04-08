"use client";

import { useState } from "react";

interface Props {
  city: string;
  country: string;
  pickupDate: string;
  dropoffDate: string;
  reasoning: string | null;
  estimatedPriceEur: number | null;
}

export default function CarRentalPanel({ city, country, pickupDate, dropoffDate, reasoning, estimatedPriceEur }: Props) {
  const [open, setOpen] = useState(false);

  const searchUrl = `https://www.rentalcars.com/SearchResults.do?pickUpCity=${encodeURIComponent(city)}&pickUpCountry=${encodeURIComponent(country)}&pickUpDate=${pickupDate}&dropOffDate=${dropoffDate}`;

  return (
    <div className="w-full mt-3 border-t border-slate-100 pt-3">
      <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm">
        🚗 {open ? "Hide car rental" : "Car rental recommended"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-400">{city}, {country} · {pickupDate} → {dropoffDate}</p>

          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <span className="text-lg flex-shrink-0">🚗</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-amber-800">Car rental suggested</p>
                {estimatedPriceEur != null && (
                  <span className="text-base font-bold text-amber-700">~€{Math.round(estimatedPriceEur)}</span>
                )}
              </div>
              {reasoning && (
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">{reasoning}</p>
              )}
            </div>
          </div>

          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs inline-block"
          >
            Search car rentals on Rentalcars.com →
          </a>
        </div>
      )}
    </div>
  );
}
