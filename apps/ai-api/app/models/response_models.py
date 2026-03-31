from pydantic import BaseModel


class FlightOptionModel(BaseModel):
    origin_iata: str
    destination_iata: str
    departure_date: str
    return_date: str
    price_eur: float
    airline: str
    stops: int = 0
    booking_url: str | None = None
    fetched_at: str


class HotelOptionModel(BaseModel):
    name: str
    stars: int
    price_per_night_eur: float
    total_price_eur: float
    rating: float
    review_count: int = 0
    booking_url: str | None = None
    fetched_at: str


class SuggestionModel(BaseModel):
    rank: int
    destination_city: str
    destination_country: str
    destination_iata: str
    suggested_departure: str
    suggested_return: str
    total_days: int
    vacation_days_used: int
    overlap_score: float
    estimated_flight_price_eur: float | None
    estimated_hotel_price_eur: float | None
    estimated_total_price_eur: float | None
    flight_data: FlightOptionModel | None
    hotel_data: HotelOptionModel | None
    reasoning: str
    highlights: list[str]
    trade_offs: list[str]
    ai_model_version: str


class GenerateSuggestionsResponse(BaseModel):
    trip_id: str
    suggestions: list[SuggestionModel]
    generated_at: str


class HealthResponse(BaseModel):
    status: str
    version: str
