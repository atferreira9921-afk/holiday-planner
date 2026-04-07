"use client";

import { useState } from "react";

interface Hotel {
  name?: string;
  rating?: number;
  reviews?: number;
  pricePerNight?: string;
  totalPrice?: string;
  link?: string;
  thumbnail?: string;
  amenities?: string[];
}

interface Props {
  city: string;
  country: string;
  checkin: string;
  checkout: string;
  fallbackUrl: string;
}

export default function HotelSearchPanel({ city, country, checkin, checkout, fallbackUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [nights, setNights] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (open && hotels) { setOpen(false); return; }
    if (!open) setOpen(true);
    if (hotels) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/hotels/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&checkin=${checkin}&checkout=${checkout}`
      );
      const data = await res.json();
      if (res.status === 503) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        setOpen(false);
        setLoading(false);
        return;
      }
      if (!res.ok || data.error) setError(data.error ?? "Search failed");
      else { setHotels(data.hotels); setNights(data.nights); }
    } catch { setError("Request failed"); }
    setLoading(false);
  }

  return (
    <div className="w-full mt-3">
      <button onClick={search} className="btn-ghost text-sm">
        🏨 {open ? "Hide hotels" : "Search hotels"}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-400">{city}, {country} · {checkin} → {checkout} · {nights} night{nights !== 1 ? "s" : ""}</p>

          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          {hotels && hotels.length === 0 && (
            <p className="text-xs text-slate-400 py-2">No hotels found.</p>
          )}

          {hotels && hotels.map((h, i) => (
            <a key={i} href={h.link ?? fallbackUrl} target="_blank" rel="noopener noreferrer"
              className="flex gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition">
              {h.thumbnail && (
                <img src={h.thumbnail} alt={h.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{h.name}</p>
                  {h.pricePerNight && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-purple-700">{h.pricePerNight}</p>
                      <p className="text-xs text-slate-400">/night</p>
                    </div>
                  )}
                </div>
                {h.rating != null && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs font-bold text-amber-600">★ {h.rating.toFixed(1)}</span>
                    {h.reviews != null && <span className="text-xs text-slate-400">({h.reviews.toLocaleString()})</span>}
                  </div>
                )}
                {(h.amenities ?? []).length > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{h.amenities!.join(" · ")}</p>
                )}
                {h.totalPrice && (
                  <p className="text-xs text-purple-600 font-semibold mt-0.5">Total: {h.totalPrice}</p>
                )}
              </div>
            </a>
          ))}

          {(hotels || error) && (
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"
              className="btn-ghost text-xs inline-block mt-1">
              View all on Booking.com →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
