"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface Expense {
  amount_eur: number;
  category: string;
}

interface ItineraryItem {
  cost_eur: number | null;
}

export default function BudgetSection({
  budgetPerPerson,
  members,
  expenses,
  itineraryItems,
}: {
  budgetPerPerson: number | null;
  members: { user_id: string; name: string }[];
  expenses: Expense[];
  itineraryItems: ItineraryItem[];
}) {
  const t  = useTranslations("budget");
  const tc = useTranslations("common");
  const te = useTranslations("expenses");
  const catLabel = (cat: string) => ({
    flight: te("category.flight"), hotel: te("category.hotel"),
    "car-trip": te("category.car-trip"), food: te("category.food"),
    transport: te("category.transport"), activity: te("category.activity"),
    other: te("category.other"),
  }[cat] ?? cat);
  const [open, setOpen] = useState(true);

  if (!budgetPerPerson && expenses.length === 0 && itineraryItems.length === 0) return null;
  const totalActual    = expenses.reduce((s, e) => s + e.amount_eur, 0);
  const totalPlanned   = itineraryItems.reduce((s, i) => s + (i.cost_eur ?? 0), 0);
  const totalBudget    = (budgetPerPerson ?? 0) * Math.max(members.length, 1);
  const pct            = totalBudget > 0 ? Math.min((totalActual / totalBudget) * 100, 100) : 0;
  const overBudget     = totalBudget > 0 && totalActual > totalBudget;

  const byCategory = Object.entries(
    expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount_eur;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 text-lg">{t("title")}</h2>
        <button onClick={() => setOpen(o => !o)} className="btn-ghost text-sm flex-shrink-0">{open ? tc("hide") : tc("show")}</button>
      </div>

      {open && <>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {budgetPerPerson && (
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-1">{t("budget")}</p>
              <p className="text-xl font-bold text-indigo-700">€{totalBudget.toFixed(0)}</p>
              <p className="text-xs text-indigo-400">€{budgetPerPerson}/person</p>
            </div>
          )}
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{t("spent")}</p>
            <p className={`text-xl font-bold ${overBudget ? "text-red-600" : "text-slate-800"}`}>
              €{totalActual.toFixed(0)}
            </p>
            <p className="text-xs text-slate-400">{expenses.length} expense{expenses.length !== 1 ? "s" : ""}</p>
          </div>
          {totalPlanned > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">{t("planned")}</p>
              <p className="text-xl font-bold text-amber-700">€{totalPlanned.toFixed(0)}</p>
              <p className="text-xs text-amber-400">{t("fromItinerary")}</p>
            </div>
          )}
          {budgetPerPerson && (
            <div className={`rounded-xl p-3 text-center ${overBudget ? "bg-red-50" : "bg-emerald-50"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${overBudget ? "text-red-500" : "text-emerald-600"}`}>
                {overBudget ? t("overBudget") : t("remaining")}
              </p>
              <p className={`text-xl font-bold ${overBudget ? "text-red-700" : "text-emerald-700"}`}>
                €{Math.abs(totalBudget - totalActual).toFixed(0)}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {budgetPerPerson && totalBudget > 0 && (
          <div>
            <div className="h-3 rounded-full overflow-hidden bg-slate-100">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: overBudget ? "#ef4444" : pct > 75 ? "#f59e0b" : "#10b981",
                }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{t("pctUsed", { pct: pct.toFixed(0) })}</span>
              {overBudget && <span className="text-red-500 font-semibold">{t("overBy", { amount: (totalActual - totalBudget).toFixed(0) })}</span>}
            </div>
          </div>
        )}

        {/* By category breakdown */}
        {byCategory.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{t("breakdown")}</p>
            <div className="space-y-1.5">
              {byCategory.map(([cat, amount]) => {
                const catPct = totalActual > 0 ? (amount / totalActual) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-24 sm:w-32 flex-shrink-0">{catLabel(cat)}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-400 transition-all"
                        style={{ width: `${catPct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-14 text-right">€{amount.toFixed(0)}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">{catPct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>}
    </div>
  );
}
