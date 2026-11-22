from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Values can also come from backend/.env (git-ignored)
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        extra="ignore",
    )

    APP_NAME: str = "AI Mood Detection & Personalized Recommendation System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite:///./mood_system.db"

    JWT_SECRET_KEY: str = "change-this-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # AI Companion chatbot, tried in this order:
    # 1. Claude (paid) - only when a key is set
    ANTHROPIC_API_KEY: str = ""
    # 2. Free local model through Ollama - empty OLLAMA_MODEL turns it off
    OLLAMA_URL: str = "http://127.0.0.1:11434"
    # gemma2:9b understood Hinglish far better than qwen2.5:7b in testing
    OLLAMA_MODEL: str = "gemma2:9b"
    # 3. Otherwise the built-in rule-based replies


settings = Settings()
