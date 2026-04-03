import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Platform, StatusBar,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { C, STATUS, EVENT, fmtShort, fmtMed, daysUntil, toISO } from "@/lib/theme";

const TODAY = toISO(new Date());
const THIS_YEAR = new Date().getFullYear();

type UpcomingItem = {
  id: string; title: string; start: string; end: string;
  emoji: string; color: string; bg: string; daysAway: number;
};

function countWorkingDays(start: string, end: string) {
  let n = 0;
  const d = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  while (d <= e) {
    if (d.getFullYear() === THIS_YEAR && d.getDay() !== 0 && d.getDay() !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("there");
  const [vacationTotal, setVacationTotal] = useState(22);
  const [bookedDays, setBookedDays] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [nextBookedTrip, setNextBookedTrip] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const name = user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";
    setFirstName(name);

    const [
      { data: prefs },
      { data: bookings },
      { data: away },
      { data: events },
      { data: memberships },
    ] = await Promise.all([
      supabase.from("user_preferences")
        .select("vacation_days_per_year, home_country, preferred_countries")
        .eq("user_id", user.id).single(),
      supabase.from("booked_holidays")
        .select("id, title, start_date, end_date")
        .eq("owner_user_id", user.id).is("family_member_id", null)
        .gte("end_date", TODAY).order("start_date"),
      supabase.from("away_periods")
        .select("id, title, start_date, end_date, reason")
        .eq("owner_user_id", user.id).is("family_member_id", null)
        .gte("end_date", TODAY).order("start_date"),
      supabase.from("calendar_events")
        .select("id, title, start_date, end_date, event_kind")
        .eq("owner_user_id", user.id).is("family_member_id", null)
        .gte("end_date", TODAY).order("start_date"),
      supabase.from("group_members").select("group_id").eq("user_id", user.id),
    ]);

    const total = prefs?.vacation_days_per_year ?? 22;
    setVacationTotal(total);

    // Also fetch booked days for this year (not just upcoming)
    const { data: allBookingsYear } = await supabase
      .from("booked_holidays")
      .select("start_date, end_date")
      .eq("owner_user_id", user.id).is("family_member_id", null)
      .gte("start_date", `${THIS_YEAR}-01-01`)
      .lte("end_date", `${THIS_YEAR}-12-31`);
    const used = (allBookingsYear ?? []).reduce(
      (s: number, b: any) => s + countWorkingDays(b.start_date, b.end_date), 0
    );
    setBookedDays(used);

    // Fetch public holidays for icon detection
    const homeCountry = prefs?.home_country ?? "PT";
    const preferredCountries: string[] = prefs?.preferred_countries ?? [];
    const allCountries = [...new Set([homeCountry, ...preferredCountries])];
    const publicHolidayDates = new Set<string>();
    await Promise.all(
      allCountries.flatMap(country =>
        [THIS_YEAR, THIS_YEAR + 1].map(async yr => {
          try {
            const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${yr}/${country}`);
            if (res.ok) {
              const data: { date: string; counties: string[] | null }[] = await res.json();
              data.forEach(h => publicHolidayDates.add(h.date));
            }
          } catch { /* ignore */ }
        })
      )
    );

    // Build upcoming list
    const items: UpcomingItem[] = [
      ...(bookings ?? []).map((b: any) => {
        const isSinglePublicHoliday = b.start_date === b.end_date && publicHolidayDates.has(b.start_date);
        return {
          id: b.id, title: b.title, start: b.start_date, end: b.end_date,
          emoji: isSinglePublicHoliday ? "📅" : "🏖️",
          color: C.primary, bg: C.primaryBg,
          daysAway: daysUntil(b.start_date),
        };
      }),
      ...(away ?? []).map((b: any) => {
        const meta = EVENT[b.reason] ?? EVENT["away-other"];
        return { id: b.id, title: b.title, start: b.start_date, end: b.end_date, ...meta, daysAway: daysUntil(b.start_date) };
      }),
      ...(events ?? []).map((b: any) => {
        const meta = EVENT[b.event_kind] ?? EVENT["event-other"];
        return { id: b.id, title: b.title, start: b.start_date, end: b.end_date, ...meta, daysAway: daysUntil(b.start_date) };
      }),
    ].sort((a, b) => a.start.localeCompare(b.start));
    setUpcoming(items);

    // Fetch trips
    const groupIds = (memberships ?? []).map((m: any) => m.group_id);
    if (groupIds.length > 0) {
      const { data: trips } = await supabase.from("trips")
        .select("id, title, status, desired_duration_days, earliest_departure, latest_return, destination_city")
        .in("group_id", groupIds)
        .in("status", ["planning", "suggested", "booked"])
        .order("created_at", { ascending: false });
      setActiveTrips(trips ?? []);
      const booked = (trips ?? [])
        .filter((t: any) => t.status === "booked" && t.earliest_departure >= TODAY)
        .sort((a: any, b: any) => a.earliest_departure.localeCompare(b.earliest_departure))[0] ?? null;
      setNextBookedTrip(booked);
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const remaining = Math.max(0, vacationTotal - bookedDays);
  const bookedPct = Math.min(100, Math.round((bookedDays / vacationTotal) * 100));
  const nextUp = upcoming[0] ?? null;
  const tripCountdown = nextBookedTrip ? daysUntil(nextBookedTrip.earliest_departure) : null;

  const PT = Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: PT + 16 }]}>
        <View>
          <Text style={s.greeting}>Hey {firstName} 👋</Text>
          <Text style={s.greetingSub}>
            {remaining > 0 ? `${remaining} vacation days left in ${THIS_YEAR}` : `All ${vacationTotal} days used!`}
          </Text>
        </View>
        <TouchableOpacity style={s.planBtn} onPress={() => router.push("/trip/new")}>
          <Text style={s.planBtnText}>+ Plan trip</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={s.body}>

          {/* Booked trip countdown */}
          {nextBookedTrip && tripCountdown !== null && (
            <TouchableOpacity style={s.countdownCard} onPress={() => router.push(`/trip/${nextBookedTrip.id}`)}>
              <Text style={{ fontSize: 36 }}>✈️</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.countdownLabel}>
                  {tripCountdown === 0 ? "Today!" : tripCountdown === 1 ? "Tomorrow!" : `${tripCountdown} days to go!`}
                </Text>
                <Text style={s.countdownTitle} numberOfLines={1}>{nextBookedTrip.title}</Text>
                <Text style={s.countdownSub}>
                  {fmtShort(nextBookedTrip.earliest_departure)}
                  {nextBookedTrip.destination_city ? ` · ${nextBookedTrip.destination_city}` : ""}
                  {` · ${nextBookedTrip.desired_duration_days}d`}
                </Text>
              </View>
              <Text style={s.countdownArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* Vacation bar */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Vacation days — {THIS_YEAR}</Text>
            <View style={s.barBg}>
              {bookedPct > 0 && <View style={[s.barFill, { width: `${bookedPct}%` as any, backgroundColor: "#0ea5e9" }]} />}
            </View>
            <View style={s.barLabels}>
              <Text style={s.barLabel}>0</Text>
              <Text style={s.barLabel}>{vacationTotal} days</Text>
            </View>
            <View style={s.statsRow}>
              {[
                { color: "#0ea5e9", label: `${bookedDays} booked` },
                { color: "#e2e8f0", label: `${remaining} remaining` },
              ].map(st => (
                <View key={st.label} style={s.statItem}>
                  <View style={[s.statDot, { backgroundColor: st.color }]} />
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Next up hero */}
          {nextUp ? (
            <View style={[s.heroCard, { borderColor: nextUp.color + "40", backgroundColor: nextUp.bg }]}>
              <Text style={{ fontSize: 40 }}>{nextUp.emoji}</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[s.heroLabel, { color: nextUp.color }]}>
                  {nextUp.daysAway === 0 ? "Today!" : nextUp.daysAway < 0 ? "Ongoing" : `In ${nextUp.daysAway} day${nextUp.daysAway === 1 ? "" : "s"}`}
                </Text>
                <Text style={s.heroTitle} numberOfLines={1}>{nextUp.title}</Text>
                <Text style={s.heroSub}>
                  {fmtMed(nextUp.start)}{nextUp.end !== nextUp.start ? ` → ${fmtMed(nextUp.end)}` : ""}
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.emptyHero}>
              <Text style={{ fontSize: 36 }}>🗺️</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.heroTitle}>Nothing booked yet</Text>
                <Text style={s.heroSub}>You have {remaining} days to use — plan something!</Text>
              </View>
            </View>
          )}

          {/* Upcoming list */}
          {upcoming.length > 1 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Upcoming</Text>
              {upcoming.slice(0, 6).map(item => {
                const dur = Math.round((new Date(item.end + "T00:00:00").getTime() - new Date(item.start + "T00:00:00").getTime()) / 86400000) + 1;
                return (
                  <View key={item.id} style={[s.upcomingRow, { borderLeftColor: item.color }]}>
                    <Text style={{ fontSize: 18, marginRight: 10 }}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.upcomingTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={s.upcomingSub}>
                        {item.start === item.end ? fmtShort(item.start) : `${fmtShort(item.start)} – ${fmtShort(item.end)}`}
                        {dur > 1 ? ` · ${dur}d` : ""}
                      </Text>
                    </View>
                    <Text style={[s.upcomingDays, { color: item.color }]}>
                      {item.daysAway === 0 ? "Today" : item.daysAway < 0 ? "Ongoing" : `in ${item.daysAway}d`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Trips summary */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Active trips</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/trips")}>
                <Text style={s.cardLink}>View all →</Text>
              </TouchableOpacity>
            </View>
            {activeTrips.length === 0 ? (
              <Text style={s.empty}>No active trips. Start planning!</Text>
            ) : (
              activeTrips.slice(0, 3).map(t => {
                const st = STATUS[t.status] ?? STATUS.planning;
                return (
                  <TouchableOpacity key={t.id} style={s.tripRow} onPress={() => router.push(`/trip/${t.id}`)}>
                    <View style={[s.tripEmoji, { backgroundColor: st.bg }]}>
                      <Text>{st.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.upcomingTitle} numberOfLines={1}>{t.title}</Text>
                      <Text style={s.upcomingSub}>
                        {t.desired_duration_days}d · {fmtShort(t.earliest_departure)}
                        {t.destination_city ? ` · ${t.destination_city}` : ""}
                      </Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: st.bg }]}>
                      <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.header,
    paddingHorizontal: 20, paddingBottom: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  greeting: { fontSize: 22, fontWeight: "700", color: "#ffffff" },
  greetingSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  planBtn: {
    backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  planBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  body: { padding: 16, gap: 14 },

  countdownCard: {
    backgroundColor: "#dcfce7", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#86efac",
  },
  countdownLabel: { fontSize: 12, fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: 0.5 },
  countdownTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginTop: 2 },
  countdownSub: { fontSize: 13, color: "#166534", marginTop: 2 },
  countdownArrow: { fontSize: 24, color: "#166534", marginLeft: 8 },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 12 },
  cardLink: { fontSize: 13, color: C.primary, fontWeight: "600" },

  barBg: { height: 10, backgroundColor: "#f1f5f9", borderRadius: 999, overflow: "hidden", marginBottom: 4 },
  barFill: { height: "100%", borderRadius: 999 },
  barLabels: { flexDirection: "row", justifyContent: "space-between" },
  barLabel: { fontSize: 11, color: C.light },
  statsRow: { flexDirection: "row", gap: 16, marginTop: 10 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statDot: { width: 10, height: 10, borderRadius: 2 },
  statLabel: { fontSize: 12, color: C.muted },

  heroCard: {
    borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center",
    borderWidth: 1.5,
  },
  emptyHero: {
    backgroundColor: C.primaryBg, borderRadius: 16, padding: 18,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#c7d2fe",
  },
  heroLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  heroTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginTop: 2 },
  heroSub: { fontSize: 13, color: C.muted, marginTop: 2 },

  upcomingRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    paddingLeft: 12, borderLeftWidth: 3, marginBottom: 6,
  },
  upcomingTitle: { fontSize: 14, fontWeight: "600", color: C.text },
  upcomingSub: { fontSize: 12, color: C.light, marginTop: 1 },
  upcomingDays: { fontSize: 12, fontWeight: "600" },

  tripRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderRadius: 12, marginBottom: 4,
  },
  tripEmoji: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { color: C.light, fontSize: 14, textAlign: "center", paddingVertical: 12 },
});
