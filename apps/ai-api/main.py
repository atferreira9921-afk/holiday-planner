from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import holidays, suggestions, feedback
from app.models.response_models import HealthResponse

app = FastAPI(
    title="Holiday Planner AI API",
    description="AI-powered holiday suggestion engine",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(holidays.router)
app.include_router(suggestions.router)
app.include_router(feedback.router)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", version="0.1.0")
