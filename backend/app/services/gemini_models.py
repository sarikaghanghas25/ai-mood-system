"""
Which Gemini models exist right now, and which to try first.

Google retires model names (gemini-2.5-flash is already gone), so a name
fixed in the settings eventually answers "404 not found". Instead of
breaking the chatbot, ask Google which models it has and pick a fast one.

Standard library only: shared by the chatbot and by set_gemini_key.py.
"""

import json
import re
import urllib.request

# Not for chat: embeddings, images, speech, live audio, agents...
SKIP_WORDS = (
    "embedding", "imagen", "image", "tts", "audio", "live", "computer-use",
    "robotics", "aqa", "veo", "learnlm", "vision", "translate",
)


def list_models(key: str, url: str, timeout: float = 15) -> list[str]:
    """Names (without "models/") of the models that can generate text."""
    names, token = [], None

    for _ in range(5):  # a few pages at most
        query = "pageSize=200" + (f"&pageToken={token}" if token else "")
        request = urllib.request.Request(
            f"{url}/v1beta/models?{query}",
            headers={"x-goog-api-key": key},
        )

        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = json.load(response)

        for model in data.get("models", []):
            if "generateContent" in model.get("supportedGenerationMethods", []):
                names.append(str(model.get("name", "")).removeprefix("models/"))

        token = data.get("nextPageToken")
        if not token:
            break

    return names


def usable(name: str) -> bool:
    lowered = name.lower()
    return lowered.startswith("gemini-") and not any(word in lowered for word in SKIP_WORDS)


def rank(name: str):
    """Smaller sorts first: fast "flash" models, stable before preview, newest first."""
    lowered = name.lower()

    if "flash" in lowered and "lite" not in lowered:
        tier = 0
    elif "flash" in lowered:
        tier = 1  # flash-lite
    else:
        tier = 2  # pro and the rest: slower, and usually not free

    unstable = any(word in lowered for word in ("preview", "exp"))
    # "gemini-flash-latest" always points at the newest one
    not_latest = "latest" not in lowered

    match = re.search(r"gemini-(\d+)(?:\.(\d+))?", lowered)
    major, minor = (int(match.group(1)), int(match.group(2) or 0)) if match else (0, 0)

    return (tier, unstable, not_latest, -major, -minor, lowered)


def candidates(names: list[str]) -> list[str]:
    """The usable models, best first, without repeats."""
    return sorted({name for name in names if usable(name)}, key=rank)
