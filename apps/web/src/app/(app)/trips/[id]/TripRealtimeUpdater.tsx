"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Invisible client component that subscribes to all Supabase table changes
 * relevant to a trip and calls router.refresh() so the server-rendered page
 * picks up the latest data.  Debounced at 800 ms to avoid refresh storms.
 */
export default function TripRealtimeUpdater({
  tripId,
  groupId,
}: {
  tripId: string;
  groupId: string;
}) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleRefresh() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => router.refresh(), 800);
  }

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`trip-rt-${tripId}`)
      // Trip row itself (status, selected suggestion, title edits)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trips",
        filter: `id=eq.${tripId}`,
      }, scheduleRefresh)
      // Suggestions
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_suggestions",
        filter: `trip_id=eq.${tripId}`,
      }, scheduleRefresh)
      // Suggestion votes — filter by trip_id is not directly available;
      // refresh will be triggered whenever any vote changes (low noise)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_suggestion_votes",
      }, scheduleRefresh)
      // Polls
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_polls",
        filter: `trip_id=eq.${tripId}`,
      }, scheduleRefresh)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_poll_votes",
      }, scheduleRefresh)
      // Availability
      .on("postgres_changes", {
        event: "*", schema: "public", table: "group_availability",
        filter: `trip_id=eq.${tripId}`,
      }, scheduleRefresh)
      // Expenses
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_expenses",
        filter: `trip_id=eq.${tripId}`,
      }, scheduleRefresh)
      // Packing
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_packing_items",
        filter: `trip_id=eq.${tripId}`,
      }, scheduleRefresh)
      // Itinerary
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_itinerary_items",
        filter: `trip_id=eq.${tripId}`,
      }, scheduleRefresh)
      // Notes
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_notes",
        filter: `trip_id=eq.${tripId}`,
      }, scheduleRefresh)
      // Photos
      .on("postgres_changes", {
        event: "*", schema: "public", table: "trip_photos",
        filter: `trip_id=eq.${tripId}`,
      }, scheduleRefresh)
      // Group members (invite accepted)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "group_members",
        filter: `group_id=eq.${groupId}`,
      }, scheduleRefresh)
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, groupId]);

  return null;
}
