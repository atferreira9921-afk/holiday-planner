"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/lib/ConfirmDialog";

interface Props {
  tripId: string;
}

export default function DeleteTripButton({ tripId }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setConfirmOpen(false);
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
    <>
      <button
        className="btn-ghost text-sm text-red-600 hover:text-red-700"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
      >
        {loading ? "Deleting…" : "🗑️ Delete"}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this trip?"
        description="This will permanently delete the trip and all its data."
        confirmLabel="Delete trip"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
