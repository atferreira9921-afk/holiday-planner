from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str
    supabase_url: str
    supabase_service_role_key: str

    # Flights (SerpApi — Google Flights)
    serpapi_key: str = ""

    # Service auth (shared secret with Next.js) — required, no default
    fastapi_secret: str

    port: int = 8000


settings = Settings()
