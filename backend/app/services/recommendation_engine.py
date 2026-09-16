# backend/app/services/recommendation_engine.py


RECOMMENDATIONS = {
    "happy": {
        "music": [
            "Happy – Pharrell Williams",
            "Can't Stop the Feeling! – Justin Timberlake",
            "Ilahi – Arijit Singh",
        ],
        "movies": [
            "The Intern",
            "3 Idiots",
            "Zindagi Na Milegi Dobara",
        ],
        "activities": [
            "Spend time with friends or family",
            "Go for a walk or outdoor activity",
            "Try something creative",
        ],
        "explanation": (
            "You seem to be in a positive mood, so these recommendations "
            "are designed to maintain your energy and make the moment more enjoyable."
        ),
    },

    "sad": {
        "music": [
            "Agar Tum Saath Ho – Alka Yagnik & Arijit Singh",
            "Kun Faya Kun – A.R. Rahman",
            "Fix You – Coldplay",
        ],
        "movies": [
            "The Pursuit of Happyness",
            "The Secret Life of Walter Mitty",
            "3 Idiots",
        ],
        "activities": [
            "Talk to someone you trust",
            "Take a relaxing walk",
            "Write down your thoughts",
        ],
        "explanation": (
            "Your mood appears low, so these recommendations focus on "
            "comfort, emotional support, and gradually improving your mood."
        ),
    },

    "angry": {
        "music": [
            "Weightless – Marconi Union",
            "Let Her Go – Passenger",
            "Kun Faya Kun – A.R. Rahman",
        ],
        "movies": [
            "The Secret Life of Walter Mitty",
            "The Pursuit of Happyness",
            "Good Will Hunting",
        ],
        "activities": [
            "Take slow deep breaths",
            "Go for a quiet walk",
            "Take a short break before making decisions",
        ],
        "explanation": (
            "You appear to be experiencing anger or frustration. "
            "These recommendations are intended to help you slow down, "
            "relax, and process the emotion calmly."
        ),
    },

    "stressed": {
        "music": [
            "Weightless – Marconi Union",
            "River Flows in You – Yiruma",
            "Perfect – Ed Sheeran",
        ],
        "movies": [
            "The Intern",
            "Chef",
            "The Secret Life of Walter Mitty",
        ],
        "activities": [
            "Try 5 minutes of deep breathing",
            "Take a short walk away from screens",
            "Listen to calming music",
        ],
        "explanation": (
            "You seem to be experiencing stress, so these recommendations "
            "focus on relaxation, reducing mental overload, and creating a calmer environment."
        ),
    },

    "tired": {
        "music": [
            "River Flows in You – Yiruma",
            "Perfect – Ed Sheeran",
            "Photograph – Ed Sheeran",
        ],
        "movies": [
            "The Intern",
            "Chef",
            "Paddington",
        ],
        "activities": [
            "Take a short rest",
            "Drink some water and stretch",
            "Reduce screen time and relax",
        ],
        "explanation": (
            "You appear tired, so the recommendations focus on low-energy "
            "activities and relaxation instead of demanding tasks."
        ),
    },

    "neutral": {
        "music": [
            "Blinding Lights – The Weeknd",
            "Ilahi – Arijit Singh",
            "Count on Me – Bruno Mars",
        ],
        "movies": [
            "The Intern",
            "3 Idiots",
            "Zindagi Na Milegi Dobara",
        ],
        "activities": [
            "Go for a walk",
            "Read or learn something interesting",
            "Try a new hobby",
        ],
        "explanation": (
            "Your mood appears balanced, so these recommendations provide "
            "a mix of entertainment, exploration, and positive activities."
        ),
    },
}


def get_recommendations(mood: str) -> dict:
    """
    Return recommendations based on detected mood.
    """

    mood = mood.lower().strip()

    return RECOMMENDATIONS.get(
        mood,
        RECOMMENDATIONS["neutral"]
    )


def get_recommendation_summary(mood: str) -> str:
    """
    Return an explanation/summary for the detected mood.
    """

    mood = mood.lower().strip()

    recommendation = RECOMMENDATIONS.get(
        mood,
        RECOMMENDATIONS["neutral"]
    )

    return recommendation["explanation"]