from app.ai.mood_model import predict_mood


MOOD_EXPLANATIONS = {
    "happy": (
        "The AI detected positive emotional signals such as happiness, "
        "energy, excitement, or satisfaction."
    ),
    "sad": (
        "The AI detected emotional signals associated with sadness, "
        "loneliness, disappointment, or low mood."
    ),
    "angry": (
        "The AI detected signals associated with anger, frustration, "
        "irritation, or loss of patience."
    ),
    "stressed": (
        "The AI detected signals associated with pressure, worry, "
        "anxiety, or feeling overwhelmed."
    ),
    "tired": (
        "The AI detected signals associated with tiredness, exhaustion, "
        "low energy, or the need for rest."
    ),
    "neutral": (
        "The AI detected a relatively balanced emotional state "
        "without a strong positive or negative signal."
    ),
}


def detect_mood_with_ai(text: str) -> dict:
    """
    Detect mood using the trained ML model.
    """

    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    result = predict_mood(text.strip())

    mood = result["mood"]
    confidence = result["confidence"]
    probabilities = result["probabilities"]

    explanation = MOOD_EXPLANATIONS.get(
        mood,
        "The AI detected a general emotional pattern in the text."
    )

    return {
        "mood": mood,
        "confidence": confidence,
        "explanation": explanation,
        "probabilities": probabilities,
    }


# Keep the older function name available too.
def analyze_mood(text: str) -> dict:
    return detect_mood_with_ai(text)