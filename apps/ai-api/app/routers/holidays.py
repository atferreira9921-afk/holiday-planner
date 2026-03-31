from fastapi import APIRouter, HTTPException
from app.services.holiday_service import get_public_holidays

router = APIRouter(prefix="/holidays", tags=["holidays"])


@router.get("/{country_code}/{year}")
async def list_public_holidays(country_code: str, year: int):
    """
    Return public holidays for a country and year.
    Fetched from Nager.Date and cached in Supabase.
    """
    if len(country_code) != 2:
        raise HTTPException(status_code=400, detail="country_code must be ISO 3166-1 alpha-2 (e.g. PT, GB)")
    if year < 2020 or year > 2035:
        raise HTTPException(status_code=400, detail="year must be between 2020 and 2035")

    holidays = await get_public_holidays(country_code.upper(), year)
    return {"country_code": country_code.upper(), "year": year, "holidays": holidays}
