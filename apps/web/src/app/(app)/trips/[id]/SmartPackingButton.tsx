"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAiEnabled } from "@/lib/config";

interface PackingSuggestion {
  item: string;
  category: string;
  reason: string;
}

export default function SmartPackingButton({
  tripId,
  destinationCountry,
  tripType,
}: {
  tripId: string;
  destinationCountry: string | null;
  tripType: string;
}) {
  const [loading, setLoading]         = useState(false);
  const [suggestions, setSuggestions] = useState<PackingSuggestion[] | null>(null);
  const [added, setAdded]             = useState<Set<number>>(new Set());
  const [error, setError]             = useState<string | null>(null);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setAdded(new Set());

    try {
      const res = await fetch(`/api/trips/${tripId}/smart-packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationCountry, tripType }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json() as { suggestions: PackingSuggestion[] };
      setSuggestions(data.suggestions);
    } catch {
      setError("Could not fetch suggestions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function addItem(suggestion: PackingSuggestion, index: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("trip_packing_items").insert({
      trip_id: tripId,
      item: suggestion.item,
      category: suggestion.category,
      packed: false,
    });

    setAdded(prev => new Set([...prev, index]));
  }

  if (!isAiEnabled) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={fetchSuggestions}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {loading ? "Thinking…" : "🤖 Suggest packing items"}
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            AI suggestions for {destinationCountry ?? "your trip"}
          </p>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{s.item}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.reason}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                    {s.category}
                  </span>
                </div>
                <button
                  onClick={() => addItem(s, i)}
                  disabled={added.has(i)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    added.has(i)
                      ? "bg-green-100 text-green-700 cursor-default"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {added.has(i) ? "✓ Added" : "+ Add"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
