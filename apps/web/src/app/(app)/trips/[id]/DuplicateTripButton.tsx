"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";

export default function DuplicateTripButton({ tripId }: { tripId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleDuplicate() {
    setLoading(true);
    const res = await fetch(`/api/trips/${tripId}/duplicate`, { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { toast(json.error ?? "Failed to duplicate trip", "error"); return; }
    toast("Trip duplicated!");
    router.push(`/trips/${json.id}`);
  }

  return (
    <button className="btn-ghost text-sm" onClick={handleDuplicate} disabled={loading}>
      {loading ? "Duplicating…" : "⧉ Duplicate"}
    </button>
  );
}
