import re
from pathlib import Path

import joblib
from sklearn.base import BaseEstimator, TransformerMixin


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

    text = text.strip()

    probabilities = model.predict_proba([text])[0]
    classes = model.classes_

    raw_probabilities = {
        mood: float(probability)
        for mood, probability in zip(classes, probabilities)
    }

    prediction = model.predict([text])[0]

    return {
        "mood": prediction,
        "probabilities": raw_probabilities,
    }

# ============================================================
# MULTI-LABEL MODEL
# ============================================================

MOODS = ["happy", "sad", "angry", "tired", "anxious", "stressed", "neutral"]

MULTILABEL_MODEL_PATH = (
    Path(__file__).resolve().parent / "mood_multilabel_model.joblib"
)

MAX_MOODS = 3

# An emotion at or above this probability is never overruled by neutral
STRONG_EMOTION = 0.75

EMBEDDING_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

_encoders = {}


def get_encoder(model_name: str):
    """Loaded once per process; the first ever call downloads ~470MB."""
    if model_name not in _encoders:
        from sentence_transformers import SentenceTransformer

        _encoders[model_name] = SentenceTransformer(model_name)

    return _encoders[model_name]


class SentenceEmbedder(BaseEstimator, TransformerMixin):
    """
    Turns each sentence into a meaning vector, so "I aced my test" lands
    near "I passed my exam" even if "aced" never appeared in training.

    The encoder itself is not saved inside the joblib file, only its name.
    """

    def __init__(self, model_name=EMBEDDING_MODEL_NAME, weight=1.0):
        self.model_name = model_name
        self.weight = weight

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        # NEG_ markers are for the word features; the encoder reads plain text
        texts = [re.sub(r"\bNEG_", "", text) for text in X]

        vectors = get_encoder(self.model_name).encode(
            texts,
            batch_size=64,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        return vectors * self.weight

_multilabel_model = None

NEGATORS = {"not", "never", "no", "nahin"}

# Skipped when looking for the word a negator applies to
NEGATION_FILLERS = {"very", "really", "so", "that", "too", "feeling", "feel", "at", "even", "much"}


def mark_negation(text: str) -> str:
    """
    "i am not angry just tired" -> "i am not NEG_angry just tired"

    Without this, "angry" counts as anger even after "not". Only English
    negators that come before the word are handled; Hinglish "nahi" comes
    after the word and often does not cancel the mood ("neend nahi aa rahi").
    """
    words = text.split()
    result = []
    negate_next = False

    for word in words:
        if negate_next and word not in NEGATION_FILLERS:
            result.append(f"NEG_{word}")
            negate_next = False
            continue

        result.append(word)

        if word in NEGATORS:
            negate_next = True

    return " ".join(result)


def load_multilabel_model():
    """Returns {"pipeline", "moods", "thresholds"}, or None if not trained yet."""
    global _multilabel_model

    if _multilabel_model is None and MULTILABEL_MODEL_PATH.exists():
        _multilabel_model = joblib.load(MULTILABEL_MODEL_PATH)

    return _multilabel_model


def select_moods(probabilities: dict, thresholds: dict):
    """
    Every emotional mood above its own threshold, strongest first.
    Neutral wins when it is the most likely mood; otherwise it is only
    returned when no emotional mood qualifies.
    """
    neutral = probabilities.get("neutral", 0.0)
    strongest_emotion = max(
        (p for mood, p in probabilities.items() if mood != "neutral"),
        default=0.0,
    )

    # A clearly felt emotion still wins over a near-tied neutral
    # ("getting shy": neutral 0.92 vs sad 0.88 should not be neutral)
    if (
        neutral >= thresholds.get("neutral", 0.5)
        and neutral > strongest_emotion
        and strongest_emotion < STRONG_EMOTION
    ):
        return ["neutral"]

    detected = sorted(
        (
            mood for mood, probability in probabilities.items()
            if mood != "neutral" and probability >= thresholds.get(mood, 0.5)
        ),
        key=lambda mood: probabilities[mood],
        reverse=True,
    )

    if detected:
        return detected[:MAX_MOODS]

    if probabilities.get("neutral", 0.0) >= thresholds.get("neutral", 0.5):
        return ["neutral"]

    return [max(probabilities, key=probabilities.get)]


def predict_moods(text: str):
    """Expects text already passed through normalize_text()."""
    text = mark_negation(text.strip())
    bundle = load_multilabel_model()

    if bundle is None:
        raise FileNotFoundError(
            f"Multi-label model not found at {MULTILABEL_MODEL_PATH}. "
            "Please run train_multilabel_model.py first."
        )

    probabilities = dict(zip(
        bundle["moods"],
        (float(p) for p in bundle["pipeline"].predict_proba([text])[0]),
    ))

    moods = select_moods(probabilities, bundle["thresholds"])

    return {
        "mood": moods[0],
        "moods": moods,
        "probabilities": probabilities,
    }
