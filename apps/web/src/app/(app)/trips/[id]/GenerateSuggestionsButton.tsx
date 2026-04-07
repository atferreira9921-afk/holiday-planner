"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateSuggestionsButton({
  tripId,
  hasSuggestions = false,
}: {
  tripId: string;
  hasSuggestions?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [stage, setStage]         = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [prompt, setPrompt]       = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setProgress(0);
    setStage("Starting…");

    try {
      const res = await fetch(`/api/trips/${tripId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: prompt.trim() || null }),
      });
      if (!res.body) throw new Error("No response stream");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

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
              await new Promise(r => setTimeout(r, 400));
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
      {/* Optional prompt */}
      <div>
        <button
          type="button"
          onClick={() => setShowPrompt(p => !p)}
          className="text-xs text-indigo-500 hover:text-indigo-700 transition flex items-center gap-1"
        >
          <span>{showPrompt ? "▾" : "▸"}</span>
          {showPrompt ? "Hide extra instructions" : "Add extra instructions (optional)"}
        </button>

        {showPrompt && (
          <textarea
            className="input mt-2 text-sm w-full resize-none"
            rows={3}
            placeholder={`e.g. "We prefer warm weather, avoid big cities, love hiking. Budget is flexible if the destination is special."`}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={loading}
          />
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`px-5 py-2 rounded-lg font-medium transition ${
          loading
            ? "bg-indigo-400 text-white cursor-not-allowed"
            : hasSuggestions
              ? "bg-slate-700 text-white hover:bg-slate-800"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        {loading
          ? "🤖 Generating…"
          : hasSuggestions
            ? "🔄 Generate new suggestions"
            : "🤖 Generate AI suggestions"}
      </button>

      {loading && (
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
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
