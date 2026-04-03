import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";

type Mode = "days_first" | "destination_first";
type Vehicle = "flight" | "car" | "bus";

export default function NewTripScreen() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("days_first");
  const [vehicle, setVehicle] = useState<Vehicle>("flight");
  const [departure, setDeparture] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [duration, setDuration] = useState("7");
  const [budget, setBudget] = useState("");
  const [hint, setHint] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destCountry, setDestCountry] = useState("");

  async function handleCreate() {
    if (!title.trim()) { Alert.alert("Missing info", "Please enter a trip name."); return; }
    if (!departure || !returnDate) { Alert.alert("Missing info", "Please enter departure and return dates."); return; }
    if (mode === "destination_first" && !destCity) { Alert.alert("Missing info", "Please enter a destination city."); return; }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: group, error: groupErr } = await supabase
      .from("travel_groups")
      .insert({ name: `${title.trim()} group`, created_by: user.id })
      .select().single();

    if (groupErr || !group) {
      Alert.alert("Error", groupErr?.message ?? "Could not create trip group.");
      setLoading(false);
      return;
    }

    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "owner" });

    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .insert({
        group_id: group.id,
        title: title.trim(),
        planning_mode: mode,
        desired_duration_days: parseInt(duration) || 7,
        earliest_departure: departure,
        latest_return: returnDate,
        budget_per_person_eur: budget ? parseInt(budget) : null,
        destination_hint: hint || null,
        destination_city: mode === "destination_first" ? destCity : null,
        destination_country: mode === "destination_first" ? destCountry.toUpperCase() : null,
        vehicle_type: vehicle,
        created_by: user.id,
      })
      .select().single();

    if (tripErr || !trip) {
      Alert.alert("Error", "Could not create trip.");
      setLoading(false);
      return;
    }

    router.replace(`/trip/${trip.id}`);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Plan a new trip</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        {/* Trip name */}
        <View style={s.card}>
          <Text style={s.cardTitle}>✈️ Trip name</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Summer beach escape"
          />
        </View>

        {/* Dates */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📅 Dates</Text>
          <Text style={s.label}>Earliest departure (YYYY-MM-DD)</Text>
          <TextInput
            style={s.input}
            value={departure}
            onChangeText={setDeparture}
            placeholder="2026-07-01"
            keyboardType="numbers-and-punctuation"
          />
          <Text style={s.label}>Latest return (YYYY-MM-DD)</Text>
          <TextInput
            style={s.input}
            value={returnDate}
            onChangeText={setReturnDate}
            placeholder="2026-07-15"
            keyboardType="numbers-and-punctuation"
          />
          <Text style={s.label}>Trip duration (days)</Text>
          <TextInput
            style={[s.input, { width: 100 }]}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* Vehicle */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🚗 How will you travel?</Text>
          <View style={s.optionRow}>
            {([
              { key: "flight" as Vehicle, icon: "✈️", label: "Flight" },
              { key: "car" as Vehicle,    icon: "🚗", label: "Road trip" },
              { key: "bus" as Vehicle,    icon: "🚌", label: "Bus / Train" },
            ] as const).map(v => (
              <TouchableOpacity
                key={v.key}
                style={[s.optionBtn, vehicle === v.key && s.optionBtnActive]}
                onPress={() => setVehicle(v.key)}
              >
                <Text style={{ fontSize: 24 }}>{v.icon}</Text>
                <Text style={[s.optionLabel, vehicle === v.key && { color: C.primary }]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Destination / mode */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🌍 Destination</Text>
          <View style={s.optionRow}>
            <TouchableOpacity
              style={[s.optionBtn, { flex: 1 }, mode === "days_first" && s.optionBtnActive]}
              onPress={() => setMode("days_first")}
            >
              <Text style={{ fontSize: 24 }}>🤖</Text>
              <Text style={[s.optionLabel, mode === "days_first" && { color: C.primary }]}>Suggest for me</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.optionBtn, { flex: 1 }, mode === "destination_first" && s.optionBtnActive]}
              onPress={() => setMode("destination_first")}
            >
              <Text style={{ fontSize: 24 }}>📍</Text>
              <Text style={[s.optionLabel, mode === "destination_first" && { color: C.primary }]}>I know where</Text>
            </TouchableOpacity>
          </View>

          {mode === "destination_first" && (
            <>
              <Text style={s.label}>City</Text>
              <TextInput style={s.input} value={destCity} onChangeText={setDestCity} placeholder="e.g. Barcelona" />
              <Text style={s.label}>Country code (e.g. ES, FR, PT)</Text>
              <TextInput
                style={[s.input, { width: 100 }]}
                value={destCountry}
                onChangeText={t => setDestCountry(t.toUpperCase())}
                placeholder="ES"
                maxLength={2}
                autoCapitalize="characters"
              />
            </>
          )}

          {mode === "days_first" && (
            <>
              <Text style={s.label}>Hint (optional)</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: "top" }]}
                value={hint}
                onChangeText={setHint}
                placeholder="e.g. warm beach, not too far from Lisbon..."
                multiline
              />
            </>
          )}
        </View>

        {/* Budget */}
        <View style={s.card}>
          <Text style={s.cardTitle}>💶 Budget (optional)</Text>
          <Text style={s.label}>Budget per person (€)</Text>
          <TextInput
            style={[s.input, { width: 140 }]}
            value={budget}
            onChangeText={setBudget}
            placeholder="e.g. 1200"
            keyboardType="number-pad"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.createBtn, (!title.trim() || !departure || !returnDate || loading) && s.createBtnDisabled]}
          onPress={handleCreate}
          disabled={!title.trim() || !departure || !returnDate || loading}
        >
          <Text style={s.createBtnText}>
            {loading ? "Creating…" : mode === "days_first" ? "Create trip → Get AI suggestions" : "Create trip →"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.header, paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 12 },

  label: { fontSize: 12, fontWeight: "600", color: C.muted, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    padding: 12, fontSize: 15, backgroundColor: C.bg, color: C.text,
  },

  optionRow: { flexDirection: "row", gap: 10 },
  optionBtn: {
    flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    padding: 14, alignItems: "center", gap: 6, backgroundColor: C.bg,
  },
  optionBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  optionLabel: { fontSize: 13, fontWeight: "600", color: C.muted, textAlign: "center" },

  createBtn: {
    backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: "center",
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
