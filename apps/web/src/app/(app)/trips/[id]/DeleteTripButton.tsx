"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tripId: string;
}

export default function DeleteTripButton({ tripId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this trip? This action cannot be undone.");
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/trips");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete trip. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button
      className="btn-ghost text-sm text-red-600 hover:text-red-700"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? "Deleting…" : "🗑️ Delete"}
    </button>
  );
}
