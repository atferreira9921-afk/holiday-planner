import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { C, STATUS, fmtShort, fmtMed, daysUntil } from "@/lib/theme";

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: tripData } = await supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .single();
    setTrip(tripData);

    const [{ data: sug }, { data: mem }] = await Promise.all([
      supabase.from("trip_suggestions")
        .select("id, destination_city, destination_country, summary, estimated_cost_per_person, is_selected, created_at")
        .eq("trip_id", id)
        .order("created_at"),
      supabase.from("group_members")
        .select("user_id, role, user_profiles(full_name, email)")
        .eq("group_id", tripData?.group_id ?? ""),
    ]);
    setSuggestions(sug ?? []);
    setMembers(mem ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleGetSuggestions() {
    setGeneratingSuggestions(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ""}/api/trips/${id}/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });
      if (res.ok) {
        await load();
      } else {
        Alert.alert("Error", "Could not generate suggestions. Try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    }
    setGeneratingSuggestions(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <Text style={{ color: C.muted }}>Trip not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: C.primary, fontWeight: "600" }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const st = STATUS[trip.status] ?? STATUS.planning;
  const countdown = trip.earliest_departure ? daysUntil(trip.earliest_departure) : null;
  const selectedSuggestion = suggestions.find(s => s.is_selected);
  const duration = trip.desired_duration_days;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={[s.badge, { backgroundColor: st.bg }]}>
          <Text style={[s.badgeText, { color: st.color }]}>{st.emoji} {st.label}</Text>
        </View>
      </View>

      <View style={s.body}>
        {/* Trip title card */}
        <View style={s.titleCard}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>{st.emoji}</Text>
          <Text style={s.tripTitle}>{trip.title}</Text>
          {trip.destination_city && (
            <Text style={s.destination}>📍 {trip.destination_city}{trip.destination_country ? `, ${trip.destination_country}` : ""}</Text>
          )}

          {/* Dates */}
          <View style={s.metaRow}>
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>Departure</Text>
              <Text style={s.metaValue}>{trip.earliest_departure ? fmtShort(trip.earliest_departure) : "—"}</Text>
            </View>
            <View style={s.metaSep} />
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>Return by</Text>
              <Text style={s.metaValue}>{trip.latest_return ? fmtShort(trip.latest_return) : "—"}</Text>
            </View>
            <View style={s.metaSep} />
            <View style={s.metaBox}>
              <Text style={s.metaLabel}>Duration</Text>
              <Text style={s.metaValue}>{duration} days</Text>
            </View>
          </View>

          {/* Countdown */}
          {countdown !== null && countdown >= 0 && (
            <View style={[s.countdown, { backgroundColor: st.bg }]}>
              <Text style={[s.countdownText, { color: st.color }]}>
                {countdown === 0 ? "✈️ Departing today!" : `${countdown} day${countdown === 1 ? "" : "s"} until departure`}
              </Text>
            </View>
          )}
        </View>

        {/* Quick stats */}
        <View style={s.statsRow}>
          {[
            { emoji: "🚗", label: trip.vehicle_type ?? "flight" },
            { emoji: "💶", label: trip.budget_per_person_eur ? `€${trip.budget_per_person_eur}/person` : "No budget set" },
            { emoji: "📋", label: trip.planning_mode === "destination_first" ? "Destination first" : "AI suggests" },
          ].map(s2 => (
            <View key={s2.label} style={s.statBox}>
              <Text style={{ fontSize: 20 }}>{s2.emoji}</Text>
              <Text style={s.statLabel}>{s2.label}</Text>
            </View>
          ))}
        </View>

        {/* Selected suggestion highlight */}
        {selectedSuggestion && (
          <View style={s.selectedCard}>
            <Text style={s.selectedBadge}>✅ Selected destination</Text>
            <Text style={s.selectedCity}>{selectedSuggestion.destination_city}, {selectedSuggestion.destination_country}</Text>
            {selectedSuggestion.estimated_cost_per_person && (
              <Text style={s.selectedCost}>~€{selectedSuggestion.estimated_cost_per_person}/person</Text>
            )}
            {selectedSuggestion.summary && (
              <Text style={s.selectedSummary} numberOfLines={3}>{selectedSuggestion.summary}</Text>
            )}
          </View>
        )}

        {/* AI Suggestions */}
        {trip.planning_mode === "days_first" && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>✨ AI Suggestions</Text>
              <Text style={s.cardSub}>{suggestions.length} option{suggestions.length !== 1 ? "s" : ""}</Text>
            </View>

            {suggestions.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🤖</Text>
                <Text style={s.emptyTitle}>No suggestions yet</Text>
                <Text style={s.emptySub}>Generate AI-powered destination suggestions based on your dates and preferences.</Text>
                <TouchableOpacity
                  style={[s.sugBtn, generatingSuggestions && { opacity: 0.6 }]}
                  onPress={handleGetSuggestions}
                  disabled={generatingSuggestions}
                >
                  <Text style={s.sugBtnText}>
                    {generatingSuggestions ? "Generating…" : "Get AI suggestions"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {suggestions.map(sug => (
                  <View key={sug.id} style={[s.sugCard, sug.is_selected && s.sugCardSelected]}>
                    <View style={s.sugHeader}>
                      <Text style={s.sugCity}>{sug.destination_city}, {sug.destination_country}</Text>
                      {sug.is_selected && <Text style={s.sugSelectedBadge}>✅ Selected</Text>}
                    </View>
                    {sug.estimated_cost_per_person && (
                      <Text style={s.sugCost}>~€{sug.estimated_cost_per_person}/person</Text>
                    )}
                    {sug.summary && (
                      <Text style={s.sugSummary} numberOfLines={3}>{sug.summary}</Text>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  style={[s.regenBtn, generatingSuggestions && { opacity: 0.6 }]}
                  onPress={handleGetSuggestions}
                  disabled={generatingSuggestions}
                >
                  <Text style={s.regenBtnText}>
                    {generatingSuggestions ? "Generating…" : "🔄 Regenerate suggestions"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Group members */}
        {members.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>👥 Group</Text>
            {members.map((m: any) => {
              const profile = Array.isArray(m.user_profiles) ? m.user_profiles[0] : m.user_profiles;
              const name = profile?.full_name ?? profile?.email ?? "Unknown";
              const initials = name.slice(0, 2).toUpperCase();
              return (
                <View key={m.user_id} style={s.memberRow}>
                  <View style={s.memberAvatar}>
                    <Text style={s.memberInitials}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.memberName}>{name}</Text>
                    <Text style={s.memberRole}>{m.role}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Notes / hint */}
        {trip.destination_hint && (
          <View style={s.card}>
            <Text style={s.cardTitle}>💬 Travel hint</Text>
            <Text style={s.hintText}>{trip.destination_hint}</Text>
          </View>
        )}

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.header, paddingTop: 60, paddingBottom: 16,
    paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  backBtn: {},
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: "600" },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: "700" },
  body: { padding: 16, gap: 14 },

  titleCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border, alignItems: "center",
  },
  tripTitle: { fontSize: 22, fontWeight: "800", color: C.text, textAlign: "center" },
  destination: { fontSize: 16, color: C.muted, marginTop: 4 },
  metaRow: { flexDirection: "row", marginTop: 16, width: "100%" },
  metaBox: { flex: 1, alignItems: "center" },
  metaSep: { width: 1, backgroundColor: C.border },
  metaLabel: { fontSize: 11, color: C.light, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 15, fontWeight: "700", color: C.text, marginTop: 4 },
  countdown: { marginTop: 14, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  countdownText: { fontWeight: "700", fontSize: 14 },

  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: C.border,
  },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 6, textAlign: "center" },

  selectedCard: {
    backgroundColor: "#ecfdf5", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "#6ee7b7",
  },
  selectedBadge: { fontSize: 12, fontWeight: "700", color: "#059669", marginBottom: 6 },
  selectedCity: { fontSize: 18, fontWeight: "700", color: C.text },
  selectedCost: { fontSize: 13, color: C.muted, marginTop: 4 },
  selectedSummary: { fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 20 },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 12 },
  cardSub: { fontSize: 13, color: C.muted },

  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  sugBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  sugBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  sugCard: {
    backgroundColor: C.bg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 10,
  },
  sugCardSelected: { borderColor: C.emerald, backgroundColor: C.emeraldBg },
  sugHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sugCity: { fontSize: 15, fontWeight: "700", color: C.text, flex: 1 },
  sugSelectedBadge: { fontSize: 12, fontWeight: "700", color: C.emerald },
  sugCost: { fontSize: 13, color: C.muted, marginTop: 4 },
  sugSummary: { fontSize: 13, color: C.muted, lineHeight: 20, marginTop: 6 },
  regenBtn: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 12,
    padding: 12, alignItems: "center", marginTop: 4,
  },
  regenBtnText: { color: C.primary, fontWeight: "700", fontSize: 14 },

  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryBg,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  memberInitials: { color: C.primary, fontWeight: "700", fontSize: 14 },
  memberName: { fontSize: 14, fontWeight: "600", color: C.text },
  memberRole: { fontSize: 12, color: C.muted, textTransform: "capitalize" },

  hintText: { fontSize: 14, color: C.muted, lineHeight: 22, fontStyle: "italic" },
});
