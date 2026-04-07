"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PackingItem {
  id: string;
  trip_id: string;
  item: string;
  category: string;
  packed: boolean;
  created_at: string;
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
    // Documents
    { item: "Passport / ID card", category: "documents" },
    { item: "Travel insurance certificate", category: "documents" },
    { item: "Flight tickets (printed or saved offline)", category: "documents" },
    { item: "Hotel booking confirmation", category: "documents" },
    { item: "Travel visas (if required)", category: "documents" },
    // Clothing
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
    { item: "Sports bra (×2, if needed)", category: "clothing" },
    { item: "Belt", category: "clothing" },
    // Toiletries
    { item: "Sunscreen SPF 50+", category: "toiletries" },
    { item: "After-sun lotion / aloe vera gel", category: "toiletries" },
    { item: "Shampoo & conditioner", category: "toiletries" },
    { item: "Shower gel / soap", category: "toiletries" },
    { item: "Deodorant", category: "toiletries" },
    { item: "Toothbrush & toothpaste", category: "toiletries" },
    { item: "Razor & shaving gel", category: "toiletries" },
    { item: "Lip balm with SPF", category: "toiletries" },
    { item: "Moisturiser / face cream", category: "toiletries" },
    { item: "Insect repellent", category: "toiletries" },
    { item: "Hand sanitiser", category: "toiletries" },
    { item: "Perfume / cologne", category: "toiletries" },
    // Tech
    { item: "Phone charger & cable", category: "tech" },
    { item: "Power bank / portable charger", category: "tech" },
    { item: "Universal travel adapter", category: "tech" },
    { item: "Waterproof phone case / dry bag", category: "tech" },
    { item: "Camera + memory card", category: "tech" },
    { item: "Earphones / wireless earbuds", category: "tech" },
    // Activities
    { item: "Beach towel (×2)", category: "activities" },
    { item: "Snorkelling mask & fins", category: "activities" },
    { item: "Beach bag", category: "activities" },
    { item: "Reusable water bottle", category: "activities" },
    { item: "Book / e-reader", category: "activities" },
    { item: "Travel games / cards", category: "activities" },
    // Health
    { item: "Paracetamol / ibuprofen", category: "health" },
    { item: "Antihistamine tablets", category: "health" },
    { item: "Prescription medication (×trip days + 3)", category: "health" },
    { item: "Plasters & blister treatment", category: "health" },
    { item: "Antidiarrhoeal tablets", category: "health" },
    // Other
    { item: "Reusable shopping bags", category: "other" },
    { item: "Travel pillow (for the flight)", category: "other" },
    { item: "Cash (local currency)", category: "other" },
    { item: "Padlock for luggage", category: "other" },
  ],

  "City break": [
    // Documents
    { item: "Passport / ID card", category: "documents" },
    { item: "Travel insurance certificate", category: "documents" },
    { item: "Flight / train tickets", category: "documents" },
    { item: "Hotel booking confirmation", category: "documents" },
    { item: "City transport card / pre-booked passes", category: "documents" },
    { item: "Museum / attraction tickets", category: "documents" },
    // Clothing
    { item: "T-shirts (×4)", category: "clothing" },
    { item: "Long-sleeved shirt / blouse (×2)", category: "clothing" },
    { item: "Trousers / jeans (×2)", category: "clothing" },
    { item: "Chinos / smart trousers (×1)", category: "clothing" },
    { item: "Casual dress / skirt (×1, if applicable)", category: "clothing" },
    { item: "Smart casual dinner outfit (×1)", category: "clothing" },
    { item: "Light jacket / trench coat", category: "clothing" },
    { item: "Underwear (×6)", category: "clothing" },
    { item: "Socks (×5)", category: "clothing" },
    { item: "Pyjamas / sleepwear", category: "clothing" },
    { item: "Comfortable walking shoes / trainers", category: "clothing" },
    { item: "Smart shoes / ankle boots / heels", category: "clothing" },
    { item: "Sunglasses", category: "clothing" },
    { item: "Compact umbrella", category: "clothing" },
    { item: "Scarf (cold evenings / religious sites)", category: "clothing" },
    { item: "Belt", category: "clothing" },
    { item: "Watch", category: "clothing" },
    // Toiletries
    { item: "Shampoo & conditioner (travel size)", category: "toiletries" },
    { item: "Shower gel / soap bar", category: "toiletries" },
    { item: "Deodorant", category: "toiletries" },
    { item: "Toothbrush & toothpaste", category: "toiletries" },
    { item: "Razor & shaving gel", category: "toiletries" },
    { item: "Moisturiser / face cream", category: "toiletries" },
    { item: "Lip balm", category: "toiletries" },
    { item: "Perfume / cologne", category: "toiletries" },
    { item: "Hand sanitiser", category: "toiletries" },
    { item: "Sunscreen SPF 30+", category: "toiletries" },
    // Tech
    { item: "Phone charger & cable", category: "tech" },
    { item: "Power bank", category: "tech" },
    { item: "Universal travel adapter", category: "tech" },
    { item: "Laptop / tablet + charger (if needed)", category: "tech" },
    { item: "Noise-cancelling headphones", category: "tech" },
    { item: "Camera", category: "tech" },
    // Activities
    { item: "Day backpack / tote bag", category: "activities" },
    { item: "Reusable water bottle", category: "activities" },
    { item: "Offline maps downloaded (Google / Maps.me)", category: "activities" },
    { item: "Guidebook or printed highlights", category: "activities" },
    { item: "Journal / notebook + pen", category: "activities" },
    // Health
    { item: "Paracetamol / ibuprofen", category: "health" },
    { item: "Prescription medication (×trip days + 3)", category: "health" },
    { item: "Plasters (for blisters from walking!)", category: "health" },
    { item: "Motion sickness tablets (if needed)", category: "health" },
    // Other
    { item: "Cash (local currency + small notes)", category: "other" },
    { item: "Reusable shopping bag", category: "other" },
    { item: "Travel padlock", category: "other" },
    { item: "Earplugs (city noise)", category: "other" },
  ],

  "Mountains": [
    // Documents
    { item: "Passport / ID card", category: "documents" },
    { item: "Travel insurance (incl. mountain rescue)", category: "documents" },
    { item: "Emergency contact card", category: "documents" },
    { item: "National park passes / trail permits", category: "documents" },
    { item: "Accommodation confirmation", category: "documents" },
    // Clothing
    { item: "Moisture-wicking base layer top (×2)", category: "clothing" },
    { item: "Moisture-wicking base layer leggings / bottoms (×2)", category: "clothing" },
    { item: "Thermal underwear top (for cold nights)", category: "clothing" },
    { item: "Thermal underwear bottoms (for cold nights)", category: "clothing" },
    { item: "Fleece / warm mid-layer jacket", category: "clothing" },
    { item: "Insulated down jacket (for cold peaks)", category: "clothing" },
    { item: "Waterproof hardshell jacket", category: "clothing" },
    { item: "Waterproof over-trousers", category: "clothing" },
    { item: "Hiking trousers (×2)", category: "clothing" },
    { item: "T-shirts (×3)", category: "clothing" },
    { item: "Merino wool or hiking socks (×5)", category: "clothing" },
    { item: "Underwear — moisture-wicking (×5)", category: "clothing" },
    { item: "Sports bra (×2, if applicable)", category: "clothing" },
    { item: "Pyjamas / sleepwear (warm)", category: "clothing" },
    { item: "Hiking boots (broken in!)", category: "clothing" },
    { item: "Camp sandals / flip flops (for hut/camp)", category: "clothing" },
    { item: "Warm beanie hat", category: "clothing" },
    { item: "Lightweight gloves", category: "clothing" },
    { item: "Buff / neck gaiter", category: "clothing" },
    { item: "Sunglasses (UV400, wraparound)", category: "clothing" },
    { item: "Gaiters (for mud / snow)", category: "clothing" },
    // Toiletries
    { item: "Sunscreen SPF 50+ (high altitude — burns faster)", category: "toiletries" },
    { item: "Lip balm with SPF 30+", category: "toiletries" },
    { item: "Deodorant", category: "toiletries" },
    { item: "Toothbrush & toothpaste", category: "toiletries" },
    { item: "Biodegradable soap / wet wipes", category: "toiletries" },
    { item: "Hand sanitiser", category: "toiletries" },
    { item: "Dry shampoo", category: "toiletries" },
    // Tech
    { item: "Phone + charger (offline maps downloaded)", category: "tech" },
    { item: "Power bank (large capacity)", category: "tech" },
    { item: "Head torch + spare batteries", category: "tech" },
    { item: "GPS device or satellite communicator", category: "tech" },
    { item: "Camera + spare batteries", category: "tech" },
    { item: "Solar charger (multi-day trips)", category: "tech" },
    // Activities
    { item: "Trekking poles (collapsible)", category: "activities" },
    { item: "Hiking backpack (25–40 L)", category: "activities" },
    { item: "Trail snacks / energy bars (×2 per day)", category: "activities" },
    { item: "Reusable water bottles (×2, 1 L each)", category: "activities" },
    { item: "Water purification tablets or filter", category: "activities" },
    { item: "Paper map & compass (don't rely only on phone)", category: "activities" },
    { item: "Emergency whistle", category: "activities" },
    { item: "Sleeping bag liner", category: "activities" },
    { item: "Lightweight tent (if camping)", category: "activities" },
    { item: "Microfibre towel", category: "activities" },
    // Health
    { item: "First aid kit (plasters, bandages, antiseptic)", category: "health" },
    { item: "Blister plasters (Compeed)", category: "health" },
    { item: "Ibuprofen (anti-inflammatory for muscle pain)", category: "health" },
    { item: "Prescription medication (×trip days + 3)", category: "health" },
    { item: "Altitude sickness tablets (if going above 3000 m)", category: "health" },
    { item: "Emergency space blanket", category: "health" },
    { item: "Knee supports / sports tape (if needed)", category: "health" },
    // Other
    { item: "Cash (mountain huts often cash-only)", category: "other" },
    { item: "Reusable ziplock bags (keep gear dry)", category: "other" },
    { item: "Bin bags (leave no trace)", category: "other" },
  ],

  "Road trip": [
    // Documents
    { item: "Passport / ID card", category: "documents" },
    { item: "Driving licence", category: "documents" },
    { item: "Vehicle registration document", category: "documents" },
    { item: "Car insurance certificate", category: "documents" },
    { item: "Travel insurance certificate", category: "documents" },
    { item: "Printed / downloaded route & hotel addresses", category: "documents" },
    { item: "Emergency breakdown service card", category: "documents" },
    // Clothing
    { item: "T-shirts (×5)", category: "clothing" },
    { item: "Long-sleeved shirt / overshirt (×2)", category: "clothing" },
    { item: "Trousers / jeans (×2)", category: "clothing" },
    { item: "Shorts (×2)", category: "clothing" },
    { item: "Casual dress / skirt (×1, if applicable)", category: "clothing" },
    { item: "Smart outfit for dinners (×1)", category: "clothing" },
    { item: "Underwear (×7)", category: "clothing" },
    { item: "Socks (×7)", category: "clothing" },
    { item: "Pyjamas / sleepwear", category: "clothing" },
    { item: "Comfortable driving shoes / loafers", category: "clothing" },
    { item: "Trainers / sneakers", category: "clothing" },
    { item: "Light jacket / hoodie", category: "clothing" },
    { item: "Sunglasses (polarised for driving)", category: "clothing" },
    { item: "Belt", category: "clothing" },
    { item: "Scarf / light blanket (passenger comfort)", category: "clothing" },
    // Toiletries
    { item: "Toothbrush & toothpaste", category: "toiletries" },
    { item: "Deodorant", category: "toiletries" },
    { item: "Shampoo & conditioner", category: "toiletries" },
    { item: "Shower gel", category: "toiletries" },
    { item: "Moisturiser & sunscreen SPF 30+", category: "toiletries" },
    { item: "Hand sanitiser (for petrol station stops)", category: "toiletries" },
    { item: "Wet wipes / travel tissue packs", category: "toiletries" },
    // Tech
    { item: "Phone mount / holder for windscreen/dashboard", category: "tech" },
    { item: "Car charger (USB / USB-C, dual port)", category: "tech" },
    { item: "Offline maps downloaded (Google / Waze)", category: "tech" },
    { item: "Aux cable / Bluetooth adapter (if no CarPlay)", category: "tech" },
    { item: "Dashcam (if you have one)", category: "tech" },
    { item: "Power bank (for phones when parked)", category: "tech" },
    // Activities
    { item: "Road trip playlist / podcasts downloaded", category: "activities" },
    { item: "Reusable water bottles (×2)", category: "activities" },
    { item: "Snacks & drinks for the car", category: "activities" },
    { item: "Cool bag / portable cooler", category: "activities" },
    { item: "Travel pillow & small blanket", category: "activities" },
    { item: "Sunshade for windscreen (for parking)", category: "activities" },
    { item: "Road atlas / fold-out map (backup)", category: "activities" },
    // Health
    { item: "Paracetamol / ibuprofen", category: "health" },
    { item: "Prescription medication (×trip days + 3)", category: "health" },
    { item: "Motion sickness tablets (for passengers)", category: "health" },
    { item: "Plasters & antiseptic wipes", category: "health" },
    { item: "Eye drops (long driving sessions)", category: "health" },
    // Other
    { item: "Reflective triangle / safety kit (legally required in many countries)", category: "other" },
    { item: "Hi-vis vest (legally required in many countries)", category: "other" },
    { item: "Spare tyre & jack — check before leaving!", category: "other" },
    { item: "Jump cables or portable jump starter", category: "other" },
    { item: "Cash (tolls, rural areas, parking)", category: "other" },
    { item: "Reusable bags (for shopping stops)", category: "other" },
    { item: "Bin bag for car rubbish", category: "other" },
  ],
};

export default function PackingSection({
  tripId,
  initialItems,
}: {
  tripId: string;
  initialItems: PackingItem[];
}) {
  const [items, setItems]             = useState<PackingItem[]>(initialItems);
  const [showForm, setShowForm]       = useState(false);
  const [newItem, setNewItem]         = useState("");
  const [newCategory, setNewCategory] = useState("other");
  const [saving, setSaving]           = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [clearing, setClearing]       = useState(false);

  const packed   = items.filter(i => i.packed).length;
  const total    = items.length;
  const pct      = total > 0 ? Math.round((packed / total) * 100) : 0;
  const allDone  = total > 0 && packed === total;

  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(i => i.category === cat.key),
  })).filter(cat => cat.items.length > 0);

  async function togglePacked(item: PackingItem) {
    const supabase = createClient();
    const next = !item.packed;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, packed: next } : i));
    await supabase.from("trip_packing_items").update({ packed: next }).eq("id", item.id);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase.from("trip_packing_items")
      .insert({ trip_id: tripId, item: newItem.trim(), category: newCategory, packed: false })
      .select("*").single();
    if (data) setItems(prev => [...prev, data as PackingItem]);
    setNewItem("");
    setNewCategory("other");
    setShowForm(false);
    setSaving(false);
  }

  async function deleteItem(id: string) {
    const supabase = createClient();
    await supabase.from("trip_packing_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function clearAll() {
    if (!confirm("Remove all packing items?")) return;
    setClearing(true);
    const supabase = createClient();
    await supabase.from("trip_packing_items").delete().eq("trip_id", tripId);
    setItems([]);
    setClearing(false);
  }

  async function applyTemplate(templateName: string) {
    const template = TEMPLATES[templateName];
    if (!template) return;
    setLoadingTemplate(true);
    const supabase = createClient();
    const existingLower = new Set(items.map(i => i.item.toLowerCase()));
    const toAdd = template.filter(t => !existingLower.has(t.item.toLowerCase()));
    if (toAdd.length > 0) {
      const payload = toAdd.map(t => ({ trip_id: tripId, item: t.item, category: t.category, packed: false }));
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
          <h2 className="font-bold text-slate-900 text-lg">🎒 Packing list</h2>
          {total > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {allDone ? "✓ All packed!" : `${packed} of ${total} packed`}
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(f => !f)} className="btn-ghost text-sm flex-shrink-0">
          {showForm ? "Cancel" : "+ Add item"}
        </button>
      </div>

      {/* Templates */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400 flex-shrink-0">Load template:</span>
        {Object.keys(TEMPLATES).map(t => (
          <button key={t} onClick={() => applyTemplate(t)} disabled={loadingTemplate || clearing}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition whitespace-nowrap disabled:opacity-50">
            {loadingTemplate ? "…" : t}
          </button>
        ))}
        {total > 0 && (
          <button onClick={clearAll} disabled={clearing || loadingTemplate}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50 transition whitespace-nowrap disabled:opacity-50 ml-auto">
            {clearing ? "Clearing…" : "🗑 Clear all"}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div>
          <div className="h-2 rounded-full overflow-hidden bg-slate-100">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: allDone ? "#10b981" : "#6366f1" }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{pct}% packed</span>
            <span>{total - packed} remaining</span>
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
          <button type="submit" disabled={saving || !newItem.trim()} className="btn-primary text-sm flex-shrink-0">
            {saving ? "…" : "Add"}
          </button>
        </form>
      )}

      {/* Items by category */}
      {total === 0 ? (
        <div className="py-6 text-center">
          <p className="text-slate-400 text-sm">No items yet.</p>
          <p className="text-xs text-slate-400 mt-1">Load a template above or add items manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byCategory.map(cat => (
            <div key={cat.key}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                {cat.emoji} {cat.label}
              </p>
              <div className="space-y-0.5">
                {cat.items.map(item => (
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
                      {item.item}
                    </span>
                    <button onClick={() => deleteItem(item.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition flex-shrink-0 w-6 text-center"
                      aria-label="Delete item">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
