"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Member { user_id: string; name: string; }
interface Vote { suggestion_id: string; user_id: string; vote: "up" | "down"; }
interface Suggestion { id: string; rank: number; destination_city: string; destination_country: string; }

export default function VotingSection({
  suggestions,
  members,
  votes,
  currentUserId,
}: {
  suggestions: Suggestion[];
  members: Member[];
  votes: Vote[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticVotes, setOptimisticVotes] = useState<Vote[]>(votes);

  function myVote(suggestionId: string) {
    return optimisticVotes.find(v => v.suggestion_id === suggestionId && v.user_id === currentUserId)?.vote ?? null;
  }

  function voteCount(suggestionId: string, type: "up" | "down") {
    return optimisticVotes.filter(v => v.suggestion_id === suggestionId && v.vote === type).length;
  }

  function voters(suggestionId: string, type: "up" | "down") {
    return optimisticVotes
      .filter(v => v.suggestion_id === suggestionId && v.vote === type)
      .map(v => members.find(m => m.user_id === v.user_id)?.name ?? "Someone");
  }

  async function castVote(suggestionId: string, newVote: "up" | "down") {
    const current = myVote(suggestionId);
    const next = current === newVote ? null : newVote;

    // Optimistic update
    setOptimisticVotes(prev => {
      const without = prev.filter(v => !(v.suggestion_id === suggestionId && v.user_id === currentUserId));
      if (next === null) return without;
      return [...without, { suggestion_id: suggestionId, user_id: currentUserId, vote: next }];
    });

    await fetch(`/api/suggestions/${suggestionId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote: next }),
    });

    startTransition(() => router.refresh());
  }

  if (suggestions.length === 0) return null;

  const allUp = (suggestionId: string) =>
    members.length > 0 && members.every(m => optimisticVotes.some(v => v.suggestion_id === suggestionId && v.user_id === m.user_id && v.vote === "up"));

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 text-lg">🗳️ Group voting</h2>
        <p className="text-xs text-slate-400">{members.length} member{members.length !== 1 ? "s" : ""} in group</p>
      </div>
      <p className="text-xs text-slate-400">Vote on each suggestion — when everyone gives a 👍, the trip is confirmed!</p>

      <div className="space-y-3">
        {suggestions.map(s => {
          const upCount = voteCount(s.id, "up");
          const downCount = voteCount(s.id, "down");
          const myV = myVote(s.id);
          const agreed = allUp(s.id);
          return (
            <div key={s.id} className={`flex items-center gap-4 p-4 rounded-xl border transition ${agreed ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">
                  #{s.rank} {s.destination_city}, {s.destination_country}
                  {agreed && <span className="ml-2 text-green-600 text-xs">✓ Everyone's in!</span>}
                </p>
                {(upCount > 0 || downCount > 0) && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {upCount > 0 && <span className="text-green-600 mr-2">👍 {voters(s.id, "up").join(", ")}</span>}
                    {downCount > 0 && <span className="text-red-500">👎 {voters(s.id, "down").join(", ")}</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => castVote(s.id, "up")}
                  disabled={pending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition ${myV === "up" ? "border-green-500 bg-green-500 text-white" : "border-slate-200 text-slate-600 hover:border-green-400"}`}
                >
                  👍 {upCount > 0 ? upCount : ""}
                </button>
                <button
                  onClick={() => castVote(s.id, "down")}
                  disabled={pending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition ${myV === "down" ? "border-red-500 bg-red-500 text-white" : "border-slate-200 text-slate-600 hover:border-red-400"}`}
                >
                  👎 {downCount > 0 ? downCount : ""}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
