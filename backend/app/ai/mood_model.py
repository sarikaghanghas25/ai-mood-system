from pathlib import Path

import joblib


MODEL_PATH = Path(__file__).resolve().parent / "mood_model.joblib"


_model = None


def load_model():
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"ML model not found at {MODEL_PATH}. "
                "Please run train_model.py first."
            )

        _model = joblib.load(MODEL_PATH)

    return _model


def predict_mood(text: str):
    model = load_model()

    prediction = model.predict([text])[0]

    probabilities = model.predict_proba([text])[0]

    classes = model.classes_

    confidence = max(probabilities) * 100

    probability_map = {
        mood: round(float(probability) * 100, 2)
        for mood, probability in zip(classes, probabilities)
    }

    return {
        "mood": prediction,
        "confidence": round(confidence, 2),
        "probabilities": probability_map,
    }