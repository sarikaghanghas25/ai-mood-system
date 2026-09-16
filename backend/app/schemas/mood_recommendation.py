from pydantic import BaseModel, Field


class MoodRecommendationRequest(BaseModel):
    text: str = Field(
        min_length=2,
        max_length=1000
    )


class MoodRecommendationResponse(BaseModel):
    mood: str
    confidence: float
    explanation: str
    music: list[str]
    movies: list[str]
    activities: list[str]