from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MoodHistoryResponse(BaseModel):
    id: int
    text: str
    mood: str
    # All detected moods, e.g. ["sad", "anxious"]
    moods: list[str] = Field(validation_alias="mood_list")
    confidence: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)