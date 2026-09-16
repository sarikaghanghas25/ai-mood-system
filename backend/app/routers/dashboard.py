from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models import User, MoodHistory
from app.schemas.dashboard import DashboardResponse
from app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


@router.get(
    "",
    response_model=DashboardResponse
)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = (
        db.query(MoodHistory)
        .filter(MoodHistory.user_id == current_user.id)
        .order_by(MoodHistory.created_at.desc())
        .all()
    )

    mood_counts = dict(
        Counter(record.mood for record in history)
    )

    latest = history[0] if history else None

    return {
        "user_name": current_user.name,
        "user_email": current_user.email,
        "total_moods": len(history),
        "mood_counts": mood_counts,
        "latest_mood": latest.mood if latest else None,
        "latest_confidence": (
            latest.confidence if latest else None
        ),
        "latest_text": latest.text if latest else None,
        "latest_created_at": (
            latest.created_at if latest else None
        )
    }