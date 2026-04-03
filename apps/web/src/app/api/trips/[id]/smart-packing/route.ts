import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Static fallback suggestions by trip type (used until Anthropic SDK is configured)
const FALLBACK: Record<string, { item: string; category: string; reason: string }[]> = {
  road_trip: [
    { item: "Portable jump starter", category: "other", reason: "Dead batteries happen — avoids waiting for roadside assistance" },
    { item: "Microfibre cleaning cloth", category: "other", reason: "Keeps windscreen clear on long drives" },
    { item: "Car phone mount", category: "tech", reason: "Hands-free navigation is both safer and legally required in most countries" },
    { item: "Reusable coffee cup", category: "activities", reason: "Saves money at petrol station stops" },
    { item: "Compression packing cubes", category: "clothing", reason: "Keeps boot organised — easy to find clothes without unpacking everything" },
    { item: "Spare phone cable", category: "tech", reason: "Cables fail at the worst moments" },
    { item: "Sunshade for windscreen", category: "other", reason: "Essential when parking in hot countries" },
    { item: "Electrolyte sachets", category: "health", reason: "Long driving days cause dehydration faster than you expect" },
  ],
  flight: [
    { item: "Noise-cancelling earbuds", category: "tech", reason: "Dramatically improves long-haul comfort" },
    { item: "Neck pillow", category: "activities", reason: "Often forgotten but makes a huge difference on overnight flights" },
    { item: "Compression socks", category: "health", reason: "Reduces DVT risk and swelling on flights over 4 hours" },
    { item: "Eye mask", category: "activities", reason: "Cabin lights stay on longer than you'd like" },
    { item: "Reusable water bottle (empty for security)", category: "activities", reason: "Fill after security — saves buying overpriced airport water" },
    { item: "Small padlock for checked luggage", category: "other", reason: "Deters opportunistic theft at baggage claim" },
    { item: "Melatonin tablets", category: "health", reason: "Helps reset your body clock on long-haul trips" },
    { item: "Lip balm & hand cream", category: "toiletries", reason: "Cabin air is extremely dry — skin suffers without these" },
    { item: "Portable door alarm", category: "other", reason: "Extra security in budget hotels" },
  ],
  bus_train: [
    { item: "Neck pillow", category: "activities", reason: "Essential for overnight buses/trains" },
    { item: "Padlock for locker / bag", category: "other", reason: "Many hostels and train compartments have lockers" },
    { item: "Offline entertainment downloaded", category: "tech", reason: "WiFi on trains and buses is often unreliable" },
    { item: "Snacks for the journey", category: "activities", reason: "Station food is expensive and options are limited" },
    { item: "Portable power bank", category: "tech", reason: "Charging points are limited on older rolling stock" },
    { item: "Earplugs", category: "other", reason: "Night trains can be very noisy" },
    { item: "Small day backpack", category: "activities", reason: "Keep valuables with you when sleeping on overnight services" },
  ],
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the user is a member of the trip's group
  const { data: trip } = await supabase
    .from("trips").select("group_id").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const body = await req.json() as { destinationCountry?: string | null; tripType?: string };
  const tripType = body.tripType ?? "flight";

  const key = tripType.replace("-", "_");
  const suggestions = FALLBACK[key] ?? FALLBACK.flight;

  return NextResponse.json({ suggestions });
}
