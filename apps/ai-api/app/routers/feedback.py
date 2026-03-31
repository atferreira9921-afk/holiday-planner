from fastapi import APIRouter, HTTPException, Header
from app.models.request_models import SubmitFeedbackRequest
from app.services.embedding_service import update_preference_embedding
from app.database import get_supabase
from app.config import settings

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _verify_secret(x_fastapi_secret: str | None):
    if x_fastapi_secret != settings.fastapi_secret:
        raise HTTPException(status_code=401, detail="Invalid service secret")


@router.post("/")
async def submit_feedback(
    req: SubmitFeedbackRequest,
    x_fastapi_secret: str | None = Header(default=None),
):
    """
    Process user feedback on a suggestion.
    Saves to DB and updates the user's preference embedding.
    """
    _verify_secret(x_fastapi_secret)

    supabase = get_supabase()

    # Save feedback to DB
    supabase.table("suggestion_feedback").upsert(
        {
            "suggestion_id": req.suggestion_id,
            "user_id": req.user_id,
            "rating": req.rating,
            "liked_aspects": req.liked_aspects,
            "disliked_aspects": req.disliked_aspects,
            "free_text": req.free_text,
        },
        on_conflict="suggestion_id,user_id",
    ).execute()

    # Update preference embedding (learning)
    await update_preference_embedding(
        user_id=req.user_id,
        liked_aspects=req.liked_aspects,
        disliked_aspects=req.disliked_aspects,
        rating=req.rating,
    )

    return {"status": "ok", "message": "Feedback saved and preferences updated"}
