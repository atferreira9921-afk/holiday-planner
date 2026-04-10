"use client";

import { useTranslations, useLocale } from "next-intl";

interface Props {
  departureDate: string;
  returnDate: string;
  tripTitle: string;
}

export default function CountdownWidget({ departureDate, returnDate, tripTitle }: Props) {
  const t = useTranslations("countdown");
  const locale = useLocale();
  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const departure  = new Date(departureDate); departure.setHours(0, 0, 0, 0);
  const returnD    = new Date(returnDate); returnD.setHours(0, 0, 0, 0);
  const daysToGo   = Math.round((departure.getTime() - today.getTime()) / 86400000);
  const tripEnded  = today > returnD;
  const onTrip     = today >= departure && today <= returnD;

  if (tripEnded) return null; // Don't show for past trips

  let bg = "from-indigo-500 to-violet-600";
  let emoji = "✈️";
  let label = "";
  let numberStr = "";
  let sub = "";

  if (onTrip) {
    const dayOfTrip = Math.round((today.getTime() - departure.getTime()) / 86400000) + 1;
    const totalDays = Math.round((returnD.getTime() - departure.getTime()) / 86400000) + 1;
    bg = "from-emerald-500 to-teal-600";
    emoji = "🌍";
    numberStr = `Day ${dayOfTrip}`;
    label = t("onTrip");
    sub = `Enjoy ${tripTitle}!`;
  } else if (daysToGo === 0) {
    bg = "from-emerald-500 to-teal-600";
    emoji = "🛫";
    numberStr = "Today!";
    label = t("departureToday");
    sub = "Have an amazing trip!";
  } else if (daysToGo === 1) {
    bg = "from-amber-500 to-orange-600";
    emoji = "🎒";
    numberStr = "Tomorrow";
    label = "departure";
    sub = "Time to pack!";
  } else if (daysToGo <= 7) {
    bg = "from-amber-500 to-orange-500";
    emoji = "🎒";
    numberStr = String(daysToGo);
    label = t("daysToGo");
    sub = "Almost there!";
  } else if (daysToGo <= 30) {
    bg = "from-indigo-500 to-violet-600";
    emoji = "✈️";
    numberStr = String(daysToGo);
    label = t("daysToGo");
    sub = new Date(departureDate).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  } else {
    bg = "from-slate-500 to-slate-600";
    emoji = "📅";
    numberStr = String(daysToGo);
    label = t("daysToGo");
    sub = new Date(departureDate).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className={`rounded-2xl bg-gradient-to-r ${bg} p-5 text-white flex items-center gap-5`}>
      <div className="text-4xl">{emoji}</div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black">{numberStr}</span>
          {label && <span className="text-base font-semibold opacity-80">{label}</span>}
        </div>
        {sub && <p className="text-sm opacity-75 mt-0.5">{sub}</p>}
      </div>
      <div className="text-right opacity-60 text-xs">
        <p>{tripTitle}</p>
      </div>
    </div>
  );
}
