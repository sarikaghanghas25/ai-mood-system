from fastapi import APIRouter, Depends
from app.schemas.mood import MoodDetectRequest, MoodDetectResponse
from app.utils.security import get_current_user
from app.models import User


router = APIRouter(
    prefix="/api/mood",
    tags=["Mood Detection"]
)


@router.post(
    "/detect",
    response_model=MoodDetectResponse
)
def detect_mood(
    mood_data: MoodDetectRequest,
    current_user: User = Depends(get_current_user)
):
    text = mood_data.text.lower()

    if any(word in text for word in ["sad", "depressed", "unhappy", "lonely", "cry"]):
        mood = "sad"
        confidence = 0.85

    elif any(word in text for word in ["angry", "mad", "furious", "annoyed"]):
        mood = "angry"
        confidence = 0.85

    elif any(word in text for word in ["stress", "stressed", "anxious", "worried", "tension"]):
        mood = "stressed"
        confidence = 0.87

    elif any(word in text for word in ["happy", "great", "excited", "joy", "good"]):
        mood = "happy"
        confidence = 0.90

    elif any(word in text for word in ["tired", "exhausted", "sleepy", "fatigued"]):
        mood = "tired"
        confidence = 0.88

    else:
        mood = "neutral"
        confidence = 0.60

    return {
        "mood": mood,
        "confidence": confidence
    }
