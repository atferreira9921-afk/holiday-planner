"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function SelectSuggestionButton({
  tripId,
  suggestionId,
  isSelected,
}: {
  tripId: string;
  suggestionId: string;
  isSelected: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/trips/${tripId}/select-suggestion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestion_id: isSelected ? null : suggestionId }),
    });
    setLoading(false);
    startTransition(() => router.refresh());
  }

  if (isSelected) {
    return (
      <button
        onClick={toggle}
        disabled={loading || pending}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-100 text-emerald-700 border-2 border-emerald-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition"
      >
        {loading || pending ? "…" : "✅ Selected — click to deselect"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || pending}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
    >
      {loading || pending ? "Selecting…" : "Select this destination →"}
    </button>
  );
}
