# app/core/config.py
# Совместимо с Pydantic v2 и v1. Экспортирует переменную `settings`.

from typing import Optional

import requests


try:
    # --- Pydantic v2 ---
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        # обязательные ключи
        OPENAI_API_KEY: str
        HEYGEN_API_KEY: str

        

        # дефолты
        HEYGEN_SERVER_URL: str = "https://api.heygen.com"
        # AVATAR_ID: str = "Elenora_IT_Sitting_public"
        AVATAR_ID: str = "Pedro_ProfessionalLook_public"
        #AVATAR_ID: str = "Pedro_Black_Suit_public"
        # AVATAR_ID: str = "Pedro_Chair_Sitting_public"
        # AVATAR_ID: str = "21f456fb4531478bb140787bbfb01915"
        # AVATAR_ID: str = "Dexter_Lawyer_Sitting_public"
        # VOICE_ID: str = "ba1544b5eae84eae9cb92598f078b6b0"
        # VOICE_ID: str = "bc69c9589d6747028dc5ec4aec2b43c3"
        VOICE_ID: str = "42d598350e7a4d339a3875eb1b0169fd"

        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            extra="ignore",           # игнорируем лишние переменные в .env
        )

except ModuleNotFoundError:
    # --- Pydantic v1 ---
    from pydantic import BaseSettings

    class Settings(BaseSettings):
        OPENAI_API_KEY: str
        HEYGEN_API_KEY: str

        HEYGEN_SERVER_URL: str = "https://api.heygen.com"
        AVATAR_ID: str = "Pedro_ProfessionalLook_public"
        # VOICE_ID: str = "ba1544b5eae84eae9cb92598f078b6b0"
        VOICE_ID: str = "42d598350e7a4d339a3875eb1b0169fd"

        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            extra = "ignore"

# ГЛАВНОЕ: единая точка доступа
settings = Settings()






