from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DashboardResponse(BaseModel):
    user_name: str
    user_email: str

    total_moods: int

    mood_counts: dict[str, int]

    latest_mood: str | None
    latest_confidence: float | None
    latest_text: str | None
    latest_created_at: datetime | None

    model_config = ConfigDict(from_attributes=True)