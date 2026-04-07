"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Supabase sends the recovery token as a URL fragment (#access_token=...&type=recovery)
  // The client SDK picks it up automatically on mount via onAuthStateChange
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
  }

  if (!ready) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Waiting for reset link…</h1>
        <p className="text-slate-500 text-sm">
          Open the reset link from your email to continue. If you arrived here directly,{" "}
          <a href="/forgot-password" className="text-indigo-600 font-semibold hover:underline">
            request a new link
          </a>.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
        <p className="text-slate-500 text-sm mt-1">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
          {loading ? "Saving…" : "Set new password →"}
        </button>
      </form>
    </div>
  );
}
