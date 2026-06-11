from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    api_prefix: str = "/api"
    database_url: str = (
        "postgresql+psycopg://neuroexam:neuroexam@127.0.0.1:5433/neuroexam"
    )
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: int = 90
    llm_max_retries: int = 2
    llm_retry_delay_seconds: float = 1.5
    disable_llm: bool = False

    @property
    def llm_configured(self) -> bool:
        return (not self.disable_llm) and bool(self.openai_api_key.strip())

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            item.strip()
            for item in self.cors_origins.split(",")
            if item.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
