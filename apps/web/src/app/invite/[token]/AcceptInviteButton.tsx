"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="space-y-2">
      <button onClick={accept} disabled={loading} className="btn-primary w-full justify-center">
        {loading ? "Joining…" : "✓ Accept & join group"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
