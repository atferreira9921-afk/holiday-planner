"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateSuggestionsButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage]       = useState("");
  const [error, setError]       = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setProgress(0);
    setStage("Starting…");

    try {
      const res = await fetch(`/api/trips/${tripId}/suggestions`, { method: "POST" });
      if (!res.body) throw new Error("No response stream");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              setError(data.error);
              setLoading(false);
              return;
            }
            if (typeof data.progress === "number") setProgress(data.progress);
            if (data.stage) setStage(data.stage);
            if (data.progress === 100) {
              await new Promise(r => setTimeout(r, 400)); // brief pause so user sees 100%
              router.refresh();
              setLoading(false);
              return;
            }
          } catch {
            // malformed chunk — ignore
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate suggestions");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`px-5 py-2 rounded-lg font-medium transition ${
          loading
            ? "bg-indigo-400 text-white cursor-not-allowed"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        {loading ? "🤖 Generating…" : "🤖 Generate AI suggestions"}
      </button>

      {loading && (
        <div className="space-y-1.5">
          {/* Progress bar */}
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Stage label + percentage */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{stage}</span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
