"use client";

import { useState, useEffect } from "react";

interface CheckItem { id: string; label: string }
interface Section { title: string; emoji: string; items: CheckItem[] }

const SECTIONS: Section[] = [
  {
    title: "At home — before you leave",
    emoji: "🏠",
    items: [
      { id: "lock_doors",     label: "Lock all doors and windows" },
      { id: "lock_garage",    label: "Lock the garage" },
      { id: "unplug",         label: "Unplug appliances (iron, toaster, etc.)" },
      { id: "thermostat",     label: "Adjust thermostat / turn off AC or heating" },
      { id: "stop_mail",      label: "Stop mail delivery or ask a neighbour to collect" },
      { id: "water_plants",   label: "Water plants / arrange plant care" },
      { id: "pet_care",       label: "Arrange pet care / kennel" },
      { id: "notify_bank",    label: "Notify bank of travel (or activate travel mode)" },
      { id: "notify_neighbour", label: "Tell a trusted neighbour you're away" },
      { id: "home_insurance", label: "Check home insurance covers absence" },
      { id: "empty_fridge",   label: "Empty fridge / dispose of perishables" },
      { id: "take_out_bins",  label: "Take out bins" },
    ],
  },
  {
    title: "Work & digital",
    emoji: "💼",
    items: [
      { id: "out_of_office",  label: "Set out-of-office email reply" },
      { id: "team_handover",  label: "Hand over any urgent tasks to colleagues" },
      { id: "backup_phone",   label: "Back up phone" },
      { id: "download_offline", label: "Download offline maps / media for the journey" },
      { id: "roaming",        label: "Enable roaming or buy eSIM for destination" },
      { id: "important_docs", label: "Save important docs offline (hotel, insurance)" },
      { id: "photo_docs",     label: "Photo/scan your passport and cards (store in cloud)" },
    ],
  },
  {
    title: "Money & travel",
    emoji: "💳",
    items: [
      { id: "local_currency", label: "Get local currency or check card works abroad" },
      { id: "card_pin",       label: "Know your card PINs" },
      { id: "emergency_cash", label: "Keep some emergency cash separate from wallet" },
      { id: "travel_insurance", label: "Confirm travel insurance is active and covers activities" },
      { id: "check_passport", label: "Passport valid for 6+ months beyond return date" },
      { id: "visa_check",     label: "Visa / entry requirements confirmed" },
      { id: "checkin",        label: "Online check-in done (if flying)" },
      { id: "boarding_pass",  label: "Boarding pass saved offline or printed" },
    ],
  },
  {
    title: "At the airport / station",
    emoji: "🛫",
    items: [
      { id: "arrive_early",   label: "Arrived with enough time (2 h domestic, 3 h intl)" },
      { id: "luggage_weight", label: "Luggage within weight limits" },
      { id: "liquids_bag",    label: "Liquids in 100 ml containers in clear bag (carry-on)" },
      { id: "electronics_out", label: "Electronics & liquids ready for security tray" },
      { id: "gate_check",     label: "Checked departure gate" },
    ],
  },
];

function storageKey(tripId: string) { return `predeparture_${tripId}`; }

export default function PreDepartureChecklist({ tripId }: { tripId: string }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(tripId));
      if (saved) setChecked(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, [tripId]);

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(storageKey(tripId), JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const total  = SECTIONS.flatMap(s => s.items).length;
  const done   = checked.size;
  const pct    = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-lg">✅ Pre-departure checklist</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {allDone ? "All done — have a great trip!" : `${done} of ${total} checked`}
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
            style={{ width: `${pct}%`, background: allDone ? "#10b981" : "#6366f1" }} />
        </div>
        <p className="text-xs text-slate-400 mt-1">{pct}% complete</p>
      </div>

      {!collapsed && (
        <div className="space-y-5">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {section.emoji} {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <label key={item.id}
                    className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition cursor-pointer group">
                    <div
                      onClick={() => toggle(item.id)}
                      className={[
                        "rounded border-2 flex-shrink-0 flex items-center justify-center transition cursor-pointer",
                        checked.has(item.id)
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 group-hover:border-indigo-400",
                      ].join(" ")}
                      style={{ width: "18px", height: "18px", minWidth: "18px" }}>
                      {checked.has(item.id) && <span style={{ fontSize: "10px", lineHeight: 1 }}>✓</span>}
                    </div>
                    <span
                      onClick={() => toggle(item.id)}
                      className={`text-sm transition ${checked.has(item.id) ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
