# backend/app/services/recommendation_engine.py

import random
from collections import defaultdict, deque

from app.services.recommendation_data import EXPLANATIONS, RECOMMENDATIONS


CATEGORIES = ("music", "movies", "activities")

ITEMS_PER_CATEGORY = 4

# How many recently shown items per user are skipped next time
RECENT_MEMORY = 60

# user_id -> items shown recently (in memory; resets when the server restarts)
_recently_shown = defaultdict(lambda: deque(maxlen=RECENT_MEMORY))


def _mood_key(mood: str) -> str:
    mood = (mood or "neutral").lower().strip()
    return mood if mood in RECOMMENDATIONS else "neutral"


def _slots_per_mood(moods: list) -> list:
    """
    How many picks each mood gets in a category. The main mood gets the
    most: ["sad", "anxious"] -> [("sad", 2), ("anxious", 2)],
    ["sad", "anxious", "tired"] -> [("sad", 2), ("anxious", 1), ("tired", 1)].
    """
    if len(moods) == 1:
        return [(moods[0], ITEMS_PER_CATEGORY)]

    others = moods[1:]
    main_slots = ITEMS_PER_CATEGORY - len(others) if len(others) > 1 else ITEMS_PER_CATEGORY // 2
    slots = [(moods[0], main_slots)]

    remaining = ITEMS_PER_CATEGORY - main_slots
    for index, mood in enumerate(others):
        share = remaining // len(others) + (1 if index < remaining % len(others) else 0)
        slots.append((mood, share))

    return slots


def _pick(pool: list, count: int, skip: set) -> list:
    """Random picks, preferring items not in `skip`."""
    fresh = [item for item in pool if item not in skip]
    random.shuffle(fresh)
    picks = fresh[:count]

    # Small pool or many visits: top up with older items
    if len(picks) < count:
        used = [item for item in pool if item not in picks]
        random.shuffle(used)
        picks += used[: count - len(picks)]

    return picks


def get_recommendations(mood: str, moods: list = None, user_id: int = None) -> dict:
    """
    A fresh set of music, movies and activities for the detected mood(s).

    moods: all detected moods, main mood first (e.g. ["sad", "anxious"]).
    user_id: when given, items this user saw recently are avoided.
    """
    main = _mood_key(mood)

    all_moods = [main]
    for other in moods or []:
        key = _mood_key(other)
        if key not in all_moods and key != "neutral":
            all_moods.append(key)

    recent = _recently_shown[user_id] if user_id is not None else deque()
    skip = set(recent)

    result = {}

    for category in CATEGORIES:
        chosen = []

        for mood_key, slots in _slots_per_mood(all_moods):
            pool = RECOMMENDATIONS[mood_key][category]
            chosen += _pick(pool, slots, skip | set(chosen))

        result[category] = chosen

        if user_id is not None:
            recent.extend(chosen)

    result["explanation"] = EXPLANATIONS[main]

    return result


def get_recommendation_summary(mood: str) -> str:
    """
    Return an explanation/summary for the detected mood.
    """
    return EXPLANATIONS[_mood_key(mood)]
