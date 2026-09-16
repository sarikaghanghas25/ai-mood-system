from pydantic import BaseModel


class RecommendationResponse(BaseModel):
    mood: str
    music: list[str]
    movies: list[str]
    activities: list[str]