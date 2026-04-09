"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchLocale(locale: string) {
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 overflow-hidden text-xs">
      {(["en", "pt"] as const).map(locale => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          disabled={pending}
          className={`px-2.5 py-1.5 font-semibold transition ${
            currentLocale === locale
              ? "bg-indigo-600 text-white"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {locale === "en" ? "EN" : "PT"}
        </button>
      ))}
    </div>
  );
}
