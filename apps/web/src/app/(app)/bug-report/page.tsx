"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  { value: "ui",          label: "UI / Visual",    emoji: "🎨", desc: "Something looks wrong or broken" },
  { value: "crash",       label: "Crash / Error",  emoji: "💥", desc: "The app threw an error or stopped working" },
  { value: "data",        label: "Wrong data",     emoji: "📊", desc: "Information displayed is incorrect" },
  { value: "performance", label: "Performance",    emoji: "🐢", desc: "The app is slow or unresponsive" },
  { value: "other",       label: "Other",          emoji: "🔧", desc: "Something else entirely" },
];

export default function BugReportPage() {
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, description, steps }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-slate-900">Report sent — thank you!</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          We've received your bug report and will look into it as soon as possible.
          If you included contact details, we may follow up with you.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link href="/dashboard" className="btn-primary text-sm">Back to dashboard</Link>
          <button
            onClick={() => { setSubmitted(false); setTitle(""); setDescription(""); setSteps(""); setCategory(""); }}
            className="btn-ghost text-sm"
          >
            Report another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="text-slate-400 text-sm hover:text-slate-600 transition flex items-center gap-1 mb-4">
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">🐛 Report a bug</h1>
        <p className="text-slate-500 text-sm mt-1">
          Found something broken? Tell us what happened and we'll fix it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Category */}
        <div className="card p-5 space-y-3">
          <label className="block text-sm font-semibold text-slate-800">What type of issue is it?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={[
                  "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition",
                  category === c.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300",
                ].join(" ")}
              >
                <span className="text-xl mt-0.5 flex-shrink-0">{c.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="card p-5 space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            Short title <span className="text-red-400">*</span>
          </label>
          <input
            className="input w-full"
            type="text"
            placeholder="e.g. Flight search crashes when no airport is selected"
            maxLength={200}
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <p className="text-xs text-slate-400">{title.length}/200</p>
        </div>

        {/* Description */}
        <div className="card p-5 space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            What happened? <span className="text-red-400">*</span>
          </label>
          <textarea
            className="input w-full resize-none"
            rows={5}
            placeholder="Describe what you were doing and what went wrong. Include any error messages you saw."
            maxLength={3000}
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <p className="text-xs text-slate-400">{description.length}/3000</p>
        </div>

        {/* Steps to reproduce */}
        <div className="card p-5 space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            Steps to reproduce <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <p className="text-xs text-slate-400">
            If you can reproduce the issue, list the exact steps. This helps us find and fix it faster.
          </p>
          <textarea
            className="input w-full resize-none"
            rows={4}
            placeholder={"1. Go to Trips\n2. Click 'Search flights'\n3. Leave airport blank and click Search\n4. See error"}
            maxLength={2000}
            value={steps}
            onChange={e => setSteps(e.target.value)}
          />
          <p className="text-xs text-slate-400">{steps.length}/2000</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full justify-center py-3 text-sm"
          disabled={loading || !title.trim() || !description.trim()}
        >
          {loading ? "Sending…" : "Send bug report"}
        </button>
      </form>
    </div>
  );
}
