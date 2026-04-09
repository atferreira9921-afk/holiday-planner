"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const SECTION_IDS = [
  { id: "trip-details",  key: "details" },
  { id: "availability",  key: "availability" },
  { id: "expenses",      key: "expenses" },
  { id: "budget",        key: "budget" },
  { id: "itinerary",     key: "itinerary" },
  { id: "packing",       key: "packing" },
  { id: "notes",         key: "notes" },
  { id: "polls",         key: "polls" },
  { id: "documents",     key: "documents" },
  { id: "photos",        key: "photos" },
  { id: "checklist",     key: "checklist" },
  { id: "tasks",         key: "tasks" },
  { id: "costs",         key: "costs" },
  { id: "phrasebook",    key: "phrasebook" },
  { id: "chat",          key: "chat" },
];

export default function TripSectionNav() {
  const t = useTranslations("sectionNav");
  const SECTIONS = SECTION_IDS.map(s => ({ ...s, label: t(s.key) }));

  const [active, setActive] = useState<string>("");
  const [visible, setVisible] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          setVisible(prev => {
            const next = new Set(prev);
            if (entry.isIntersecting) next.add(id);
            else next.delete(id);
            return next;
          });
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  useEffect(() => {
    // Active = topmost visible section in document order
    const first = SECTIONS.find(s => visible.has(s.id));
    if (first) setActive(first.id);
  }, [visible]);

  const presentSections = SECTIONS.filter(({ id }) => {
    if (typeof document === "undefined") return true;
    return !!document.getElementById(id);
  });

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="hidden xl:block sticky top-24 self-start w-40 flex-shrink-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-2">{t("onThisPage")}</p>
      <ul className="space-y-0.5">
        {SECTIONS.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                onClick={() => scrollTo(id)}
                className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-all flex items-center gap-2 ${
                  isActive
                    ? "text-indigo-600 font-semibold bg-indigo-50"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${isActive ? "bg-indigo-500" : "bg-slate-200"}`} />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
