import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function DashboardScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("trips")
      .select("id, title, status, desired_duration_days, earliest_departure, latest_return")
      .order("created_at", { ascending: false })
      .limit(10);
    setTrips(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Holidays</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push("/(tabs)/trips")}>
          <Text style={styles.buttonText}>+ New trip</Text>
        </TouchableOpacity>
      </View>

      {trips.length === 0 && !loading && (
        <Text style={styles.empty}>No trips yet. Start planning!</Text>
      )}

      {trips.map((trip) => (
        <TouchableOpacity
          key={trip.id}
          style={styles.card}
          onPress={() => router.push(`/trip/${trip.id}`)}
        >
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>{trip.title}</Text>
            <StatusBadge status={trip.status} />
          </View>
          <Text style={styles.cardSub}>
            {trip.desired_duration_days} days · {trip.earliest_departure} – {trip.latest_return}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    planning: { bg: "#fef9c3", text: "#854d0e" },
    suggested: { bg: "#dbeafe", text: "#1d4ed8" },
    booked: { bg: "#dcfce7", text: "#166534" },
    cancelled: { bg: "#fee2e2", text: "#991b1b" },
  };
  const c = colors[status] ?? { bg: "#f3f4f6", text: "#374151" };
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
      <Text style={{ color: c.text, fontSize: 12, fontWeight: "500" }}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "700" },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  card: { margin: 8, marginHorizontal: 16, padding: 16, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "600", flex: 1, marginRight: 8 },
  cardSub: { color: "#6b7280", fontSize: 13, marginTop: 4 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 48, fontSize: 16 },
});
