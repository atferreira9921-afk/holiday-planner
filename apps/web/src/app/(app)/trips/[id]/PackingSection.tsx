"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAiEnabled } from "@/lib/config";
import { useTranslations } from "next-intl";

interface PackingItem {
  id: string;
  trip_id: string;
  item: string;
  category: string;
  packed: boolean;
  created_at: string;
  owner_user_id: string | null;
  is_shared: boolean;
}

interface AiPackingSuggestion {
  item: string;
  category: string;
  reason: string;
}

interface Props {
  tripId: string;
  currentUserId: string;
  members: { user_id: string; name: string }[];
  initialItems: PackingItem[];
  destinationCountry: string | null;
  tripType: string;
}

// Parse "T-shirts (×5)" → { base: "T-shirts", qty: 5 }
function parseQty(item: string): { base: string; qty: number | null } {
  const m = item.match(/^(.+?)\s*\(×(\d+)\)(.*)$/);
  if (m) return { base: (m[1] + m[3]).trim(), qty: parseInt(m[2]) };
  return { base: item, qty: null };
}

function fmtItem(base: string, qty: number | null): string {
  if (!qty || qty <= 0) return base;
  return `${base} (×${qty})`;
}

const CATEGORIES = [
  { key: "documents",  label: "Documents",  emoji: "📄" },
  { key: "clothing",   label: "Clothing",   emoji: "👕" },
  { key: "toiletries", label: "Toiletries", emoji: "🧴" },
  { key: "tech",       label: "Tech",       emoji: "📱" },
  { key: "activities", label: "Activities", emoji: "🎒" },
  { key: "health",     label: "Health",     emoji: "💊" },
  { key: "other",      label: "Other",      emoji: "📦" },
];

const TEMPLATES: Record<string, { item: string; category: string }[]> = {
  "Beach trip": [
    { item: "Passport / ID card", category: "documents" },
    { item: "Travel insurance certificate", category: "documents" },
    { item: "Flight tickets (printed or saved offline)", category: "documents" },
    { item: "Hotel booking confirmation", category: "documents" },
    { item: "Travel visas (if required)", category: "documents" },
    { item: "Swimsuit / bikini (×2)", category: "clothing" },
    { item: "T-shirts (×5)", category: "clothing" },
    { item: "Shorts (×3)", category: "clothing" },
    { item: "Casual dress / linen trousers (×2)", category: "clothing" },
    { item: "Smart evening outfit (×1)", category: "clothing" },
    { item: "Underwear (×7)", category: "clothing" },
    { item: "Socks — ankle (×3)", category: "clothing" },
    { item: "Pyjamas / sleepwear", category: "clothing" },
    { item: "Sandals / flip flops", category: "clothing" },
    { item: "Trainers / sneakers (×1)", category: "clothing" },
    { item: "Sun hat / wide-brim cap", category: "clothing" },
    { item: "Sunglasses", category: "clothing" },
    { item: "Light beach cover-up / sarong", category: "clothing" },
    { item: "Lightweight cardigan / hoodie (cool evenings)", category: "clothing" },
    { item: "Belt", category: "clothing" },
    { item: "Sunscreen SPF 50+", category: "toiletries" },
    { item: "After-sun lotion / aloe vera gel", category: "toiletries" },
    { item: "Shampoo & conditioner", category: "toiletries" },
    { item: "Shower gel / soap", category: "toiletries" },
    { item: "Deodorant", category: "toiletries" },
    { item: "Toothbrush & toothpaste", category: "toiletries" },
    { item: "Lip balm with SPF", category: "toiletries" },
    { item: "Moisturiser / face cream", category: "toiletries" },
    { item: "Insect repellent", category: "toiletries" },
    { item: "Hand sanitiser", category: "toiletries" },
    { item: "Phone charger & cable", category: "tech" },
    { item: "Power bank / portable charger", category: "tech" },
    { item: "Universal travel adapter", category: "tech" },
    { item: "Waterproof phone case / dry bag", category: "tech" },
    { item: "Camera + memory card", category: "tech" },
    { item: "Earphones / wireless earbuds", category: "tech" },
    { item: "Beach towel (×2)", category: "activities" },
    { item: "Snorkelling mask & fins", category: "activities" },
    { item: "Beach bag", category: "activities" },
    { item: "Reusable water bottle", category: "activities" },
    { item: "Book / e-reader", category: "activities" },
    { item: "Paracetamol / ibuprofen", category: "health" },
    { item: "Antihistamine tablets", category: "health" },
    { item: "Prescription medication (×trip days + 3)", category: "health" },
    { item: "Plasters & blister treatment", category: "health" },
    { item: "Cash (local currency)", category: "other" },
    { item: "Travel pillow (for the flight)", category: "other" },
    { item: "Padlock for luggage", category: "other" },
  ],
  "City break": [
    { item: "Passport / ID card", category: "documents" },
    { item: "Travel insurance certificate", category: "documents" },
    { item: "Flight / train tickets", category: "documents" },
    { item: "Hotel booking confirmation", category: "documents" },
    { item: "City transport card / pre-booked passes", category: "documents" },
    { item: "Museum / attraction tickets", category: "documents" },
    { item: "T-shirts (×4)", category: "clothing" },
    { item: "Long-sleeved shirt / blouse (×2)", category: "clothing" },
    { item: "Trousers / jeans (×2)", category: "clothing" },
    { item: "Smart casual dinner outfit (×1)", category: "clothing" },
    { item: "Light jacket / trench coat", category: "clothing" },
    { item: "Underwear (×6)", category: "clothing" },
    { item: "Socks (×5)", category: "clothing" },
    { item: "Comfortable walking shoes / trainers", category: "clothing" },
    { item: "Smart shoes / ankle boots", category: "clothing" },
    { item: "Sunglasses", category: "clothing" },
    { item: "Compact umbrella", category: "clothing" },
    { item: "Shampoo & conditioner (travel size)", category: "toiletries" },
    { item: "Deodorant", category: "toiletries" },
    { item: "Toothbrush & toothpaste", category: "toiletries" },
    { item: "Moisturiser / face cream", category: "toiletries" },
    { item: "Hand sanitiser", category: "toiletries" },
    { item: "Phone charger & cable", category: "tech" },
    { item: "Power bank", category: "tech" },
    { item: "Universal travel adapter", category: "tech" },
    { item: "Day backpack / tote bag", category: "activities" },
    { item: "Reusable water bottle", category: "activities" },
    { item: "Paracetamol / ibuprofen", category: "health" },
    { item: "Prescription medication (×trip days + 3)", category: "health" },
    { item: "Plasters (for blisters from walking!)", category: "health" },
    { item: "Cash (local currency + small notes)", category: "other" },
    { item: "Travel padlock", category: "other" },
  ],
  "Mountains": [
    { item: "Passport / ID card", category: "documents" },
    { item: "Travel insurance (incl. mountain rescue)", category: "documents" },
    { item: "National park passes / trail permits", category: "documents" },
    { item: "Moisture-wicking base layer top (×2)", category: "clothing" },
    { item: "Fleece / warm mid-layer jacket", category: "clothing" },
    { item: "Waterproof hardshell jacket", category: "clothing" },
    { item: "Hiking trousers (×2)", category: "clothing" },
    { item: "Merino wool or hiking socks (×5)", category: "clothing" },
    { item: "Hiking boots (broken in!)", category: "clothing" },
    { item: "Warm beanie hat", category: "clothing" },
    { item: "Sunglasses (UV400, wraparound)", category: "clothing" },
    { item: "Sunscreen SPF 50+", category: "toiletries" },
    { item: "Hand sanitiser", category: "toiletries" },
    { item: "Phone + charger (offline maps downloaded)", category: "tech" },
    { item: "Power bank (large capacity)", category: "tech" },
    { item: "Head torch + spare batteries", category: "tech" },
    { item: "Trekking poles (collapsible)", category: "activities" },
    { item: "Hiking backpack (25–40 L)", category: "activities" },
    { item: "Trail snacks / energy bars (×2 per day)", category: "activities" },
    { item: "Reusable water bottles (×2, 1 L each)", category: "activities" },
    { item: "First aid kit (plasters, bandages, antiseptic)", category: "health" },
    { item: "Ibuprofen (anti-inflammatory for muscle pain)", category: "health" },
    { item: "Prescription medication (×trip days + 3)", category: "health" },
    { item: "Cash (mountain huts often cash-only)", category: "other" },
  ],
  "Road trip": [
    { item: "Passport / ID card", category: "documents" },
    { item: "Driving licence", category: "documents" },
    { item: "Vehicle registration document", category: "documents" },
    { item: "Car insurance certificate", category: "documents" },
    { item: "Travel insurance certificate", category: "documents" },
    { item: "T-shirts (×5)", category: "clothing" },
    { item: "Trousers / jeans (×2)", category: "clothing" },
    { item: "Underwear (×7)", category: "clothing" },
    { item: "Comfortable driving shoes / loafers", category: "clothing" },
    { item: "Sunglasses (polarised for driving)", category: "clothing" },
    { item: "Toothbrush & toothpaste", category: "toiletries" },
    { item: "Deodorant", category: "toiletries" },
    { item: "Hand sanitiser (for petrol station stops)", category: "toiletries" },
    { item: "Phone mount / holder for windscreen/dashboard", category: "tech" },
    { item: "Car charger (USB / USB-C, dual port)", category: "tech" },
    { item: "Offline maps downloaded (Google / Waze)", category: "tech" },
    { item: "Reusable water bottles (×2)", category: "activities" },
    { item: "Snacks & drinks for the car", category: "activities" },
    { item: "Travel pillow & small blanket", category: "activities" },
    { item: "Paracetamol / ibuprofen", category: "health" },
    { item: "Prescription medication (×trip days + 3)", category: "health" },
    { item: "Reflective triangle / safety kit", category: "other" },
    { item: "Cash (tolls, rural areas, parking)", category: "other" },
  ],
};

export default function PackingSection({ tripId, currentUserId, members, initialItems, destinationCountry, tripType }: Props) {
  const t  = useTranslations("packing");
  const tc = useTranslations("common");
  const [open, setOpen]               = useState(true);
  const [items, setItems]             = useState<PackingItem[]>(initialItems);

  // AI suggestions state
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiPackingSuggestion[] | null>(null);
  const [aiAddedSet, setAiAddedSet]       = useState<Set<number>>(new Set());
  const [aiError, setAiError]             = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [newItem, setNewItem]         = useState("");
  const [newQty, setNewQty]           = useState<number | "">("");
  const [newCategory, setNewCategory] = useState("other");
  const [saving, setSaving]           = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [clearing, setClearing]       = useState(false);

  const memberName = (uid: string) => members.find(m => m.user_id === uid)?.name ?? "Member";

  const myItems     = items.filter(i => i.owner_user_id === currentUserId || i.owner_user_id === null);
  const othersShared = items.filter(i => i.owner_user_id !== null && i.owner_user_id !== currentUserId && i.is_shared);

  const myPacked  = myItems.filter(i => i.packed).length;
  const myTotal   = myItems.length;
  const myPct     = myTotal > 0 ? Math.round((myPacked / myTotal) * 100) : 0;
  const myAllDone = myTotal > 0 && myPacked === myTotal;

  const byCategory = (list: PackingItem[]) =>
    CATEGORIES.map(cat => ({
      ...cat,
      items: list.filter(i => i.category === cat.key),
    })).filter(cat => cat.items.length > 0);

  // Group others' shared items by owner
  const othersGrouped = Object.entries(
    othersShared.reduce<Record<string, PackingItem[]>>((acc, item) => {
      const uid = item.owner_user_id!;
      if (!acc[uid]) acc[uid] = [];
      acc[uid].push(item);
      return acc;
    }, {})
  );

  async function togglePacked(item: PackingItem) {
    if (item.owner_user_id !== null && item.owner_user_id !== currentUserId) return; // read-only
    const supabase = createClient();
    const next = !item.packed;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, packed: next } : i));
    await supabase.from("trip_packing_items").update({ packed: next }).eq("id", item.id);
  }

  async function toggleShared(item: PackingItem) {
    const supabase = createClient();
    const next = !item.is_shared;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_shared: next } : i));
    await supabase.from("trip_packing_items").update({ is_shared: next }).eq("id", item.id);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    setSaving(true);
    const qty = typeof newQty === "number" && newQty > 0 ? newQty : null;
    const itemName = fmtItem(newItem.trim(), qty);
    const supabase = createClient();
    const { data } = await supabase.from("trip_packing_items")
      .insert({ trip_id: tripId, item: itemName, category: newCategory, packed: false, owner_user_id: currentUserId, is_shared: false })
      .select("*").single();
    if (data) setItems(prev => [...prev, data as PackingItem]);
    setNewItem("");
    setNewQty("");
    setNewCategory("other");
    setShowForm(false);
    setSaving(false);
  }

  async function deleteItem(id: string) {
    const supabase = createClient();
    await supabase.from("trip_packing_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function updateQty(item: PackingItem, qty: number) {
    const { base } = parseQty(item.item);
    const newName = fmtItem(base, qty > 0 ? qty : null);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, item: newName } : i));
    const supabase = createClient();
    await supabase.from("trip_packing_items").update({ item: newName }).eq("id", item.id);
  }

  async function clearAll() {
    if (!confirm("Remove all your packing items?")) return;
    setClearing(true);
    const supabase = createClient();
    await supabase.from("trip_packing_items").delete()
      .eq("trip_id", tripId).eq("owner_user_id", currentUserId);
    setItems(prev => prev.filter(i => i.owner_user_id !== currentUserId));
    setClearing(false);
  }

  async function fetchAiSuggestions() {
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions(null);
    setAiAddedSet(new Set());
    try {
      const res = await fetch(`/api/trips/${tripId}/smart-packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationCountry, tripType }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? "Failed to generate suggestions"); }
      else { setAiSuggestions(data.suggestions ?? []); }
    } catch {
      setAiError("Network error. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  async function addAiSuggestion(s: AiPackingSuggestion, index: number) {
    if (aiAddedSet.has(index)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("trip_packing_items").insert({
      trip_id: tripId,
      item: s.item,
      category: s.category,
      packed: false,
      owner_user_id: currentUserId,
      is_shared: false,
    }).select("*").single();
    if (data) {
      setItems(prev => [...prev, data as PackingItem]);
      setAiAddedSet(prev => new Set([...prev, index]));
    }
  }

  async function applyTemplate(templateName: string) {
    const template = TEMPLATES[templateName];
    if (!template) return;
    setLoadingTemplate(true);
    const supabase = createClient();
    const existingLower = new Set(myItems.map(i => i.item.toLowerCase()));
    const toAdd = template.filter(t => !existingLower.has(t.item.toLowerCase()));
    if (toAdd.length > 0) {
      const payload = toAdd.map(t => ({ trip_id: tripId, item: t.item, category: t.category, packed: false, owner_user_id: currentUserId, is_shared: false }));
      const { data } = await supabase.from("trip_packing_items").insert(payload).select("*");
      if (data) setItems(prev => [...prev, ...(data as PackingItem[])]);
    }
    setLoadingTemplate(false);
  }

  return (
    <div className="card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-lg">{t("title")}</h2>
          {myTotal > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {myAllDone ? t("allPacked") : t("packedOf", { packed: myPacked, total: myTotal })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {isAiEnabled && open && !aiSuggestions && (
            <button onClick={fetchAiSuggestions} disabled={aiLoading} className="btn-ghost text-sm flex items-center gap-1.5">
              {aiLoading
                ? <><span className="animate-spin inline-block text-xs">⏳</span> {t("generating")}</>
                : <span>{t("aiSuggest")}</span>}
            </button>
          )}
          {aiSuggestions && (
            <button onClick={() => { setAiSuggestions(null); setAiAddedSet(new Set()); }} className="btn-ghost text-sm text-slate-400">
              {t("closeAi")}
            </button>
          )}
          <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm flex-shrink-0">{open ? tc("hide") : tc("show")}</button>
          {open && <button onClick={() => setShowForm(f => !f)} className="btn-ghost text-sm flex-shrink-0">
            {showForm ? tc("cancel") : t("addItem")}
          </button>}
        </div>
      </div>

      {open && <>
      {/* AI error */}
      {aiError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <span>{aiError}</span>
          <button onClick={() => setAiError(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* AI suggestions panel */}
      {aiSuggestions && aiSuggestions.length > 0 && (
        <div className="border border-indigo-200 rounded-xl overflow-hidden">
          <div className="bg-indigo-50 px-4 py-3">
            <p className="text-sm font-semibold text-indigo-800">{t("aiPanelTitle")}</p>
            <p className="text-xs text-indigo-500 mt-0.5">{aiSuggestions.length} · {t("aiPanelAdded", { added: aiAddedSet.size })}</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {aiSuggestions.map((s, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 transition ${aiAddedSet.has(i) ? "opacity-50 bg-emerald-50" : "bg-white hover:bg-slate-50"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{s.item}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.reason}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{s.category}</span>
                </div>
                <button
                  onClick={() => addAiSuggestion(s, i)}
                  disabled={aiAddedSet.has(i)}
                  className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition ${aiAddedSet.has(i) ? "text-emerald-600 bg-emerald-100" : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"}`}
                >
                  {aiAddedSet.has(i) ? t("added") : t("addSuggestion")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400 flex-shrink-0">{t("loadTemplate")}</span>
        {Object.keys(TEMPLATES).map(t => (
          <button key={t} onClick={() => applyTemplate(t)} disabled={loadingTemplate || clearing}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition whitespace-nowrap disabled:opacity-50">
            {loadingTemplate ? "…" : t}
          </button>
        ))}
        {myTotal > 0 && (
          <button onClick={clearAll} disabled={clearing || loadingTemplate}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50 transition whitespace-nowrap disabled:opacity-50 ml-auto">
            {clearing ? "Clearing…" : "🗑 Clear mine"}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {myTotal > 0 && (
        <div>
          <div className="h-2 rounded-full overflow-hidden bg-slate-100">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${myPct}%`, background: myAllDone ? "#10b981" : "#6366f1" }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{myPct}% packed</span>
            <span>{myTotal - myPacked} remaining</span>
          </div>
        </div>
      )}

      {/* Add item form */}
      {showForm && (
        <form onSubmit={addItem} className="flex flex-wrap gap-2">
          <select className="input text-sm flex-shrink-0 w-36"
            value={newCategory} onChange={e => setNewCategory(e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <input className="input text-sm min-w-0 flex-1" value={newItem}
            onChange={e => setNewItem(e.target.value)} placeholder="Item name…" autoFocus required />
          <input
            type="number" min="1" max="99"
            className="input text-sm w-16 flex-shrink-0 text-center"
            value={newQty}
            onChange={e => setNewQty(e.target.value === "" ? "" : parseInt(e.target.value))}
            placeholder="Qty"
          />
          <button type="submit" disabled={saving || !newItem.trim()} className="btn-primary text-sm flex-shrink-0">
            {saving ? "…" : "Add"}
          </button>
        </form>
      )}

      {/* My items by category */}
      {myTotal === 0 ? (
        <div className="py-4 text-center">
          <p className="text-slate-400 text-sm">{t("noItems")}</p>
          <p className="text-xs text-slate-400 mt-1">{t("loadTemplate")} …</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byCategory(myItems).map(cat => (
            <div key={cat.key}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                {cat.emoji} {cat.label}
              </p>
              <div className="space-y-0.5">
                {cat.items.map(item => {
                  const isOwn = item.owner_user_id === currentUserId || item.owner_user_id === null;
                  const { base, qty } = parseQty(item.item);
                  return (
                    <div key={item.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition group">
                      <button onClick={() => togglePacked(item)}
                        className={[
                          "rounded border-2 flex-shrink-0 flex items-center justify-center transition",
                          item.packed
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 hover:border-indigo-400",
                        ].join(" ")}
                        style={{ width: "18px", height: "18px", minWidth: "18px" }}>
                        {item.packed && <span style={{ fontSize: "10px", lineHeight: 1 }}>✓</span>}
                      </button>
                      <span className={`flex-1 min-w-0 text-sm break-words transition ${item.packed ? "line-through text-slate-400" : "text-slate-700"}`}>
                        {base}
                      </span>
                      {/* Inline qty editor — only for items with a quantity and own items */}
                      {qty !== null && isOwn && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-slate-400">×</span>
                          <input
                            type="number" min="1" max="99"
                            value={qty}
                            onChange={e => {
                              const v = parseInt(e.target.value);
                              if (!isNaN(v)) setItems(prev => prev.map(i => i.id === item.id ? { ...i, item: fmtItem(base, v) } : i));
                            }}
                            onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) updateQty(item, v); }}
                            className="w-10 text-center text-xs border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            onClick={e => e.currentTarget.select()}
                          />
                        </div>
                      )}
                      {qty !== null && !isOwn && (
                        <span className="text-xs text-slate-400 flex-shrink-0">×{qty}</span>
                      )}
                      {/* Visibility toggle — only on own items */}
                      {isOwn && (
                        <button
                          onClick={() => toggleShared(item)}
                          title={item.is_shared ? "Visible to group — click to make private" : "Only you — click to share with group"}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs flex-shrink-0 transition px-1.5 py-0.5 rounded-md"
                        >
                          {item.is_shared
                            ? <span className="text-indigo-500">👥</span>
                            : <span className="text-slate-300 hover:text-slate-500">🔒</span>}
                        </button>
                      )}
                      {isOwn && (
                        <button onClick={() => deleteItem(item.id)}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition flex-shrink-0 w-6 text-center"
                          aria-label="Delete item">
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Others' shared items */}
      {othersGrouped.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Shared by the group</p>
          {othersGrouped.map(([uid, ownedItems]) => (
            <div key={uid}>
              <p className="text-xs font-medium text-slate-500 mb-1.5">{memberName(uid)}</p>
              <div className="space-y-0.5">
                {byCategory(ownedItems).flatMap(cat =>
                  cat.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-slate-50">
                      <div
                        className={[
                          "rounded border-2 flex-shrink-0 flex items-center justify-center",
                          item.packed
                            ? "border-emerald-400 bg-emerald-400 text-white"
                            : "border-slate-200",
                        ].join(" ")}
                        style={{ width: "18px", height: "18px", minWidth: "18px" }}>
                        {item.packed && <span style={{ fontSize: "10px", lineHeight: 1 }}>✓</span>}
                      </div>
                      <span className={`flex-1 text-sm ${item.packed ? "line-through text-slate-400" : "text-slate-600"}`}>
                        {item.item}
                      </span>
                      <span className="text-xs text-slate-300">{cat.emoji}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </>}
    </div>
  );
}
