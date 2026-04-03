import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Platform, StatusBar,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { C, STATUS, fmtShort, toISO } from "@/lib/theme";

const TODAY = toISO(new Date());
const FILTERS = ["All", "Planning", "Suggested", "Booked", "Done"] as const;

export default function TripsScreen() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("All");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: memberships } = await supabase
      .from("group_members").select("group_id").eq("user_id", user.id);
    const groupIds = (memberships ?? []).map((m: any) => m.group_id);

    if (groupIds.length === 0) { setTrips([]); setLoading(false); return; }

    const { data } = await supabase.from("trips")
      .select("id, title, status, planning_mode, desired_duration_days, earliest_departure, latest_return, destination_city, destination_country, budget_per_person_eur, created_at")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false });

    setTrips(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = trips.filter(t => {
    if (filter === "All") return true;
    if (filter === "Planning") return t.status === "planning";
    if (filter === "Suggested") return t.status === "suggested";
    if (filter === "Booked") return t.status === "booked";
    if (filter === "Done") return t.status === "completed";
    return true;
  });

  const PT = Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: PT + 16 }]}>
        <Text style={s.headerTitle}>✈️ My Trips</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => router.push("/trip/new")}>
          <Text style={s.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterBtnActive]} onPress={() => setFilter(f)}>
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {!loading && filtered.length === 0 && (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🗺️</Text>
            <Text style={s.emptyTitle}>{filter === "All" ? "No trips yet" : `No ${filter.toLowerCase()} trips`}</Text>
            <Text style={s.emptySub}>Start planning your next adventure!</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/trip/new")}>
              <Text style={s.emptyBtnText}>Plan a trip →</Text>
            </TouchableOpacity>
          </View>
        )}

        {filtered.map(trip => {
          const st = STATUS[trip.status] ?? STATUS.planning;
          const isUpcoming = trip.earliest_departure >= TODAY;
          const countdown = isUpcoming ? Math.round(
            (new Date(trip.earliest_departure + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86400000
          ) : null;

          return (
            <TouchableOpacity key={trip.id} style={s.card} onPress={() => router.push(`/trip/${trip.id}`)}>
              <View style={s.cardTop}>
                <View style={[s.emojiBox, { backgroundColor: st.bg }]}>
                  <Text style={{ fontSize: 22 }}>{st.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.tripTitle} numberOfLines={1}>{trip.title}</Text>
                  {trip.destination_city && (
                    <Text style={s.destination}>📍 {trip.destination_city}{trip.destination_country ? `, ${trip.destination_country}` : ""}</Text>
                  )}
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              <View style={s.cardMeta}>
                <Text style={s.metaItem}>📅 {fmtShort(trip.earliest_departure)} – {fmtShort(trip.latest_return)}</Text>
                <Text style={s.metaItem}>⏱ {trip.desired_duration_days} days</Text>
                {trip.budget_per_person_eur && (
                  <Text style={s.metaItem}>💶 €{trip.budget_per_person_eur}/person</Text>
                )}
              </View>

              {countdown !== null && countdown >= 0 && trip.status === "booked" && (
                <View style={s.countdownBanner}>
                  <Text style={s.countdownText}>
                    {countdown === 0 ? "✈️ Departing today!" : `✈️ ${countdown} day${countdown === 1 ? "" : "s"} to go`}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.header, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  newBtn: { backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  filterWrap: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  filters: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
  },
  filterBtnActive: { backgroundColor: C.primaryBg, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: "600", color: C.muted },
  filterTextActive: { color: C.primary },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  emojiBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tripTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  destination: { fontSize: 13, color: C.muted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaItem: { fontSize: 12, color: C.muted, backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  countdownBanner: {
    marginTop: 10, backgroundColor: "#dcfce7", borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  countdownText: { color: "#166534", fontWeight: "700", fontSize: 13 },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 6 },
  emptySub: { fontSize: 14, color: C.muted, marginBottom: 20 },
  emptyBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
