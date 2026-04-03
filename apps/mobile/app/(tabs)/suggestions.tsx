import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Alert, Platform, StatusBar,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { C, EVENT, fmtShort, toISO } from "@/lib/theme";

const TODAY = toISO(new Date());

const CATEGORY_GROUPS = [
  { label: "🏖️ Holidays", cats: [{ key: "holiday", emoji: "🏖️", label: "Holiday" }] },
  { label: "✈️ Away", cats: [
    { key: "work",       emoji: "💼", label: "Work travel" },
    { key: "personal",   emoji: "🏠", label: "Personal" },
    { key: "away-other", emoji: "📌", label: "Other away" },
  ]},
  { label: "🎟️ Events", cats: [
    { key: "concert",      emoji: "🎵", label: "Concert" },
    { key: "game",         emoji: "⚽", label: "Game" },
    { key: "visit",        emoji: "🤝", label: "Visit" },
    { key: "party",        emoji: "🎉", label: "Party" },
    { key: "event-other",  emoji: "⭐", label: "Event" },
  ]},
];

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [upcomingItems, setUpcomingItems] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [addCat, setAddCat] = useState("holiday");
  const [addTitle, setAddTitle] = useState("Holiday");
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [{ data: bookings }, { data: away }, { data: events }] = await Promise.all([
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
    ]);

    const items = [
      ...(bookings ?? []).map((b: any) => ({
        id: b.id, title: b.title, start: b.start_date, end: b.end_date,
        emoji: "🏖️", color: C.primary, bg: C.primaryBg, category: "holiday",
      })),
      ...(away ?? []).map((b: any) => {
        const meta = EVENT[b.reason] ?? EVENT["away-other"];
        return { id: b.id, title: b.title, start: b.start_date, end: b.end_date, ...meta, category: b.reason };
      }),
      ...(events ?? []).map((b: any) => {
        const meta = EVENT[b.event_kind] ?? EVENT["event-other"];
        return { id: b.id, title: b.title, start: b.start_date, end: b.end_date, ...meta, category: b.event_kind };
      }),
    ].sort((a, b) => a.start.localeCompare(b.start));

    setUpcomingItems(items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(item: any) {
    Alert.alert("Remove", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          if (item.category === "holiday") {
            await supabase.from("booked_holidays").delete().eq("id", item.id);
          } else if (["work", "personal", "away-other"].includes(item.category)) {
            await supabase.from("away_periods").delete().eq("id", item.id);
          } else {
            await supabase.from("calendar_events").delete().eq("id", item.id);
          }
          setUpcomingItems(prev => prev.filter(i => i.id !== item.id));
        },
      },
    ]);
  }

  async function handleSave() {
    if (!addStart || !addEnd || !userId) return;
    if (addEnd < addStart) { Alert.alert("Error", "End date must be after start date"); return; }
    setSaving(true);
    const finalTitle = addTitle.trim() || "Holiday";
    const end = addEnd < addStart ? addStart : addEnd;

    if (addCat === "holiday") {
      await supabase.from("booked_holidays").insert({
        owner_user_id: userId, title: finalTitle, start_date: addStart, end_date: end,
      });
    } else if (["work", "personal", "away-other"].includes(addCat)) {
      await supabase.from("away_periods").insert({
        owner_user_id: userId, title: finalTitle, start_date: addStart, end_date: end, reason: addCat,
      });
    } else {
      await supabase.from("calendar_events").insert({
        owner_user_id: userId, title: finalTitle, start_date: addStart, end_date: end, event_kind: addCat,
      });
    }

    setShowAdd(false);
    setAddStart(""); setAddEnd(""); setAddTitle("Holiday"); setAddCat("holiday");
    await load();
    setSaving(false);
  }

  const PT = Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 24) + 8;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: PT + 16 }]}>
        <Text style={s.headerTitle}>🗓️ Calendar</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(f => !f)}>
          <Text style={s.addBtnText}>{showAdd ? "Cancel" : "+ Add"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {/* Add form */}
        {showAdd && (
          <View style={s.addForm}>
            <Text style={s.addFormTitle}>New booking</Text>

            {/* Category picker */}
            {CATEGORY_GROUPS.map(group => (
              <View key={group.label} style={{ marginBottom: 8 }}>
                <Text style={s.groupLabel}>{group.label}</Text>
                <View style={s.catRow}>
                  {group.cats.map(cat => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[s.catBtn, addCat === cat.key && s.catBtnActive]}
                      onPress={() => { setAddCat(cat.key); setAddTitle(cat.label); }}
                    >
                      <Text style={[s.catBtnText, addCat === cat.key && s.catBtnTextActive]}>
                        {cat.emoji} {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <Text style={s.label}>Title</Text>
            <TextInput
              style={s.input}
              value={addTitle}
              onChangeText={setAddTitle}
              placeholder="e.g. Summer holiday"
            />
            <View style={s.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Start (YYYY-MM-DD)</Text>
                <TextInput
                  style={s.input}
                  value={addStart}
                  onChangeText={setAddStart}
                  placeholder="2026-07-01"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>End (YYYY-MM-DD)</Text>
                <TextInput
                  style={s.input}
                  value={addEnd}
                  onChangeText={setAddEnd}
                  placeholder="2026-07-14"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.saveBtn, (!addStart || !addEnd || saving) && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!addStart || !addEnd || saving}
            >
              <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save booking"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming list */}
        <Text style={s.sectionTitle}>Upcoming periods</Text>

        {!loading && upcomingItems.length === 0 && (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📅</Text>
            <Text style={s.emptyTitle}>Nothing booked yet</Text>
            <Text style={s.emptySub}>Tap + Add to log a holiday, away period, or event.</Text>
          </View>
        )}

        {upcomingItems.map(item => {
          const dur = Math.round(
            (new Date(item.end + "T00:00:00").getTime() - new Date(item.start + "T00:00:00").getTime()) / 86400000
          ) + 1;
          const daysAway = Math.round(
            (new Date(item.start + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86400000
          );
          return (
            <View key={item.id} style={[s.itemCard, { borderLeftColor: item.color }]}>
              <Text style={{ fontSize: 22, marginRight: 12 }}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle}>{item.title}</Text>
                <Text style={s.itemSub}>
                  {item.start === item.end ? fmtShort(item.start) : `${fmtShort(item.start)} – ${fmtShort(item.end)}`}
                  {dur > 1 ? ` · ${dur}d` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={[s.daysAway, { color: item.color }]}>
                  {daysAway <= 0 ? "Ongoing" : `in ${daysAway}d`}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Text style={s.deleteBtn}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  addBtn: { backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  addForm: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  addFormTitle: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 12 },
  groupLabel: { fontSize: 11, fontWeight: "700", color: C.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg,
  },
  catBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  catBtnText: { fontSize: 12, fontWeight: "600", color: C.muted },
  catBtnTextActive: { color: C.primary },
  label: { fontSize: 12, fontWeight: "600", color: C.muted, marginBottom: 4, marginTop: 10 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    padding: 10, fontSize: 14, backgroundColor: C.bg,
  },
  dateRow: { flexDirection: "row", marginTop: 4 },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 12, padding: 14,
    alignItems: "center", marginTop: 14,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: C.text },

  itemCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    borderLeftWidth: 4, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: C.border,
  },
  itemTitle: { fontSize: 14, fontWeight: "600", color: C.text },
  itemSub: { fontSize: 12, color: C.light, marginTop: 2 },
  daysAway: { fontSize: 12, fontWeight: "700" },
  deleteBtn: { fontSize: 12, color: "#ef4444" },

  emptyState: { alignItems: "center", paddingTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 4 },
  emptySub: { fontSize: 13, color: C.muted, textAlign: "center" },
});
