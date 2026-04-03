import hmac
from fastapi import APIRouter, HTTPException, Header
from app.models.request_models import GenerateSuggestionsRequest
from app.models.response_models import GenerateSuggestionsResponse
from app.services.ai_engine import generate_suggestions
from app.config import settings

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


def _verify_secret(x_fastapi_secret: str | None):
    if not x_fastapi_secret or not hmac.compare_digest(x_fastapi_secret, settings.fastapi_secret):
        raise HTTPException(status_code=401, detail="Invalid service secret")


@router.post("/generate", response_model=GenerateSuggestionsResponse)
async def generate(
    req: GenerateSuggestionsRequest,
    x_fastapi_secret: str | None = Header(default=None),
):
    """
    Main AI pipeline endpoint.
    Called by Next.js API route when user requests suggestions for a trip.
    Requires X-FastAPI-Secret header.
    """
    _verify_secret(x_fastapi_secret)

    if not req.group_members:
        raise HTTPException(status_code=400, detail="At least one group member is required")

    return await generate_suggestions(req)


@router.get("/{trip_id}")
async def get_suggestions(
    trip_id: str,
    x_fastapi_secret: str | None = Header(default=None),
):
    """Retrieve existing suggestions for a trip from Supabase."""
    _verify_secret(x_fastapi_secret)

    from app.database import get_supabase
    supabase = get_supabase()

    result = (
        supabase.table("trip_suggestions")
        .select("*")
        .eq("trip_id", trip_id)
        .order("rank")
        .execute()
    )

    return {"trip_id": trip_id, "suggestions": result.data}
