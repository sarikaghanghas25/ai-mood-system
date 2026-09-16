from pydantic import BaseModel, Field


class MoodDetectRequest(BaseModel):
    text: str = Field(min_length=3, max_length=1000)


class MoodDetectResponse(BaseModel):
    mood: str
    confidence: float