from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import User, MoodHistory
from app.schemas.mood_recommendation import MoodRecommendationRequest
from app.services.mood_ai import detect_mood_with_ai
from app.services.recommendation_engine import get_recommendations
from app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/mood",
    tags=["Mood & Recommendations"]
)


@router.post("/recommend")
def mood_and_recommend(
    request: MoodRecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ---------------------------------------------------------
    # AI Mood Detection
    # ---------------------------------------------------------

    ai_result = detect_mood_with_ai(request.text)

    mood = ai_result["mood"]
    confidence = ai_result["confidence"]
    explanation = ai_result["explanation"]
    probabilities = ai_result.get("probabilities", {})

    # ---------------------------------------------------------
    # Personalized Recommendations
    # ---------------------------------------------------------

    recommendations = get_recommendations(mood)

    # ---------------------------------------------------------
    # Save Mood History
    # ---------------------------------------------------------

    mood_history = MoodHistory(
        user_id=current_user.id,
        text=request.text,
        mood=mood,
        confidence=confidence
    )

    db.add(mood_history)
    db.commit()
    db.refresh(mood_history)

    # ---------------------------------------------------------
    # Return Response
    # ---------------------------------------------------------

    return {
        "mood": mood,
        "confidence": confidence,
        "explanation": explanation,
        "probabilities": probabilities,
        "recommendations": recommendations
    }