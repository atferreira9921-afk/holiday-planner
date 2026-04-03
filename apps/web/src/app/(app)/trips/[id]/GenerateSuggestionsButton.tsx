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
        disabled
        className="bg-slate-100 text-slate-400 px-5 py-2 rounded-lg font-medium cursor-not-allowed transition"
        title="AI features are temporarily disabled"
      >
        🤖 AI suggestions — coming soon
      </button>
      <p className="text-xs text-slate-400">AI features are temporarily unavailable.</p>
    </div>
  );
}
