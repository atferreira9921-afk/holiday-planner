"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function RegisterForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    const redirectTo = searchParams.get("redirect");
    const destination = redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
    window.location.href = destination;
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t("registerTitle")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("registerSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">{t("fullName")}</label>
          <input className="input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Ferreira" required />
        </div>
        <div>
          <label className="label">{t("email")}</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div>
          <label className="label">{t("password")}</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("minPassword")} required minLength={6} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
          {loading ? t("registering") : t("registerSubmit")}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        {t("alreadyAccount")}{" "}
        <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
