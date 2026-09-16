from fastapi import APIRouter, Depends, HTTPException

from app.models import User
from app.schemas.recommendation import RecommendationResponse
from app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/recommendations",
    tags=["Recommendations"]
)


RECOMMENDATIONS = {
    "happy": {
        "music": [
            "Upbeat Pop",
            "Feel Good Playlist",
            "Dance Hits"
        ],
        "movies": [
            "The Secret Life of Walter Mitty",
            "Paddington 2",
            "The Intern"
        ],
        "activities": [
            "Go for a walk",
            "Meet a friend",
            "Try something creative"
        ]
    },

    "sad": {
        "music": [
            "Calm Acoustic",
            "Lo-fi Chill",
            "Soft Piano"
        ],
        "movies": [
            "Good Will Hunting",
            "About Time",
            "The Pursuit of Happyness"
        ],
        "activities": [
            "Take a relaxing walk",
            "Write in a journal",
            "Talk to someone you trust"
        ]
    },

    "angry": {
        "music": [
            "Calm Instrumental",
            "Meditation Music",
            "Relaxing Ambient"
        ],
        "movies": [
            "The Secret Life of Walter Mitty",
            "Chef",
            "Soul"
        ],
        "activities": [
            "Take deep breaths",
            "Go for a walk",
            "Do some light exercise"
        ]
    },

    "stressed": {
        "music": [
            "Meditation Music",
            "Rain Sounds",
            "Lo-fi Relaxation"
        ],
        "movies": [
            "The Intern",
            "Chef",
            "Paddington 2"
        ],
        "activities": [
            "Practice breathing exercises",
            "Take a short break",
            "Go for a peaceful walk"
        ]
    },

    "tired": {
        "music": [
            "Sleep Sounds",
            "Soft Piano",
            "Calm Acoustic"
        ],
        "movies": [
            "Paddington 2",
            "The Intern",
            "About Time"
        ],
        "activities": [
            "Take a power nap",
            "Rest for a while",
            "Get some fresh air"
        ]
    },

    "neutral": {
        "music": [
            "Chill Playlist",
            "Indie Mix",
            "Acoustic Favorites"
        ],
        "movies": [
            "The Intern",
            "Chef",
            "The Secret Life of Walter Mitty"
        ],
        "activities": [
            "Read a book",
            "Go for a walk",
            "Learn something new"
        ]
    }
}


@router.get(
    "/{mood}",
    response_model=RecommendationResponse
)
def get_recommendations(
    mood: str,
    current_user: User = Depends(get_current_user)
):
    mood = mood.lower()

    if mood not in RECOMMENDATIONS:
        raise HTTPException(
            status_code=404,
            detail="Recommendations not available for this mood"
        )

    recommendations = RECOMMENDATIONS[mood]

    return {
        "mood": mood,
        "music": recommendations["music"],
        "movies": recommendations["movies"],
        "activities": recommendations["activities"]
    }
