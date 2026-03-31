"""
Manages preference embeddings stored in pgvector (Supabase).
Uses Claude to generate text representations of preferences,
then stores embeddings for similarity-based destination matching.

NOTE: Anthropic doesn't expose an embeddings endpoint directly.
We use a simple weighted vector approach based on feedback signals,
updated via exponential moving average.
"""
import json
import math
from app.database import get_supabase


EMBEDDING_DIM = 1536

# Interest categories mapped to dimension indices (simplified)
INTEREST_DIMENSIONS = {
    "beach": 0,
    "mountains": 1,
    "culture": 2,
    "food": 3,
    "nightlife": 4,
    "nature": 5,
    "city": 6,
    "adventure": 7,
    "relaxation": 8,
    "history": 9,
}

STYLE_DIMENSIONS = {
    "budget": 10,
    "mid-range": 11,
    "luxury": 12,
}

ASPECT_DIMENSIONS = {
    "destination": 20,
    "timing": 21,
    "price": 22,
    "hotel": 23,
    "flight": 24,
    "duration": 25,
    "weather": 26,
}


def _zero_vector() -> list[float]:
    return [0.0] * EMBEDDING_DIM


def _normalize(vec: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(x ** 2 for x in vec))
    if magnitude == 0:
        return vec
    return [x / magnitude for x in vec]


def preferences_to_vector(preferences: dict) -> list[float]:
    """Convert user preferences dict to a starting embedding vector."""
    vec = _zero_vector()

    for interest in preferences.get("interests", []):
        dim = INTEREST_DIMENSIONS.get(interest.lower())
        if dim is not None:
            vec[dim] = 1.0

    style = preferences.get("travel_style", "mid-range")
    style_dim = STYLE_DIMENSIONS.get(style)
    if style_dim is not None:
        vec[style_dim] = 1.0

    # Budget encoding: normalize 0-10000 range to 0-1 in dim 13
    budget_max = preferences.get("budget_max_eur", 2000)
    vec[13] = min(budget_max / 10000, 1.0)

    return _normalize(vec)


async def update_preference_embedding(
    user_id: str,
    liked_aspects: list[str],
    disliked_aspects: list[str],
    rating: int,
) -> None:
    """
    Update a user's preference embedding based on feedback.
    Uses exponential moving average: new = old * 0.85 + feedback * 0.15
    """
    supabase = get_supabase()

    # Load current embedding
    result = (
        supabase.table("user_preferences")
        .select("preference_embedding, interests, travel_style, budget_max_eur")
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        return

    prefs = result.data
    current_embedding = prefs.get("preference_embedding")

    if current_embedding is None:
        current_embedding = preferences_to_vector(prefs)

    # Build feedback delta vector
    delta = _zero_vector()
    rating_scale = (rating - 3) / 2  # -1 to +1

    for aspect in liked_aspects:
        dim = ASPECT_DIMENSIONS.get(aspect)
        if dim is not None:
            delta[dim] += 0.5 * rating_scale

    for aspect in disliked_aspects:
        dim = ASPECT_DIMENSIONS.get(aspect)
        if dim is not None:
            delta[dim] -= 0.5

    # Blend: old * 0.85 + feedback * 0.15
    new_embedding = [
        current_embedding[i] * 0.85 + delta[i] * 0.15
        for i in range(EMBEDDING_DIM)
    ]
    new_embedding = _normalize(new_embedding)

    supabase.table("user_preferences").update(
        {"preference_embedding": new_embedding}
    ).eq("user_id", user_id).execute()


async def get_preference_embedding(user_id: str) -> list[float] | None:
    """Retrieve a user's preference embedding, or None if not set."""
    supabase = get_supabase()

    result = (
        supabase.table("user_preferences")
        .select("preference_embedding")
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if result.data:
        return result.data.get("preference_embedding")
    return None
