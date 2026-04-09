"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getPhrasebook } from "@/lib/data/phrases";

interface Props { countryCode: string }

export default function PhrasebookCard({ countryCode }: Props) {
  const t = useTranslations("phrasebook");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const book = getPhrasebook(countryCode);
  if (!book || book.phrases.length === 0) return null;

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{book.flag}</span>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">{t("title")}</h2>
            <p className="text-xs text-slate-400">{book.language} — {t("tapToCopy")}</p>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm flex-shrink-0">
          {open ? tc("hide") : tc("show")}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {book.phrases.map((phrase, i) => (
            <button
              key={i}
              onClick={() => copy(phrase.native)}
              className="group text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{phrase.en}</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{phrase.native}</p>
                  {phrase.phonetic && (
                    <p className="text-xs text-slate-400 mt-0.5 italic">{phrase.phonetic}</p>
                  )}
                </div>
                <span className={`text-xs flex-shrink-0 mt-0.5 transition ${copied === phrase.native ? "text-emerald-500" : "text-slate-300 group-hover:text-indigo-400"}`}>
                  {copied === phrase.native ? t("copied") : "⎘"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
