import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Platform, StatusBar, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";

const COUNTRIES = [
  "PT", "GB", "ES", "FR", "DE", "IT", "NL", "BE", "PL", "SE",
  "NO", "DK", "FI", "AT", "CH", "IE", "US", "CA", "AU", "BR",
];

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [vacationDays, setVacationDays] = useState("22");
  const [homeCountry, setHomeCountry] = useState("PT");
  const [familyCount, setFamilyCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    setEmail(user.email ?? "");
    setFullName(user.user_metadata?.full_name ?? "");

    const [{ data: prefs }, { data: family }] = await Promise.all([
      supabase.from("user_preferences")
        .select("vacation_days_per_year, home_country")
        .eq("user_id", user.id).single(),
      supabase.from("family_members")
        .select("id", { count: "exact" })
        .eq("owner_user_id", user.id),
    ]);

    if (prefs) {
      setVacationDays(String(prefs.vacation_days_per_year ?? 22));
      setHomeCountry(prefs.home_country ?? "PT");
    }
    setFamilyCount((family as any)?.length ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    const days = parseInt(vacationDays);
    if (isNaN(days) || days < 0 || days > 365) {
      flash("Vacation days must be between 0 and 365", false);
      setSaving(false);
      return;
    }

    const [nameRes, prefsRes] = await Promise.all([
      supabase.auth.updateUser({ data: { full_name: fullName } }),
      supabase.from("user_preferences").upsert({
        user_id: userId,
        vacation_days_per_year: days,
        home_country: homeCountry,
      }, { onConflict: "user_id" }),
    ]);

    setSaving(false);
    if (nameRes.error || prefsRes.error) {
      flash(nameRes.error?.message ?? prefsRes.error?.message ?? "Error saving", false);
    } else {
      flash("Saved!", true);
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out", style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const initials = (fullName || email).slice(0, 2).toUpperCase();
  const PT = Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: PT + 16 }]}>
        <Text style={s.headerTitle}>⚙️ Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Flash */}
            {msg && (
              <View style={[s.flash, msg.ok ? s.flashOk : s.flashErr]}>
                <Text style={msg.ok ? s.flashOkText : s.flashErrText}>{msg.text}</Text>
              </View>
            )}

            {/* Avatar card */}
            <View style={s.avatarCard}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={s.avatarName}>{fullName || "No name set"}</Text>
                <Text style={s.avatarEmail}>{email}</Text>
              </View>
            </View>

            {/* Settings card */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Settings</Text>

              <Text style={s.label}>Display name</Text>
              <TextInput
                style={s.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
              />

              <Text style={s.label}>Vacation days per year</Text>
              <TextInput
                style={[s.input, { width: 100 }]}
                value={vacationDays}
                onChangeText={setVacationDays}
                keyboardType="number-pad"
                maxLength={3}
              />

              <Text style={s.label}>Home country</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={s.countryRow}>
                  {COUNTRIES.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.countryBtn, homeCountry === c && s.countryBtnActive]}
                      onPress={() => setHomeCountry(c)}
                    >
                      <Text style={[s.countryText, homeCountry === c && s.countryTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[s.saveBtn, saving && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save changes"}</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Overview</Text>
              <View style={s.statsGrid}>
                <View style={s.statBox}>
                  <Text style={s.statValue}>{vacationDays}</Text>
                  <Text style={s.statLabel}>Vacation days/yr</Text>
                </View>
                <View style={s.statBox}>
                  <Text style={s.statValue}>{familyCount}</Text>
                  <Text style={s.statLabel}>Family members</Text>
                </View>
              </View>
            </View>

            {/* Quick links */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Quick actions</Text>
              {[
                { label: "✈️  Plan a new trip", onPress: () => router.push("/trip/new") },
                { label: "📅  View calendar", onPress: () => router.push("/(tabs)/suggestions") },
                { label: "🗺️  View my trips", onPress: () => router.push("/(tabs)/trips") },
              ].map(link => (
                <TouchableOpacity key={link.label} style={s.linkRow} onPress={link.onPress}>
                  <Text style={s.linkText}>{link.label}</Text>
                  <Text style={s.linkArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sign out */}
            <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
              <Text style={s.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.header, paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },

  flash: { borderRadius: 12, padding: 12 },
  flashOk: { backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#86efac" },
  flashErr: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5" },
  flashOkText: { color: "#166534", fontWeight: "600", fontSize: 14 },
  flashErrText: { color: "#991b1b", fontWeight: "600", fontSize: 14 },

  avatarCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center",
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  avatarName: { fontSize: 17, fontWeight: "700", color: C.text },
  avatarEmail: { fontSize: 13, color: C.muted, marginTop: 2 },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 14 },

  label: { fontSize: 12, fontWeight: "600", color: C.muted, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    padding: 10, fontSize: 15, backgroundColor: C.bg, color: C.text,
  },

  countryRow: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  countryBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg,
  },
  countryBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  countryText: { fontSize: 13, fontWeight: "600", color: C.muted },
  countryTextActive: { color: C.primary },

  saveBtn: {
    backgroundColor: C.primary, borderRadius: 12, padding: 14,
    alignItems: "center", marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  statsGrid: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: C.border,
  },
  statValue: { fontSize: 28, fontWeight: "700", color: C.primary },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 4, textAlign: "center" },

  linkRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  linkText: { fontSize: 15, color: C.text, fontWeight: "500" },
  linkArrow: { fontSize: 20, color: C.light },

  signOutBtn: {
    borderWidth: 1.5, borderColor: "#ef4444", borderRadius: 14,
    padding: 16, alignItems: "center",
  },
  signOutText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },
});
