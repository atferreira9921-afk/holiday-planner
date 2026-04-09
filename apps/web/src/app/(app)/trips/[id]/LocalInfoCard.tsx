"use client";

import { useState, useEffect } from "react";
import { getCountryInfo } from "@/lib/data/country-info";
import { getWarning, WARNING_COLORS, WARNING_LABELS } from "@/lib/data/travel-warnings";
import { getVisaRequirement, VISA_LABELS } from "@/lib/data/visa-requirements";
import { COUNTRIES } from "@/lib/data/geo";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  );
}

export default function LocalInfoCard({
  destinationCountry,
  homeCountry,
}: {
  destinationCountry: string;
  homeCountry: string;
}) {
  const info    = getCountryInfo(destinationCountry);
  const warning = getWarning(destinationCountry);
  const visa    = getVisaRequirement(homeCountry, destinationCountry);
  const destName = COUNTRIES.find(c => c.code === destinationCountry)?.name ?? destinationCountry;
  const homeName = COUNTRIES.find(c => c.code === homeCountry)?.name ?? homeCountry;

  const [open, setOpen]     = useState(true);
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  if (!info && warning.level === "normal" && !visa) return null;

  const wColors = WARNING_COLORS[warning.level];
  const vMeta   = visa ? VISA_LABELS[visa] : null;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 text-lg">🌐 {destName} — local info</h2>
        <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm">{open ? "Hide" : "Show"}</button>
      </div>

      {open && <>
      {/* Travel warning */}
      <div className="rounded-xl px-4 py-3 border" style={{ background: isDark ? `${wColors.text}26` : wColors.bg, borderColor: isDark ? `${wColors.border}66` : wColors.border }}>
        <div className="flex items-start gap-2">
          <span className="text-base mt-0.5">
            {warning.level === "normal" || warning.level === "none" ? "✅" :
             warning.level === "high" ? "⚠️" : "🚫"}
          </span>
          <div>
            <p className="text-sm font-bold" style={{ color: wColors.text }}>
              {WARNING_LABELS[warning.level]}
            </p>
            <p className="text-xs mt-0.5" style={{ color: wColors.text }}>{warning.summary}</p>
            <p className="text-xs opacity-60 mt-0.5">Source: {warning.source}</p>
          </div>
        </div>
      </div>

      {/* Visa requirement */}
      {vMeta && homeCountry !== destinationCountry && (
        <div className="rounded-xl px-4 py-3 border" style={{ background: isDark ? `${vMeta.color}26` : vMeta.bg, borderColor: vMeta.color + "40" }}>
          <div className="flex items-center gap-2">
            <span>🛂</span>
            <div>
              <p className="text-sm font-bold" style={{ color: vMeta.color }}>
                {vMeta.label} — for {homeName} passport holders
              </p>
              {visa === "evisa" && (
                <p className="text-xs text-slate-500 mt-0.5">Apply online before travelling — usually takes 24–72 hours.</p>
              )}
              {visa === "visa_on_arrival" && (
                <p className="text-xs text-slate-500 mt-0.5">Obtain at the airport on arrival. Have a return ticket and proof of accommodation ready.</p>
              )}
              {visa === "visa_required" && (
                <p className="text-xs text-slate-500 mt-0.5">Apply in advance at the embassy. Check processing times — can take several weeks.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Practical info */}
      {info && (
        <div className="space-y-0">
          <Row label="💰 Currency" value={`${info.currency} ${info.currencySymbol}`} />
          <Row label="🗣️ Language" value={info.language} />
          <Row label="🚨 Emergency" value={info.emergencyNumber} />
          <Row label="👮 Police" value={info.policeNumber} />
          <Row label="🚑 Ambulance" value={info.ambulanceNumber} />
          <Row label="🔌 Plug type" value={info.plugTypes.join(", ")} />
          <Row label="🚗 Drives on" value={info.drivingSide === "left" ? "Left side" : "Right side"} />
          <Row label="📞 Calling code" value={info.callingCode} />
          <Row label="💵 Tipping" value={info.tippingCulture} />
        </div>
      )}
      </>}
    </div>
  );
}
