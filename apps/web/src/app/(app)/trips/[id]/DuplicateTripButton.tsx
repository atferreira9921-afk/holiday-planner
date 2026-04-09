"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import { useTranslations } from "next-intl";

export default function DuplicateTripButton({ tripId }: { tripId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("tripActions");

  async function handleDuplicate() {
    setLoading(true);
    const res = await fetch(`/api/trips/${tripId}/duplicate`, { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { toast(json.error ?? t("failed"), "error"); return; }
    toast(t("duplicated"));
    router.push(`/trips/${json.id}`);
  }

  return (
    <button className="btn-ghost text-sm" onClick={handleDuplicate} disabled={loading}>
      {loading ? t("duplicating") : t("duplicate")}
    </button>
  );
}
