"""
AI replies for the chatbot from Google's Gemini API, which has a free tier
(https://aistudio.google.com). Called over plain HTTPS, so no extra library
is needed.

Uses the same system prompt, mood note and safety rules as the Claude and
Ollama versions. Returns None when there is no key, the free quota is used
up, the request fails or Gemini blocks the message, so the chatbot falls
back to the next option (and finally the rule-based replies).

Note: on the free tier Google may use the messages to improve its products.
"""

import json
import logging
import time
import urllib.error
import urllib.request

from app.config import settings
from app.services import gemini_models
from app.services.claude_chat import (
    CRISIS_LINE,
    SYSTEM_PROMPT,
    build_messages,
    build_mood_note,
)


logger = logging.getLogger(__name__)

# Replies are 2-4 sentences (the prompt asks for that)
MAX_OUTPUT_TOKENS = 512

# Per attempt. A crowded model can sit on a request for 30 seconds; it is
# better to give up on it quickly and try another model.
TIMEOUT_SECONDS = 15

# Seconds a model is skipped after it was overloaded (503), timed out or ran
# out of quota
COOL_DOWN_SECONDS = 300

# Gemini 2.5 models "think" before answering, which adds several seconds to
# a chat reply that doesn't need it, so thinking is switched off. Some models
# refuse that setting (400); they are remembered and asked without it.
_no_thinking_setting = set()

# Google retires model names and the newest ones are often overloaded. The
# configured model is used until it fails; then a working, fast one is found
# (asking Google which models exist and timing them, once) and used instead.
_model_override = None
_dead_models = set()
_slow_until = {}
_candidates = None


def current_model() -> str:
    return _model_override or settings.GEMINI_MODEL


def _load_candidates():
    """Models Google has, fastest first. Asks Google once and remembers the list."""
    global _candidates

    if _candidates is None:
        try:
            ranked = gemini_models.candidates(
                gemini_models.list_models(settings.GEMINI_API_KEY, settings.GEMINI_URL)
            )
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError):
            logger.warning("Could not ask Gemini which models exist")
            return []

        timed = gemini_models.by_speed(settings.GEMINI_API_KEY, settings.GEMINI_URL, ranked)
        # If none answered the timing round, the plain ranking is all there is
        _candidates = [name for name, _ in timed] or ranked

    return _candidates


def _find_replacement(failed: str):
    """The next model worth trying: not dead, not resting, not the one that just failed."""
    now = time.time()

    return next(
        (
            name for name in _load_candidates()
            if name != failed
            and name not in _dead_models
            and _slow_until.get(name, 0) <= now
        ),
        None,
    )


def build_contents(messages):
    """
    Gemini wants "user" / "model" turns that alternate; the operator's
    mood note (a "system" message) goes into the system instruction instead.
    """
    contents = []

    for message in messages:
        if message["role"] == "system":
            continue

        role = "model" if message["role"] == "assistant" else "user"
        text = message["content"]

        # Two turns in a row from the same side are joined into one
        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"][0]["text"] += f"\n{text}"
        else:
            contents.append({"role": role, "parts": [{"text": text}]})

    return contents


def _error_text(error: urllib.error.HTTPError) -> str:
    """The message inside Gemini's error answer, for telling errors apart."""
    try:
        return str(json.load(error).get("error", {}).get("message", ""))
    except (ValueError, AttributeError, OSError):
        return ""


def _post(body: dict):
    """Send the request; the parsed answer, or None if it failed."""
    global _model_override

    # Each pass fixes one thing (a setting, a retired or crowded model) and asks again
    for _ in range(6):
        model = current_model()
        config = {"temperature": 0.7, "maxOutputTokens": MAX_OUTPUT_TOKENS}

        if model not in _no_thinking_setting:
            config["thinkingConfig"] = {"thinkingBudget": 0}

        request = urllib.request.Request(
            f"{settings.GEMINI_URL}/v1beta/models/{model}:generateContent",
            data=json.dumps({**body, "generationConfig": config}).encode(),
            headers={
                "Content-Type": "application/json",
                # In a header, not the URL, so it never shows up in logs
                "x-goog-api-key": settings.GEMINI_API_KEY,
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            detail = _error_text(error)
            code = error.code

            # A bad key is also a 400 and says so; any other 400 is almost
            # always the thinking setting this model doesn't take
            if code == 400 and "thinkingConfig" in config and "api key" not in detail.lower():
                logger.info("Model %s doesn't take the thinking setting, asking without it", model)
                _no_thinking_setting.add(model)
                continue

            if code == 404:
                _dead_models.add(model)
            elif code in (429, 500, 503):
                # Overloaded or out of quota: leave it alone for a while
                _slow_until[model] = time.time() + COOL_DOWN_SECONDS
            else:
                # 400/403: wrong key or request; nothing another model would fix
                logger.error("Gemini error %s for model %s", code, model)
                return None

            replacement = _find_replacement(model)

            if replacement:
                logger.warning("Gemini model %s answered %s; using %s", model, code, replacement)
                _model_override = replacement
                continue

            if code == 429:
                logger.warning("Gemini free quota used up, falling back")
            else:
                logger.error("Gemini error %s for model %s and no other model to try", code, model)
            return None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            # Crowded models drop or stall the connection
            logger.warning("Gemini model %s did not answer in time", model)
            _slow_until[model] = time.time() + COOL_DOWN_SECONDS
            replacement = _find_replacement(model)

            if replacement:
                _model_override = replacement
                continue

            return None

    return None


def generate_gemini_reply(message: str, history, mood_result: dict, intent: str):
    """Gemini's reply text, or None if it is not available."""
    if not settings.GEMINI_API_KEY:
        return None

    mood_note = build_mood_note(mood_result, intent, message)
    messages = build_messages(message, history, mood_note)

    body = {
        "systemInstruction": {
            "parts": [{"text": f"{SYSTEM_PROMPT}\n\n{mood_note}"}]
        },
        "contents": build_contents(messages),
    }

    data = _post(body)

    if data is None:
        return None

    # A blocked message has no candidates (or no text in them)
    candidates = data.get("candidates") or []
    parts = (candidates[0].get("content") or {}).get("parts") if candidates else None
    reply = "".join(part.get("text", "") for part in parts or []).strip()

    if not reply:
        logger.warning("Gemini returned no text (blocked?), falling back")
        return None

    # Never let a self-harm conversation go without the helpline
    if intent == "self_harm" and "14416" not in reply:
        reply = f"{reply}\n\n{CRISIS_LINE}"

    return reply
