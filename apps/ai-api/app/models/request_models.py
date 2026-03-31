from pydantic import BaseModel
from typing import Literal


class UserPreferencesModel(BaseModel):
    home_country: str
    home_city: str
    vacation_days_per_year: int
    travel_style: Literal["budget", "mid-range", "luxury"]
    budget_min_eur: int
    budget_max_eur: int
    accommodation_types: list[str]
    interests: list[str]
    avoid_destinations: list[str]
    min_trip_days: int
    max_trip_days: int


class MemberCalendarModel(BaseModel):
    user_id: str
    home_country: str
    home_city: str
    vacation_days_remaining: int
    blocked_dates: list[str]  # ISO dates already booked/unavailable
    preferences: UserPreferencesModel


class TripConstraintsModel(BaseModel):
    desired_duration_days: int
    earliest_departure: str  # ISO date
    latest_return: str  # ISO date
    budget_per_person_eur: int | None = None
    destination_hint: str | None = None
    planning_mode: Literal["days_first", "destination_first"] = "days_first"
    destination_city: str | None = None
    destination_country: str | None = None  # ISO alpha-2


class GenerateSuggestionsRequest(BaseModel):
    trip_id: str
    group_members: list[MemberCalendarModel]
    trip_constraints: TripConstraintsModel


class SubmitFeedbackRequest(BaseModel):
    suggestion_id: str
    user_id: str
    rating: Literal[1, 2, 3, 4, 5]
    liked_aspects: list[str] = []
    disliked_aspects: list[str] = []
    free_text: str | None = None
