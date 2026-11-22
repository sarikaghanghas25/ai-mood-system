"""
Which words made the model pick each mood.

Every word is left out once and the sentence is scored again; the more a
mood's score falls without a word, the more that word mattered. Scores
are compared as log-odds, so a word still counts when the model was
already 99% sure. Words are taken from the original text, so the user
sees their own spelling.
"""

import math
import re

from app.ai.mood_model import load_multilabel_model, mark_negation

# A word must lower a mood's log-odds by this much to be highlighted...
MIN_DROP = 0.25

# ...and by at least this share of the strongest word for that mood
MIN_SHARE = 0.3

# Longer texts are not explained; that many re-scorings would be slow
MAX_WORDS = 60

# Everyday words that never explain a mood on their own
FILLER_WORDS = {
    "i", "i'm", "im", "me", "my", "the", "a", "an", "to", "of", "and", "is",
    "am", "was", "it", "in", "on", "at", "for", "so", "very", "today",
    "aaj", "main", "mai", "m", "mujhe", "merko", "mere", "meri", "mera", "ki",
    "ka", "ke", "ko", "hai", "h", "hu", "hoon", "tha", "thi", "ho", "se",
    "ne", "bhi", "aur", "or", "toh", "to", "ek", "rahi", "raha", "rha", "rhi",
    "gya", "gyi", "gaya", "gayi", "hua", "hui", "wha", "waha", "p", "pe", "par",
}

EPSILON = 1e-4


def log_odds(probability: float) -> float:
    probability = min(max(probability, EPSILON), 1 - EPSILON)
    return math.log(probability / (1 - probability))


def bare(word: str) -> str:
    return re.sub(r"[^\w']", "", word.lower())


def explain_words(text: str, moods: list[str], normalize) -> list[dict]:
    """
    Returns the text split into words, each with the mood it supports
    most (or None) and a weight from 0 to 1:
    [{"text": "tension", "mood": "anxious", "weight": 1.0}, ...]
    """
    words = re.findall(r"\S+", text)
    plain = [{"text": word, "mood": None, "weight": 0.0} for word in words]

    moods = [mood for mood in moods if mood != "neutral"]
    bundle = load_multilabel_model()

    if not moods or not bundle or len(words) < 2 or len(words) > MAX_WORDS:
        return plain

    texts = [text] + [
        " ".join(words[:index] + words[index + 1:])
        for index in range(len(words))
    ]

    scores = bundle["pipeline"].predict_proba(
        [mark_negation(normalize(item).strip()) for item in texts]
    )
    columns = {mood: bundle["moods"].index(mood) for mood in moods}

    # drops[mood][i]: how much mood's log-odds fall without word i
    drops = {
        mood: [
            log_odds(scores[0][column]) - log_odds(scores[index + 1][column])
            for index in range(len(words))
        ]
        for mood, column in columns.items()
    }

    for index, item in enumerate(plain):
        if bare(item["text"]) in FILLER_WORDS:
            continue

        best_mood, best_share = None, 0.0

        for mood, mood_drops in drops.items():
            strongest = max(mood_drops)
            drop = mood_drops[index]

            if strongest <= 0 or drop < MIN_DROP:
                continue

            share = drop / strongest
            if share >= MIN_SHARE and share > best_share:
                best_mood, best_share = mood, share

        if best_mood:
            item["mood"] = best_mood
            item["weight"] = round(best_share, 3)

    return plain
