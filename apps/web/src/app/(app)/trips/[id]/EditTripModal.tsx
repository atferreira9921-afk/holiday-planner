"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ReturnOriginPicker from "../ReturnOriginPicker";
import { COUNTRIES } from "@/lib/data/geo";
import { useTranslations } from "next-intl";

interface TripData {
  id: string;
  title: string;
  earliest_departure: string;
  latest_return: string;
  desired_duration_days: number;
  budget_per_person_eur: number | null;
  destination_hint: string | null;
  destination_city: string | null;
  destination_country: string | null;
  return_origin_city: string | null;
  return_origin_country: string | null;
  vehicle_type: string | null;
  planning_mode: string | null;
}

interface Props {
  trip: TripData;
}

export default function EditTripModal({ trip }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: trip.title,
    earliest_departure: trip.earliest_departure,
    latest_return: trip.latest_return,
    desired_duration_days: trip.desired_duration_days,
    budget_per_person_eur: trip.budget_per_person_eur ?? "",
    destination_hint: trip.destination_hint ?? "",
    destination_city: trip.destination_city ?? "",
    destination_country: trip.destination_country ?? "",
    return_origin_city: trip.return_origin_city ?? "",
    return_origin_country: trip.return_origin_country ?? "",
  });

  const isDestinationFirst = trip.planning_mode === "destination_first" || !!trip.destination_city;
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations("tripActions");
  const tc = useTranslations("common");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from("trips").update({
      title: form.title,
      earliest_departure: form.earliest_departure,
      latest_return: form.latest_return,
      desired_duration_days: Number(form.desired_duration_days),
      budget_per_person_eur: form.budget_per_person_eur !== "" ? Number(form.budget_per_person_eur) : null,
      destination_hint: form.destination_hint !== "" ? form.destination_hint : null,
      destination_city: isDestinationFirst && form.destination_city !== "" ? form.destination_city : undefined,
      destination_country: isDestinationFirst && form.destination_country !== "" ? form.destination_country.toUpperCase() : undefined,
      return_origin_city: form.return_origin_city !== "" ? form.return_origin_city : null,
      return_origin_country: form.return_origin_country !== "" ? form.return_origin_country.toUpperCase().slice(0, 2) : null,
    }).eq("id", trip.id);
    setSaving(false);
    if (error) { setSaveError(t("failedSave")); return; }
    setIsEditing(false);
    router.refresh();
  }

  if (!isEditing) {
    return (
      <button className="btn-ghost text-sm" onClick={() => setIsEditing(true)}>
        ✏️ Edit
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4 w-full">
      <h3 className="font-semibold text-slate-900 text-sm">{t("editTitle")}</h3>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("tripTitle")}</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          className="input w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("windowStart")}</label>
          <input
            type="date"
            name="earliest_departure"
            value={form.earliest_departure}
            onChange={handleChange}
            required
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("windowEnd")}</label>
          <input
            type="date"
            name="latest_return"
            value={form.latest_return}
            onChange={handleChange}
            required
            className="input w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("duration")}</label>
        <input
          type="number"
          name="desired_duration_days"
          value={form.desired_duration_days}
          onChange={handleChange}
          required
          min={1}
          className="input w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("budgetPp")} <span className="text-slate-400">({tc("optional")})</span></label>
        <input
          type="number"
          name="budget_per_person_eur"
          value={form.budget_per_person_eur}
          onChange={handleChange}
          min={0}
          className="input w-full"
        />
      </div>

      {isDestinationFirst ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t("destCity")}</label>
            <input
              type="text"
              name="destination_city"
              value={form.destination_city}
              onChange={handleChange}
              placeholder="e.g. Barcelona"
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t("destCountry")}</label>
            <select
              name="destination_country"
              value={form.destination_country}
              onChange={e => setForm(prev => ({ ...prev, destination_country: e.target.value }))}
              className="input w-full"
            >
              <option value="">Select country…</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t("destHint")} <span className="text-slate-400">({tc("optional")})</span></label>
          <input
            type="text"
            name="destination_hint"
            value={form.destination_hint}
            onChange={handleChange}
            className="input w-full"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          {t("returnJourney")}
        </label>
        <ReturnOriginPicker
          vehicleType={(trip.vehicle_type as "flight" | "car" | "bus") ?? "flight"}
          city={form.return_origin_city}
          country={form.return_origin_country}
          onChange={(city, country) => setForm(prev => ({ ...prev, return_origin_city: city, return_origin_country: country }))}
        />
      </div>

      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary text-sm" disabled={saving}>
          {saving ? tc("saving") : t("saveChanges")}
        </button>
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() => setIsEditing(false)}
          disabled={saving}
        >
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
