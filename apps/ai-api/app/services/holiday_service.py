"""
Fetches public holidays from Nager.Date API and caches them in Supabase.
No API key required.
"""
import httpx
from datetime import datetime
from app.database import get_supabase

NAGER_BASE = "https://date.nager.at/api/v3"


async def get_public_holidays(country_code: str, year: int) -> list[dict]:
    """Return public holidays for a country/year, using DB cache."""
    supabase = get_supabase()

    # Check cache first
    result = (
        supabase.table("public_holidays")
        .select("*")
        .eq("country_code", country_code.upper())
        .eq("year", year)
        .execute()
    )

    if result.data:
        return result.data

    # Fetch from Nager.Date
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{NAGER_BASE}/PublicHolidays/{year}/{country_code.upper()}")
        resp.raise_for_status()
        holidays = resp.json()

    # Persist to cache
    rows = [
        {
            "country_code": country_code.upper(),
            "year": year,
            "date": h["date"],
            "name": h["name"],
            "local_name": h["localName"],
            "is_fixed": h.get("fixed", False),
        }
        for h in holidays
    ]

    if rows:
        supabase.table("public_holidays").upsert(
            rows,
            on_conflict="country_code,date,name",
        ).execute()

    return rows


def find_holiday_bridges(
    holidays: list[dict],
    start_date: str,
    end_date: str,
) -> list[dict]:
    """Return holidays that fall within a date window."""
    from datetime import date

    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)

    return [
        h for h in holidays
        if start <= date.fromisoformat(h["date"]) <= end
    ]
