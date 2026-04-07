"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateSuggestionsButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/trips/${tripId}/suggestions`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to generate suggestions");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`px-5 py-2 rounded-lg font-medium transition ${
          loading
            ? "bg-indigo-400 text-white cursor-not-allowed"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        {loading ? "🤖 Generating…" : "🤖 Generate AI suggestions"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
