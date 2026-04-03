"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DashboardGlobe from "./DashboardGlobe";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FamilyMemberRow {
  id: string;
  display_name: string;
  color: string;
  vacation_days_per_year: number;
  birthday: string | null;
  home_country: string;
  travel_style: string | null;
  on_parental_leave: boolean;
  gender: string;
  interests: string[];
  avatar_config: { hair?: number; glasses?: number; face?: number; shirt?: number; bottom?: number; clothesColor?: number } | null;
}

export interface BookingRow {
  id: string;
  family_member_id: string | null;
  title: string;
  start_date: string;
  end_date: string;
}

export interface AwayRow extends BookingRow { reason: string; }
export interface EventRow extends BookingRow { event_kind: string; }

export interface TripRow {
  id: string; title: string; status: string; planning_mode: string;
  desired_duration_days: number; earliest_departure: string;
  latest_return: string; destination_city: string | null;
}

export interface FreeStayRow {
  id: string; destination_city: string; destination_country: string;
}

export interface WishlistRow {
  id: string; destination_city: string; destination_country: string; priority: number;
}

export interface DashboardProps {
  userId: string;
  firstName: string;
  thisYear: number;
  todayISO: string;
  userPrefs: { vacation_days_per_year: number; birthday: string | null; home_country: string } | null;
  userGender?: string;
  userAvatarConfig?: { hair?: number; glasses?: number; face?: number; shirt?: number; bottom?: number; clothesColor?: number } | null;
  allBookings: BookingRow[];
  allAway: AwayRow[];
  allEvents: EventRow[];
  familyMembers: FamilyMemberRow[];
  activeTrips: TripRow[];
  completedTrips: TripRow[];
  tripCounts: { planning: number; suggested: number; booked: number };
  freeStays: FreeStayRow[];
  wishlist: WishlistRow[];
  publicHolidaysByCountry: Record<string, { date: string; name: string }[]>;
  userCountry: string;
  familyMemberTripIds: Record<string, string[]>;
  allPublicHolidayDates: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { dot: string; bg: string }> = {
  indigo:  { dot: "#6366f1", bg: "#eef2ff" },
  rose:    { dot: "#f43f5e", bg: "#fff1f2" },
  amber:   { dot: "#f59e0b", bg: "#fffbeb" },
  teal:    { dot: "#14b8a6", bg: "#f0fdfa" },
  violet:  { dot: "#8b5cf6", bg: "#f5f3ff" },
  orange:  { dot: "#f97316", bg: "#fff7ed" },
  cyan:    { dot: "#06b6d4", bg: "#ecfeff" },
  emerald: { dot: "#10b981", bg: "#ecfdf5" },
};

const EVENT_META: Record<string, { emoji: string; color: string; bg: string }> = {
  holiday:      { emoji: "🏖️", color: "#6366f1", bg: "#eef2ff" },
  work:         { emoji: "💼", color: "#94a3b8", bg: "#f1f5f9" },
  personal:     { emoji: "🏠", color: "#94a3b8", bg: "#f1f5f9" },
  "away-other": { emoji: "📌", color: "#94a3b8", bg: "#f1f5f9" },
  concert:      { emoji: "🎵", color: "#c026d3", bg: "#fdf4ff" },
  game:         { emoji: "⚽", color: "#16a34a", bg: "#f0fdf4" },
  visit:        { emoji: "🤝", color: "#0ea5e9", bg: "#f0f9ff" },
  party:        { emoji: "🎉", color: "#f59e0b", bg: "#fffbeb" },
  "event-other":{ emoji: "⭐", color: "#6366f1", bg: "#eef2ff" },
};

const BOOKING_GROUPS = [
  {
    label: "🏖️ Holidays", cats: [
      { key: "holiday",    label: "Holiday",     emoji: "🏖️" },
    ],
  },
  {
    label: "✈️ Away", cats: [
      { key: "work",       label: "Work travel", emoji: "💼" },
      { key: "personal",   label: "Personal",    emoji: "🏠" },
      { key: "away-other", label: "Other",       emoji: "📌" },
    ],
  },
  {
    label: "🎟️ Events", cats: [
      { key: "concert",      label: "Concert", emoji: "🎵" },
      { key: "game",         label: "Game",    emoji: "⚽" },
      { key: "visit",        label: "Visit",   emoji: "🤝" },
      { key: "party",        label: "Party",   emoji: "🎉" },
      { key: "event-other",  label: "Event",   emoji: "⭐" },
    ],
  },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string; emoji: string }> = {
  planning:  { bg: "#fef9c3", color: "#854d0e", label: "Planning",  emoji: "🗓️" },
  suggested: { bg: "#ede9fe", color: "#5b21b6", label: "Suggested", emoji: "✨" },
  booked:    { bg: "#dcfce7", color: "#166534", label: "Booked",    emoji: "✅" },
  completed: { bg: "#f1f5f9", color: "#475569", label: "Done",      emoji: "🏁" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled", emoji: "✕"  },
};

const PRIORITY_COLORS: Record<number, string> = { 1: "#94a3b8", 2: "#60a5fa", 3: "#34d399", 4: "#f59e0b", 5: "#f43f5e" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWorkingDays(start: string, end: string, year: number) {
  let n = 0;
  const d = new Date(start + "T00:00:00");
  const e = new Date(end   + "T00:00:00");
  while (d <= e) {
    if (d.getFullYear() === year && d.getDay() !== 0 && d.getDay() !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

function daysUntil(iso: string) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00").getTime() - t.getTime()) / 86400000);
}

function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtMed(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

// ─── Add Booking Form ─────────────────────────────────────────────────────────

function AddBookingForm({
  userId, memberId, memberName, onSaved, isDark,
}: {
  userId: string; memberId: string | null; memberName: string; isDark: boolean;
  onSaved: (item: { id: string; title: string; start: string; end: string; emoji: string; color: string; bg: string }) => void;
}) {
  const [cat, setCat] = useState("holiday");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const meta = EVENT_META[cat] ?? EVENT_META["holiday"];
  const catGroup = BOOKING_GROUPS.find(g => g.cats.some(c => c.key === cat))?.label?.split(" ")[1] ?? "Holidays";

  async function save() {
    if (!start || !end) return;
    setSaving(true);
    const supabase = createClient();
    const finalTitle = title.trim() || (BOOKING_GROUPS.flatMap(g => g.cats).find(c => c.key === cat)?.label ?? "Event");
    const fmId = memberId;

    let id = crypto.randomUUID();
    if (cat === "holiday") {
      const { data } = await supabase.from("booked_holidays")
        .insert({ owner_user_id: userId, family_member_id: fmId, title: finalTitle, start_date: start, end_date: end })
        .select("id").single();
      id = data?.id ?? id;
    } else if (["work", "personal", "away-other"].includes(cat)) {
      const { data } = await supabase.from("away_periods")
        .insert({ owner_user_id: userId, family_member_id: fmId, title: finalTitle, start_date: start, end_date: end, reason: cat })
        .select("id").single();
      id = data?.id ?? id;
    } else {
      const { data } = await supabase.from("calendar_events")
        .insert({ owner_user_id: userId, family_member_id: fmId, title: finalTitle, start_date: start, end_date: end, event_kind: cat })
        .select("id").single();
      id = data?.id ?? id;
    }

    onSaved({ id, title: finalTitle, start, end, emoji: meta.emoji, color: meta.color, bg: meta.bg });
    setTitle(""); setStart(""); setEnd(""); setCat("holiday");
    setSaving(false);
  }

  return (
    <div className="card p-4 space-y-3 border-indigo-100" style={{ background: isDark ? "#1e293b" : "#fafbff" }}>
      <p className="text-sm font-semibold text-slate-700">
        Add for <span className="text-indigo-600">{memberName}</span>
      </p>

      {/* Category */}
      {BOOKING_GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{group.label}</p>
          <div className="flex gap-1.5 flex-wrap">
            {group.cats.map(c => (
              <button key={c.key} type="button"
                onClick={() => { setCat(c.key); setTitle(c.label); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border-2 transition ${cat === c.key ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder={catGroup} />
        </div>
        <div>
          <label className="label">Start</label>
          <input type="date" className="input" value={start} onChange={e => { setStart(e.target.value); if (!end) setEnd(e.target.value); }} />
        </div>
        <div>
          <label className="label">End</label>
          <input type="date" className="input" value={end} min={start} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>

      <button onClick={save} disabled={saving || !start || !end} className="btn-primary text-sm px-5">
        {saving ? "Saving…" : `Save ${meta.emoji}`}
      </button>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function DashboardClient({
  userId, firstName, thisYear, todayISO,
  userPrefs, userGender, userAvatarConfig, allBookings, allAway, allEvents,
  familyMembers, activeTrips, completedTrips, tripCounts,
  freeStays, wishlist, publicHolidaysByCountry, userCountry, familyMemberTripIds,
  allPublicHolidayDates,
}: DashboardProps) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const [selectedId, setSelectedId] = useState<"you" | string>("you");
  const [showAddForm, setShowAddForm] = useState(false);
  const [extraItems, setExtraItems] = useState<{ id: string; title: string; start: string; end: string; emoji: string; color: string; bg: string }[]>([]);
  // Read which public holidays the user has opted out of (stored in localStorage by the calendar page)
  const [deselectedKeys, setDeselectedKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`holiday-deselected-${thisYear}`);
      if (stored) setDeselectedKeys(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, [thisYear]);

  const isYou = selectedId === "you";
  const selectedFm = familyMembers.find(fm => fm.id === selectedId) ?? null;
  const selectedColor = selectedFm ? (COLOR_MAP[selectedFm.color] ?? COLOR_MAP.rose) : { dot: "#6366f1", bg: "#eef2ff" };

  // ── Per-member data ──────────────────────────────────────────────────────
  const memberBookings = allBookings.filter(b =>
    isYou ? b.family_member_id === null : b.family_member_id === selectedId
  );
  const memberAway = allAway.filter(b =>
    isYou ? b.family_member_id === null : b.family_member_id === selectedId
  );
  const memberEvents = allEvents.filter(b =>
    isYou ? b.family_member_id === null : b.family_member_id === selectedId
  );

  const vacationTotal = isYou
    ? (userPrefs?.vacation_days_per_year ?? 22)
    : (selectedFm?.vacation_days_per_year ?? 22);

  const birthday = isYou
    ? (userPrefs?.birthday ? `${thisYear}-${userPrefs.birthday.slice(5, 10)}` : null)
    : (selectedFm?.birthday ? `${thisYear}-${selectedFm.birthday.slice(5, 10)}` : null);
  const bdAway   = birthday ? daysUntil(birthday) : null;
  const showBd   = bdAway !== null && bdAway >= 0 && bdAway <= 60;

  // ── Vacation stats ───────────────────────────────────────────────────────
  const bookedDays  = memberBookings.reduce((s, b) => s + countWorkingDays(b.start_date, b.end_date, thisYear), 0);
  const awayDays    = memberAway.reduce((s, b)    => s + countWorkingDays(b.start_date, b.end_date, thisYear), 0);
  const plannedDays = isYou
    ? activeTrips
        .filter(t => ["planning", "suggested"].includes(t.status) && t.latest_return >= todayISO)
        .reduce((s, t) => s + (t.desired_duration_days ?? 0), 0)
    : 0;
  const remainingDays = Math.max(0, vacationTotal - bookedDays);
  const bookedPct  = Math.min(100, Math.round((bookedDays  / vacationTotal) * 100));
  const plannedPct = Math.min(100 - bookedPct, Math.round((plannedDays / vacationTotal) * 100));

  // ── All upcoming items ───────────────────────────────────────────────────
  type UpcomingItem = { id: string; title: string; start: string; end: string; emoji: string; color: string; bg: string; daysAway: number };

  // Set of all public holiday dates (national + regional + preferred countries)
  // used to show 📅 for manually-booked single-day entries that fall on a public holiday
  const publicHolidayDateSet = new Set(allPublicHolidayDates);

  // Public holidays — shown for both the logged-in user and family members,
  // using each person's home_country so the right national holidays appear.
  const activeCountry = isYou ? userCountry : (selectedFm?.home_country ?? userCountry);
  const activeHolidays = publicHolidaysByCountry[activeCountry] ?? [];
  const deselectedPrefix = isYou ? "you" : selectedId;

  const publicHolidayItems: UpcomingItem[] = activeHolidays
    .filter(h => {
      if (h.date < todayISO) return false;
      const d = new Date(h.date + "T00:00:00");
      if (d.getDay() === 0 || d.getDay() === 6) return false;
      if (deselectedKeys.has(`${deselectedPrefix}::${h.date}`)) return false;
      return true;
    })
    .map(h => ({ id: `ph-${h.date}`, title: h.name, start: h.date, end: h.date, emoji: "📅", color: "#10b981", bg: "#ecfdf5", daysAway: daysUntil(h.date) }));

  const upcoming: UpcomingItem[] = [
    ...memberBookings.filter(b => b.end_date >= todayISO)
      .map(b => {
        // Single-day booking that coincides with a public holiday → show 📅 instead of 🏖️
        const isPublicHoliday = b.start_date === b.end_date && publicHolidayDateSet.has(b.start_date);
        const meta = isPublicHoliday
          ? { emoji: "📅", color: "#10b981", bg: "#ecfdf5" }
          : EVENT_META.holiday;
        return { id: b.id, title: b.title, start: b.start_date, end: b.end_date, ...meta, daysAway: daysUntil(b.start_date) };
      }),
    ...memberAway.filter(b => b.end_date >= todayISO)
      .map(b => ({ id: b.id, title: b.title, start: b.start_date, end: b.end_date, ...(EVENT_META[b.reason] ?? EVENT_META["away-other"]), daysAway: daysUntil(b.start_date) })),
    ...memberEvents.filter(b => b.end_date >= todayISO)
      .map(b => ({ id: b.id, title: b.title, start: b.start_date, end: b.end_date, ...(EVENT_META[b.event_kind] ?? EVENT_META["event-other"]), daysAway: daysUntil(b.start_date) })),
    ...publicHolidayItems,
    ...extraItems.filter(i => i.end >= todayISO).map(i => ({ ...i, daysAway: daysUntil(i.start) })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const nextUp = upcoming[0] ?? null;

  // Booked trip countdown — find the soonest booked trip that hasn't started yet
  const nextBookedTrip = isYou
    ? activeTrips
        .filter(t => t.status === "booked" && t.earliest_departure >= todayISO)
        .sort((a, b) => a.earliest_departure.localeCompare(b.earliest_departure))[0] ?? null
    : null;
  const tripCountdown = nextBookedTrip ? daysUntil(nextBookedTrip.earliest_departure) : null;

  const displayName = isYou ? firstName : (selectedFm?.display_name ?? "");
  const memberId = isYou ? null : selectedId;
  const memberLabel = isYou ? "You" : selectedFm?.display_name ?? "";

  function handleSaved(item: { id: string; title: string; start: string; end: string; emoji: string; color: string; bg: string }) {
    setExtraItems(prev => [...prev, item]);
    setShowAddForm(false);
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isYou ? `Hey ${firstName} 👋` : `Viewing ${displayName}'s calendar`}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {remainingDays > 0
              ? `${isYou ? "You have" : `${displayName} has`} ${remainingDays} vacation days left in ${thisYear}.`
              : `All ${vacationTotal} vacation days used for ${thisYear}.`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/holidays" className="btn-ghost text-sm">🗓️ Calendar</Link>
          {isYou && <Link href="/wishlist" className="btn-ghost text-sm">🌍 Wishlist</Link>}
          {isYou && <Link href="/trips/new" className="btn-primary text-sm">✈️ Plan trip</Link>}
          {!isYou && (
            <button onClick={() => setShowAddForm(f => !f)} className="btn-primary text-sm">
              {showAddForm ? "Cancel" : `+ Add for ${displayName}`}
            </button>
          )}
        </div>
      </div>

      {/* ── Member switcher ─────────────────────────────────────────────────── */}
      {familyMembers.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">View:</span>
          {/* You */}
          <button
            onClick={() => { setSelectedId("you"); setShowAddForm(false); setExtraItems([]); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition"
            style={isYou
              ? { background: isDark ? "rgba(99,102,241,0.2)" : "#eef2ff", borderColor: "#6366f1", color: isDark ? "#a5b4fc" : "#4338ca" }
              : { background: isDark ? "#1e293b" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: "#64748b" }}>
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            {firstName}
          </button>
          {/* Family members */}
          {familyMembers.map(fm => {
            const c = COLOR_MAP[fm.color] ?? COLOR_MAP.rose;
            const isSelected = selectedId === fm.id;
            return (
              <button key={fm.id}
                onClick={() => { setSelectedId(fm.id); setShowAddForm(false); setExtraItems([]); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition"
                style={isSelected
                  ? { background: c.bg, borderColor: c.dot, color: c.dot }
                  : { background: isDark ? "#1e293b" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: "#64748b" }}>
                <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0"
                  style={{ background: c.dot }}>
                  {fm.display_name.slice(0, 1).toUpperCase()}
                </span>
                {fm.display_name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Viewing-as banner ───────────────────────────────────────────────── */}
      {!isYou && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: isDark ? `${selectedColor.dot}1a` : selectedColor.bg, border: `1.5px solid ${selectedColor.dot}30`, color: selectedColor.dot }}>
          <span className="text-base">👤</span>
          <span>Viewing <b>{selectedFm?.display_name}</b>&apos;s calendar — you can add bookings and events on their behalf.</span>
          <button onClick={() => setSelectedId("you")}
            className="ml-auto text-xs underline opacity-70 hover:opacity-100">Back to mine</button>
        </div>
      )}

      {/* ── Quick add form ───────────────────────────────────────────────────── */}
      {showAddForm && !isYou && (
        <AddBookingForm
          userId={userId}
          memberId={memberId}
          memberName={selectedFm?.display_name ?? ""}
          onSaved={handleSaved}
          isDark={isDark}
        />
      )}

      {/* ── Booked trip countdown ──────────────────────────────────────────── */}
      {nextBookedTrip && tripCountdown !== null && (
        <div className="rounded-2xl p-5 flex items-center gap-5 flex-wrap"
          style={isDark
            ? { background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(134,239,172,0.3)" }
            : { background: "linear-gradient(135deg, #dcfce7, #bbf7d0)", border: "1.5px solid #86efac" }}>
          <div className="text-5xl flex-shrink-0">✈️</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-0.5">
              {tripCountdown === 0 ? "Today!" : tripCountdown === 1 ? "Tomorrow!" : `${tripCountdown} days to go!`}
            </p>
            <h2 className="text-xl font-bold text-slate-900 truncate">{nextBookedTrip.title}</h2>
            <p className="text-sm text-emerald-700 mt-0.5 font-medium">
              {fmtMed(nextBookedTrip.earliest_departure)}
              {nextBookedTrip.destination_city ? ` · ${nextBookedTrip.destination_city}` : ""}
              {" · "}{nextBookedTrip.desired_duration_days} days
            </p>
          </div>
          <Link href={`/trips/${nextBookedTrip.id}`}
            className="flex-shrink-0 text-sm px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition">
            View trip →
          </Link>
        </div>
      )}

      {/* ── Birthday alert ─────────────────────────────────────────────────── */}
      {showBd && (
        <div className="card p-4 flex items-center gap-4" style={{ background: isDark ? "rgba(168,85,247,0.12)" : "#fdf4ff", borderColor: isDark ? "rgba(168,85,247,0.3)" : "#e9d5ff" }}>
          <span className="text-3xl flex-shrink-0">🎂</span>
          <div className="flex-1">
            <p className="font-bold text-purple-800 text-sm">
              {bdAway === 0
                ? `Happy Birthday${isYou ? "" : `, ${displayName}`}! 🎉`
                : `${isYou ? "Your" : `${displayName}'s`} birthday is in ${bdAway} day${bdAway === 1 ? "" : "s"}`}
            </p>
            <p className="text-xs text-purple-500 mt-0.5">{fmtMed(birthday!)} — why not make it special?</p>
          </div>
          {isYou && (
            <Link href={`/trips/new?from=${birthday}&days=7`}
              className="text-sm px-4 py-2 rounded-lg bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition flex-shrink-0">
              Plan trip →
            </Link>
          )}
        </div>
      )}

      {/* ── Hero: next thing ────────────────────────────────────────────────── */}
      {nextUp ? (
        <div className="rounded-2xl p-6 flex items-center gap-6 flex-wrap"
          style={{ background: `linear-gradient(135deg, ${nextUp.color}18, ${nextUp.color}08)`, border: `1.5px solid ${nextUp.color}30` }}>
          <div className="text-5xl flex-shrink-0">{nextUp.emoji}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: nextUp.color }}>
              {nextUp.daysAway === 0 ? "Today!" : nextUp.daysAway < 0 ? "Ongoing" : `In ${nextUp.daysAway} day${nextUp.daysAway === 1 ? "" : "s"}`}
            </p>
            <h2 className="text-xl font-bold text-slate-900 truncate">{nextUp.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {fmtMed(nextUp.start)}{nextUp.end !== nextUp.start ? ` → ${fmtMed(nextUp.end)}` : ""}
            </p>
          </div>
          {upcoming.length > 1 && (
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-slate-400">+{upcoming.length - 1} more</p>
              <Link href="/holidays" className="text-sm font-semibold hover:underline" style={{ color: nextUp.color }}>View calendar →</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-6 flex items-center gap-6"
          style={isDark
            ? { background: "rgba(99,102,241,0.1)", border: "1.5px solid rgba(99,102,241,0.25)" }
            : { background: "linear-gradient(135deg, #eef2ff, #f5f3ff)", border: "1.5px solid #c7d2fe" }}>
          <div className="text-5xl">🗺️</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">
              {isYou ? "Nothing booked yet" : `Nothing booked for ${displayName} yet`}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isYou ? `You have ${remainingDays} days to use — plan something!` : `${remainingDays} vacation days remaining.`}
            </p>
          </div>
          {isYou
            ? <Link href="/trips/new" className="btn-primary text-sm flex-shrink-0">Plan now →</Link>
            : <button onClick={() => setShowAddForm(true)} className="btn-primary text-sm flex-shrink-0">Add booking →</button>
          }
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Days remaining", value: remainingDays,  sub: `of ${vacationTotal}/yr`,    color: "#6366f1", bg: "#eef2ff", href: "/holidays" },
          { label: "Days booked",    value: bookedDays,     sub: `${awayDays}d away too`,     color: "#0ea5e9", bg: "#f0f9ff", href: "/holidays" },
          { label: "Free stays",     value: freeStays.length, sub: "save on hotels",          color: "#10b981", bg: "#ecfdf5", href: "/wishlist" },
          { label: "Wishlist",       value: wishlist.length,  sub: "dream destinations",      color: "#f59e0b", bg: "#fffbeb", href: "/wishlist" },
        ].map(s => (
          <Link key={s.label} href={s.href}
            className="rounded-2xl p-4 text-center hover:scale-[1.02] transition-transform"
            style={{ background: isDark ? `${s.color}1a` : s.bg, border: `1.5px solid ${s.color}${isDark ? "33" : "20"}` }}>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">{s.label}</div>
            <div className="text-xs text-slate-400">{s.sub}</div>
          </Link>
        ))}
      </div>

      {/* ── Two column ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Upcoming */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Upcoming</h2>
            <div className="flex items-center gap-2">
              {!isYou && (
                <button onClick={() => setShowAddForm(f => !f)}
                  className="text-xs text-indigo-600 font-semibold hover:underline">
                  + Add
                </button>
              )}
              <Link href="/holidays" className="text-xs text-indigo-600 font-semibold hover:underline">Calendar →</Link>
            </div>
          </div>
          {upcoming.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-slate-400 text-sm">Nothing upcoming.</p>
              {isYou
                ? <Link href="/holidays" className="text-indigo-500 text-sm font-semibold mt-1 inline-block">Add a booking →</Link>
                : <button onClick={() => setShowAddForm(true)} className="text-indigo-500 text-sm font-semibold mt-1">Add one →</button>
              }
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.slice(0, 6).map(item => {
                const duration = Math.round((new Date(item.end + "T00:00:00").getTime() - new Date(item.start + "T00:00:00").getTime()) / 86400000) + 1;
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl transition hover:bg-slate-50"
                    style={{ borderLeft: `3px solid ${item.color}` }}>
                    <span className="text-lg flex-shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{item.title}</p>
                      <p className="text-xs text-slate-400">
                        {fmtShort(item.start)}{duration > 1 ? ` – ${fmtShort(item.end)} · ${duration}d` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 flex-shrink-0">
                      {item.daysAway === 0 ? <span style={{ color: item.color }}>Today!</span>
                        : item.daysAway < 0 ? "ongoing"
                        : `in ${item.daysAway}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trips */}
        {(() => {
          const visibleTrips = isYou
            ? activeTrips
            : activeTrips.filter(t => (familyMemberTripIds[selectedId] ?? []).includes(t.id));
          const visibleCounts = {
            planning:  visibleTrips.filter(t => t.status === "planning").length,
            suggested: visibleTrips.filter(t => t.status === "suggested").length,
            booked:    visibleTrips.filter(t => t.status === "booked").length,
          };
          return (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Trips</h2>
            <Link href="/trips" className="text-xs text-indigo-600 font-semibold hover:underline">View all →</Link>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { val: visibleCounts.planning,  style: STATUS_STYLE.planning  },
              { val: visibleCounts.suggested, style: STATUS_STYLE.suggested },
              { val: visibleCounts.booked,    style: STATUS_STYLE.booked    },
            ].filter(s => s.val > 0).map(s => (
              <span key={s.style.label} className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: isDark ? `${s.style.color}26` : s.style.bg, color: s.style.color }}>
                {s.style.emoji} {s.val} {s.style.label}
              </span>
            ))}
            {visibleTrips.length === 0 && (
              <span className="text-xs text-slate-400">
                {isYou ? "No active trips" : `No trips for ${displayName} yet`}
              </span>
            )}
          </div>
          {visibleTrips.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-slate-400 text-sm">
                {isYou ? "No trips in progress." : `${displayName} hasn't been added to any trips yet.`}
              </p>
              {isYou && <Link href="/trips/new" className="text-indigo-500 text-sm font-semibold mt-1 inline-block">Plan one →</Link>}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleTrips.slice(0, 5).map(t => {
                const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.planning;
                return (
                  <Link key={t.id} href={`/trips/${t.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                      style={{ background: isDark ? `${s.color}26` : s.bg }}>{s.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{t.title}</p>
                      <p className="text-xs text-slate-400">
                        {t.desired_duration_days}d · {fmtShort(t.earliest_departure)} – {fmtShort(t.latest_return)}
                        {t.destination_city ? ` · ${t.destination_city}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: isDark ? `${s.color}26` : s.bg, color: s.color }}>{s.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
          );
        })()}
      </div>

      {/* ── Vacation bar ───────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-slate-900">
            {isYou ? `Vacation days — ${thisYear}` : `${displayName}'s vacation days — ${thisYear}`}
          </h2>
          {isYou && (
            <Link href="/preferences" className="text-xs text-slate-400 hover:text-indigo-600 transition">Edit allocation →</Link>
          )}
        </div>
        <div>
          <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
            {bookedPct  > 0 && <div style={{ width: `${bookedPct}%`,  background: "#0ea5e9" }} />}
            {plannedPct > 0 && <div style={{ width: `${plannedPct}%`, background: "#7dd3fc" }} />}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0</span><span>{vacationTotal} days</span>
          </div>
        </div>
        <div className="flex gap-5 flex-wrap text-sm">
          {[
            { label: `${bookedDays} booked`,      color: "#0ea5e9" },
            { label: `${plannedDays} planned`,     color: "#7dd3fc" },
            { label: `${remainingDays} remaining`, color: "#e2e8f0" },
            ...(awayDays > 0 ? [{ label: `${awayDays} away (not vacation)`, color: "#94a3b8" }] : []),
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
              <span className="text-slate-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Wishlist preview (own view) ─────────────────────────────────────── */}
      {isYou && wishlist.length > 0 && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">🌍 Wishlist</h2>
            <Link href="/wishlist" className="text-xs text-indigo-600 font-semibold hover:underline">View globe →</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {wishlist.map(w => {
              const hasFreeStay = freeStays.some(
                fs => fs.destination_city.toLowerCase() === w.destination_city.toLowerCase()
                   && fs.destination_country === w.destination_country
              );
              return (
                <div key={w.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
                  style={{ background: PRIORITY_COLORS[w.priority] + (isDark ? "26" : "18"), border: `1.5px solid ${PRIORITY_COLORS[w.priority]}33` }}>
                  <span style={{ color: PRIORITY_COLORS[w.priority] }}>{"★".repeat(w.priority)}</span>
                  <span className="text-slate-700">{w.destination_city}</span>
                  {hasFreeStay && <span className="text-xs text-emerald-600 font-semibold">🏠 free</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Family cards ─────────────────────────────────────────────────────── */}
      {familyMembers.length > 0 && isYou && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg">Family & Friends</h2>
            <Link href="/family" className="text-xs text-indigo-600 font-semibold hover:underline">Manage →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {familyMembers.map(fm => {
              const c = COLOR_MAP[fm.color] ?? COLOR_MAP.rose;
              const fmBkings = allBookings.filter(b => b.family_member_id === fm.id);
              const fmBooked = fmBkings.reduce((s, b) => s + countWorkingDays(b.start_date, b.end_date, thisYear), 0);
              const fmTotal  = fm.vacation_days_per_year ?? 22;
              const usedPct  = Math.min(100, Math.round((fmBooked / fmTotal) * 100));
              const nextBk   = fmBkings.filter(b => b.end_date >= todayISO).sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
              const fmBd     = fm.birthday ? `${thisYear}-${fm.birthday.slice(5, 10)}` : null;
              const fmBdAway = fmBd ? daysUntil(fmBd) : null;
              return (
                <button key={fm.id} onClick={() => setSelectedId(fm.id)}
                  className="card p-4 space-y-3 text-left hover:shadow-md transition hover:border-indigo-200 w-full"
                  title={`Switch to ${fm.display_name}'s view`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: c.dot }}>
                      {fm.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-800 text-sm truncate">{fm.display_name}</p>
                        {fmBdAway !== null && fmBdAway >= 0 && fmBdAway <= 30 && <span title={`Birthday in ${fmBdAway}d`}>🎂</span>}
                      </div>
                      <p className="text-xs text-slate-400">{fm.home_country} · {fm.travel_style ?? "mid-range"}</p>
                    </div>
                    <span className="text-xs text-indigo-400 font-medium flex-shrink-0">View →</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{fmBooked}d used</span><span>{Math.max(0, fmTotal - fmBooked)}d left</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: c.dot }} />
                    </div>
                  </div>
                  {nextBk && (
                    <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">
                      Next: <span className="font-semibold text-slate-700">{nextBk.title}</span>
                      <span className="text-slate-400"> · {fmtShort(nextBk.start_date)}</span>
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Globe + visited countries ────────────────────────────────────────── */}
      <DashboardGlobe
        activeTrips={activeTrips}
        completedTrips={completedTrips}
        freeStays={freeStays}
        wishlist={wishlist}
        userName={isYou ? firstName : (selectedFm?.display_name ?? firstName)}
        userGender={isYou ? userGender : (selectedFm?.gender ?? undefined)}
        userAvatarConfig={isYou ? userAvatarConfig : (selectedFm?.avatar_config ?? null)}
      />

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {isYou && activeTrips.length === 0 && familyMembers.length === 0 && upcoming.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <h3 className="font-bold text-slate-900 mb-1 text-lg">Let&apos;s get started!</h3>
          <p className="text-slate-500 text-sm mb-6">Set your preferences, add family members, then plan your first trip.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/preferences" className="btn-ghost">Set preferences</Link>
            <Link href="/family" className="btn-ghost">Add family</Link>
            <Link href="/wishlist" className="btn-ghost">Add wishlist</Link>
            <Link href="/trips/new" className="btn-primary">Plan first trip</Link>
          </div>
        </div>
      )}
    </div>
  );
}
