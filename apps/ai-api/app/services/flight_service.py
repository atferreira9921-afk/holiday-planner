"""
Flight price search via SerpApi — Google Flights.
Docs: https://serpapi.com/google-flights-api
Free tier: 100 searches/month.
"""
import asyncio
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

from app.config import settings

_executor = ThreadPoolExecutor(max_workers=4)


def _search_sync(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str,
) -> list[dict]:
    """Synchronous SerpApi call (their SDK is sync-only)."""
    if not settings.serpapi_key:
        return []

    try:
        from serpapi import GoogleSearch

        params = {
            "engine": "google_flights",
            "departure_id": origin.upper(),
            "arrival_id": destination.upper(),
            "outbound_date": departure_date,
            "return_date": return_date,
            "currency": "EUR",
            "hl": "en",
            "type": "1",  # 1 = round trip
            "api_key": settings.serpapi_key,
        }

        search = GoogleSearch(params)
        data = search.get_dict()

    except Exception:
        return []

    fetched_at = datetime.now(timezone.utc).isoformat()
    results = []

    # SerpApi returns best_flights and other_flights
    all_flights = data.get("best_flights", []) + data.get("other_flights", [])

    for offer in all_flights[:5]:
        try:
            price = float(offer["price"])
            flights = offer.get("flights", [])

            # Airline: first leg carrier
            airline = flights[0].get("airline", "Unknown") if flights else "Unknown"
            stops = len(flights) - 1 if flights else 0

            # Booking token can be used to construct a Google Flights link
            booking_token = offer.get("booking_token")
            booking_url = (
                f"https://www.google.com/flights?hl=en#flt={origin}.{destination}.{departure_date}*{destination}.{origin}.{return_date}"
                if not booking_token else None
            )

            results.append({
                "origin_iata": origin.upper(),
                "destination_iata": destination.upper(),
                "departure_date": departure_date,
                "return_date": return_date,
                "price_eur": price,
                "airline": airline,
                "stops": stops,
                "booking_url": booking_url,
                "fetched_at": fetched_at,
            })
        except (KeyError, TypeError, ValueError):
            continue

    return sorted(results, key=lambda x: x["price_eur"])


async def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str,
    adults: int = 1,
    max_results: int = 3,
) -> list[dict]:
    """
    Async wrapper — runs the SerpApi sync call in a thread pool
    so it doesn't block the FastAPI event loop.
    """
    loop = asyncio.get_running_loop()
    results = await loop.run_in_executor(
        _executor,
        _search_sync,
        origin,
        destination,
        departure_date,
        return_date,
    )
    return results[:max_results]
