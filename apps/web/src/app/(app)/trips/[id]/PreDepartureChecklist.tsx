"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface CheckRow {
  item_id: string;
  is_checked: boolean;
  is_shared: boolean;
  is_removed: boolean;
  label: string | null;
  user_id: string;
}

interface Props {
  tripId: string;
  currentUserId: string;
  members: { user_id: string; name: string }[];
  initialChecks: CheckRow[];
}

interface CheckItem { id: string; label: string }
interface Section { title: string; emoji: string; items: CheckItem[] }

const SECTIONS: Section[] = [
  {
    title: "At home — before you leave",
    emoji: "🏠",
    items: [
      { id: "lock_doors",       label: "Lock all doors and windows" },
      { id: "lock_garage",      label: "Lock the garage" },
      { id: "unplug",           label: "Unplug appliances (iron, toaster, etc.)" },
      { id: "thermostat",       label: "Adjust thermostat / turn off AC or heating" },
      { id: "stop_mail",        label: "Stop mail delivery or ask a neighbour to collect" },
      { id: "water_plants",     label: "Water plants / arrange plant care" },
      { id: "pet_care",         label: "Arrange pet care / kennel" },
      { id: "notify_bank",      label: "Notify bank of travel (or activate travel mode)" },
      { id: "notify_neighbour", label: "Tell a trusted neighbour you're away" },
      { id: "home_insurance",   label: "Check home insurance covers absence" },
      { id: "empty_fridge",     label: "Empty fridge / dispose of perishables" },
      { id: "take_out_bins",    label: "Take out bins" },
    ],
  },
  {
    title: "Work & digital",
    emoji: "💼",
    items: [
      { id: "out_of_office",    label: "Set out-of-office email reply" },
      { id: "team_handover",    label: "Hand over any urgent tasks to colleagues" },
      { id: "backup_phone",     label: "Back up phone" },
      { id: "download_offline", label: "Download offline maps / media for the journey" },
      { id: "roaming",          label: "Enable roaming or buy eSIM for destination" },
      { id: "important_docs",   label: "Save important docs offline (hotel, insurance)" },
      { id: "photo_docs",       label: "Photo/scan your passport and cards (store in cloud)" },
    ],
  },
  {
    title: "Money & travel",
    emoji: "💳",
    items: [
      { id: "local_currency",   label: "Get local currency or check card works abroad" },
      { id: "card_pin",         label: "Know your card PINs" },
      { id: "emergency_cash",   label: "Keep some emergency cash separate from wallet" },
      { id: "travel_insurance", label: "Confirm travel insurance is active and covers activities" },
      { id: "check_passport",   label: "Passport valid for 6+ months beyond return date" },
      { id: "visa_check",       label: "Visa / entry requirements confirmed" },
      { id: "checkin",          label: "Online check-in done (if flying)" },
      { id: "boarding_pass",    label: "Boarding pass saved offline or printed" },
    ],
  },
  {
    title: "At the airport / station",
    emoji: "🛫",
    items: [
      { id: "arrive_early",    label: "Arrived with enough time (2 h domestic, 3 h intl)" },
      { id: "luggage_weight",  label: "Luggage within weight limits" },
      { id: "liquids_bag",     label: "Liquids in 100 ml containers in clear bag (carry-on)" },
      { id: "electronics_out", label: "Electronics & liquids ready for security tray" },
      { id: "gate_check",      label: "Checked departure gate" },
    ],
  },
];

const ALL_STANDARD_ITEMS = SECTIONS.flatMap(s => s.items);

function generateId() {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function PreDepartureChecklist({ tripId, currentUserId, members, initialChecks }: Props) {
  const [checks, setChecks] = useState<CheckRow[]>(initialChecks);
  const [collapsed, setCollapsed] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [saving, setSaving] = useState(false);

  const memberName = (uid: string) => members.find(m => m.user_id === uid)?.name ?? "Member";

  function myCheck(itemId: string): CheckRow | undefined {
    return checks.find(c => c.user_id === currentUserId && c.item_id === itemId);
  }

  function othersChecked(itemId: string): string[] {
    return checks
      .filter(c => c.user_id !== currentUserId && c.is_shared && c.is_checked && c.item_id === itemId)
      .map(c => memberName(c.user_id));
  }

  // Standard items visible to current user (not removed by them)
  const removedIds = new Set(
    checks.filter(c => c.user_id === currentUserId && c.is_removed).map(c => c.item_id)
  );
  const visibleStandardItems = ALL_STANDARD_ITEMS.filter(i => !removedIds.has(i.id));
  const hiddenCount = removedIds.size;

  // Custom items added by current user
  const myCustomItems = checks.filter(c => c.user_id === currentUserId && c.label !== null && !c.is_removed);

  const allVisible = [...visibleStandardItems.map(i => i.id), ...myCustomItems.map(c => c.item_id)];
  const myCheckedCount = allVisible.filter(id => myCheck(id)?.is_checked).length;
  const total = allVisible.length;
  const pct = total > 0 ? Math.round((myCheckedCount / total) * 100) : 0;
  const allDone = total > 0 && myCheckedCount === total;

  async function upsert(itemId: string, patch: Partial<CheckRow>) {
    const existing = myCheck(itemId) ?? { item_id: itemId, is_checked: false, is_shared: false, is_removed: false, label: null, user_id: currentUserId };
    const next = { ...existing, ...patch };

    setChecks(prev => {
      const without = prev.filter(c => !(c.user_id === currentUserId && c.item_id === itemId));
      return [...without, next];
    });

    const supabase = createClient();
    await supabase.from("trip_predeparture_checks").upsert(
      { trip_id: tripId, user_id: currentUserId, item_id: itemId, is_checked: next.is_checked, is_shared: next.is_shared, is_removed: next.is_removed, label: next.label, updated_at: new Date().toISOString() },
      { onConflict: "trip_id,user_id,item_id" }
    );
  }

  async function addCustomItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setSaving(true);
    const itemId = generateId();
    const supabase = createClient();
    const { data } = await supabase.from("trip_predeparture_checks")
      .insert({ trip_id: tripId, user_id: currentUserId, item_id: itemId, label: newLabel.trim(), is_checked: false, is_shared: false, is_removed: false })
      .select("item_id, is_checked, is_shared, is_removed, label, user_id")
      .single();
    if (data) setChecks(prev => [...prev, data as CheckRow]);
    setNewLabel("");
    setAddingItem(false);
    setSaving(false);
  }

  async function removeCustomItem(itemId: string) {
    const supabase = createClient();
    setChecks(prev => prev.filter(c => !(c.user_id === currentUserId && c.item_id === itemId)));
    await supabase.from("trip_predeparture_checks")
      .delete().eq("trip_id", tripId).eq("user_id", currentUserId).eq("item_id", itemId);
  }

  function renderItem(itemId: string, label: string, isCustom: boolean) {
    const mine = myCheck(itemId);
    const isChecked = mine?.is_checked ?? false;
    const isShared = mine?.is_shared ?? false;
    const alsoChecked = othersChecked(itemId);

    return (
      <div key={itemId} className="group">
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition">
          <div
            onClick={() => upsert(itemId, { is_checked: !isChecked })}
            className={[
              "rounded border-2 flex-shrink-0 flex items-center justify-center transition cursor-pointer",
              isChecked
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-300 group-hover:border-indigo-400",
            ].join(" ")}
            style={{ width: "18px", height: "18px", minWidth: "18px" }}>
            {isChecked && <span style={{ fontSize: "10px", lineHeight: 1 }}>✓</span>}
          </div>
          <span
            onClick={() => upsert(itemId, { is_checked: !isChecked })}
            className={`flex-1 text-sm transition cursor-pointer select-none ${isChecked ? "line-through text-slate-400" : "text-slate-700"}`}>
            {label}
          </span>
          {/* Visibility toggle */}
          <button
            onClick={() => upsert(itemId, { is_shared: !isShared })}
            title={isShared ? "Visible to group — click to make private" : "Only you — click to share with group"}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs flex-shrink-0 transition px-1 py-0.5 rounded"
          >
            {isShared
              ? <span className="text-indigo-500">👥</span>
              : <span className="text-slate-300 hover:text-slate-500">🔒</span>}
          </button>
          {/* Remove button */}
          <button
            onClick={() => isCustom ? removeCustomItem(itemId) : upsert(itemId, { is_removed: true })}
            title="Remove from my list"
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition flex-shrink-0 w-5 text-center"
          >
            ✕
          </button>
        </div>
        {alsoChecked.length > 0 && (
          <p className="text-xs text-slate-400 pl-9 pb-1">
            Also done: {alsoChecked.join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-lg">✅ Pre-departure checklist</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {allDone && total > 0 ? "All done — have a great trip!" : `${myCheckedCount} of ${total} checked`}
          </p>
        </div>
        <button onClick={() => setCollapsed(c => !c)} className="btn-ghost text-sm flex-shrink-0">
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-2 rounded-full overflow-hidden bg-slate-100">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: allDone && total > 0 ? "#10b981" : "#6366f1" }} />
        </div>
        <p className="text-xs text-slate-400 mt-1">{pct}% complete</p>
      </div>

      {!collapsed && (
        <div className="space-y-5">
          {/* Standard sections */}
          {SECTIONS.map(section => {
            const visible = section.items.filter(i => !removedIds.has(i.id));
            if (visible.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {section.emoji} {section.title}
                </p>
                <div className="space-y-0.5">
                  {visible.map(item => renderItem(item.id, item.label, false))}
                </div>
              </div>
            );
          })}

          {/* Custom items */}
          {myCustomItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                ✏️ My additions
              </p>
              <div className="space-y-0.5">
                {myCustomItems.map(c => renderItem(c.item_id, c.label!, true))}
              </div>
            </div>
          )}

          {/* Add custom item */}
          <div>
            {addingItem ? (
              <form onSubmit={addCustomItem} className="flex gap-2 mt-1">
                <input
                  className="input text-sm flex-1 min-w-0"
                  placeholder="e.g. Feed the fish"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" disabled={saving || !newLabel.trim()} className="btn-primary text-sm flex-shrink-0">
                  {saving ? "…" : "Add"}
                </button>
                <button type="button" onClick={() => { setAddingItem(false); setNewLabel(""); }} className="btn-ghost text-sm flex-shrink-0">
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setAddingItem(true)}
                className="text-sm text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1.5 transition mt-1"
              >
                <span>＋</span> Add item
              </button>
            )}
          </div>

          {/* Hidden items restore */}
          {hiddenCount > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowHidden(s => !s)}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                {showHidden ? "Hide" : `Show ${hiddenCount} removed item${hiddenCount !== 1 ? "s" : ""}`}
              </button>
              {showHidden && (
                <div className="mt-2 space-y-0.5">
                  {ALL_STANDARD_ITEMS.filter(i => removedIds.has(i.id)).map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-1 px-2 text-slate-400">
                      <span className="flex-1 text-sm line-through">{item.label}</span>
                      <button
                        onClick={() => upsert(item.id, { is_removed: false })}
                        className="text-xs text-indigo-500 hover:text-indigo-700 transition"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
