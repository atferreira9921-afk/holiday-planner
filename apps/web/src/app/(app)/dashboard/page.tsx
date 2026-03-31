import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import type {
  BookingRow, AwayRow, EventRow, TripRow,
  FreeStayRow, WishlistRow, FamilyMemberRow,
} from "./DashboardClient";

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today    = new Date();
  const todayISO = localISO(today);
  const thisYear = today.getFullYear();

  const { data: memberships } = await supabase
    .from("group_members").select("group_id").eq("user_id", user.id);
  const groupIds = (memberships ?? []).map((g: { group_id: string }) => g.group_id);

  const [
    { data: prefs },
    { data: tripsRaw },
    { data: allBookingsRaw },
    { data: allAwayRaw },
    { data: allEventsRaw },
    { data: familyMembersRaw },
    { data: freeStaysRaw },
    { data: wishlistRaw },
  ] = await Promise.all([
    supabase.from("user_preferences")
      .select("vacation_days_per_year, birthday, home_country")
      .eq("user_id", user.id).single(),
    groupIds.length > 0
      ? supabase.from("trips")
          .select("id, title, status, planning_mode, desired_duration_days, earliest_departure, latest_return, destination_city")
          .in("group_id", groupIds).order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] as TripRow[] }),
    supabase.from("booked_holidays")
      .select("id, family_member_id, title, start_date, end_date")
      .eq("owner_user_id", user.id).order("start_date"),
    supabase.from("away_periods")
      .select("id, family_member_id, title, start_date, end_date, reason")
      .eq("owner_user_id", user.id).order("start_date"),
    supabase.from("calendar_events")
      .select("id, family_member_id, title, start_date, end_date, event_kind")
      .eq("owner_user_id", user.id).order("start_date"),
    supabase.from("family_members")
      .select("id, display_name, color, vacation_days_per_year, birthday, home_country, travel_style, on_parental_leave, gender, interests")
      .eq("owner_user_id", user.id).order("created_at"),
    supabase.from("free_stays")
      .select("id, destination_city, destination_country")
      .eq("owner_user_id", user.id),
    supabase.from("destination_wishlist")
      .select("id, destination_city, destination_country, priority")
      .eq("user_id", user.id).order("priority", { ascending: false }).limit(4),
  ]);

  // Fetch public holidays from Nager.Date for all relevant countries:
  // the user's own home country + each family member's home country.
  const userCountry = prefs?.home_country ?? "PT";
  const familyCountries = (familyMembersRaw ?? []).map((m: { home_country: string }) => m.home_country).filter(Boolean);
  const allCountries = [...new Set([userCountry, ...familyCountries])];

  const publicHolidaysByCountry: Record<string, { date: string; name: string }[]> = {};
  await Promise.all(
    allCountries.flatMap(country =>
      [thisYear, thisYear + 1].map(async yr => {
        try {
          const res = await fetch(
            `https://date.nager.at/api/v3/PublicHolidays/${yr}/${country}`,
            { next: { revalidate: 86400 } }
          );
          if (res.ok) {
            const data: { date: string; localName: string; name: string }[] = await res.json();
            if (!publicHolidaysByCountry[country]) publicHolidaysByCountry[country] = [];
            for (const h of data) publicHolidaysByCountry[country].push({ date: h.date, name: h.localName ?? h.name });
          }
        } catch { /* degrade gracefully */ }
      })
    )
  );

  const allTrips      = (tripsRaw ?? []) as TripRow[];
  const activeTrips   = allTrips.filter(t => ["planning", "suggested", "booked"].includes(t.status));
  const completedTrips = allTrips.filter(t => t.status === "completed");
  const tripCounts  = {
    planning:  activeTrips.filter(t => t.status === "planning").length,
    suggested: activeTrips.filter(t => t.status === "suggested").length,
    booked:    activeTrips.filter(t => t.status === "booked").length,
  };

  const firstName = user.user_metadata?.full_name?.split(" ")[0]
    ?? user.email?.split("@")[0]
    ?? "there";

  return (
    <DashboardClient
      userId={user.id}
      firstName={firstName}
      thisYear={thisYear}
      todayISO={todayISO}
      userPrefs={prefs
        ? {
            vacation_days_per_year: prefs.vacation_days_per_year ?? 22,
            birthday: prefs.birthday ?? null,
            home_country: prefs.home_country ?? "PT",
          }
        : null}
      allBookings={(allBookingsRaw ?? []) as BookingRow[]}
      allAway={(allAwayRaw ?? []) as AwayRow[]}
      allEvents={(allEventsRaw ?? []) as EventRow[]}
      familyMembers={(familyMembersRaw ?? []) as FamilyMemberRow[]}
      activeTrips={activeTrips}
      completedTrips={completedTrips}
      tripCounts={tripCounts}
      freeStays={(freeStaysRaw ?? []) as FreeStayRow[]}
      wishlist={(wishlistRaw ?? []) as WishlistRow[]}
      publicHolidaysByCountry={publicHolidaysByCountry}
      userCountry={userCountry}
    />
  );
}
