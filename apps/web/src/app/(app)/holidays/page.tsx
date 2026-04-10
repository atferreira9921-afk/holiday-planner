"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, getAirports } from "@/lib/data/geo";
import { getMunicipalHolidays } from "@/lib/data/pt-municipal-holidays";
import { useTranslations, useLocale } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicHoliday {
  date: string;
  name: string;
  localName: string;
  global: boolean;
  counties: string[] | null;
}

type BookingCategory = "holiday" | "work" | "personal" | "away-other" | "concert" | "game" | "visit" | "party" | "event-other";

const BOOKING_META: Record<BookingCategory, { label: string; emoji: string; group: "holiday" | "away" | "event"; dotColor: string; bgColor: string }> = {
  holiday:    { label: "Holiday",     emoji: "🏖️", group: "holiday", dotColor: "#6366f1", bgColor: "#eef2ff" },
  work:       { label: "Work travel", emoji: "💼", group: "away",    dotColor: "#94a3b8", bgColor: "#f1f5f9" },
  personal:   { label: "Personal",    emoji: "🏠", group: "away",    dotColor: "#94a3b8", bgColor: "#f1f5f9" },
  "away-other": { label: "Other away", emoji: "📌", group: "away",   dotColor: "#94a3b8", bgColor: "#f1f5f9" },
  concert:    { label: "Concert",     emoji: "🎵", group: "event",   dotColor: "#c026d3", bgColor: "#fdf4ff" },
  game:       { label: "Game",        emoji: "⚽", group: "event",   dotColor: "#16a34a", bgColor: "#f0fdf4" },
  visit:      { label: "Visit",       emoji: "🤝", group: "event",   dotColor: "#0ea5e9", bgColor: "#f0f9ff" },
  party:      { label: "Party",       emoji: "🎉", group: "event",   dotColor: "#f59e0b", bgColor: "#fffbeb" },
  "event-other": { label: "Event",   emoji: "⭐", group: "event",   dotColor: "#6366f1", bgColor: "#eef2ff" },
};

interface BookedPeriod {
  id: string;
  memberId: string; // "you" or family_member.id
  memberName: string;
  dot: string;
  bg: string;
  title: string;
  start: string;
  end: string;
  category: BookingCategory;
}

interface BirthdayEntry {
  iso: string;       // birthday in current year: YYYY-MM-DD
  name: string;
  memberId: string;
  dot: string;
  bg: string;
}

interface CalendarMember {
  id: string;
  name: string;
  country: string;
  city: string;
  region: string | null; // ISO 3166-2, for regional holiday filtering
  cityName: string | null; // residential city name (may differ from airport city)
  dot: string;
  bg: string;
  isYou: boolean;
  blockedDates: Set<string>;
  holidayDates: Map<string, string>;
}

interface BridgeWindow {
  start: string; end: string; totalDays: number;
  vacationDaysNeeded: number; efficiency: number;
  holidays: { name: string; memberId: string; memberName: string }[];
}

// ─── Colour palette ───────────────────────────────────────────────────────────

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

// ─── Dark mode hook ───────────────────────────────────────────────────────────

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseDate(iso: string) { return new Date(iso + "T00:00:00"); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isWeekend(d: Date) { return d.getDay() === 0 || d.getDay() === 6; }
function fmtShort(iso: string, locale: string) { return parseDate(iso).toLocaleDateString(locale, { day: "numeric", month: "short" }); }
function fmtLong(iso: string, locale: string) { return parseDate(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }); }

/** Count days in [start, end] that are working days AND not in publicHolidayDates. */
function countVacationDays(start: string, end: string, publicHolidayDates: Set<string>): number {
  let n = 0;
  const d = parseDate(start);
  const e = parseDate(end);
  while (d <= e) {
    if (!isWeekend(d) && !publicHolidayDates.has(toISO(d))) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

// Convert stored birthday (any year) to current-year ISO date
function birthdayThisYear(birthday: string, year: number): string {
  return `${year}-${birthday.slice(5, 10)}`; // YYYY-MM-DD → YEAR-MM-DD
}

function computeBridgeWindows(members: CalendarMember[], year: number): BridgeWindow[] {
  const allHolidayDates = new Map<string, { name: string; memberId: string; memberName: string }[]>();
  for (const m of members) {
    for (const [date, name] of m.holidayDates) {
      if (!allHolidayDates.has(date)) allHolidayDates.set(date, []);
      allHolidayDates.get(date)!.push({ name, memberId: m.id, memberName: m.name });
    }
  }
  const windows: BridgeWindow[] = [];
  const seen = new Set<string>();
  for (const [hDate] of allHolidayDates) {
    const base = parseDate(hDate);
    for (let lb = 0; lb <= 3; lb++) {
      for (let len = 3; len <= 14; len++) {
        const start = addDays(base, -lb);
        const end = addDays(start, len - 1);
        if (end.getFullYear() > year) continue;
        let vac = 0;
        const covered: { name: string; memberId: string; memberName: string }[] = [];
        for (let i = 0; i < len; i++) {
          const d = addDays(start, i);
          const ds = toISO(d);
          if (isWeekend(d)) continue;
          const entries = allHolidayDates.get(ds);
          if (entries) {
            for (const e of entries) {
              if (!covered.some(x => x.memberId === e.memberId && x.name === e.name)) covered.push(e);
            }
          } else { vac++; }
        }
        if (vac === 0 || covered.length === 0 || vac > 5) continue;
        const efficiency = parseFloat((len / Math.max(vac, 1)).toFixed(1));
        if (efficiency < 1.5) continue;
        const key = `${toISO(start)}-${toISO(end)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        windows.push({ start: toISO(start), end: toISO(end), totalDays: len, vacationDaysNeeded: vac, efficiency, holidays: covered });
      }
    }
  }
  return windows.sort((a, b) => b.efficiency - a.efficiency).slice(0, 20);
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({
  year, month, members, viewMode, selStart, selEnd,
  onDayClick, onHoverDay, hoveredDay, bookedPeriods, birthdays, deselectedKeys, rawHolidayDates,
}: {
  year: number; month: number; members: CalendarMember[]; viewMode: "individual" | "family";
  selStart: string | null; selEnd: string | null;
  onDayClick: (iso: string) => void; onHoverDay: (iso: string | null) => void; hoveredDay: string | null;
  bookedPeriods: BookedPeriod[];
  birthdays: BirthdayEntry[];
  deselectedKeys: Set<string>;
  rawHolidayDates: Set<string>;
}) {
  const isDark = useDarkMode();
  const todayStr = toISO(new Date());
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const visibleMembers = viewMode === "individual" ? members.filter(m => m.isYou) : members;
  const visibleMemberIds = new Set(visibleMembers.map(m => m.id));

  function isInRange(iso: string) {
    const a = selStart, b = selEnd ?? hoveredDay;
    if (!selStart || !b) return false;
    const lo = a! < b ? a! : b, hi = a! < b ? b : a!;
    return iso >= lo && iso <= hi;
  }

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 pb-2">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ background: isDark ? "#334155" : "#e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        {cells.map((iso, idx) => {
          if (!iso) return <div key={idx} style={{ background: isDark ? "#0f172a" : "#f8fafc", minHeight: 88 }} />;

          const d = parseDate(iso);
          const wknd = isWeekend(d);
          const today = iso === todayStr;
          const inRange = isInRange(iso);
          const isSelStart = iso === selStart;

          // Public holidays — only ones not deselected in the All Holidays tab
          const holidays: { name: string; member: CalendarMember }[] = [];
          for (const m of visibleMembers) {
            const hName = m.holidayDates.get(iso);
            if (hName && !deselectedKeys.has(`${m.id}::${iso}`)) {
              holidays.push({ name: hName, member: m });
            }
          }

          // Booked periods for this day
          const dayBookings = bookedPeriods.filter(bp =>
            visibleMemberIds.has(bp.memberId) && iso >= bp.start && iso <= bp.end
          );

          // Birthdays for this day
          const dayBirthdays = birthdays.filter(b =>
            visibleMemberIds.has(b.memberId) && b.iso === iso
          );

          const blocked = visibleMembers.some(m => m.blockedDates.has(iso));

          return (
            <div
              key={idx}
              onClick={() => onDayClick(iso)}
              onMouseEnter={() => onHoverDay(iso)}
              onMouseLeave={() => onHoverDay(null)}
              style={{
                background: inRange
                  ? (isDark ? "rgba(99,102,241,0.25)" : "#eef2ff")
                  : wknd
                  ? (isDark ? "#1a2438" : "#f8fafc")
                  : (isDark ? "#1e293b" : "#ffffff"),
                minHeight: 88,
                padding: "4px 6px 4px",
                cursor: "pointer",
                position: "relative",
                outline: isSelStart ? "2px solid #6366f1" : "none",
                boxSizing: "border-box",
              }}
            >
              {/* Day number */}
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22, borderRadius: "50%",
                background: today ? "#6366f1" : "transparent",
                color: today ? "#fff" : wknd ? "#94a3b8" : (isDark ? "#cbd5e1" : "#374151"),
                fontSize: 11, fontWeight: today ? 700 : 500, marginBottom: 3,
              }}>
                {d.getDate()}
              </div>

              {/* Parental leave overlay */}
              {blocked && (
                <div style={{
                  position: "absolute", inset: 0, opacity: 0.12,
                  background: "repeating-linear-gradient(45deg,#94a3b8 0,#94a3b8 1px,transparent 0,transparent 50%)",
                  backgroundSize: "6px 6px", pointerEvents: "none",
                }} />
              )}

              {/* Birthdays */}
              {dayBirthdays.map((b, j) => {
                const isHoliday = visibleMembers.find(m => m.id === b.memberId)?.holidayDates.has(iso);
                return (
                  <div key={j} title={`${b.name}'s birthday${isHoliday ? " 🎉 (public holiday!)" : ""}`}
                    style={{ fontSize: 9, marginBottom: 2, display: "flex", alignItems: "center", gap: 2 }}>
                    <span>🎂</span>
                    <span style={{ color: b.dot, fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {b.name}{isHoliday ? " 🎉" : ""}
                    </span>
                  </div>
                );
              })}

              {/* Booked event bars */}
              {dayBookings.map((bp, j) => {
                const meta = BOOKING_META[bp.category];
                const isAway = meta.group === "away";
                const displayEmoji = rawHolidayDates.has(iso) ? "📅" : meta.emoji;
                return (
                  <div key={j} title={`${bp.memberName}: ${displayEmoji} ${bp.title}`}
                    style={{
                      borderLeft: `3px solid ${bp.dot}`,
                      fontSize: 9, padding: "1px 4px", marginBottom: 2,
                      borderRadius: "0 3px 3px 0",
                      backgroundColor: isDark ? `${bp.dot}28` : bp.bg,
                      color: isDark ? "#e2e8f0" : "#374151",
                      overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                      fontWeight: 600,
                      backgroundImage: isAway ? "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.04) 3px,rgba(0,0,0,0.04) 6px)" : "none",
                    }}>
                    {iso === bp.start ? `${displayEmoji} ${bp.title}` : "·"}
                  </div>
                );
              })}

              {/* Public holiday badges */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {holidays.slice(0, 2).map((h, i) => (
                  <div key={i} title={`${h.member.name}: ${h.name}`}
                    style={{ display: "flex", alignItems: "center", gap: 3, background: isDark ? `${h.member.dot}26` : h.member.bg, borderRadius: 3, padding: "1px 3px" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: h.member.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 8, color: isDark ? "#cbd5e1" : "#374151", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      📅 {h.name}
                    </span>
                  </div>
                ))}
                {holidays.length > 2 && <span style={{ fontSize: 8, color: "#94a3b8" }}>+{holidays.length - 2}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const t = useTranslations("holidaysPage");
  const locale = useLocale();
  const isDark = useDarkMode();
  const router = useRouter();
  const thisYear = new Date().getFullYear();
  const yearOptions = [thisYear, thisYear + 1, thisYear + 2];
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(new Date().getMonth());
  const [members, setMembers] = useState<CalendarMember[]>([]);
  const [familyRaw, setFamilyRaw] = useState<{ id: string; display_name: string; color: string; birthday: string | null }[]>([]);
  const [holidayCache, setHolidayCache] = useState<Record<string, PublicHoliday[]>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"calendar" | "windows" | "list">("calendar");
  const [viewMode, setViewMode] = useState<"individual" | "family">("family");
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Booked holidays + away periods
  const [bookedHolidays, setBookedHolidays] = useState<BookedPeriod[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingTitle, setBookingTitle] = useState("Holiday");

  // Edit existing booking
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", start: "", end: "", category: "holiday" as BookingCategory, forMember: "you" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [bookingForMember, setBookingForMember] = useState<string>("you");
  const [bookingType, setBookingType] = useState<BookingCategory>("holiday");
  const [savingBooking, setSavingBooking] = useState(false);

  // Holiday selection: per-member opt-outs. Key format: "memberId::date"
  // Weekend holidays are always auto-skipped (they're already free days).
  const [deselectedKeys, setDeselectedKeys] = useState<Set<string>>(new Set());

  // Smart window "book as vacation" per-window state
  const [windowBooked, setWindowBooked] = useState<Set<number>>(new Set());
  const [windowBooking, setWindowBooking] = useState<Set<number>>(new Set());

  // User identity
  const [userId, setUserId] = useState<string | null>(null);
  const [userBirthday, setUserBirthday] = useState<string | null>(null);
  const [vacationDaysTotal, setVacationDaysTotal] = useState<number>(22);

  // Keep a ref to latest members so realtime callbacks can map raw rows
  const membersRef = useRef<CalendarMember[]>([]);
  useEffect(() => { membersRef.current = members; }, [members]);

  // Ref to linked family members so the Realtime refresh can re-fetch their data
  const linkedFmsRef = useRef<{ id: string; linked_user_id: string }[]>([]);

  async function loadBookings(uid: string) {
    const supabase = createClient();
    const [{ data: holidays }, { data: away }, { data: events }] = await Promise.all([
      supabase.from("booked_holidays").select("*").eq("owner_user_id", uid).order("start_date"),
      supabase.from("away_periods").select("*").eq("owner_user_id", uid).order("start_date"),
      supabase.from("calendar_events").select("*").eq("owner_user_id", uid).order("start_date"),
    ]);
    return { holidays: holidays ?? [], away: away ?? [], events: events ?? [] };
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: prefs }, { data: family }] = await Promise.all([
        supabase.from("user_preferences")
          .select("home_country,home_city,home_region,home_city_name,preferred_countries,on_parental_leave,parental_leave_end_date,birthday,vacation_days_per_year,birthday_is_vacation_day")
          .eq("user_id", user.id).single(),
        supabase.from("family_members").select("*").eq("owner_user_id", user.id).order("created_at"),
      ]);

      setUserBirthday(prefs?.birthday ?? null);
      const baseDays = prefs?.vacation_days_per_year ?? 22;
      setVacationDaysTotal(baseDays + (prefs?.birthday_is_vacation_day ? 1 : 0));
      setFamilyRaw((family ?? []).map((fm: { id: string; display_name: string; color: string; birthday: string | null }) => ({
        id: fm.id, display_name: fm.display_name, color: fm.color, birthday: fm.birthday,
      })));

      const youColor = COLOR_MAP["indigo"];
      const blocked = new Set<string>();
      if (prefs?.on_parental_leave && prefs?.parental_leave_end_date) {
        let d = new Date();
        const end = parseDate(prefs.parental_leave_end_date);
        while (d <= end) { blocked.add(toISO(d)); d = addDays(d, 1); }
      }

      const built: CalendarMember[] = [{
        id: "you", name: "You", country: prefs?.home_country || "PT", city: prefs?.home_city || "LIS",
        region: prefs?.home_region ?? null, cityName: prefs?.home_city_name ?? null,
        dot: youColor.dot, bg: youColor.bg, isYou: true, blockedDates: blocked, holidayDates: new Map(),
      }];

      for (const fm of (family ?? [])) {
        const c = COLOR_MAP[fm.color] ?? COLOR_MAP["rose"];
        built.push({
          id: fm.id, name: fm.display_name, country: fm.home_country || "PT", city: fm.home_city || "LIS",
          region: fm.home_region ?? null, cityName: fm.home_city_name ?? null,
          dot: c.dot, bg: c.bg, isYou: false, blockedDates: new Set(), holidayDates: new Map(),
        });
      }

      for (const code of (prefs?.preferred_countries ?? [])) {
        if (built.some(m => m.country === code)) continue;
        const colors = Object.values(COLOR_MAP);
        const c = colors[built.length % colors.length];
        built.push({
          id: `country-${code}`, name: COUNTRIES.find(x => x.code === code)?.name ?? code, country: code, city: "",
          region: null, cityName: null,
          dot: c.dot, bg: c.bg, isYou: false, blockedDates: new Set(), holidayDates: new Map(),
        });
      }

      setMembers(built);

      // Load bookings + away periods + events and resolve colours
      const { holidays: rawBookings, away: rawAway, events: rawEvents } = await loadBookings(user.id);

      // Pull in personal bookings from linked family members (real users whose
      // account is connected via linked_user_id). The RLS policy now allows
      // reading their rows; remap family_member_id so mapPeriod places them
      // under the correct family member card in the sidebar.
      const linkedFms = (family ?? []).filter(
        (fm: { linked_user_id: string | null }) => fm.linked_user_id
      ) as { id: string; linked_user_id: string }[];
      linkedFmsRef.current = linkedFms;

      if (linkedFms.length > 0) {
        await Promise.all(linkedFms.map(async fm => {
          const [{ data: lHols }, { data: lAway }, { data: lEvts }] = await Promise.all([
            supabase.from("booked_holidays").select("*").eq("owner_user_id", fm.linked_user_id).is("family_member_id", null).order("start_date"),
            supabase.from("away_periods").select("*").eq("owner_user_id", fm.linked_user_id).is("family_member_id", null).order("start_date"),
            supabase.from("calendar_events").select("*").eq("owner_user_id", fm.linked_user_id).is("family_member_id", null).order("start_date"),
          ]);
          for (const b of (lHols ?? [])) rawBookings.push({ ...b, family_member_id: fm.id });
          for (const b of (lAway ?? [])) rawAway.push({ ...b, family_member_id: fm.id });
          for (const b of (lEvts ?? [])) rawEvents.push({ ...b, family_member_id: fm.id });
        }));
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapPeriod = (b: any, category: BookingCategory): BookedPeriod => {
        const mid = b.family_member_id ?? "you";
        const member = built.find(m => m.id === mid) ?? built[0];
        const meta = BOOKING_META[category];
        const dot = category === "holiday" ? (member.dot ?? meta.dotColor) : meta.dotColor;
        const bg  = category === "holiday" ? (member.bg  ?? meta.bgColor)  : meta.bgColor;
        return { id: b.id, memberId: mid, memberName: member.name, dot, bg, title: b.title, start: b.start_date, end: b.end_date, category };
      };
      setBookedHolidays([
        ...rawBookings.map((b: { id: string; family_member_id: string | null; title: string; start_date: string; end_date: string }) => mapPeriod(b, "holiday")),
        ...rawAway.map((b: { id: string; family_member_id: string | null; title: string; start_date: string; end_date: string; reason: string }) => mapPeriod(b, (b.reason as BookingCategory) ?? "away-other")),
        ...rawEvents.map((b: { id: string; family_member_id: string | null; title: string; start_date: string; end_date: string; event_kind: string }) => mapPeriod(b, (b.event_kind as BookingCategory) ?? "event-other")),
      ]);
    }
    init();
  }, []);

  // ── Supabase Realtime: refresh bookings when any member updates their calendar ──
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    async function refreshBookings() {
      const { holidays: rawBookings, away: rawAway, events: rawEvents } = await loadBookings(userId!);

      // Re-fetch linked family members' personal bookings
      const currentLinkedFms = linkedFmsRef.current;
      if (currentLinkedFms.length > 0) {
        await Promise.all(currentLinkedFms.map(async fm => {
          const [{ data: lHols }, { data: lAway }, { data: lEvts }] = await Promise.all([
            supabase.from("booked_holidays").select("*").eq("owner_user_id", fm.linked_user_id).is("family_member_id", null).order("start_date"),
            supabase.from("away_periods").select("*").eq("owner_user_id", fm.linked_user_id).is("family_member_id", null).order("start_date"),
            supabase.from("calendar_events").select("*").eq("owner_user_id", fm.linked_user_id).is("family_member_id", null).order("start_date"),
          ]);
          for (const b of (lHols ?? [])) rawBookings.push({ ...b, family_member_id: fm.id });
          for (const b of (lAway ?? [])) rawAway.push({ ...b, family_member_id: fm.id });
          for (const b of (lEvts ?? [])) rawEvents.push({ ...b, family_member_id: fm.id });
        }));
      }

      const currentMembers = membersRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapPeriodFn = (b: any, category: BookingCategory): BookedPeriod => {
        const mid = b.family_member_id ?? "you";
        const member = currentMembers.find(m => m.id === mid) ?? currentMembers[0];
        const meta = BOOKING_META[category];
        const dot = category === "holiday" ? (member?.dot ?? meta.dotColor) : meta.dotColor;
        const bg  = category === "holiday" ? (member?.bg  ?? meta.bgColor)  : meta.bgColor;
        return { id: b.id, memberId: mid, memberName: member?.name ?? "You", dot, bg, title: b.title, start: b.start_date, end: b.end_date, category };
      };
      setBookedHolidays([
        ...rawBookings.map((b: { id: string; family_member_id: string | null; title: string; start_date: string; end_date: string }) => mapPeriodFn(b, "holiday")),
        ...rawAway.map((b: { id: string; family_member_id: string | null; title: string; start_date: string; end_date: string; reason: string }) => mapPeriodFn(b, (b.reason as BookingCategory) ?? "away-other")),
        ...rawEvents.map((b: { id: string; family_member_id: string | null; title: string; start_date: string; end_date: string; event_kind: string }) => mapPeriodFn(b, (b.event_kind as BookingCategory) ?? "event-other")),
      ]);
    }

    const channel = supabase
      .channel(`holidays-rt-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "booked_holidays",  filter: `owner_user_id=eq.${userId}` }, refreshBookings)
      .on("postgres_changes", { event: "*", schema: "public", table: "away_periods",     filter: `owner_user_id=eq.${userId}` }, refreshBookings)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events",  filter: `owner_user_id=eq.${userId}` }, refreshBookings)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load/save per-member deselected keys per year (localStorage)
  useEffect(() => {
    const stored = localStorage.getItem(`holiday-deselected-${year}`);
    setDeselectedKeys(stored ? new Set(JSON.parse(stored)) : new Set());
    setWindowBooked(new Set()); // reset booked state when year changes
  }, [year]);

  // Fetch public holidays for countries
  useEffect(() => {
    const needed = new Set(members.map(m => `${m.country}-${year}`));
    for (const key of needed) {
      if (holidayCache[key] !== undefined || loadingKeys.has(key)) continue;
      const country = key.split("-")[0];
      // Skip if country code is missing or not a valid 2-letter ISO code
      if (!country || country.length !== 2) continue;
      setLoadingKeys(prev => new Set(prev).add(key));
      fetch(`/api/holidays/${country}/${year}`)
        .then(r => r.ok ? r.json() : []).catch(() => [])
        .then((data: PublicHoliday[]) => {
          // Merge in municipal holidays for members in this country/year
          const municipal = members
            .filter(m => m.country === country)
            .flatMap(m => getMunicipalHolidays(m.cityName, country, year, m.region) as PublicHoliday[]);
          // Deduplicate by date (municipal takes precedence for same date)
          const municipalDates = new Set(municipal.map(h => h.date));
          const merged = [...data.filter(h => !municipalDates.has(h.date)), ...municipal];
          setHolidayCache(prev => ({ ...prev, [key]: merged }));
          setLoadingKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
        });
    }
  }, [members, year]);

  const membersWithHolidays = members.map(m => {
    const holidays = holidayCache[`${m.country}-${year}`] ?? [];
    const holidayDates = new Map<string, string>();
    for (const h of holidays) {
      // Filter regional holidays: include only national holidays (counties === null)
      // or holidays that match the member's specific region if set.
      if (m.region) {
        const isRelevant = h.global || !h.counties || h.counties.includes(m.region);
        if (!isRelevant) continue;
      } else {
        // No region set — exclude region-specific holidays entirely
        if (h.counties !== null) continue;
      }
      holidayDates.set(h.date, h.name);
    }
    return { ...m, holidayDates };
  });

  // Toggle a specific member's holiday on/off
  function toggleMemberHoliday(memberId: string, date: string) {
    const key = `${memberId}::${date}`;
    setDeselectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(`holiday-deselected-${year}`, JSON.stringify([...next]));
      return next;
    });
  }

  // All raw holiday dates from cache (before regional filtering) — used for icon detection
  const rawHolidayDates = new Set<string>(
    members.flatMap(m => (holidayCache[`${m.country}-${year}`] ?? []).map(h => h.date))
  );

  // Members used for Smart Windows: weekends excluded (already free), per-member opt-outs respected
  const membersForWindows = membersWithHolidays.map(m => ({
    ...m,
    holidayDates: new Map(
      [...m.holidayDates].filter(([date]) =>
        !isWeekend(parseDate(date)) &&
        !deselectedKeys.has(`${m.id}::${date}`)
      )
    ),
  }));

  // Vacation days used by selected public holidays (non-weekend, not already booked)
  const selectedHolidaysInYear = (() => {
    const youHolidays = membersForWindows.find(m => m.isYou);
    if (!youHolidays) return 0;
    return [...youHolidays.holidayDates.keys()]
      .filter(d => d.startsWith(String(year)) && !isWeekend(parseDate(d))).length;
  })();

  // Book a smart window as vacation
  async function bookWindowAsVacation(idx: number, start: string, end: string) {
    if (!userId || windowBooking.has(idx)) return;
    setWindowBooking(prev => new Set(prev).add(idx));
    const supabase = createClient();
    const { data } = await supabase.from("booked_holidays")
      .insert({ owner_user_id: userId, family_member_id: null, title: "Holiday", start_date: start, end_date: end })
      .select("id").single();
    const me = membersWithHolidays.find(m => m.isYou) ?? membersWithHolidays[0];
    setBookedHolidays(prev => [...prev, {
      id: data?.id ?? crypto.randomUUID(), memberId: "you", memberName: "You",
      dot: me?.dot ?? COLOR_MAP.indigo.dot, bg: me?.bg ?? COLOR_MAP.indigo.bg,
      title: "Holiday", start, end, category: "holiday" as BookingCategory,
    }]);
    setWindowBooking(prev => { const n = new Set(prev); n.delete(idx); return n; });
    setWindowBooked(prev => new Set(prev).add(idx));
  }

  // Remove a single-day booking (reverse of bookSingleDay)
  async function unbookSingleDay(date: string, title: string) {
    const booking = bookedHolidays.find(
      b => b.start === date && b.end === date && b.memberId === "you" && b.title === title
    );
    if (!booking) return;
    const supabase = createClient();
    await supabase.from("booked_holidays").delete().eq("id", booking.id);
    setBookedHolidays(prev => prev.filter(b => b.id !== booking.id));
  }

  // Book a single holiday day for the logged-in user (used for country-only holidays)
  async function bookSingleDay(date: string, title: string) {
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase.from("booked_holidays")
      .insert({ owner_user_id: userId, family_member_id: null, title, start_date: date, end_date: date })
      .select("id").single();
    const me = membersWithHolidays.find(m => m.isYou) ?? membersWithHolidays[0];
    setBookedHolidays(prev => [...prev, {
      id: data?.id ?? crypto.randomUUID(), memberId: "you", memberName: "You",
      dot: me?.dot ?? COLOR_MAP.indigo.dot, bg: me?.bg ?? COLOR_MAP.indigo.bg,
      title, start: date, end: date, category: "holiday" as BookingCategory,
    }]);
  }

  // Build birthdays for current year
  const birthdays: BirthdayEntry[] = [];
  if (userBirthday) {
    birthdays.push({ iso: birthdayThisYear(userBirthday, year), name: "You", memberId: "you", dot: COLOR_MAP.indigo.dot, bg: COLOR_MAP.indigo.bg });
  }
  for (const fm of familyRaw) {
    if (!fm.birthday) continue;
    const c = COLOR_MAP[fm.color] ?? COLOR_MAP.rose;
    birthdays.push({ iso: birthdayThisYear(fm.birthday, year), name: fm.display_name, memberId: fm.id, dot: c.dot, bg: c.bg });
  }

  // Calendar interaction
  function handleDayClick(iso: string) {
    if (!selStart) { setSelStart(iso); setSelEnd(null); setShowBookingForm(false); }
    else if (!selEnd) {
      if (iso === selStart) { setSelEnd(iso); return; } // single-day selection
      const [s, e] = iso > selStart ? [selStart, iso] : [iso, selStart];
      setSelStart(s); setSelEnd(e); setShowBookingForm(false);
    } else {
      setSelStart(iso); setSelEnd(null); setShowBookingForm(false);
    }
  }

  function clearSelection() { setSelStart(null); setSelEnd(null); setShowBookingForm(false); }

  function planTrip() {
    if (!selStart || !selEnd) return;
    const days = Math.round((parseDate(selEnd).getTime() - parseDate(selStart).getTime()) / 86400000) + 1;
    router.push(`/trips/new?from=${selStart}&to=${selEnd}&days=${days}`);
  }

  async function saveBooking() {
    if (!selStart || !selEnd || !userId) return;
    setSavingBooking(true);
    const supabase = createClient();
    const meta = BOOKING_META[bookingType];
    const title = bookingTitle || meta.label;
    const familyMemberId = bookingForMember === "you" ? null : bookingForMember;
    const member = membersWithHolidays.find(m => m.id === bookingForMember) ?? membersWithHolidays[0];
    let newId = crypto.randomUUID();

    if (meta.group === "holiday") {
      const { data } = await supabase.from("booked_holidays").insert({ owner_user_id: userId, family_member_id: familyMemberId, title, start_date: selStart, end_date: selEnd }).select("id").single();
      newId = data?.id ?? newId;
    } else if (meta.group === "away") {
      const { data } = await supabase.from("away_periods").insert({ owner_user_id: userId, family_member_id: familyMemberId, title, start_date: selStart, end_date: selEnd, reason: bookingType }).select("id").single();
      newId = data?.id ?? newId;
    } else {
      const { data } = await supabase.from("calendar_events").insert({ owner_user_id: userId, family_member_id: familyMemberId, title, start_date: selStart, end_date: selEnd, event_kind: bookingType }).select("id").single();
      newId = data?.id ?? newId;
    }

    const dot = bookingType === "holiday" ? (member?.dot ?? meta.dotColor) : meta.dotColor;
    const bg  = bookingType === "holiday" ? (member?.bg  ?? meta.bgColor)  : meta.bgColor;
    setBookedHolidays(prev => [...prev, { id: newId, memberId: bookingForMember, memberName: member?.name ?? "You", dot, bg, title, start: selStart, end: selEnd, category: bookingType }]);

    setSavingBooking(false);
    setShowBookingForm(false);
    setBookingTitle("");
    setBookingType("holiday");
    clearSelection();
  }

  async function deleteBooking(id: string) {
    const supabase = createClient();
    const period = bookedHolidays.find(b => b.id === id);
    const group = period ? BOOKING_META[period.category].group : "holiday";
    const table = group === "away" ? "away_periods" : group === "event" ? "calendar_events" : "booked_holidays";
    await supabase.from(table).delete().eq("id", id);
    setBookedHolidays(prev => prev.filter(b => b.id !== id));
  }

  function startEdit(b: BookedPeriod) {
    setEditingId(b.id);
    setEditForm({ title: b.title, start: b.start, end: b.end, category: b.category, forMember: b.memberId });
  }

  async function updateBooking() {
    if (!editingId || !userId) return;
    setSavingEdit(true);
    const supabase = createClient();
    const oldPeriod = bookedHolidays.find(b => b.id === editingId)!;
    const oldGroup = BOOKING_META[oldPeriod.category].group;
    const newMeta = BOOKING_META[editForm.category];
    const familyMemberId = editForm.forMember === "you" ? null : editForm.forMember;

    // If category group changed, delete from old table and insert to new
    if (oldGroup !== newMeta.group) {
      const oldTable = oldGroup === "away" ? "away_periods" : oldGroup === "event" ? "calendar_events" : "booked_holidays";
      await supabase.from(oldTable).delete().eq("id", editingId);
      if (newMeta.group === "holiday") {
        await supabase.from("booked_holidays").insert({ id: editingId, owner_user_id: userId, family_member_id: familyMemberId, title: editForm.title, start_date: editForm.start, end_date: editForm.end });
      } else if (newMeta.group === "away") {
        await supabase.from("away_periods").insert({ id: editingId, owner_user_id: userId, family_member_id: familyMemberId, title: editForm.title, start_date: editForm.start, end_date: editForm.end, reason: editForm.category });
      } else {
        await supabase.from("calendar_events").insert({ id: editingId, owner_user_id: userId, family_member_id: familyMemberId, title: editForm.title, start_date: editForm.start, end_date: editForm.end, event_kind: editForm.category });
      }
    } else {
      const table = newMeta.group === "away" ? "away_periods" : newMeta.group === "event" ? "calendar_events" : "booked_holidays";
      const extra = newMeta.group === "away" ? { reason: editForm.category } : newMeta.group === "event" ? { event_kind: editForm.category } : {};
      await supabase.from(table).update({ title: editForm.title, start_date: editForm.start, end_date: editForm.end, family_member_id: familyMemberId, ...extra }).eq("id", editingId);
    }

    const member = membersWithHolidays.find(m => m.id === editForm.forMember) ?? membersWithHolidays[0];
    const dot = editForm.category === "holiday" ? (member?.dot ?? newMeta.dotColor) : newMeta.dotColor;
    const bg  = editForm.category === "holiday" ? (member?.bg  ?? newMeta.bgColor)  : newMeta.bgColor;
    setBookedHolidays(prev => prev.map(b => b.id === editingId ? {
      ...b, title: editForm.title, start: editForm.start, end: editForm.end,
      memberId: editForm.forMember, memberName: member?.name ?? b.memberName,
      dot, bg, category: editForm.category,
    } : b));

    setSavingEdit(false);
    setEditingId(null);
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const monthName = new Date(year, month, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const today = toISO(new Date());
  const bridges = computeBridgeWindows(membersForWindows, year).filter(w => w.end >= today);
  const isLoading = loadingKeys.size > 0;

  function effColor(e: number, dark: boolean) {
    if (e >= 3) return dark
      ? { bg: "rgba(34,197,94,0.15)", border: "rgba(134,239,172,0.4)", text: "#86efac" }
      : { bg: "#f0fdf4", border: "#86efac", text: "#16a34a" };
    if (e >= 2) return dark
      ? { bg: "rgba(245,158,11,0.15)", border: "rgba(252,211,77,0.4)", text: "#fcd34d" }
      : { bg: "#fffbeb", border: "#fcd34d", text: "#d97706" };
    return dark
      ? { bg: "rgba(71,85,105,0.2)", border: "rgba(148,163,184,0.3)", text: "#94a3b8" }
      : { bg: "#f8fafc", border: "#cbd5e1", text: "#64748b" };
  }

  const selDays = selStart && selEnd
    ? Math.round((parseDate(selEnd).getTime() - parseDate(selStart).getTime()) / 86400000) + 1
    : 0;

  // Upcoming bookings — in individual view only show the user's own bookings
  const todayISO = toISO(new Date());
  const upcomingBookings = bookedHolidays
    .filter(b => b.end >= todayISO && (viewMode === "family" || b.memberId === "you"))
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm mt-1">Register booked holidays, see everyone's availability, and plan new trips.</p>
        </div>
        <Link href="/family" className="btn-ghost text-sm">👨‍👩‍👧 Manage family</Link>
      </div>

      {/* Member legend + quick add */}
      {membersWithHolidays.length > 0 && (
        <div className="card p-4 space-y-2">
          {/* Real people */}
          {membersWithHolidays.filter(m => !m.id.startsWith("country-")).length > 0 && (
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Members</span>
              {membersWithHolidays.filter(m => !m.id.startsWith("country-")).map(m => {
                const airportCity = m.city ? getAirports(m.country).find(a => a.iata === m.city)?.city : null;
                const displayCity = m.cityName ?? airportCity ?? m.city ?? null;
                return (
                  <div key={m.id} className="flex items-center gap-1.5 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: m.dot }} />
                    <span className="font-medium text-slate-700">{m.name}</span>
                    <span className="text-slate-400 text-xs">
                      {displayCity ? `${displayCity}, ` : ""}{COUNTRIES.find(c => c.code === m.country)?.name ?? m.country}
                    </span>
                  </div>
                );
              })}
              {isLoading && <span className="text-xs text-slate-400">Loading...</span>}
            </div>
          )}

          {/* Country-only holiday calendars + add dropdown */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Holiday calendars</span>
            {/* Home countries of real members — auto-included, non-removable */}
            {membersWithHolidays.filter(m => !m.id.startsWith("country-")).map(m => {
              const countryName = COUNTRIES.find(c => c.code === m.country)?.name ?? m.country;
              return (
                <div key={`home-${m.id}`}
                  className="flex items-center gap-1 text-xs rounded-lg px-2 py-1 border border-indigo-100 bg-indigo-50">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.dot }} />
                  <span className="text-indigo-700 font-medium">{countryName}</span>
                  <span className="text-indigo-400">({m.name})</span>
                </div>
              );
            })}
            {membersWithHolidays.filter(m => m.id.startsWith("country-")).map(m => (
              <div key={m.id} className="flex items-center gap-1 text-xs rounded-lg px-2 py-1 border border-slate-200 bg-slate-50">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.dot }} />
                <span className="text-slate-600 font-medium">{m.name}</span>
                <button
                  onClick={() => setMembers(prev => prev.filter(x => x.id !== m.id))}
                  className="ml-1 text-slate-400 hover:text-red-500 transition font-bold"
                  title="Remove">×</button>
              </div>
            ))}
            <div className="ml-auto">
              <select
                className="input text-xs py-1"
                style={{ maxWidth: 220 }}
                value=""
                onChange={e => {
                  const code = e.target.value;
                  if (!code) return;
                  if (membersWithHolidays.some(m => m.country === code)) return;
                  const c = Object.values(COLOR_MAP)[membersWithHolidays.length % 8];
                  const countryName = COUNTRIES.find(x => x.code === code)?.name ?? code;
                  setMembers(prev => [...prev, {
                    id: `country-${code}`, name: countryName, country: code, city: "",
                    region: null, cityName: null,
                    dot: c.dot, bg: c.bg, isYou: false, blockedDates: new Set(), holidayDates: new Map(),
                  }]);
                }}
              >
                <option value="">+ Add country holiday calendar…</option>
                {COUNTRIES
                  .filter(c => !membersWithHolidays.some(m => m.country === c.code))
                  .map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          ["calendar", t("tabCalendar")],
          ["windows", t("tabSmartWindows")],
          ["list", t("tabAllHolidays")],
        ] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${activeTab === tab ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── Calendar Tab ─── */}
      {activeTab === "calendar" && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left: calendar + controls ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="btn-ghost px-2 py-1 text-sm">‹</button>
              <span className="font-bold text-slate-800 w-40 text-center">{monthName}</span>
              <button onClick={nextMonth} className="btn-ghost px-2 py-1 text-sm">›</button>
            </div>
            <select
              className="input text-sm py-1"
              value={year}
              onChange={e => { setYear(parseInt(e.target.value)); setMonth(0); }}
              style={{ maxWidth: 100 }}
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              <button onClick={() => setViewMode("individual")} className={`px-4 py-1.5 font-medium transition ${viewMode === "individual" ? "bg-indigo-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{t("individual")}</button>
              <button onClick={() => setViewMode("family")} className={`px-4 py-1.5 font-medium transition ${viewMode === "family" ? "bg-indigo-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{t("family")}</button>
            </div>
            <span className="text-xs text-slate-400 ml-auto">Select a date range to book or plan a trip</span>
          </div>

          {/* Grid */}
          <div className="card p-5">
            <CalendarGrid
              year={year} month={month}
              members={membersWithHolidays} viewMode={viewMode}
              selStart={selStart} selEnd={selEnd}
              onDayClick={handleDayClick} onHoverDay={setHoveredDay} hoveredDay={hoveredDay}
              bookedPeriods={bookedHolidays}
              birthdays={birthdays}
              deselectedKeys={deselectedKeys}
              rawHolidayDates={rawHolidayDates}
            />
          </div>

          {/* Selection CTA */}
          {selStart && (
            <div className="card p-4 space-y-3" style={{ background: isDark ? "rgba(99,102,241,0.18)" : "#eef2ff", borderColor: "#a5b4fc" }}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1">
                  {!selEnd ? (
                    <p className="text-sm font-semibold text-indigo-800">
                      Start: <span className="text-indigo-600">{fmtLong(selStart, locale)}</span> — now click an end date
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-indigo-800">
                      <span className="text-indigo-600">{fmtLong(selStart, locale)}</span> → <span className="text-indigo-600">{fmtLong(selEnd, locale)}</span>
                      <span className="ml-2 text-indigo-400 font-normal">({selDays} days)</span>
                    </p>
                  )}
                </div>
                {selEnd && (
                  <>
                    <button onClick={planTrip} className="btn-primary text-sm px-4">{t("planTrip")}</button>
                    <button onClick={() => setShowBookingForm(f => !f)}
                      className="text-sm px-4 py-2 rounded-lg border-2 border-indigo-300 text-indigo-700 font-semibold hover:bg-indigo-100 transition">
                      {showBookingForm ? "Cancel" : t("markBooked")}
                    </button>
                  </>
                )}
                <button onClick={clearSelection} className="text-indigo-400 hover:text-indigo-600 text-sm">Clear</button>
              </div>

              {/* Booking form */}
              {showBookingForm && selEnd && (
                <div className="rounded-xl p-4 space-y-3 border border-indigo-100" style={{ background: isDark ? "#1e293b" : "#ffffff" }}>
                  <p className="text-sm font-semibold text-slate-700">{t("registerPeriod")}</p>
                  {/* Category groups */}
                  {(["holiday", "away", "event"] as const).map(group => {
                    const cats = (Object.entries(BOOKING_META) as [BookingCategory, typeof BOOKING_META[BookingCategory]][]).filter(([, m]) => m.group === group);
                    const groupLabel = group === "holiday" ? "🏖️ Holidays" : group === "away" ? "✈️ Away" : "🎟️ Events";
                    return (
                      <div key={group}>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{groupLabel}</p>
                        <div className="flex gap-2 flex-wrap">
                          {cats.map(([cat, meta]) => (
                            <button key={cat} type="button"
                              onClick={() => { setBookingType(cat); setBookingTitle(meta.label); }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition ${bookingType === cat ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                              {meta.emoji} {meta.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Title</label>
                      <input className="input" value={bookingTitle} onChange={e => setBookingTitle(e.target.value)} placeholder={BOOKING_META[bookingType].label} />
                    </div>
                    <div>
                      <label className="label">For</label>
                      <select className="input" value={bookingForMember} onChange={e => setBookingForMember(e.target.value)}>
                        <option value="you">Me</option>
                        {familyRaw.map(fm => <option key={fm.id} value={fm.id}>{fm.display_name}</option>)}
                      </select>
                    </div>
                  </div>
                  {BOOKING_META[bookingType].group === "away" && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                      ✈️ Away periods are shown on the calendar and excluded from trip windows — but don&apos;t count as vacation days.
                    </p>
                  )}
                  {BOOKING_META[bookingType].group === "event" && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                      🎟️ Events appear on the calendar as a reminder — they don&apos;t block trip windows.
                    </p>
                  )}
                  <button onClick={saveBooking} className="btn-primary text-sm px-5" disabled={savingBooking}>
                    {savingBooking ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Upcoming bookings list */}
          {upcomingBookings.length > 0 && (
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("upcoming")}</p>
              {upcomingBookings.map(b => (
                <div key={b.id}>
                  {/* Row */}
                  <div className="flex items-center gap-3 py-1.5">
                    <span className="text-sm flex-shrink-0">{b.start === b.end && rawHolidayDates.has(b.start) ? "📅" : (BOOKING_META[b.category]?.emoji ?? "📅")}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-slate-700">{b.title}</span>
                      <span className="text-xs text-slate-400 ml-2">{b.start === b.end ? fmtShort(b.start, locale) : `${fmtShort(b.start, locale)} – ${fmtShort(b.end, locale)}`} · {b.memberName}</span>
                    </div>
                    <button
                      onClick={() => editingId === b.id ? setEditingId(null) : startEdit(b)}
                      className="text-xs text-indigo-500 hover:text-indigo-700 transition px-2 font-medium">
                      {editingId === b.id ? "Cancel" : "Edit"}
                    </button>
                    <button onClick={() => deleteBooking(b.id)} className="text-xs text-red-400 hover:text-red-600 transition px-2">Remove</button>
                  </div>

                  {/* Inline edit form */}
                  {editingId === b.id && (
                    <div className="ml-7 mb-2 p-4 rounded-xl border border-indigo-100 bg-indigo-50 space-y-3">
                      {/* Category */}
                      <div className="flex gap-2 flex-wrap">
                        {(Object.entries(BOOKING_META) as [BookingCategory, typeof BOOKING_META[BookingCategory]][]).map(([cat, meta]) => (
                          <button key={cat} type="button"
                            onClick={() => setEditForm(f => ({ ...f, category: cat }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition ${editForm.category === cat ? "border-indigo-500 bg-white text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}>
                            {meta.emoji} {meta.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Title</label>
                          <input className="input" value={editForm.title}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">For</label>
                          <select className="input" value={editForm.forMember}
                            onChange={e => setEditForm(f => ({ ...f, forMember: e.target.value }))}>
                            <option value="you">Me</option>
                            {familyRaw.map(fm => <option key={fm.id} value={fm.id}>{fm.display_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label">Start date</label>
                          <input type="date" className="input" value={editForm.start}
                            onChange={e => setEditForm(f => ({ ...f, start: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">End date</label>
                          <input type="date" className="input" value={editForm.end}
                            min={editForm.start}
                            onChange={e => setEditForm(f => ({ ...f, end: e.target.value }))} />
                        </div>
                      </div>
                      <button onClick={updateBooking} className="btn-primary text-sm px-5" disabled={savingEdit}>
                        {savingEdit ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Birthday alerts */}
          {birthdays.filter(b => b.iso.startsWith(String(year))).map(b => {
            const isHoliday = membersWithHolidays.find(m => m.id === b.memberId)?.holidayDates.get(b.iso);
            return (
              <div key={b.memberId} className="card p-4 flex items-center gap-3" style={{ background: isDark ? "rgba(168,85,247,0.12)" : "#fdf4ff", borderColor: isDark ? "rgba(168,85,247,0.3)" : "#e9d5ff" }}>
                <span className="text-2xl">🎂</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-800">
                    {b.name === "You" ? "Your" : `${b.name}'s`} birthday — {fmtShort(b.iso, locale)}
                  </p>
                  {isHoliday
                    ? <p className="text-xs text-purple-600">🎉 Falls on a public holiday: {isHoliday}! Lucky!</p>
                    : <p className="text-xs text-purple-400">Not a public holiday this year. Why not plan a birthday trip?</p>
                  }
                </div>
                <button onClick={() => router.push(`/trips/new?from=${b.iso}&days=7`)} className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition">
                  Plan birthday trip →
                </button>
              </div>
            );
          })}
        </div>{/* end left column */}

        {/* ── Right: per-person booking summary ── */}
        {membersWithHolidays.filter(m => !m.id.startsWith("country-")).length > 0 && (
          <div className="w-full lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{year} Bookings</p>
            {membersWithHolidays.filter(m => !m.id.startsWith("country-")).map(m => {
              const memberBookings = bookedHolidays.filter(b => b.memberId === m.id && b.start.startsWith(String(year)));
              const holidays = memberBookings.filter(b => BOOKING_META[b.category].group === "holiday");
              const events   = memberBookings.filter(b => BOOKING_META[b.category].group === "event");
              // Count only working days that aren't public holidays (actual vacation days used)
              const memberHolidaySet = new Set(m.holidayDates.keys());
              const totalHolidayDays = holidays.reduce((sum, b) =>
                sum + countVacationDays(b.start, b.end, memberHolidaySet), 0);
              // Merge public holidays + booked vacations + events into one timeline
              type SidebarItem =
                | { kind: "public";  date: string; name: string }
                | { kind: "booked";  date: string; name: string; endDate: string; days: number }
                | { kind: "event";   date: string; name: string; category: BookingCategory };

              // For "you", also include holidays from country-only calendars the user added
              const extraCountryHolidays: [string, string][] = m.isYou
                ? membersWithHolidays
                    .filter(cm => cm.id.startsWith("country-"))
                    .flatMap(cm => [...cm.holidayDates.entries()].filter(
                      ([date]) =>
                        date >= todayISO &&
                        !isWeekend(parseDate(date)) &&
                        !deselectedKeys.has(`${cm.id}::${date}`)
                    ))
                : [];

              // All public holiday dates (own country + extra country calendars) — used to detect taken public holidays
              const allPublicHolidayDates = new Set<string>([
                ...m.holidayDates.keys(),
                ...extraCountryHolidays.map(([date]) => date),
              ]);

              // Only suppress public holiday entries for single-day bookings that specifically target
              // that day (e.g. "Take this day" from the All Holidays tab). Multi-day vacations
              // should not hide the public holidays they happen to span.
              const singleDayBookedDates = new Set<string>(
                holidays.filter(b => b.start === b.end).map(b => b.start)
              );

              // Deduplicate public holidays by date (own country + extra country calendars)
              const publicHolidayMap = new Map<string, string>();
              for (const [date, name] of [
                ...[...m.holidayDates.entries()].filter(([date]) =>
                  date >= todayISO &&
                  !isWeekend(parseDate(date)) &&
                  !deselectedKeys.has(`${m.id}::${date}`)
                ),
                ...extraCountryHolidays,
              ]) {
                if (singleDayBookedDates.has(date)) continue;
                if (!publicHolidayMap.has(date)) publicHolidayMap.set(date, name);
                else if (publicHolidayMap.get(date) !== name)
                  publicHolidayMap.set(date, `${publicHolidayMap.get(date)} · ${name}`);
              }

              const sidebarItems: SidebarItem[] = [
                ...[...publicHolidayMap.entries()]
                  .map(([date, name]): SidebarItem => ({ kind: "public", date, name })),
                ...holidays
                  .filter(b => b.end >= todayISO)
                  .map((b): SidebarItem => ({
                    kind: "booked", date: b.start, name: b.title, endDate: b.end,
                    days: Math.round((parseDate(b.end).getTime() - parseDate(b.start).getTime()) / 86400000) + 1,
                  })),
                ...events
                  .filter(b => b.end >= todayISO)
                  .map((b): SidebarItem => ({ kind: "event", date: b.start, name: b.title, category: b.category })),
              ].sort((a, b) => a.date.localeCompare(b.date));

              return (
                <div key={m.id} className="card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: m.dot }} />
                      <span className="text-sm font-bold text-slate-800 truncate">{m.name}</span>
                    </div>
                    {totalHolidayDays > 0 && (
                      <span className="text-xs text-slate-400">{totalHolidayDays}d booked</span>
                    )}
                  </div>
                  {sidebarItems.length > 0 ? (
                    <div className="space-y-1">
                      {sidebarItems.map((item, i) => {
                        if (item.kind === "public") return (
                          <div key={`ph-${item.date}-${i}`} className="flex items-center justify-between text-xs rounded-lg px-2 py-1" style={{ background: isDark ? `${m.dot}18` : m.bg }}>
                            <span className="flex items-center gap-1 truncate flex-1 mr-1">
                              <span>🗓️</span>
                              <span className="font-medium" style={{ color: isDark ? "#cbd5e1" : "#374151" }}>{item.name}</span>
                            </span>
                            <span className="text-slate-400 flex-shrink-0">{fmtShort(item.date, locale)}</span>
                          </div>
                        );
                        if (item.kind === "booked") return (
                          <div key={`bk-${item.date}-${i}`} className="flex items-center justify-between text-xs rounded-lg px-2 py-1" style={{ background: isDark ? `${m.dot}26` : m.bg }}>
                            <span className="flex items-center gap-1 truncate flex-1 mr-1">
                              <span>{item.days === 1 && members.some(cm => (holidayCache[`${cm.country}-${year}`] ?? []).some(h => h.date === item.date)) ? "🗓️" : BOOKING_META["holiday"].emoji}</span>
                              <span className="font-medium text-slate-700">{item.name}</span>
                            </span>
                            <span className="text-slate-400 flex-shrink-0">
                              {fmtShort(item.date, locale)}{item.days > 1 ? `–${fmtShort(item.endDate, locale)}` : ""}
                            </span>
                          </div>
                        );
                        const meta = BOOKING_META[item.category];
                        return (
                          <div key={`ev-${item.date}-${i}`} className="flex items-center justify-between text-xs rounded-lg px-2 py-1" style={{ background: isDark ? `${meta.dotColor}26` : meta.bgColor }}>
                            <span className="flex items-center gap-1 truncate flex-1 mr-1">
                              <span>{meta.emoji}</span>
                              <span className="font-medium" style={{ color: meta.dotColor }}>{item.name}</span>
                            </span>
                            <span className="text-slate-400 flex-shrink-0">{fmtShort(item.date, locale)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{t("nothingComingUp")}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* ─── Smart Windows Tab ─── */}
      {activeTab === "windows" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select className="input text-sm py-1" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ maxWidth: 110 }}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <p className="text-xs text-slate-400">
              Bridging your selected public holidays into longer breaks.
              {deselectedKeys.size > 0 && <span className="text-amber-600 ml-1">{deselectedKeys.size} member-holiday{deselectedKeys.size > 1 ? "s" : ""} excluded — edit in All Holidays tab.</span>}
            </p>
          </div>

          {/* Vacation budget summary */}
          <div className="card p-4 flex items-center gap-6 flex-wrap" style={{ background: isDark ? "#1e293b" : "#f8fafc" }}>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{vacationDaysTotal}</div>
              <div className="text-xs text-slate-400">{t("vacationDaysPerYear")}</div>
            </div>
            <div className="text-slate-300 text-xl font-thin">|</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{selectedHolidaysInYear}</div>
              <div className="text-xs text-slate-400">{t("publicHolidays")}</div>
            </div>
            <div className="text-slate-300 text-xl font-thin">|</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{vacationDaysTotal + selectedHolidaysInYear}</div>
              <div className="text-xs text-slate-400">potential days off total</div>
            </div>
            <div className="flex-1 min-w-0 ml-2">
              <p className="text-xs text-slate-500">Pick the windows below to see how far your vacation days stretch. Adjust which holidays you take in the <button onClick={() => setActiveTab("list")} className="text-indigo-600 hover:underline font-semibold">All Holidays</button> tab.</p>
            </div>
          </div>

          {bridges.length === 0 && !isLoading && (
            <div className="card p-8 text-center text-slate-400 text-sm">
              No bridge windows found.{deselectedKeys.size > 0 ? " Try enabling more holidays in the All Holidays tab." : ""}
            </div>
          )}
          {bridges.map((w, i) => {
            const ec = effColor(w.efficiency, isDark);
            const birthdayInWindow = birthdays.find(b => b.iso >= w.start && b.iso <= w.end);
            const alreadyBooked = bookedHolidays.some(b => BOOKING_META[b.category]?.group === "holiday" && b.start === w.start && b.end === w.end);
            const booked = windowBooked.has(i) || alreadyBooked;
            const booking = windowBooking.has(i);
            return (
              <div key={i} className="card p-5 hover:shadow-md transition" style={booked ? { borderColor: "#86efac" } : {}}>
                <div className="flex items-start gap-4">
                  <div className="text-center rounded-xl px-3 py-2 flex-shrink-0" style={{ background: isDark ? "rgba(99,102,241,0.2)" : "#eef2ff" }}>
                    <div className="text-2xl font-bold" style={{ color: "#6366f1" }}>{w.totalDays}</div>
                    <div className="text-xs" style={{ color: "#a5b4fc" }}>days off</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ background: ec.bg, borderColor: ec.border, color: ec.text }}>
                        {w.efficiency}x efficiency
                      </span>
                      {birthdayInWindow && <span className="text-xs">🎂 {birthdayInWindow.name}&apos;s birthday!</span>}
                      {booked && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ Booked</span>}
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">{fmtShort(w.start, locale)} – {fmtShort(w.end, locale)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <b>{w.totalDays} days off</b> using only <span className="text-indigo-600 font-semibold">{w.vacationDaysNeeded} vacation {w.vacationDaysNeeded === 1 ? "day" : "days"}</span>
                      <span className="text-slate-400"> · {w.holidays.length} public holiday{w.holidays.length !== 1 ? "s" : ""} + weekends</span>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.holidays.map((h, j) => {
                        const m = membersForWindows.find(x => x.id === h.memberId);
                        return (
                          <span key={j} className="text-xs px-2 py-0.5 rounded-full border font-medium"
                            style={{ background: isDark ? `${m?.dot ?? "#94a3b8"}26` : (m?.bg ?? "#f8fafc"), borderColor: m?.dot ?? "#e2e8f0", color: isDark ? "#e2e8f0" : "#374151" }}>
                            {h.memberName} · {h.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/trips/new?from=${w.start}&to=${w.end}&days=${w.totalDays}`)}
                      className="btn-primary text-xs px-3 py-1.5">
                      {t("planTrip")}
                    </button>
                    <button
                      onClick={() => !booked && bookWindowAsVacation(i, w.start, w.end)}
                      disabled={booked || booking}
                      className={`text-xs px-3 py-1.5 rounded-lg border-2 font-semibold transition ${
                        booked
                          ? "border-emerald-300 bg-emerald-50 text-emerald-600 cursor-default"
                          : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                      }`}>
                      {booked ? "✓ On calendar" : booking ? "Saving…" : "Book on calendar"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── All Holidays Tab ─── */}
      {activeTab === "list" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select className="input text-sm py-1" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ maxWidth: 110 }}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <p className="text-xs text-slate-400 flex-1">
              Click a member chip to toggle whether they take that holiday. Weekend holidays are grouped at the top — they&apos;re always free.
            </p>
            {deselectedKeys.size > 0 && (
              <button
                onClick={() => { setDeselectedKeys(new Set()); localStorage.removeItem(`holiday-deselected-${year}`); }}
                className="text-xs text-indigo-600 hover:underline font-semibold">
                Reset all
              </button>
            )}
          </div>

          {/* Per-person summary */}
          {(() => {
            const realMembers = membersWithHolidays.filter(m => !m.id.startsWith("country-"));
            return (
              <div className="card p-4 space-y-2" style={{ background: isDark ? "rgba(16,185,129,0.1)" : "#f0fdf4", borderColor: isDark ? "rgba(16,185,129,0.3)" : "#86efac" }}>
                {realMembers.map(m => {
                  const forWindows = membersForWindows.find(x => x.id === m.id);
                  // Holidays from their own country, currently selected
                  const taken = forWindows
                    ? [...forWindows.holidayDates.keys()].filter(d => d.startsWith(String(year))).length
                    : 0;
                  // Total available weekday holidays for this person
                  const total = [...m.holidayDates.keys()].filter(d =>
                    d.startsWith(String(year)) && !isWeekend(parseDate(d))
                  ).length;
                  // Extra days booked from other countries (only applies to "you")
                  const extra = m.isYou
                    ? bookedHolidays.filter(b =>
                        b.memberId === "you" && BOOKING_META[b.category]?.group === "holiday" &&
                        b.start === b.end && b.start.startsWith(String(year)) &&
                        !isWeekend(parseDate(b.start)) &&
                        !m.holidayDates.has(b.start)
                      ).length
                    : 0;
                  return (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.dot }} />
                      <span className="text-sm font-semibold text-slate-700 w-20 truncate">{m.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: total > 0 ? `${Math.min(100, ((taken + extra) / total) * 100)}%` : "0%", background: m.dot }} />
                      </div>
                      <span className="text-xs text-slate-600 font-semibold w-28 text-right">
                        {taken}{extra > 0 ? <span className="text-indigo-600"> +{extra} other</span> : ""} / {total} days
                      </span>
                    </div>
                  );
                })}
                {deselectedKeys.size > 0 && (
                  <p className="text-xs text-slate-400 pt-1 border-t border-emerald-100">
                    {deselectedKeys.size} member-holiday{deselectedKeys.size > 1 ? "s" : ""} excluded from smart windows
                  </p>
                )}
              </div>
            );
          })()}

          {(() => {
            // Deduplicate: one row per (date, name), aggregate members
            const grouped = new Map<string, { date: string; name: string; members: CalendarMember[] }>();
            for (const m of membersWithHolidays) {
              for (const [date, name] of m.holidayDates) {
                const key = `${date}::${name}`;
                if (!grouped.has(key)) grouped.set(key, { date, name, members: [] });
                grouped.get(key)!.members.push(m);
              }
            }
            const all = Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));

            // Weekends always go to the auto-skipped top section
            const weekendRows = all.filter(h => isWeekend(parseDate(h.date)));
            // Weekday holidays with ALL members deselected → also skipped
            const manuallySkipped = all.filter(h => {
              if (isWeekend(parseDate(h.date))) return false;
              return h.members.every(m => deselectedKeys.has(`${m.id}::${h.date}`));
            });
            const skippedSection = [...weekendRows, ...manuallySkipped].sort((a, b) => a.date.localeCompare(b.date));
            // Active = weekday holidays with at least one member still taking it
            const activeRows = all.filter(h => {
              if (isWeekend(parseDate(h.date))) return false;
              return h.members.some(m => !deselectedKeys.has(`${m.id}::${h.date}`));
            });

            function HolidayRow({ h, autoSkipped }: { h: { date: string; name: string; members: CalendarMember[] }; autoSkipped?: boolean }) {
              const d = parseDate(h.date);
              const past = h.date < todayISO;
              const birthday = birthdays.find(b => b.iso === h.date);
              const weekend = isWeekend(d);

              // Split members: real people vs country-only reference calendars
              const realMembers = h.members.filter(m => !m.id.startsWith("country-"));
              const countryMembers = h.members.filter(m => m.id.startsWith("country-"));

              return (
                <div className={`flex items-start gap-4 px-5 py-3 ${past ? "opacity-40" : ""}`}>
                  {/* Date */}
                  <div className="w-14 text-center flex-shrink-0 pt-0.5">
                    <div className="text-xs text-slate-400">{d.toLocaleDateString(locale, { weekday: "short" })}</div>
                    <div className={`font-bold text-sm ${autoSkipped ? "text-slate-400" : "text-slate-700"}`}>
                      {d.toLocaleDateString(locale, { day: "numeric", month: "short" })}
                    </div>
                  </div>

                  {/* Name + chips */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold mb-1.5 ${autoSkipped ? "text-slate-400" : "text-slate-800"}`}>
                      🗓️ {h.name}
                      {birthday && <span className="ml-2 text-purple-500 font-normal text-xs">🎂 {birthday.name}&apos;s birthday!</span>}
                    </p>
                    <div className="flex flex-wrap gap-1.5 items-center">

                      {/* Real member chips — clickable toggles */}
                      {realMembers.map((m) => {
                        const memberTaking = !deselectedKeys.has(`${m.id}::${h.date}`);
                        const canToggle = !past && !weekend;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={!canToggle}
                            onClick={() => canToggle && toggleMemberHoliday(m.id, h.date)}
                            title={canToggle ? (memberTaking ? `${m.name} is taking this — click to skip` : `${m.name} is skipping this — click to take`) : undefined}
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition ${canToggle ? "cursor-pointer hover:opacity-75" : "cursor-default"} ${!memberTaking ? "opacity-40" : ""}`}
                            style={{
                              background: memberTaking ? (isDark ? `${m.dot}26` : m.bg) : (isDark ? "#334155" : "#f1f5f9"),
                              borderColor: memberTaking ? m.dot : (isDark ? "#475569" : "#cbd5e1"),
                              color: memberTaking ? (isDark ? "#e2e8f0" : "#374151") : "#94a3b8",
                              textDecoration: memberTaking ? "none" : "line-through",
                            }}>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: memberTaking ? m.dot : "#94a3b8" }} />
                            {m.name}
                            {canToggle && <span className="ml-0.5 opacity-50">{memberTaking ? "✓" : "×"}</span>}
                          </button>
                        );
                      })}

                      {/* Country-only badges — informational, with Take / Ignore actions */}
                      {countryMembers.map((m) => {
                        const youMember = membersWithHolidays.find(mu => mu.isYou);
                        const alreadyBooked = bookedHolidays.some(
                          b => b.start === h.date && b.end === h.date && b.memberId === "you" && b.title === h.name
                        );
                        const isIgnored = deselectedKeys.has(`${m.id}::${h.date}`);
                        return (
                          <span key={m.id} className="flex items-center gap-1.5 flex-wrap">
                            {/* Country reference badge */}
                            <span
                              className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border"
                              style={{ background: isDark ? "#1e293b" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: "#64748b", borderStyle: "dashed" }}>
                              🌍 {m.name}
                            </span>

                            {alreadyBooked && youMember ? (
                              /* Booked → "You ✓" chip, click to unbook */
                              <button
                                type="button"
                                onClick={() => unbookSingleDay(h.date, h.name)}
                                title="Click to remove this day"
                                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition hover:opacity-60"
                                style={{ background: isDark ? `${youMember.dot}26` : youMember.bg, borderColor: youMember.dot, color: isDark ? "#e2e8f0" : "#374151" }}>
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: youMember.dot }} />
                                You ✓
                                <span className="opacity-40">×</span>
                              </button>
                            ) : isIgnored ? (
                              /* Ignored (showing in skipped section) → undo link */
                              <button
                                type="button"
                                onClick={() => toggleMemberHoliday(m.id, h.date)}
                                className="text-xs px-2 py-0.5 rounded-full border font-semibold transition border-slate-200 bg-slate-50 text-slate-500 hover:bg-white hover:text-indigo-600 hover:border-indigo-200">
                                Ignored · undo
                              </button>
                            ) : !past && !weekend ? (
                              /* Normal state → Take this day + Ignore */
                              <>
                                <button
                                  type="button"
                                  onClick={() => bookSingleDay(h.date, h.name)}
                                  className="text-xs px-2 py-0.5 rounded-full border font-semibold transition border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
                                  + Take this day
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleMemberHoliday(m.id, h.date)}
                                  className="text-xs px-2 py-0.5 rounded-full border font-semibold transition border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                                  Ignore
                                </button>
                              </>
                            ) : null}
                          </span>
                        );
                      })}

                      {weekend && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">{t("alwaysFree")}</span>}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <>
                {/* Active weekday holidays — at the top */}
                <div className="card divide-y divide-slate-100">
                  {activeRows.length === 0 ? (
                    <div className="px-5 py-8 text-center text-slate-400 text-sm">
                      No active holidays. Click the member chips above to re-include holidays.
                    </div>
                  ) : (
                    activeRows.map((h, i) => <HolidayRow key={i} h={h} />)
                  )}
                </div>

                {/* Weekends & skipped — at the bottom */}
                {skippedSection.length > 0 && (
                  <div className="card divide-y divide-slate-100 mt-3" style={{ borderColor: "#e2e8f0" }}>
                    <div className="px-5 py-2 rounded-t-xl flex items-center gap-2" style={{ background: isDark ? "#1e293b" : "#f8fafc" }}>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex-1">
                        {t("weekendsSkipped")} ({skippedSection.length})
                      </p>
                      <span className="text-xs text-slate-400">Excluded from smart windows</span>
                    </div>
                    {skippedSection.map((h, i) => <HolidayRow key={i} h={h} autoSkipped />)}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
