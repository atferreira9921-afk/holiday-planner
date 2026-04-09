"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { isAiEnabled } from "@/lib/config";

interface ParsedReceipt {
  description: string;
  total_eur: number;
  currency: string;
  category: string;
  items?: { name: string; price: number }[];
}

export default function ReceiptScanner({
  tripId,
  onResult,
}: {
  tripId: string;
  onResult?: (receipt: ParsedReceipt) => void;
}) {
  const t  = useTranslations("receipt");
  const tc = useTranslations("common");
  const [open, setOpen]         = useState(true);
  const [mode, setMode]         = useState<"text" | "image">("text");
  const [text, setText]         = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [result, setResult]     = useState<ParsedReceipt | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);

  async function scanText() {
    if (!text.trim()) return;
    setScanning(true); setError(null); setResult(null);
    try {
      const res  = await fetch(`/api/trips/${tripId}/receipt-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      onResult?.(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    }
    setScanning(false);
  }

  async function scanImage(file: File) {
    setScanning(true); setError(null); setResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res    = await fetch(`/api/trips/${tripId}/receipt-scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64, media_type: file.type }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResult(data);
        onResult?.(data);
        setScanning(false);
      };
      reader.onerror = () => { setError("Failed to read file"); setScanning(false); };
      reader.readAsDataURL(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setScanning(false);
    }
  }

  if (!isAiEnabled) return null;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">🧾 {t("title")}</h3>
        <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm">{open ? tc("hide") : tc("show")}</button>
      </div>

      {open && <>
      {/* Mode toggle */}
      <div className="flex gap-2">
        {(["text", "image"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              mode === m
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {m === "text" ? `📝 ${t("pasteText")}` : `📷 ${t("uploadPhoto")}`}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t("pasteHere")}
            rows={5}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={scanText}
            disabled={scanning || !text.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {scanning ? t("scanning") : t("scan")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) scanImage(f); }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition disabled:opacity-50"
          >
            {scanning ? t("scanning") : t("uploadPhoto")}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {result && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("result")}</p>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{result.description}</p>
            <p className="font-bold text-indigo-700 text-lg">
              <span className="text-xs text-slate-400 font-normal mr-1">{t("total")}</span>
              {result.currency !== "EUR" ? `${result.currency} ` : "€"}{result.total_eur.toFixed(2)}
            </p>
          </div>
          <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium capitalize">
            {t("category")}: {result.category}
          </span>
          {result.items && result.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t("items")}</p>
              <ul className="space-y-1 text-sm text-slate-600">
                {result.items.map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{item.name}</span>
                    <span className="font-medium">{item.price.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      </>}
    </div>
  );
}
