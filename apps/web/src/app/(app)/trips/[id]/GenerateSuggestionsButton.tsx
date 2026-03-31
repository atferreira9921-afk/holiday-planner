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
        className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? "Generating... (this takes ~30s)" : "Generate suggestions"}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
