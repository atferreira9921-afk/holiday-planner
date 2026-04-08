"use client";

import { useState } from "react";

export default function AcceptButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }
    // Hard redirect so the trips page is fetched fresh from the server
    // with the new group membership already committed to the DB.
    // router.push() can serve a stale RSC cache that doesn't include the new trip.
    window.location.href = "/trips";
  }

  return (
    <div className="space-y-2">
      <button
        onClick={accept}
        disabled={loading}
        className="btn-primary w-full text-base py-3"
      >
        {loading ? "Joining…" : "Join group & view trips →"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
