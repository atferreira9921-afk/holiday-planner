"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFacebook() {
    const supabase = createClient();
    const redirectParam = searchParams.get("redirect");
    const next = redirectParam?.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/dashboard";
    await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    const redirectTo = searchParams.get("redirect");
    const destination = redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
    // Hard redirect so the browser sends a fresh request with the auth cookie already set.
    // Soft router.push + router.refresh() can race and render before the server sees the session.
    window.location.href = destination;
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
      </div>

      <button
        type="button"
        onClick={handleFacebook}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-sm font-semibold text-slate-700 mb-4"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
        </svg>
        Continue with Facebook
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">{t("orSeparator")}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">{t("email")}</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div>
          <label className="label">{t("password")}</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-indigo-500 hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        {t("noAccount")}{" "}
        <Link
          href={searchParams.get("redirect") ? `/register?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : "/register"}
          className="text-indigo-600 font-semibold hover:underline"
        >
          {t("createFree")}
        </Link>
      </p>
    </div>
  );
}
