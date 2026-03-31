"use client";

import { useState, useRef } from "react";

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
  const [mode, setMode]       = useState<"text" | "image">("text");
  const [text, setText]       = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<ParsedReceipt | null>(null);
  const fileRef               = useRef<HTMLInputElement>(null);

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
        setScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setScanning(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">🧾 Receipt scanner</h3>
      <p className="text-xs text-slate-400">Paste receipt text or upload a photo — AI will extract the amounts.</p>

      {/* Mode switcher */}
      <div className="flex gap-2">
        {(["text", "image"] as const).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition ${
              mode === m ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"
            }`}>
            {m === "text" ? "📝 Paste text" : "📷 Photo"}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        <div className="space-y-2">
          <textarea className="input text-sm w-full" rows={5} value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"Paste receipt text here…\n\nExample:\n2x Pastel de nata   €2.40\n1x Coffee           €1.20\nTotal:              €3.60"} />
          <button onClick={scanText} disabled={scanning || !text.trim()}
            className="btn-primary text-sm">
            {scanning ? "Scanning…" : "🤖 Scan receipt"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) scanImage(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={scanning}
            className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl p-6 text-center transition">
            <p className="text-2xl mb-1">📷</p>
            <p className="text-sm text-slate-600 font-semibold">{scanning ? "Scanning…" : "Tap to upload receipt photo"}</p>
            <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP</p>
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">⚠️ {error}</p>}

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">✓ Receipt parsed</p>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{result.description}</p>
            <p className="text-xl font-bold text-emerald-700">€{result.total_eur.toFixed(2)}</p>
          </div>
          <p className="text-xs text-slate-500 capitalize">Category: {result.category}</p>
          {result.items && result.items.length > 0 && (
            <div className="space-y-0.5">
              {result.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-600">
                  <span>{item.name}</span>
                  <span>€{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { onResult?.(result); setResult(null); setText(""); }}
            className="btn-primary text-sm w-full justify-center mt-2">
            + Add as expense
          </button>
        </div>
      )}
    </div>
  );
}
