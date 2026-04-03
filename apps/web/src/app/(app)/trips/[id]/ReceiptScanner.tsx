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
    <div className="card p-5 space-y-3">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">🧾 Receipt scanner</h3>
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <span className="text-slate-400 text-lg">🤖</span>
        <div>
          <p className="text-sm font-semibold text-slate-500">AI features coming soon</p>
          <p className="text-xs text-slate-400">Receipt scanning is temporarily unavailable.</p>
        </div>
      </div>
    </div>
  );
}
