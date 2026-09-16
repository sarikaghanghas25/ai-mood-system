from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AI Mood Detection & Personalized Recommendation System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite:///./mood_system.db"

    JWT_SECRET_KEY: str = "change-this-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60


settings = Settings()