from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import User, MoodHistory
from app.schemas.mood_recommendation import (
    MoodRecommendationRequest
)
from app.services.mood_ai import (
    detect_mood_with_ai,
    normalize_text
)
from app.services.mood_explain import (
    explain_words
)
from app.services.recommendation_engine import (
    get_recommendations
)
from app.utils.security import (
    get_current_user
)


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

    ai_result = detect_mood_with_ai(
        request.text
    )

    mood = ai_result["mood"]
    confidence = ai_result["confidence"]

    # Recommendations follow the main mood only
    recommendations = get_recommendations(
        mood,
        user_id=current_user.id,
    )

    mood_history = MoodHistory(
        user_id=current_user.id,
        text=request.text,
        mood=mood,
        moods=",".join(ai_result["moods"]),
        confidence=confidence
    )

    db.add(mood_history)
    db.commit()
    db.refresh(mood_history)

    return {
        "mood": mood,
        "moods": ai_result["moods"],
        "confidence": confidence,
        "intensity": ai_result["intensity"],
        "explanation": ai_result["explanation"],
        "probabilities": ai_result["probabilities"],
        "related_emotions": ai_result["related_emotions"],
        # Which words led to each mood, for highlighting in the result
        "highlights": explain_words(
            request.text,
            ai_result["moods"],
            normalize_text
        ),
        "recommendations": recommendations
    }