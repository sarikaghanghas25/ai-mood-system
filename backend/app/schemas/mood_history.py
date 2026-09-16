from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MoodHistoryResponse(BaseModel):
    id: int
    text: str
    mood: str
    confidence: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)