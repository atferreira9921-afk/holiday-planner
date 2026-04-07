import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import GenerateSuggestionsButton from "./GenerateSuggestionsButton";
import VotingSection from "./VotingSection";
import ExpensesSection from "./ExpensesSection";
import InviteSection from "./InviteSection";
import PackingSection from "./PackingSection";
import SelectSuggestionButton from "./SelectSuggestionButton";
import ItinerarySection from "./ItinerarySection";
import BudgetSection from "./BudgetSection";
import LocalInfoCard from "./LocalInfoCard";
import CurrencyWidget from "./CurrencyWidget";
import AvailabilityPoll from "./AvailabilityPoll";
import PhotoSection from "./PhotoSection";
import ReceiptScanner from "./ReceiptScanner";
import CountdownWidget from "./CountdownWidget";
import PreDepartureChecklist from "./PreDepartureChecklist";
import TripReportExport from "./TripReportExport";
import TripNotes from "./TripNotes";
import GroupPolls from "./GroupPolls";
import DocumentVault from "./DocumentVault";
import SmartPackingButton from "./SmartPackingButton";
import SuggestionWeather from "./SuggestionWeather";
import TripStatusControl from "./TripStatusControl";
import EditTripModal from "./EditTripModal";
import DeleteTripButton from "./DeleteTripButton";
import TripRealtimeUpdater from "./TripRealtimeUpdater";
import TripFamilyMembers from "./TripFamilyMembers";
import DuplicateTripButton from "./DuplicateTripButton";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).single();
  if (!trip) notFound();

  const db = createServiceClient();

  // Fetch everything in parallel
  const [
    { data: suggestions },
    { data: groupMembersRaw },
    { data: votes },
    { data: expenses },
    { data: packingItems },
    { data: userCars },
    { data: userPrefs },
    { data: familyMembersRaw },
    { data: tripFamilyMembersRaw },
    { data: itineraryItems },
    { data: availabilityEntries },
    { data: tripPhotos },
    { data: tripNotesRow },
    { data: tripPolls },
    { data: pollOptions },
    { data: pollVotes },
    { data: tripDocuments },
  ] = await Promise.all([
    db.from("trip_suggestions").select("*").eq("trip_id", id).order("rank"),
    db.from("group_members").select("user_id, role").eq("group_id", trip.group_id),
    db.from("trip_suggestion_votes").select("*").in(
      "suggestion_id",
      ["00000000-0000-0000-0000-000000000000"]
    ),
    db.from("trip_expenses").select("*").eq("trip_id", id).order("created_at"),
    db.from("trip_packing_items").select("*").eq("trip_id", id).order("created_at"),
    db.from("user_cars").select("*").eq("owner_user_id", user.id).order("created_at"),
    db.from("user_preferences").select("home_country").eq("user_id", user.id).maybeSingle(),
    db.from("family_members").select("id, display_name, color").eq("owner_user_id", user.id).order("created_at"),
    db.from("trip_family_members").select("family_member_id").eq("trip_id", id),
    db.from("trip_itinerary_items").select("*").eq("trip_id", id).order("day_number").order("sort_order"),
    db.from("group_availability").select("*").eq("trip_id", id),
    db.from("trip_photos").select("*").eq("trip_id", id).order("created_at", { ascending: false }),
    db.from("trip_notes").select("*").eq("trip_id", id).maybeSingle(),
    db.from("trip_polls").select("*").eq("trip_id", id).order("created_at"),
    db.from("trip_poll_options").select("*").in("poll_id", ["00000000-0000-0000-0000-000000000000"]),
    db.from("trip_poll_votes").select("*").in("poll_id", ["00000000-0000-0000-0000-000000000000"]),
    db.from("trip_documents").select("*").eq("trip_id", id).order("created_at"),
  ]);

  const homeCountry = (userPrefs as { home_country?: string } | null)?.home_country ?? "PT";

  // Fetch poll options + votes with real poll IDs
  const pollIds = (tripPolls ?? []).map((p: { id: string }) => p.id);
  const [{ data: pollOptionsReal }, { data: pollVotesReal }] = await Promise.all([
    pollIds.length > 0
      ? db.from("trip_poll_options").select("*").in("poll_id", pollIds)
      : Promise.resolve({ data: [] }),
    pollIds.length > 0
      ? db.from("trip_poll_votes").select("*").in("poll_id", pollIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Fetch votes properly now that we have suggestion ids
  const suggestionIds = (suggestions ?? []).map(s => s.id);
  const { data: votesReal } = suggestionIds.length > 0
    ? await db.from("trip_suggestion_votes").select("*").in("suggestion_id", suggestionIds)
    : { data: [] };

  // Fetch user profiles for group members + pending invites
  const memberUserIds = (groupMembersRaw ?? []).map(m => m.user_id);
  const [{ data: profiles }, { data: pendingInvites }] = await Promise.all([
    memberUserIds.length > 0
      ? db.from("user_profiles").select("id, full_name, email").in("id", memberUserIds)
      : Promise.resolve({ data: [] }),
    db.from("group_invites")
      .select("id, invited_email")
      .eq("group_id", trip.group_id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);

  // Confirmed members (used everywhere)
  const members = (groupMembersRaw ?? []).map(m => {
    const profile = (profiles ?? []).find((p: { id: string; full_name: string | null; email: string }) => p.id === m.user_id);
    return {
      user_id: m.user_id,
      name: profile?.full_name ?? profile?.email?.split("@")[0] ?? "Member",
    };
  });

  // Tagged family members for this trip
  const taggedFamilyMemberIds = new Set((tripFamilyMembersRaw ?? []).map((t: { family_member_id: string }) => t.family_member_id));
  const taggedFamilyMembers = (familyMembersRaw ?? [])
    .filter((fm: { id: string }) => taggedFamilyMemberIds.has(fm.id))
    .map((fm: { id: string; display_name: string }) => ({
      user_id: fm.id, // family_members.id is UUID, no FK on group_availability.user_id
      name: fm.display_name,
      familyMember: true as const,
    }));

  // Confirmed + pending + tagged family members — used only for availability poll
  const availabilityMembers = [
    ...members,
    ...(pendingInvites ?? []).map((inv, i) => ({
      user_id: `pending-${inv.id}`,
      name: inv.invited_email ?? `Invited person ${i + 1}`,
      pending: true,
    })),
    ...taggedFamilyMembers,
  ];

  const memberNames: Record<string, string> = Object.fromEntries(members.map(m => [m.user_id, m.name]));

  function buildFlightSearchUrl(destIATA: string | null, destCity: string, depart: string, ret: string) {
    const fmt = (d: string) => d.replace(/-/g, "").slice(2); // YYYYMMDD → YYMMDD
    const from = `${homeCountry.toUpperCase()}-sky`;
    const to   = destIATA ? `${destIATA}-sky` : encodeURIComponent(destCity);
    return `https://www.skyscanner.net/transport/flights/${from}/${to}/${fmt(depart)}/${fmt(ret)}/`;
  }
  function buildHotelSearchUrl(destCity: string, destCountry: string, checkin: string, checkout: string) {
    return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${destCity}, ${destCountry}`)}&checkin=${checkin}&checkout=${checkout}&group_adults=2`;
  }

  const selectedSuggestionData = trip.selected_suggestion_id
    ? (suggestions ?? []).find(s => s.id === trip.selected_suggestion_id) ?? null
    : null;

  const destinationCountry =
    trip.planning_mode === "destination_first"
      ? (trip.destination_country as string | null)
      : selectedSuggestionData?.destination_country ?? null;

  const departureDate =
    selectedSuggestionData?.suggested_departure ?? trip.earliest_departure;

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <TripRealtimeUpdater tripId={id} groupId={trip.group_id} />

      {/* Header */}
      <div>
        <Link href="/trips" className="text-slate-400 text-sm hover:text-slate-600 transition flex items-center gap-1 mb-4">
          ← Back to trips
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{trip.title}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {trip.desired_duration_days} days · {trip.earliest_departure} – {trip.latest_return}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={trip.status} />
            <EditTripModal trip={{ id: trip.id, title: trip.title, earliest_departure: trip.earliest_departure, latest_return: trip.latest_return, desired_duration_days: trip.desired_duration_days, budget_per_person_eur: trip.budget_per_person_eur ?? null, destination_hint: trip.destination_hint ?? null }} />
            <DuplicateTripButton tripId={trip.id} />
            <DeleteTripButton tripId={trip.id} />
            <TripReportExport
              tripTitle={trip.title}
              departureDate={departureDate}
              returnDate={selectedSuggestionData?.suggested_return ?? trip.latest_return}
              members={members}
              totalExpenses={(expenses ?? []).reduce((s: number, e: { amount_eur: number }) => s + e.amount_eur, 0)}
              budgetPerPerson={trip.budget_per_person_eur ?? null}
              destinationCountry={destinationCountry}
            />
          </div>
        </div>
      </div>

      {/* Status control */}
      <TripStatusControl tripId={trip.id} currentStatus={trip.status} selectedSuggestionId={trip.selected_suggestion_id ?? null} />

      {/* Family member travellers */}
      <TripFamilyMembers
        tripId={trip.id}
        allFamilyMembers={(familyMembersRaw ?? []) as { id: string; display_name: string; color: string }[]}
        initialTaggedIds={(tripFamilyMembersRaw ?? []).map((r: { family_member_id: string }) => r.family_member_id)}
      />

      {/* Countdown */}
      {(trip.status === "booked" || trip.status === "suggested") && (
        <CountdownWidget
          departureDate={departureDate}
          returnDate={selectedSuggestionData?.suggested_return ?? trip.latest_return}
          tripTitle={trip.title}
        />
      )}

      {/* Trip details card */}
      <div className="card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon="🌙" label="Duration" value={`${trip.desired_duration_days} days`} />
          <Stat icon="📅" label="Window" value={`${trip.earliest_departure}`} sub={`→ ${trip.latest_return}`} />
          {trip.budget_per_person_eur && <Stat icon="💶" label="Budget" value={`€${trip.budget_per_person_eur}`} sub="per person" />}
          {trip.destination_hint && <Stat icon="💡" label="Hint" value={trip.destination_hint} />}
          {trip.planning_mode === "destination_first" && trip.destination_city && (
            <Stat icon="📍" label="Destination" value={`${trip.destination_city}, ${trip.destination_country}`} />
          )}
        </div>
      </div>

      {/* Local info + currency (shown when destination is known) */}
      {destinationCountry && (
        <>
          <LocalInfoCard destinationCountry={destinationCountry} homeCountry={homeCountry} />
          <CurrencyWidget destinationCountry={destinationCountry} />
        </>
      )}

      {/* Generate suggestions */}
      {trip.status === "planning" && (
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl gradient-card flex items-center justify-center text-2xl flex-shrink-0">🤖</div>
            <div className="flex-1">
              <h2 className="font-bold text-slate-900">Get AI suggestions</h2>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                The AI will analyse public holidays, find optimal date windows, and suggest your top trips.
              </p>
              <GenerateSuggestionsButton tripId={trip.id} hasSuggestions={false} />
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (() => {
        const selectedSuggestion = trip.selected_suggestion_id
          ? suggestions.find(s => s.id === trip.selected_suggestion_id) ?? null
          : null;
        const otherSuggestions = suggestions.filter(s => s.id !== trip.selected_suggestion_id);

        function SuggestionCard({ s, dimmed }: { s: NonNullable<typeof suggestions>[0]; dimmed?: boolean }) {
          const isSelected = trip.selected_suggestion_id === s.id;
          return (
            <div className={["card transition", isSelected ? "ring-2 ring-emerald-400 p-6" : dimmed ? "p-4" : "p-6"].join(" ")}>
              <div className={`flex items-center gap-4 ${dimmed ? "mb-2" : "mb-4"}`}>
                <div className={`rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 ${isSelected ? "bg-emerald-500" : "gradient-card"} ${dimmed ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"}`}>
                  {isSelected ? "✓" : `#${s.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold text-slate-900 ${dimmed ? "text-base" : "text-lg"}`}>
                      {s.destination_city}, {s.destination_country}
                      {s.destination_iata && <span className="text-slate-400 font-normal text-sm ml-1">({s.destination_iata})</span>}
                    </h3>
                    {isSelected && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✅ Selected</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {s.suggested_departure} → {s.suggested_return} · {s.total_days} days · {s.vacation_days_used} vacation days used
                  </p>
                  {!dimmed && s.suggested_departure && s.suggested_return && (
                    <SuggestionWeather
                      city={s.destination_city}
                      country={s.destination_country}
                      fromDate={s.suggested_departure}
                      toDate={s.suggested_return}
                    />
                  )}
                </div>
                {s.estimated_total_price_eur && (
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-indigo-600 ${dimmed ? "text-lg" : "text-2xl"}`}>€{Math.round(s.estimated_total_price_eur)}</p>
                    <p className="text-xs text-slate-400">per person est.</p>
                  </div>
                )}
              </div>

              {!dimmed && (
                <>
                  {(s.estimated_flight_price_eur || s.estimated_hotel_price_eur) && (
                    <div className="flex gap-3 mb-4 flex-wrap">
                      {s.estimated_flight_price_eur && (
                        <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                          <span>✈️</span>
                          <span className="text-sm font-semibold text-blue-700">€{Math.round(s.estimated_flight_price_eur)}</span>
                          <span className="text-xs text-blue-400">flights</span>
                        </div>
                      )}
                      {s.estimated_hotel_price_eur && (
                        <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
                          <span>🏨</span>
                          <span className="text-sm font-semibold text-purple-700">€{Math.round(s.estimated_hotel_price_eur)}</span>
                          <span className="text-xs text-purple-400">hotel</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{s.reasoning}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {s.highlights?.length > 0 && (
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Highlights</p>
                        <ul className="space-y-1">
                          {s.highlights.map((h: string, j: number) => (
                            <li key={j} className="text-sm text-green-700 flex items-start gap-1.5"><span className="mt-0.5">✓</span>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.trade_offs?.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Trade-offs</p>
                        <ul className="space-y-1">
                          {s.trade_offs.map((t: string, j: number) => (
                            <li key={j} className="text-sm text-slate-600 flex items-start gap-1.5"><span className="mt-0.5">·</span>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className={`flex items-center gap-2 flex-wrap ${dimmed ? "" : "pt-3 border-t border-slate-100"}`}>
                <SelectSuggestionButton tripId={trip.id} suggestionId={s.id} isSelected={isSelected} />
                {!dimmed && s.suggested_departure && s.suggested_return && (
                  <>
                    <a href={s.flight_data?.booking_url ?? buildFlightSearchUrl(s.destination_iata ?? null, s.destination_city, s.suggested_departure, s.suggested_return)}
                      target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">✈️ Search flights</a>
                    <a href={s.hotel_data?.booking_url ?? buildHotelSearchUrl(s.destination_city, s.destination_country, s.suggested_departure, s.suggested_return)}
                      target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">🏨 Search hotels</a>
                  </>
                )}
              </div>
            </div>
          );
        }

        // Group into batches of 3 by rank (batch 1 = ranks 1-3, batch 2 = ranks 4-6, …)
        const batches: (typeof suggestions)[] = [];
        for (const s of suggestions) {
          const batchIdx = Math.ceil(s.rank / 3) - 1;
          if (!batches[batchIdx]) batches[batchIdx] = [];
          batches[batchIdx].push(s);
        }
        const latestBatchIdx = batches.length - 1;

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg">✨ Suggestions</h2>
              {!trip.selected_suggestion_id && (
                <p className="text-xs text-slate-400">Select a destination to confirm your trip</p>
              )}
            </div>

            {/* Selected suggestion — always shown full */}
            {selectedSuggestion && <SuggestionCard s={selectedSuggestion} />}

            {batches.map((batch, batchIdx) => {
              const isLatest = batchIdx === latestBatchIdx;
              const batchNum = batchIdx + 1;
              const visibleBatch = batch.filter(s => s.id !== trip.selected_suggestion_id);
              if (visibleBatch.length === 0) return null;

              if (isLatest && !selectedSuggestion) {
                // Latest batch, no selection yet — show all full
                return (
                  <div key={batchIdx} className="space-y-4">
                    {visibleBatch.map(s => <SuggestionCard key={s.id} s={s} />)}
                  </div>
                );
              }

              // Older batches or post-selection — collapsed
              return (
                <details key={batchIdx} className="group">
                  <summary className="list-none cursor-pointer flex items-center gap-2 px-1 py-2 text-sm text-slate-400 hover:text-slate-600 transition select-none">
                    <span className="text-xs group-open:rotate-90 transition-transform inline-block">▶</span>
                    {isLatest
                      ? `${visibleBatch.length} other option${visibleBatch.length !== 1 ? "s" : ""} — not selected`
                      : `Batch ${batchNum} — ${visibleBatch.length} suggestion${visibleBatch.length !== 1 ? "s" : ""}`}
                  </summary>
                  <div className="space-y-2 mt-2 opacity-60">
                    {visibleBatch.map(s => <SuggestionCard key={s.id} s={s} dimmed />)}
                  </div>
                </details>
              );
            })}
          </div>
        );
      })()}

      {/* Regenerate suggestions */}
      {suggestions && suggestions.length > 0 && !trip.selected_suggestion_id && (
        <div className="card p-5">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-medium text-slate-500 hover:text-slate-700 transition">
              <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
              Not happy with these suggestions? Generate new ones
            </summary>
            <div className="mt-4">
              <GenerateSuggestionsButton tripId={trip.id} hasSuggestions={true} />
            </div>
          </details>
        </div>
      )}

      {/* Voting — hidden once a destination is selected */}
      {suggestions && suggestions.length > 0 && !trip.selected_suggestion_id && (
        <VotingSection
          suggestions={suggestions.map(s => ({ id: s.id, rank: s.rank, destination_city: s.destination_city, destination_country: s.destination_country }))}
          members={members}
          votes={(votesReal ?? []) as { suggestion_id: string; user_id: string; vote: "up" | "down" }[]}
          currentUserId={user.id}
        />
      )}

      {/* Availability poll */}
      <AvailabilityPoll
        tripId={trip.id}
        members={availabilityMembers}
        currentUserId={user.id}
        initialEntries={(availabilityEntries ?? []) as Parameters<typeof AvailabilityPoll>[0]["initialEntries"]}
        earliestDeparture={trip.earliest_departure}
        latestReturn={trip.latest_return}
      />

      {/* Cost split */}
      <ExpensesSection
        tripId={trip.id}
        members={members}
        initialExpenses={(expenses ?? []) as Parameters<typeof ExpensesSection>[0]["initialExpenses"]}
        initialCars={(userCars ?? []) as Parameters<typeof ExpensesSection>[0]["initialCars"]}
        currentUserId={user.id}
        homeCountry={homeCountry}
      />

      {/* Receipt scanner */}
      <ReceiptScanner tripId={trip.id} />


      {/* Budget vs actual */}
      <BudgetSection
        budgetPerPerson={trip.budget_per_person_eur ?? null}
        members={members}
        expenses={(expenses ?? []) as Parameters<typeof BudgetSection>[0]["expenses"]}
        itineraryItems={(itineraryItems ?? []) as Parameters<typeof BudgetSection>[0]["itineraryItems"]}
      />

      {/* Itinerary */}
      <ItinerarySection
        tripId={trip.id}
        initialItems={(itineraryItems ?? []) as Parameters<typeof ItinerarySection>[0]["initialItems"]}
        tripDays={trip.desired_duration_days}
        departureDate={departureDate}
      />

      {/* Smart packing suggestions */}
      <SmartPackingButton
        tripId={trip.id}
        destinationCountry={destinationCountry}
        tripType={trip.vehicle_type ?? "flight"}
      />

      {/* Packing list */}
      <PackingSection
        tripId={trip.id}
        initialItems={(packingItems ?? []) as Parameters<typeof PackingSection>[0]["initialItems"]}
      />

      {/* Shared notes */}
      <TripNotes
        tripId={trip.id}
        currentUserId={user.id}
        initialContent={(tripNotesRow as { content?: string } | null)?.content ?? ""}
        updatedBy={(tripNotesRow as { updated_by?: string } | null)?.updated_by ?? null}
        updatedAt={(tripNotesRow as { updated_at?: string } | null)?.updated_at ?? null}
        memberNames={memberNames}
      />

      {/* Group polls */}
      <GroupPolls
        tripId={trip.id}
        currentUserId={user.id}
        initialPolls={(tripPolls ?? []) as Parameters<typeof GroupPolls>[0]["initialPolls"]}
        initialOptions={(pollOptionsReal ?? []) as Parameters<typeof GroupPolls>[0]["initialOptions"]}
        initialVotes={(pollVotesReal ?? []) as Parameters<typeof GroupPolls>[0]["initialVotes"]}
        memberNames={memberNames}
      />

      {/* Documents vault */}
      <DocumentVault
        tripId={trip.id}
        currentUserId={user.id}
        initialDocs={(tripDocuments ?? []) as Parameters<typeof DocumentVault>[0]["initialDocs"]}
        memberNames={memberNames}
      />

      {/* Trip photos */}
      <PhotoSection
        tripId={trip.id}
        initialPhotos={(tripPhotos ?? []) as Parameters<typeof PhotoSection>[0]["initialPhotos"]}
        memberNames={memberNames}
        currentUserId={user.id}
      />

      {/* Pre-departure checklist */}
      <PreDepartureChecklist tripId={trip.id} />

      {/* Invite */}
      <InviteSection tripId={trip.id} members={members} />
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">{icon} {label}</p>
      <p className="font-semibold text-slate-900 text-sm">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    planning:  "bg-yellow-100 text-yellow-800",
    suggested: "bg-violet-100 text-violet-700",
    booked:    "bg-green-100 text-green-700",
    completed: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-100 text-red-700",
  };
  return <span className={`badge ${map[status] ?? map.planning}`}>{status}</span>;
}
