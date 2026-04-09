import { createClient, createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import TripsFilter from "./TripsFilter";
import { getTranslations } from "next-intl/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isWeekend(d: Date) { return d.getDay() === 0 || d.getDay() === 6; }

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric" });
}
function fmtMonth(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { month: "short" });
}
function fmtShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function fmtFull(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function countVacationDays(start: string, end: string, publicHolidays: Set<string>): number {
  let n = 0;
  const d = new Date(start + "T00:00:00");
  const e = new Date(end   + "T00:00:00");
  while (d <= e) {
    if (!isWeekend(d) && !publicHolidays.has(localISO(d))) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

function totalCalDays(start: string, end: string): number {
  return Math.round(
    (new Date(end + "T00:00:00").getTime() - new Date(start + "T00:00:00").getTime()) / 86400000
  ) + 1;
}

function daysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00").getTime() - today.getTime()) / 86400000);
}

/**
 * Find bridge day opportunities: unbooked working days where taking 1 or 2 days off
 * would extend into a weekend/public holiday for a 3+ day break.
 */
interface BridgeOpportunity {
  start: string;
  end: string;
  vacDays: number;
  calDays: number;
  label: string; // e.g. "Fri 18 Apr + weekend = 3 days"
}

function findBridgeOpportunities(
  todayISO: string,
  publicHolidays: Set<string>,
  bookedRanges: { start: string; end: string }[],
  remainingDays: number,
  maxResults = 12,
): BridgeOpportunity[] {
  if (remainingDays <= 0) return [];
  const results: BridgeOpportunity[] = [];
  const seen = new Set<string>();

  const start = new Date(todayISO + "T00:00:00");
  const limit = new Date(start); limit.setFullYear(limit.getFullYear() + 1);

  function isBooked(iso: string) {
    return bookedRanges.some(r => r.start <= iso && r.end >= iso);
  }
  function isFreeWorkday(d: Date) {
    const iso = localISO(d);
    return !isWeekend(d) && !publicHolidays.has(iso) && !isBooked(iso);
  }

  const d = new Date(start);
  while (d < limit) {
    const iso = localISO(d);

    // 1-day bridge: single free working day
    if (isFreeWorkday(d)) {
      let extStart = iso;
      let extEnd   = iso;

      // Extend backwards
      for (let g = 0; g < 14; g++) {
        const prev = new Date(extStart + "T00:00:00"); prev.setDate(prev.getDate() - 1);
        const prevISO = localISO(prev);
        if (isWeekend(prev) || publicHolidays.has(prevISO)) extStart = prevISO;
        else break;
      }
      // Extend forwards
      for (let g = 0; g < 14; g++) {
        const next = new Date(extEnd + "T00:00:00"); next.setDate(next.getDate() + 1);
        const nextISO = localISO(next);
        if (isWeekend(next) || publicHolidays.has(nextISO)) extEnd = nextISO;
        else break;
      }

      const calDays = totalCalDays(extStart, extEnd);
      const key = `1::${extStart}::${extEnd}`;
      if (calDays >= 3 && !seen.has(key)) {
        seen.add(key);
        const dayName = new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" });
        results.push({ start: extStart, end: extEnd, vacDays: 1, calDays, label: `${dayName} ${fmtShort(iso)}` });
      }

      // 2-day bridge: this day + next free working day
      if (remainingDays >= 2) {
        const next1 = new Date(d); next1.setDate(next1.getDate() + 1);
        while (next1 < limit && (isWeekend(next1) || publicHolidays.has(localISO(next1)))) {
          next1.setDate(next1.getDate() + 1);
        }
        const iso2 = localISO(next1);
        if (isFreeWorkday(next1)) {
          let extStart2 = iso;
          let extEnd2   = iso2;

          for (let g = 0; g < 14; g++) {
            const prev = new Date(extStart2 + "T00:00:00"); prev.setDate(prev.getDate() - 1);
            const prevISO = localISO(prev);
            if (isWeekend(prev) || publicHolidays.has(prevISO)) extStart2 = prevISO;
            else break;
          }
          for (let g = 0; g < 14; g++) {
            const next = new Date(extEnd2 + "T00:00:00"); next.setDate(next.getDate() + 1);
            const nextISO = localISO(next);
            if (isWeekend(next) || publicHolidays.has(nextISO)) extEnd2 = nextISO;
            else break;
          }

          const calDays2 = totalCalDays(extStart2, extEnd2);
          const key2 = `2::${extStart2}::${extEnd2}`;
          if (calDays2 >= 4 && !seen.has(key2)) {
            seen.add(key2);
            results.push({ start: extStart2, end: extEnd2, vacDays: 2, calDays: calDays2, label: `${fmtShort(iso)}–${fmtShort(iso2)}` });
          }
        }
      }
    }

    d.setDate(d.getDate() + 1);
    if (results.length >= maxResults * 2) break; // gather extras then trim
  }

  // Sort by calDays desc, then by date asc; dedupe overlapping windows
  results.sort((a, b) => b.calDays - a.calDays || a.start.localeCompare(b.start));
  return results.slice(0, maxResults);
}

/**
 * Find the best sub-window of exactly `targetVacDays` vacation days within [wStart, wEnd].
 * Extends outward through adjacent weekends and public holidays to maximise calendar days.
 * Returns null if the window doesn't have enough vacation days.
 */
function findBestSubWindow(
  wStart: string,
  wEnd: string,
  targetVacDays: number,
  publicHolidays: Set<string>,
): { start: string; end: string; calDays: number } | null {
  // Collect ordered vacation days inside the window
  const vacDays: string[] = [];
  const d = new Date(wStart + "T00:00:00");
  const e = new Date(wEnd   + "T00:00:00");
  while (d <= e) {
    const iso = localISO(d);
    if (!isWeekend(d) && !publicHolidays.has(iso)) vacDays.push(iso);
    d.setDate(d.getDate() + 1);
  }
  if (vacDays.length < targetVacDays) return null;

  let best: { start: string; end: string; calDays: number } | null = null;

  for (let i = 0; i <= vacDays.length - targetVacDays; i++) {
    let extStartISO = vacDays[i];
    let extEndISO   = vacDays[i + targetVacDays - 1];

    // Extend start backwards through weekends/holidays (cap at 14 days)
    for (let guard = 0; guard < 14; guard++) {
      const prev = new Date(extStartISO + "T00:00:00");
      prev.setDate(prev.getDate() - 1);
      const prevISO = localISO(prev);
      if (isWeekend(prev) || publicHolidays.has(prevISO)) extStartISO = prevISO;
      else break;
    }

    // Extend end forwards through weekends/holidays (cap at 14 days)
    for (let guard = 0; guard < 14; guard++) {
      const next = new Date(extEndISO + "T00:00:00");
      next.setDate(next.getDate() + 1);
      const nextISO = localISO(next);
      if (isWeekend(next) || publicHolidays.has(nextISO)) extEndISO = nextISO;
      else break;
    }

    const calDays = totalCalDays(extStartISO, extEndISO);
    if (!best || calDays > best.calDays) {
      best = { start: extStartISO, end: extEndISO, calDays };
    }
  }

  return best;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SmartOption {
  vacDays: number;
  calDays: number;
  start: string;
  end: string;
  memberNames: string[]; // family members who also have vacation in this period
}

interface VacationWindow {
  id: string;
  title: string;
  start: string;
  end: string;
  vacationDays: number;
  calDays: number;
  daysAway: number;
  hasTrip: boolean;
  memberOverlap: string[]; // family members sharing this window
  options: SmartOption[];  // smart trip-length suggestions
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { bg: string; color: string; label: string; emoji: string }> = {
  planning:  { bg: "#fef9c3", color: "#854d0e", label: "Planning",  emoji: "🗓️" },
  suggested: { bg: "#ede9fe", color: "#5b21b6", label: "Suggested", emoji: "✨" },
  booked:    { bg: "#dcfce7", color: "#166534", label: "Booked",    emoji: "✅" },
  completed: { bg: "#f1f5f9", color: "#475569", label: "Completed", emoji: "🏁" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled", emoji: "✕"  },
};

const MONTH_COLORS = [
  { bg: "#eef2ff", text: "#4338ca" }, // indigo
  { bg: "#ecfdf5", text: "#065f46" }, // emerald
  { bg: "#fff7ed", text: "#c2410c" }, // orange
  { bg: "#fdf4ff", text: "#7e22ce" }, // violet
  { bg: "#eff6ff", text: "#1d4ed8" }, // blue
  { bg: "#fef2f2", text: "#b91c1c" }, // red
  { bg: "#f0fdfa", text: "#0f766e" }, // teal
  { bg: "#fefce8", text: "#854d0e" }, // yellow-brown
];

const TARGET_DURATIONS = [1, 2, 3, 4, 5, 7, 10, 14];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TripsPage() {
  const t = await getTranslations("tripsPage");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const db = createServiceClient();

  // Fetch trips (filtered to user's groups).
  // Use the service client so RLS auth.uid() mismatches never silently hide memberships.
  // Security: user.id comes from server-validated auth.getUser(), so explicit filtering is safe.
  const { data: memberships } = user
    ? await db.from("group_members").select("group_id").eq("user_id", user.id)
    : { data: [] };
  const groupIds = (memberships ?? []).map((g: { group_id: string }) => g.group_id);

  const { data: tripsRaw } = groupIds.length > 0
    ? await db.from("trips")
        .select("id, title, status, desired_duration_days, earliest_departure, latest_return, budget_per_person_eur, created_at")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; title: string; status: string; desired_duration_days: number; earliest_departure: string; latest_return: string; budget_per_person_eur: number | null; created_at: string }[] };

  const trips = tripsRaw ?? [];

  // ── Vacation windows ─────────────────────────────────────────────────────
  let vacationWindows: VacationWindow[] = [];
  let remainingDays  = 0;
  let vacationTotal  = 0;
  let bridgeOpportunities: BridgeOpportunity[] = [];
  let groupOverlaps: { start: string; end: string; memberNames: string[]; calDays: number; daysAway: number }[] = [];

  if (user) {
    const today    = new Date();
    const todayISO = localISO(today);
    const thisYear = today.getFullYear();

    const [
      { data: prefs },
      { data: holidays },
      { data: familyMembersRaw },
      { data: familyHolidaysRaw },
    ] = await Promise.all([
      supabase.from("user_preferences").select("vacation_days_per_year, home_country").eq("user_id", user.id).single(),
      supabase.from("booked_holidays")
        .select("id, start_date, end_date, title")
        .eq("owner_user_id", user.id)
        .is("family_member_id", null)
        .gte("end_date", todayISO)
        .order("start_date"),
      supabase.from("family_members")
        .select("id, display_name")
        .eq("owner_user_id", user.id),
      supabase.from("booked_holidays")
        .select("family_member_id, start_date, end_date")
        .eq("owner_user_id", user.id)
        .not("family_member_id", "is", null)
        .gte("end_date", todayISO),
    ]);

    vacationTotal = prefs?.vacation_days_per_year ?? 22;
    const homeCountry = prefs?.home_country ?? "PT";

    // Build member name lookup
    const memberNameMap = new Map<string, string>(
      (familyMembersRaw ?? []).map(m => [m.id, m.display_name])
    );

    // Fetch public holidays
    const publicHolidays = new Set<string>();
    await Promise.all([thisYear, thisYear + 1].map(async yr => {
      try {
        const res = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${yr}/${homeCountry}`,
          { next: { revalidate: 86400 } }
        );
        if (res.ok) {
          const data: { date: string }[] = await res.json();
          for (const h of data) publicHolidays.add(h.date);
        }
      } catch { /* degrade gracefully */ }
    }));

    // Remaining vacation days this year
    const { data: allHolidaysThisYear } = await supabase
      .from("booked_holidays")
      .select("start_date, end_date")
      .eq("owner_user_id", user.id)
      .is("family_member_id", null)
      .gte("start_date", `${thisYear}-01-01`)
      .lte("end_date", `${thisYear}-12-31`);

    const bookedDays = (allHolidaysThisYear ?? []).reduce(
      (sum, b) => sum + countVacationDays(b.start_date, b.end_date, publicHolidays), 0
    );
    remainingDays = Math.max(0, vacationTotal - bookedDays);

    const tripRanges = trips
      .filter(trip => !["cancelled", "completed"].includes(trip.status))
      .map(trip => ({ start: trip.earliest_departure, end: trip.latest_return }));

    const familyHolidays = familyHolidaysRaw ?? [];

    vacationWindows = (holidays ?? []).map(b => {
      const vacDays = countVacationDays(b.start_date, b.end_date, publicHolidays);
      const cal     = totalCalDays(b.start_date, b.end_date);
      const hasTrip = tripRanges.some(tr => tr.start <= b.end_date && tr.end >= b.start_date);

      // Which family members have a holiday overlapping this window?
      const memberOverlap = familyHolidays
        .filter(fh => fh.start_date <= b.end_date && fh.end_date >= b.start_date)
        .map(fh => memberNameMap.get(fh.family_member_id) ?? "")
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i); // unique

      // Generate smart options for each target duration
      const options: SmartOption[] = TARGET_DURATIONS
        .filter(n => n <= vacDays)
        .map(n => {
          const sub = findBestSubWindow(b.start_date, b.end_date, n, publicHolidays);
          if (!sub) return null;
          const optionMemberNames = familyHolidays
            .filter(fh => fh.start_date <= sub.end && fh.end_date >= sub.start)
            .map(fh => memberNameMap.get(fh.family_member_id) ?? "")
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i);
          return { vacDays: n, calDays: sub.calDays, start: sub.start, end: sub.end, memberNames: optionMemberNames };
        })
        .filter((o): o is SmartOption => o !== null);

      return {
        id: b.id,
        title: b.title,
        start: b.start_date,
        end: b.end_date,
        vacationDays: vacDays,
        calDays: cal,
        daysAway: daysUntil(b.start_date),
        hasTrip,
        memberOverlap,
        options,
      };
    });

    // Prioritise windows where family members also have holidays
    vacationWindows.sort((a, b) => {
      if (b.memberOverlap.length !== a.memberOverlap.length)
        return b.memberOverlap.length - a.memberOverlap.length;
      return a.daysAway - b.daysAway;
    });

    // ── Bridge opportunities ────────────────────────────────────────────────
    const userBookedRanges = (holidays ?? []).map(b => ({ start: b.start_date, end: b.end_date }));
    bridgeOpportunities = findBridgeOpportunities(todayISO, publicHolidays, userBookedRanges, remainingDays);

    // ── Group overlap windows ───────────────────────────────────────────────
    // Periods where the user AND at least one family member are both off simultaneously
    const userHolidaySet = holidays ?? [];
    for (const userH of userHolidaySet) {
      const overlapping = familyHolidays.filter(
        fh => fh.start_date <= userH.end_date && fh.end_date >= userH.start_date
      );
      if (overlapping.length === 0) continue;
      const names = overlapping
        .map(fh => memberNameMap.get(fh.family_member_id) ?? "")
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);
      const overlapStart = overlapping.reduce((max, fh) => fh.start_date > max ? fh.start_date : max, userH.start_date);
      const overlapEnd   = overlapping.reduce((min, fh) => fh.end_date < min ? fh.end_date : min, userH.end_date);
      groupOverlaps.push({
        start: overlapStart,
        end: overlapEnd,
        memberNames: names,
        calDays: totalCalDays(overlapStart, overlapEnd),
        daysAway: daysUntil(overlapStart),
      });
    }
    // Sort by most members then soonest
    groupOverlaps.sort((a, b) => b.memberNames.length - a.memberNames.length || a.daysAway - b.daysAway);
  }

  const hasAnyVacation = vacationWindows.length > 0;

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("activePlural", { count: trips.filter(trip => !["cancelled", "archived"].includes(trip.status)).length })}</p>
        </div>
        <Link href="/trips/new" className="btn-primary">✈️ New trip</Link>
      </div>

      {/* ── Trips grid ── */}
      {trips.length > 0 ? (
        <div>
          <h2 className="font-bold text-slate-900 mb-3">{t("allTrips")}</h2>
          <TripsFilter trips={trips} />
        </div>
      ) : (
        <div className="card p-16 text-center">
          <div className="text-6xl mb-4">✈️</div>
          <h3 className="font-bold text-slate-900 text-xl mb-2">{t("noTrips")}</h3>
          <p className="text-slate-500 text-sm mb-6">Plan your first holiday and let AI find the best dates and prices.</p>
          <Link href="/trips/new" className="btn-primary">{t("planFirst")}</Link>
        </div>
      )}

      {/* ── Vacation windows ── */}
      {user && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-slate-900">{t("smartWindows")}</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {hasAnyVacation
                  ? `${vacationWindows.length} vacation period${vacationWindows.length !== 1 ? "s" : ""} · ${remainingDays > 0 ? `${remainingDays} day${remainingDays !== 1 ? "s" : ""} still available to book` : "all days booked"}`
                  : "No vacations booked yet"}
              </p>
            </div>
            <Link href="/holidays" className="text-xs text-indigo-500 font-semibold hover:underline">
              {remainingDays > 0 ? `+ Book ${remainingDays} more days →` : "Open calendar →"}
            </Link>
          </div>

          {hasAnyVacation ? (
            <div className="space-y-3">
              {vacationWindows.map((w) => {
                const accent  = MONTH_COLORS[new Date(w.start + "T00:00:00").getMonth() % MONTH_COLORS.length];
                const ongoing = w.daysAway < 0;
                const isToday = w.daysAway === 0;
                return (
                  <div key={w.id} className="card overflow-hidden">
                    {/* Window header */}
                    <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
                      {/* Date pill */}
                      <div className="flex-shrink-0 w-12 text-center rounded-xl py-1.5" style={{ background: accent.bg }}>
                        <div className="text-xs font-bold uppercase" style={{ color: accent.text }}>{fmtMonth(w.start)}</div>
                        <div className="text-xl font-black leading-tight" style={{ color: accent.text }}>{fmtDay(w.start)}</div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm">{w.title}</p>
                          {isToday && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Today!</span>
                          )}
                          {ongoing && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Ongoing</span>
                          )}
                          {w.memberOverlap.length > 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                              👥 {w.memberOverlap.join(", ")} also off
                            </span>
                          )}
                          {w.hasTrip && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{t("tripPlanned")}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {w.end !== w.start ? `${fmtShort(w.start)} – ${fmtShort(w.end)}` : fmtFull(w.start)}
                          {" · "}
                          <span className="font-medium text-slate-600">
                            {w.vacationDays} vacation day{w.vacationDays !== 1 ? "s" : ""}
                          </span>
                          {w.calDays !== w.vacationDays && (
                            <span className="text-slate-400"> · {w.calDays}d total</span>
                          )}
                          {!ongoing && !isToday && w.daysAway > 0 && (
                            <span className="text-slate-400"> · in {w.daysAway}d</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Smart options */}
                    {w.options.length > 0 && (
                      <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
                        {w.options.map(opt => {
                          const isFull  = opt.vacDays === w.vacationDays;
                          const hasOverlap = opt.memberNames.length > 0;
                          return (
                            <Link
                              key={opt.vacDays}
                              href={`/trips/new?from=${opt.start}&to=${opt.end}&days=${opt.vacDays}`}
                              className={[
                                "flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl border transition hover:shadow-sm",
                                hasOverlap
                                  ? "border-violet-200 bg-violet-50 hover:bg-violet-100"
                                  : isFull
                                  ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                                  : "border-slate-200 bg-white hover:bg-slate-50",
                              ].join(" ")}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={[
                                  "text-xs font-bold",
                                  hasOverlap ? "text-violet-700" : isFull ? "text-indigo-700" : "text-slate-700",
                                ].join(" ")}>
                                  {opt.vacDays}d vacation
                                </span>
                                {hasOverlap && <span className="text-xs">👥</span>}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                                {fmtShort(opt.start)}–{fmtShort(opt.end)}
                              </div>
                              <div className="text-xs font-semibold mt-0.5 whitespace-nowrap" style={{ color: accent.text }}>
                                {opt.calDays} cal day{opt.calDays !== 1 ? "s" : ""}
                                {opt.calDays > opt.vacDays && (
                                  <span className="ml-1 font-normal text-slate-400">
                                    (+{opt.calDays - opt.vacDays} free)
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">🗓️</div>
              <p className="font-semibold text-slate-700">No vacation booked yet</p>
              <p className="text-sm text-slate-400 mt-1 mb-4">
                Head to the calendar to book your vacation days first, then come back to plan trips.
              </p>
              <Link href="/holidays" className="btn-primary text-sm">Open calendar →</Link>
            </div>
          )}
        </div>
      )}

      {/* ── Group overlap ── */}
      {groupOverlaps.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-900 mb-3">👥 Shared time off</h2>
          <div className="card overflow-hidden divide-y divide-slate-100">
            {groupOverlaps.map((ov, i) => {
              const accent = MONTH_COLORS[new Date(ov.start + "T00:00:00").getMonth() % MONTH_COLORS.length];
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition group">
                  <div className="flex-shrink-0 w-12 text-center rounded-xl py-1.5" style={{ background: accent.bg }}>
                    <div className="text-xs font-bold uppercase" style={{ color: accent.text }}>{fmtMonth(ov.start)}</div>
                    <div className="text-xl font-black leading-tight" style={{ color: accent.text }}>{fmtDay(ov.start)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">
                        {ov.memberNames.join(" & ")} also off
                      </p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                        👥 {ov.memberNames.length + 1} people
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fmtShort(ov.start)} – {fmtShort(ov.end)} · <span className="font-medium text-slate-600">{ov.calDays}d together</span>
                      {ov.daysAway > 0 && <span> · in {ov.daysAway}d</span>}
                    </p>
                  </div>
                  <Link
                    href={`/trips/new?from=${ov.start}&to=${ov.end}`}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold border border-violet-200 text-violet-600 bg-violet-50 hover:bg-violet-100 transition opacity-0 group-hover:opacity-100">
                    {t("planTogether")}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bridge day opportunities ── */}
      {bridgeOpportunities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-slate-900">🌉 {t("bridgeOpportunities")}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Unbooked days — take 1–2 days off to unlock a longer break
              </p>
            </div>
            <Link href="/holidays" className="text-xs text-indigo-500 font-semibold hover:underline">
              Book days →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bridgeOpportunities.map((b, i) => {
              const accent = MONTH_COLORS[new Date(b.start + "T00:00:00").getMonth() % MONTH_COLORS.length];
              const bonus = b.calDays - b.vacDays;
              return (
                <Link
                  key={i}
                  href={`/holidays`}
                  className="card p-4 flex gap-3 hover:shadow-md transition group"
                >
                  <div className="flex-shrink-0 w-11 text-center rounded-xl py-1.5" style={{ background: accent.bg }}>
                    <div className="text-xs font-bold uppercase" style={{ color: accent.text }}>{fmtMonth(b.start)}</div>
                    <div className="text-lg font-black leading-tight" style={{ color: accent.text }}>{fmtDay(b.start)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {b.vacDays}d off
                      </span>
                      {bonus > 0 && (
                        <span className="text-xs font-semibold text-emerald-600">
                          +{bonus} free
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="font-medium text-slate-700">{b.calDays} days total</span>
                      {" · "}{fmtShort(b.start)}–{fmtShort(b.end)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{b.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
