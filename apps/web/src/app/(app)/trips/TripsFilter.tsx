"use client";

import Link from "next/link";
import { useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Trip {
  id: string;
  title: string;
  status: string;
  desired_duration_days: number;
  earliest_departure: string;
  latest_return: string;
  budget_per_person_eur: number | null;
  created_at: string;
}

interface Props {
  trips: Trip[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const GRADIENTS = ["gradient-ocean", "gradient-card", "gradient-sunset", "gradient-forest"];
const EMOJIS    = ["🏖️", "🏔️", "🏙️", "🌴", "🗺️", "⛵"];

const STATUS_MAP: Record<string, { cls: string; label: string; emoji: string }> = {
  planning:  { cls: "bg-yellow-100 text-yellow-800", label: "Planning",  emoji: "🗓️" },
  suggested: { cls: "bg-violet-100 text-violet-700", label: "Suggested", emoji: "✨" },
  booked:    { cls: "bg-green-100 text-green-700",   label: "Booked",    emoji: "✅" },
  completed: { cls: "bg-slate-100 text-slate-600",   label: "Completed", emoji: "🏁" },
  cancelled: { cls: "bg-red-100 text-red-700",       label: "Cancelled", emoji: "✕" },
  archived:  { cls: "bg-slate-200 text-slate-500",   label: "Archived",  emoji: "📦" },
};

const STATUS_PILLS = [
  { value: "all",       label: "All" },
  { value: "planning",  label: "Planning" },
  { value: "suggested", label: "Suggested" },
  { value: "booked",    label: "Booked" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived",  label: "Archived" },
];

// ─── Helper ────────────────────────────────────────────────────────────────────

function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TripsFilter({ trips }: Props) {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort]                 = useState("newest");

  const filtered = trips
    .filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      // soonest: sort by earliest_departure ascending
      return a.earliest_departure.localeCompare(b.earliest_departure);
    });

  return (
    <div className="space-y-4">
      {/* ── Search + Sort row ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search trips..."
          className="input text-sm flex-1 min-w-48"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input text-sm"
          value={sort}
          onChange={e => setSort(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="soonest">Soonest departure</option>
        </select>
      </div>

      {/* ── Status filter pills ── */}
      <div className="flex flex-wrap gap-2">
        {STATUS_PILLS.map(pill => (
          <button
            key={pill.value}
            onClick={() => setStatusFilter(pill.value)}
            className={[
              "text-xs font-medium px-3 py-1 rounded-full transition",
              statusFilter === pill.value
                ? "bg-indigo-500 text-white"
                : "bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300",
            ].join(" ")}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* ── Count ── */}
      <p className="text-xs text-slate-400">{filtered.length} trips</p>

      {/* ── Trips grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length > 0 ? (
          filtered.map((trip, i) => {
            const s = STATUS_MAP[trip.status] ?? STATUS_MAP.planning;
            return (
              <Link key={trip.id} href={`/trips/${trip.id}`} className="card p-5 block hover:shadow-md transition">
                <div className={`w-full h-28 rounded-xl ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-5xl mb-4`}>
                  {EMOJIS[i % EMOJIS.length]}
                </div>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{trip.title}</h3>
                </div>
                <span className={`badge ${s.cls}`}>
                  {s.emoji} {s.label}
                </span>
                <div className="mt-3 space-y-1">
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <span>📅</span>
                    {fmtShort(trip.earliest_departure)} – {fmtShort(trip.latest_return)}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <span>🌙</span>
                    {trip.desired_duration_days} days
                  </p>
                  {trip.budget_per_person_eur && (
                    <p className="text-sm text-slate-500 flex items-center gap-1.5">
                      <span>💶</span>
                      €{trip.budget_per_person_eur} / person
                    </p>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-400">No trips match your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
