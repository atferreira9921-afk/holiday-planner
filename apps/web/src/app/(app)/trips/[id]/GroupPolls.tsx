"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface Poll {
  id: string;
  trip_id: string;
  question: string;
  created_by: string;
  created_at: string;
  closed_at: string | null;
}

interface PollOption {
  id: string;
  poll_id: string;
  label: string;
}

interface PollVote {
  poll_id: string;
  user_id: string;
  option_id: string;
}

export default function GroupPolls({
  tripId,
  currentUserId,
  initialPolls,
  initialOptions,
  initialVotes,
  memberNames,
}: {
  tripId: string;
  currentUserId: string;
  initialPolls: Poll[];
  initialOptions: PollOption[];
  initialVotes: PollVote[];
  memberNames: Record<string, string>;
}) {
  const t = useTranslations("polls");
  const tc = useTranslations("common");

  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [options, setOptions] = useState<PollOption[]>(initialOptions);
  const [votes, setVotes] = useState<PollVote[]>(initialVotes);

  const [open, setOpen]                     = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptionLabels, setNewOptionLabels] = useState(["", ""]);

  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  function addOptionInput() {
    if (newOptionLabels.length >= 6) return;
    setNewOptionLabels(prev => [...prev, ""]);
  }

  function removeOptionInput(index: number) {
    if (newOptionLabels.length <= 2) return;
    setNewOptionLabels(prev => prev.filter((_, i) => i !== index));
  }

  function updateOptionLabel(index: number, value: string) {
    setNewOptionLabels(prev => prev.map((l, i) => i === index ? value : l));
  }

  function resetCreateForm() {
    setNewQuestion("");
    setNewOptionLabels(["", ""]);
    setShowCreateForm(false);
  }

  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault();
    const filledLabels = newOptionLabels.map(l => l.trim()).filter(Boolean);
    if (!newQuestion.trim() || filledLabels.length < 2) return;
    setCreating(true);
    const supabase = createClient();

    const { data: pollData } = await supabase
      .from("trip_polls")
      .insert({ trip_id: tripId, question: newQuestion.trim(), created_by: currentUserId })
      .select("*")
      .single();

    if (!pollData) { setCreating(false); return; }

    const optionRows = filledLabels.map((label, i) => ({
      poll_id: (pollData as Poll).id,
      label,
      sort_order: i,
    }));

    const { data: optionsData } = await supabase
      .from("trip_poll_options")
      .insert(optionRows)
      .select("*");

    setPolls(prev => [...prev, pollData as Poll]);
    if (optionsData) setOptions(prev => [...prev, ...(optionsData as PollOption[])]);
    resetCreateForm();
    setCreating(false);
  }

  async function handleVote(pollId: string, optionId: string) {
    setVotingPollId(pollId);
    const supabase = createClient();
    await supabase.from("trip_poll_votes").upsert(
      { poll_id: pollId, user_id: currentUserId, option_id: optionId },
      { onConflict: "poll_id,user_id" }
    );
    setVotes(prev => {
      const without = prev.filter(v => !(v.poll_id === pollId && v.user_id === currentUserId));
      return [...without, { poll_id: pollId, user_id: currentUserId, option_id: optionId }];
    });
    setVotingPollId(null);
  }

  async function handleClosePoll(pollId: string) {
    const supabase = createClient();
    const closedAt = new Date().toISOString();
    await supabase.from("trip_polls").update({ closed_at: closedAt }).eq("id", pollId);
    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, closed_at: closedAt } : p));
  }

  async function handleDeletePoll(pollId: string) {
    const supabase = createClient();
    await supabase.from("trip_polls").delete().eq("id", pollId);
    setPolls(prev => prev.filter(p => p.id !== pollId));
    setOptions(prev => prev.filter(o => o.poll_id !== pollId));
    setVotes(prev => prev.filter(v => v.poll_id !== pollId));
  }

  function getPollVotes(pollId: string) {
    return votes.filter(v => v.poll_id === pollId);
  }

  function getOptionVotes(optionId: string, pollVotes: PollVote[]) {
    return pollVotes.filter(v => v.option_id === optionId).length;
  }

  function getLeadingOptionId(pollId: string) {
    const pollOpts = options.filter(o => o.poll_id === pollId);
    const pollVotes = getPollVotes(pollId);
    if (pollVotes.length === 0) return null;
    let maxCount = 0;
    let leadingId: string | null = null;
    for (const opt of pollOpts) {
      const count = getOptionVotes(opt.id, pollVotes);
      if (count > maxCount) { maxCount = count; leadingId = opt.id; }
    }
    return leadingId;
  }

  function getUserVoteForPoll(pollId: string) {
    return votes.find(v => v.poll_id === pollId && v.user_id === currentUserId)?.option_id ?? null;
  }

  function pollHasVotes(pollId: string) {
    return votes.some(v => v.poll_id === pollId);
  }

  return (
    <div className="card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 text-lg">{t("title")}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm">{open ? tc("hide") : tc("show")}</button>
          {open && <button onClick={() => setShowCreateForm(f => !f)} className="btn-ghost text-sm">
            {showCreateForm ? tc("cancel") : t("createPoll")}
          </button>}
        </div>
      </div>

      {open && <>
      {/* Create poll form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreatePoll}
          className="bg-slate-50 rounded-xl p-5 space-y-4 border border-slate-200"
        >
          <div>
            <label className="label">{t("question")}</label>
            <input
              className="input"
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              placeholder={t("questionPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="label">{t("options")}</label>
            {newOptionLabels.map((label, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="input flex-1 text-sm"
                  value={label}
                  onChange={e => updateOptionLabel(i, e.target.value)}
                  placeholder={t("optionPlaceholder", { n: i + 1 })}
                  required={i < 2}
                />
                {newOptionLabels.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOptionInput(i)}
                    className="text-xs text-red-400 hover:text-red-600 px-1 flex-shrink-0"
                    aria-label="Remove option"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {newOptionLabels.length < 6 && (
              <button
                type="button"
                onClick={addOptionInput}
                className="text-xs text-indigo-500 hover:underline mt-1"
              >
                + {t("addOption")}
              </button>
            )}
          </div>

          <button type="submit" className="btn-primary text-sm" disabled={creating}>
            {creating ? tc("saving") : t("createAction")}
          </button>
        </form>
      )}

      {/* Polls list */}
      {polls.length === 0 && !showCreateForm && (
        <p className="text-sm text-slate-400 text-center py-4">
          {t("noPolls")}
        </p>
      )}

      <div className="space-y-5">
        {polls.map(poll => {
          const pollOpts = options.filter(o => o.poll_id === poll.id);
          const pollVotes = getPollVotes(poll.id);
          const totalVotes = pollVotes.length;
          const userVote = getUserVoteForPoll(poll.id);
          const isClosed = poll.closed_at !== null;
          const leadingId = getLeadingOptionId(poll.id);
          const isCreator = poll.created_by === currentUserId;
          const canDelete = isCreator && !pollHasVotes(poll.id);
          const isVoting = votingPollId === poll.id;
          const creatorName = memberNames[poll.created_by] ?? "Someone";

          return (
            <div key={poll.id} className="space-y-3 border border-slate-100 rounded-xl p-4">
              {/* Poll header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800 text-sm leading-snug">
                    {poll.question}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    by {creatorName}
                    {isClosed && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        {t("closed")}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {isCreator && !isClosed && (
                    <button
                      onClick={() => handleClosePoll(poll.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition"
                    >
                      {t("closePoll")}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeletePoll(poll.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {pollOpts.map(opt => {
                  const count = getOptionVotes(opt.id, pollVotes);
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isUserChoice = userVote === opt.id;
                  const isWinner = isClosed && opt.id === leadingId && count > 0;

                  return (
                    <div key={opt.id} className="space-y-1">
                      <button
                        type="button"
                        disabled={isClosed || isVoting}
                        onClick={() => !isClosed && handleVote(poll.id, opt.id)}
                        className={[
                          "w-full text-left px-3 py-2 rounded-lg border-2 text-sm font-medium transition",
                          isWinner
                            ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                            : isUserChoice
                              ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                              : isClosed
                                ? "border-slate-100 bg-slate-50 text-slate-500 cursor-default"
                                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <span>{opt.label}</span>
                          <span className="text-xs font-semibold ml-2 flex-shrink-0">
                            {t("votes", { count })}
                            {totalVotes > 0 && ` · ${pct}%`}
                            {isUserChoice && " · Your pick"}
                            {isWinner && " · Winner"}
                          </span>
                        </div>
                      </button>

                      {/* Progress bar */}
                      {totalVotes > 0 && (
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mx-0.5">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isWinner ? "bg-emerald-400" : isUserChoice ? "bg-indigo-400" : "bg-slate-300"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalVotes > 0 && (
                <p className="text-xs text-slate-400">
                  {t("votes", { count: totalVotes })} total
                </p>
              )}
            </div>
          );
        })}
      </div>
      </>}
    </div>
  );
}
