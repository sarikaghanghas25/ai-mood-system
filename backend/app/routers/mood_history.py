from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import User, MoodHistory
from app.schemas.mood_history import MoodHistoryResponse
from app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/mood",
    tags=["Mood History"]
)


# ---------------------------------------------------------
# Mood History
# ---------------------------------------------------------

@router.get(
    "/history",
    response_model=list[MoodHistoryResponse]
)
def get_mood_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = (
        db.query(MoodHistory)
        .filter(MoodHistory.user_id == current_user.id)
        .order_by(MoodHistory.created_at.desc())
        .all()
    )

    return history


# ---------------------------------------------------------
# Mood Trend
# ---------------------------------------------------------

@router.get("/trend")
def get_mood_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = (
        db.query(MoodHistory)
        .filter(MoodHistory.user_id == current_user.id)
        .order_by(MoodHistory.created_at.asc())
        .all()
    )

    mood_scores = {
        "sad": 1,
        "angry": 2,
        "stressed": 2,
        "tired": 3,
        "neutral": 4,
        "happy": 5,
    }

    trend = []

    for item in history:
        mood = item.mood.lower() if item.mood else "neutral"

        trend.append({
            "id": item.id,
            "date": item.created_at,
            "mood": mood,
            "score": mood_scores.get(mood, 4),
            "confidence": item.confidence,
        })

    mood_counts = Counter(
        item["mood"]
        for item in trend
    )

    return {
        "total_records": len(trend),
        "trend": trend,
        "mood_counts": dict(mood_counts),
    }


# ---------------------------------------------------------
# Smart Mood Insights
# ---------------------------------------------------------

@router.get("/insights")
def get_mood_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = (
        db.query(MoodHistory)
        .filter(MoodHistory.user_id == current_user.id)
        .order_by(MoodHistory.created_at.asc())
        .all()
    )

    # No mood history
    if not history:
        return {
            "total_records": 0,
            "dominant_mood": None,
            "average_score": 0,
            "trend_direction": "stable",
            "insights": [
                "Start analyzing your mood to generate personalized insights."
            ]
        }

    mood_scores = {
        "sad": 1,
        "angry": 2,
        "stressed": 2,
        "tired": 3,
        "neutral": 4,
        "happy": 5,
    }

    moods = [
        item.mood.lower()
        for item in history
        if item.mood
    ]

    # Count moods
    mood_counts = Counter(moods)

    # Most frequent mood
    dominant_mood = mood_counts.most_common(1)[0][0]

    # Average mood score
    scores = [
        mood_scores.get(mood, 4)
        for mood in moods
    ]

    average_score = round(
        sum(scores) / len(scores),
        2
    )

    # -----------------------------------------------------
    # Determine mood trend
    # -----------------------------------------------------

    if len(scores) < 2:
        trend_direction = "stable"
    else:
        recent_scores = scores[-3:]
        previous_scores = scores[:-3]

        recent_average = (
            sum(recent_scores) / len(recent_scores)
        )

        if previous_scores:
            previous_average = (
                sum(previous_scores) / len(previous_scores)
            )
        else:
            previous_average = recent_average

        difference = recent_average - previous_average

        if difference > 0.3:
            trend_direction = "improving"
        elif difference < -0.3:
            trend_direction = "declining"
        else:
            trend_direction = "stable"

    # -----------------------------------------------------
    # Generate insights
    # -----------------------------------------------------

    insights = []

    # Dominant mood insight
    if dominant_mood == "happy":
        insights.append(
            "Happy mood is your most frequent mood. "
            "Keep doing activities that support your positive energy."
        )

    elif dominant_mood == "sad":
        insights.append(
            "Sad mood appears frequently in your recent records. "
            "Consider talking with someone you trust and taking time to relax."
        )

    elif dominant_mood == "angry":
        insights.append(
            "Anger appears frequently in your mood history. "
            "Taking short breaks and practicing slow breathing may help."
        )

    elif dominant_mood == "stressed":
        insights.append(
            "Stress appears frequently in your mood history. "
            "Consider taking regular breaks, walking, or practicing relaxation."
        )

    elif dominant_mood == "tired":
        insights.append(
            "Tired mood appears frequently. "
            "Make time for rest, hydration, and reducing screen time."
        )

    else:
        insights.append(
            "Your mood history shows a balanced pattern."
        )

    # Trend insight
    if trend_direction == "improving":
        insights.append(
            "Your recent mood trend is improving compared with your earlier records."
        )

    elif trend_direction == "declining":
        insights.append(
            "Your recent mood trend is lower than your earlier records. "
            "Consider focusing on rest and activities that help you feel better."
        )

    else:
        insights.append(
            "Your recent mood trend is relatively stable."
        )

    # Positive mood frequency
    happy_count = mood_counts.get("happy", 0)

    if happy_count > 0:
        happy_percentage = round(
            (happy_count / len(moods)) * 100,
            1
        )

        insights.append(
            f"Happy mood was detected in {happy_percentage}% "
            "of your recorded mood entries."
        )

    # Stress-related insight
    stress_count = (
        mood_counts.get("stressed", 0)
        + mood_counts.get("angry", 0)
    )

    if stress_count >= 2:
        insights.append(
            "You have had multiple stress or anger related entries. "
            "Try adding short relaxation breaks to your routine."
        )

    return {
        "total_records": len(history),
        "dominant_mood": dominant_mood,
        "average_score": average_score,
        "trend_direction": trend_direction,
        "mood_counts": dict(mood_counts),
        "insights": insights,
    }