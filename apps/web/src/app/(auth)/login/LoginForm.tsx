"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    const redirectTo = searchParams.get("redirect");
    const destination = redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-slate-500 text-sm mt-1">Sign in to continue planning</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-indigo-500 hover:underline">
            Forgot your password?
          </Link>
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
          {loading ? "Signing in..." : "Sign in →"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        No account?{" "}
        <Link
          href={searchParams.get("redirect") ? `/register?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : "/register"}
          className="text-indigo-600 font-semibold hover:underline"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}
