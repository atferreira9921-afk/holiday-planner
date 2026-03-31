"""
Core AI suggestion engine.

Pipeline:
  1. Calendar intersection  — find windows where ALL members are free
  2. Mock destinations      — hardcoded candidates (AI disabled)
  3. Persist                — save to Supabase
"""
import asyncio
from datetime import date, timedelta, datetime, timezone

from app.database import get_supabase
from app.models.request_models import GenerateSuggestionsRequest, MemberCalendarModel
from app.models.response_models import SuggestionModel, GenerateSuggestionsResponse
from app.services import holiday_service

MODEL_VERSION = "mock-v1"

MOCK_DESTINATIONS = [
    {
        "city": "Lisbon", "country": "PT", "iata": "LIS",
        "reasoning": "Vibrant city with great food, culture and warm weather. Very affordable.",
        "highlights": ["Excellent food scene", "Historic neighbourhoods", "Budget-friendly"],
        "trade_offs": ["Can be crowded in summer", "Hilly terrain"],
        "estimated_flight_price_eur": 120, "estimated_hotel_price_eur": 350,
    },
    {
        "city": "Barcelona", "country": "ES", "iata": "BCN",
        "reasoning": "Perfect blend of beach and city. World-class architecture and nightlife.",
        "highlights": ["Beach and city combo", "Gaudí architecture", "Great transport links"],
        "trade_offs": ["Popular tourist destination", "Can be expensive in peak season"],
        "estimated_flight_price_eur": 180, "estimated_hotel_price_eur": 480,
    },
    {
        "city": "Amsterdam", "country": "NL", "iata": "AMS",
        "reasoning": "Charming canals, world-class museums, and a laid-back atmosphere.",
        "highlights": ["Rich museum scene", "Beautiful canal district", "Easy cycling city"],
        "trade_offs": ["Weather can be unpredictable", "Higher accommodation costs"],
        "estimated_flight_price_eur": 160, "estimated_hotel_price_eur": 520,
    },
    {
        "city": "Prague", "country": "CZ", "iata": "PRG",
        "reasoning": "Stunning medieval architecture at very affordable prices.",
        "highlights": ["Very budget-friendly", "Beautiful old town", "Great beer culture"],
        "trade_offs": ["Landlocked city", "Very touristy centre"],
        "estimated_flight_price_eur": 140, "estimated_hotel_price_eur": 280,
    },
    {
        "city": "Rome", "country": "IT", "iata": "FCO",
        "reasoning": "Unmatched history and cuisine. Every corner is a postcard.",
        "highlights": ["World-famous landmarks", "Incredible food", "Rich history"],
        "trade_offs": ["Busy and crowded", "Summer heat can be intense"],
        "estimated_flight_price_eur": 200, "estimated_hotel_price_eur": 440,
    },
]


# ─── Step 1: Calendar Intersection ───────────────────────────────────────────

def _date_range(start: str, end: str) -> list[date]:
    s = date.fromisoformat(start)
    e = date.fromisoformat(end)
    return [s + timedelta(days=i) for i in range((e - s).days + 1)]


async def find_available_windows(
    members: list[MemberCalendarModel],
    earliest: str,
    latest: str,
    desired_days: int,
) -> list[dict]:
    """
    Find date windows where all members have enough vacation days available.
    Score each window by how many public holidays are included (fewer vacation days burned).
    """
    # Fetch holidays for all member countries — fetch both departure and return
    # years so windows that span New Year's Day are scored correctly.
    member_holidays: dict[str, list[dict]] = {}
    start_year = date.fromisoformat(earliest).year
    end_year = date.fromisoformat(latest).year
    for member in members:
        for country in {member.home_country}:
            if country not in member_holidays:
                all_holidays: list[dict] = []
                for yr in range(start_year, end_year + 1):
                    all_holidays.extend(await holiday_service.get_public_holidays(country, yr))
                member_holidays[country] = all_holidays

    all_dates = _date_range(earliest, latest)
    windows = []

    for i, start_d in enumerate(all_dates):
        end_d = start_d + timedelta(days=desired_days - 1)
        if end_d > date.fromisoformat(latest):
            break

        window_dates = [start_d + timedelta(days=j) for j in range(desired_days)]

        # Check availability for all members
        all_free = True
        total_vacation_cost = 0
        min_overlap = 1.0

        for member in members:
            blocked = set(member.blocked_dates)
            member_h_dates = set(
                h["date"]
                for country in [member.home_country]
                for h in member_holidays.get(country, [])
            )

            vacation_days_needed = 0
            member_free = True

            for d in window_dates:
                d_str = d.isoformat()
                if d_str in blocked:
                    member_free = False
                    break
                if d.weekday() < 5 and d_str not in member_h_dates:
                    vacation_days_needed += 1

            if not member_free or vacation_days_needed > member.vacation_days_remaining:
                all_free = False
                break

            total_vacation_cost += vacation_days_needed

        if not all_free:
            continue

        # Score: fewer vacation days burned = higher score
        max_possible = desired_days * len(members)
        overlap_score = round(1.0 - (total_vacation_cost / max_possible), 2)

        windows.append({
            "start_date": start_d.isoformat(),
            "end_date": end_d.isoformat(),
            "total_days": desired_days,
            "vacation_days_used": total_vacation_cost // len(members),
            "overlap_score": overlap_score,
        })

    # Return top 10 windows by overlap score
    windows.sort(key=lambda w: w["overlap_score"], reverse=True)
    return windows[:10]


# ─── Step 2: Persist to Supabase ─────────────────────────────────────────────

def _persist_suggestions(trip_id: str, ranked: list[dict]) -> list[dict]:
    supabase = get_supabase()

    rows = []
    for i, item in enumerate(ranked):
        window = item.get("window", {})
        rows.append({
            "trip_id": trip_id,
            "rank": i + 1,
            "destination_city": item["city"],
            "destination_country": item["country"],
            "destination_iata": item.get("iata", ""),
            "suggested_departure": window.get("start_date"),
            "suggested_return": window.get("end_date"),
            "total_days": window.get("total_days", 0),
            "vacation_days_used": window.get("vacation_days_used", 0),
            "overlap_score": window.get("overlap_score", 0),
            "estimated_flight_price_eur": item.get("estimated_flight_price_eur"),
            "estimated_hotel_price_eur": item.get("estimated_hotel_price_eur"),
            "estimated_total_price_eur": item.get("estimated_total_price_eur"),
            "flight_data": item.get("flight_data"),
            "hotel_data": item.get("hotel_data"),
            "reasoning": item.get("reasoning", ""),
            "highlights": item.get("highlights", []),
            "trade_offs": item.get("trade_offs", []),
            "ai_model_version": MODEL_VERSION,
        })

    result = supabase.table("trip_suggestions").insert(rows).execute()
    supabase.table("trips").update({"status": "suggested"}).eq("id", trip_id).execute()

    return result.data


# ─── Main Entrypoint ──────────────────────────────────────────────────────────

async def generate_suggestions(req: GenerateSuggestionsRequest) -> GenerateSuggestionsResponse:
    constraints = req.trip_constraints.model_dump()
    planning_mode = constraints.get("planning_mode", "days_first")

    # Step 1: Find calendar windows (applies to both modes)
    windows = await find_available_windows(
        members=req.group_members,
        earliest=constraints["earliest_departure"],
        latest=constraints["latest_return"],
        desired_days=constraints["desired_duration_days"],
    )

    if not windows:
        windows = [{
            "start_date": constraints["earliest_departure"],
            "end_date": constraints["latest_return"],
            "total_days": constraints["desired_duration_days"],
            "vacation_days_used": constraints["desired_duration_days"],
            "overlap_score": 0.5,
        }]

    ranked = []

    if planning_mode == "destination_first":
        # User chose a destination — return top 5 windows for that destination
        city = constraints.get("destination_city") or "Unknown"
        country = constraints.get("destination_country") or "??"
        mock_flight_base = 200
        mock_hotel_base = 400
        for i, window in enumerate(windows[:5]):
            # Vary price slightly per window to simulate different pricing
            price_delta = i * 30
            flight = mock_flight_base + price_delta
            hotel = mock_hotel_base + price_delta
            vacation_used = window.get("vacation_days_used", 0)
            ranked.append({
                "city": city,
                "country": country,
                "iata": "",
                "window": window,
                "flight_data": None,
                "hotel_data": None,
                "estimated_flight_price_eur": flight,
                "estimated_hotel_price_eur": hotel,
                "estimated_total_price_eur": flight + hotel,
                "reasoning": f"Window {i + 1} for {city}: {window['total_days']} days off using only {vacation_used} vacation days. Ranked by calendar efficiency.",
                "highlights": [
                    f"Only {vacation_used} vacation days needed",
                    f"Overlap score: {window.get('overlap_score', 0):.0%}",
                    "Estimated prices (mock data)",
                ],
                "trade_offs": ["Prices are estimates — verify before booking"],
            })
    else:
        # Days-first mode — suggest 5 different destinations using best windows
        for i, dest in enumerate(MOCK_DESTINATIONS):
            window = windows[min(i, len(windows) - 1)]
            flight = dest["estimated_flight_price_eur"]
            hotel = dest["estimated_hotel_price_eur"]
            ranked.append({
                **dest,
                "window": window,
                "flight_data": None,
                "hotel_data": None,
                "estimated_flight_price_eur": flight,
                "estimated_hotel_price_eur": hotel,
                "estimated_total_price_eur": flight + hotel,
            })

    # Step 3: Persist
    _persist_suggestions(req.trip_id, ranked)

    # Build response
    suggestions = []
    for i, item in enumerate(ranked):
        window = item["window"]
        suggestions.append(SuggestionModel(
            rank=i + 1,
            destination_city=item["city"],
            destination_country=item["country"],
            destination_iata=item.get("iata", ""),
            suggested_departure=window.get("start_date", ""),
            suggested_return=window.get("end_date", ""),
            total_days=window.get("total_days", 0),
            vacation_days_used=window.get("vacation_days_used", 0),
            overlap_score=window.get("overlap_score", 0),
            estimated_flight_price_eur=item.get("estimated_flight_price_eur"),
            estimated_hotel_price_eur=item.get("estimated_hotel_price_eur"),
            estimated_total_price_eur=item.get("estimated_total_price_eur"),
            flight_data=None,
            hotel_data=None,
            reasoning=item.get("reasoning", ""),
            highlights=item.get("highlights", []),
            trade_offs=item.get("trade_offs", []),
            ai_model_version=MODEL_VERSION,
        ))

    return GenerateSuggestionsResponse(
        trip_id=req.trip_id,
        suggestions=suggestions,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
