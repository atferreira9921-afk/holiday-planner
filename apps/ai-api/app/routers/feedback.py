import hmac
from fastapi import APIRouter, HTTPException, Header
from app.models.request_models import SubmitFeedbackRequest
from app.services.embedding_service import update_preference_embedding
from app.database import get_supabase
from app.config import settings

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _verify_secret(x_fastapi_secret: str | None):
    if not x_fastapi_secret or not hmac.compare_digest(x_fastapi_secret, settings.fastapi_secret):
        raise HTTPException(status_code=401, detail="Invalid service secret")


@router.post("/")
async def submit_feedback(
    req: SubmitFeedbackRequest,
    x_fastapi_secret: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
):
    """
    Process user feedback on a suggestion.
    Saves to DB and updates the user's preference embedding.
    user_id is taken from the X-User-Id header set by the trusted Next.js backend,
    never from the request body.
    """
    _verify_secret(x_fastapi_secret)

    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header required")

    supabase = get_supabase()

    # Save feedback to DB — user_id comes from the verified header, not the body
    supabase.table("suggestion_feedback").upsert(
        {
            "suggestion_id": req.suggestion_id,
            "user_id": x_user_id,
            "rating": req.rating,
            "liked_aspects": req.liked_aspects,
            "disliked_aspects": req.disliked_aspects,
            "free_text": req.free_text,
        },
        on_conflict="suggestion_id,user_id",
    ).execute()

    # Update preference embedding (learning)
    await update_preference_embedding(
        user_id=x_user_id,
        liked_aspects=req.liked_aspects,
        disliked_aspects=req.disliked_aspects,
        rating=req.rating,
    )

    return {"status": "ok", "message": "Feedback saved and preferences updated"}
