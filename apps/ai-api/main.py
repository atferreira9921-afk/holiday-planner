import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import holidays, suggestions, feedback
from app.models.response_models import HealthResponse

app = FastAPI(
    title="Holiday Planner AI API",
    description="AI-powered holiday suggestion engine",
    version="0.1.0",
)

# Only allow requests from the configured app URL (and localhost in dev).
# Do not use wildcards — they defeat the purpose of CORS.
_app_url = os.environ.get("NEXT_PUBLIC_APP_URL", "").rstrip("/")
_allowed_origins = ["http://localhost:3000"]
if _app_url:
    _allowed_origins.append(_app_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "X-FastAPI-Secret", "X-User-Id"],
)

app.include_router(holidays.router)
app.include_router(suggestions.router)
app.include_router(feedback.router)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", version="0.1.0")
