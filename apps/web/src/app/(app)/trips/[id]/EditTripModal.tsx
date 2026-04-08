"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface TripData {
  id: string;
  title: string;
  earliest_departure: string;
  latest_return: string;
  desired_duration_days: number;
  budget_per_person_eur: number | null;
  destination_hint: string | null;
  return_origin_city: string | null;
  return_origin_country: string | null;
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
    return_origin_city: trip.return_origin_city ?? "",
    return_origin_country: trip.return_origin_country ?? "",
  });
  const router = useRouter();
  const supabase = createClient();

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
      return_origin_city: form.return_origin_city !== "" ? form.return_origin_city : null,
      return_origin_country: form.return_origin_country !== "" ? form.return_origin_country.toUpperCase().slice(0, 2) : null,
    }).eq("id", trip.id);
    setSaving(false);
    if (error) { setSaveError("Failed to save. Please try again."); return; }
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
      <h3 className="font-semibold text-slate-900 text-sm">Edit trip details</h3>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
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
          <label className="block text-xs font-medium text-slate-600 mb-1">Window start</label>
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
          <label className="block text-xs font-medium text-slate-600 mb-1">Window end</label>
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
        <label className="block text-xs font-medium text-slate-600 mb-1">Duration (days)</label>
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
        <label className="block text-xs font-medium text-slate-600 mb-1">Budget per person (EUR) <span className="text-slate-400">(optional)</span></label>
        <input
          type="number"
          name="budget_per_person_eur"
          value={form.budget_per_person_eur}
          onChange={handleChange}
          min={0}
          className="input w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Destination hint <span className="text-slate-400">(optional)</span></label>
        <input
          type="text"
          name="destination_hint"
          value={form.destination_hint}
          onChange={handleChange}
          className="input w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Return from different city <span className="text-slate-400">(optional — for open-jaw trips)</span>
        </label>
        <p className="text-xs text-slate-400 mb-1.5">Leave blank to return from your destination. Set this if your itinerary ends in a different city.</p>
        <div className="flex gap-2">
          <input
            type="text"
            name="return_origin_city"
            value={form.return_origin_city}
            onChange={handleChange}
            placeholder="e.g. Rome"
            className="input flex-1"
          />
          <input
            type="text"
            name="return_origin_country"
            value={form.return_origin_country}
            onChange={handleChange}
            placeholder="IT"
            maxLength={2}
            className="input w-16 text-center uppercase"
          />
        </div>
      </div>

      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary text-sm" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() => setIsEditing(false)}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
