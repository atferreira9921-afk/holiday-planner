"""
Hotel search via SerpApi — Google Hotels.
Docs: https://serpapi.com/google-hotels-api
Same API key as flights. Free tier: 100 searches/month (shared with flights).
"""
import asyncio
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

from app.config import settings

_executor = ThreadPoolExecutor(max_workers=4)


def _search_sync(
    destination_city: str,
    checkin_date: str,
    checkout_date: str,
    adults: int = 2,
) -> list[dict]:
    """Synchronous SerpApi call."""
    if not settings.serpapi_key:
        return []

    try:
        from serpapi import GoogleSearch

        params = {
            "engine": "google_hotels",
            "q": destination_city,
            "check_in_date": checkin_date,
            "check_out_date": checkout_date,
            "adults": adults,
            "currency": "EUR",
            "hl": "en",
            "api_key": settings.serpapi_key,
        }

        search = GoogleSearch(params)
        data = search.get_dict()

    except Exception:
        return []

    fetched_at = datetime.now(timezone.utc).isoformat()
    results = []
    nights = _count_nights(checkin_date, checkout_date)

    for prop in data.get("properties", [])[:5]:
        try:
            # Price can be per night or total depending on the result
            rate_info = prop.get("rate_per_night") or prop.get("total_rate") or {}
            price_str = rate_info.get("lowest", "0").replace("€", "").replace(",", "").strip()
            price_per_night = float(price_str) if price_str else 0.0

            total_price = price_per_night * nights if price_per_night else 0.0

            rating = float(prop.get("overall_rating", 0))
            review_count = int(prop.get("reviews", 0))
            stars = len(prop.get("hotel_class", "").replace(" ", "")) if prop.get("hotel_class") else 0
            name = prop.get("name", "Unknown Hotel")
            link = prop.get("link")

            if price_per_night == 0:
                continue

            results.append({
                "name": name,
                "stars": stars,
                "price_per_night_eur": round(price_per_night, 2),
                "total_price_eur": round(total_price, 2),
                "rating": rating,
                "review_count": review_count,
                "booking_url": link,
                "fetched_at": fetched_at,
            })
        except (KeyError, TypeError, ValueError):
            continue

    return sorted(results, key=lambda x: x["price_per_night_eur"])


async def search_hotels(
    destination_city: str,
    checkin_date: str,
    checkout_date: str,
    adults: int = 2,
    max_results: int = 3,
) -> list[dict]:
    """
    Async wrapper — runs the SerpApi sync call in a thread pool.
    """
    loop = asyncio.get_running_loop()
    results = await loop.run_in_executor(
        _executor,
        _search_sync,
        destination_city,
        checkin_date,
        checkout_date,
        adults,
    )
    return results[:max_results]


def _count_nights(checkin: str, checkout: str) -> int:
    from datetime import date
    return (date.fromisoformat(checkout) - date.fromisoformat(checkin)).days
