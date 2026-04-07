"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Member { user_id: string; name: string; pending?: boolean; familyMember?: boolean; }
interface AvailabilityEntry { trip_id: string; user_id: string; date: string; available: boolean; }

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function isWeekend(d: string) {
  const day = new Date(d).getDay();
  return day === 0 || day === 6;
}

export default function AvailabilityPoll({
  tripId,
  members,
  currentUserId,
  initialEntries,
  earliestDeparture,
  latestReturn,
}: {
  tripId: string;
  members: Member[];
  currentUserId: string;
  initialEntries: AvailabilityEntry[];
  earliestDeparture: string;
  latestReturn: string;
}) {
  const [entries, setEntries]   = useState<AvailabilityEntry[]>(initialEntries);
  const [saving, setSaving]     = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const dates = dateRange(earliestDeparture, latestReturn).slice(0, 60); // cap at 60 days

  function getStatus(userId: string, date: string): boolean | null {
    const e = entries.find(en => en.user_id === userId && en.date === date);
    return e ? e.available : null;
  }

  async function toggle(date: string, targetUserId: string = currentUserId) {
    const current = getStatus(targetUserId, date);
    const next    = current === true ? false : current === false ? null : true;
    setSaving(`${targetUserId}-${date}`);
    const supabase = createClient();

    if (next === null) {
      await supabase.from("group_availability")
        .delete().eq("trip_id", tripId).eq("user_id", targetUserId).eq("date", date);
      setEntries(prev => prev.filter(e => !(e.user_id === targetUserId && e.date === date)));
    } else {
      const { data } = await supabase.from("group_availability").upsert({
        trip_id: tripId, user_id: targetUserId, date, available: next,
      }, { onConflict: "trip_id,user_id,date" }).select("*").single();
      if (data) {
        setEntries(prev => [
          ...prev.filter(e => !(e.user_id === targetUserId && e.date === date)),
          data as AvailabilityEntry,
        ]);
      }
    }
    setSaving(null);
  }

  const confirmedMembers = members.filter(m => !m.pending && !m.familyMember);

  // Find dates where ALL confirmed members responded as available
  const allAvailableDates = dates.filter(date =>
    confirmedMembers.length > 1 && confirmedMembers.every(m => getStatus(m.user_id, date) === true)
  );

  // Find dates where current user is available
  const myAvailableDates = dates.filter(date => getStatus(currentUserId, date) === true).length;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">📅 Availability poll</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {members.length > 1
              ? `${confirmedMembers.length} member${confirmedMembers.length !== 1 ? "s" : ""} · green = everyone free`
              : "Just you so far — invite others to compare availability"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allAvailableDates.length > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {allAvailableDates.length} shared day{allAvailableDates.length !== 1 ? "s" : ""}
            </span>
          )}
          <button onClick={() => setCollapsed(c => !c)} className="btn-ghost text-sm">
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>
      </div>

      {!collapsed && confirmedMembers.length <= 1 && members.filter(m => m.pending).length === 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
          <span className="text-lg">👋</span>
          <p>
            Invite your travel companions so they can mark their available dates.
            Use the <strong>Invite people</strong> section below.
          </p>
        </div>
      )}

      {!collapsed && (
        <>
          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-400 inline-block" /> Free</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-300 inline-block" /> Busy</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-slate-200 inline-block" /> No response</span>
            {members.length > 1 && <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-600 inline-block" /> Everyone free</span>}
          </div>

          {/* Calendar grid */}
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr>
                  <th className="text-left p-1 pr-3 text-slate-500 font-semibold sticky left-0 bg-white">Member</th>
                  {dates.map(date => (
                    <th key={date} className={`p-0.5 text-center font-normal ${isWeekend(date) ? "text-indigo-400" : "text-slate-400"}`}
                      style={{ minWidth: "28px" }}>
                      <div>{new Date(date).toLocaleDateString("en-GB", { weekday: "narrow" })}</div>
                      <div className="font-semibold">{new Date(date).getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.user_id}>
                    <td className="p-1 pr-3 font-semibold text-slate-700 sticky left-0 bg-white whitespace-nowrap max-w-[120px] truncate">
                      <span title={member.name}>{member.name}</span>
                      {member.user_id === currentUserId && <span className="text-slate-400 font-normal ml-1">(you)</span>}
                      {member.pending && <span className="text-amber-500 font-normal ml-1 text-[10px]">invited</span>}
                      {member.familyMember && <span className="text-indigo-400 font-normal ml-1 text-[10px]">traveller</span>}
                    </td>
                    {dates.map(date => {
                      const status        = getStatus(member.user_id, date);
                      const isCurrentUser = member.user_id === currentUserId;
                      const isFamilyMember = !!member.familyMember;
                      const canToggle     = isCurrentUser || isFamilyMember;
                      const isSaving      = saving === `${member.user_id}-${date}`;
                      const allFree       = members.filter(m => !m.pending).length > 1 && allAvailableDates.includes(date);

                      let bg = member.pending ? "bg-slate-50 border border-dashed border-slate-200" : "bg-slate-100";
                      if (!member.pending) {
                        if (status === true)  bg = allFree ? "bg-emerald-600" : "bg-emerald-400";
                        if (status === false) bg = "bg-red-300";
                      }

                      return (
                        <td key={date} className="p-0.5 text-center">
                          <button
                            onClick={() => canToggle ? toggle(date, member.user_id) : undefined}
                            disabled={!canToggle || isSaving || !!member.pending}
                            className={`w-6 h-6 rounded transition ${bg} ${canToggle ? "hover:opacity-75 cursor-pointer" : "cursor-default"} ${isSaving ? "animate-pulse" : ""}`}
                            title={member.pending ? `${member.name} — invite pending` : canToggle ? "Click to toggle" : member.name}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>You marked <strong className="text-slate-700">{myAvailableDates}</strong> day{myAvailableDates !== 1 ? "s" : ""} as free</span>
            {allAvailableDates.length > 0 && members.length > 1 && (
              <span className="text-emerald-700 font-semibold">
                ✓ {allAvailableDates.length} date{allAvailableDates.length !== 1 ? "s" : ""} work for everyone
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
