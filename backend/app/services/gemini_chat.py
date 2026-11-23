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
TIMEOUT_SECONDS = 25

# Gemini 2.5 models "think" before answering, which adds several seconds
# to a chat reply that doesn't need it, so thinking is switched off. A
# model that can't run without thinking rejects that once; after that the
# setting is left out.
_send_thinking_off = True

# Google retires model names. When the configured one answers "404 not
# found", a working model is looked up once and used from then on.
_model_override = None
_dead_models = set()
_candidates = None


def current_model() -> str:
    return _model_override or settings.GEMINI_MODEL


def _find_replacement():
    """A model Google still has, or None. Asks Google once and remembers the list."""
    global _candidates

    if _candidates is None:
        try:
            _candidates = gemini_models.candidates(
                gemini_models.list_models(settings.GEMINI_API_KEY, settings.GEMINI_URL)
            )
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError):
            logger.warning("Could not ask Gemini which models exist")
            return None

    return next((name for name in _candidates if name not in _dead_models), None)


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
    global _send_thinking_off, _model_override

    thinking_retried = False

    # Each pass fixes one thing (thinking setting, retired model) and asks again
    for _ in range(6):
        model = current_model()
        config = {"temperature": 0.7, "maxOutputTokens": MAX_OUTPUT_TOKENS}

        if _send_thinking_off:
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

            # Only this model's refusal of "no thinking" is retried; a bad key
            # is also a 400 and must not switch the setting off for good
            if (
                error.code == 400
                and not thinking_retried
                and _send_thinking_off
                and "thinking" in detail.lower()
            ):
                logger.info("Model %s needs thinking, retrying without the setting", model)
                _send_thinking_off = False
                thinking_retried = True
                continue

            # The model name is gone: find one that is still there
            if error.code == 404:
                _dead_models.add(model)
                replacement = _find_replacement()

                if replacement:
                    logger.warning("Gemini model %s no longer exists; using %s", model, replacement)
                    _model_override = replacement
                    continue

            if error.code == 429:
                logger.warning("Gemini free quota used up, falling back")
            else:
                # 400/403: wrong key; 404 with no replacement: no model to use
                logger.error("Gemini error %s for model %s", error.code, model)
            return None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            logger.warning("Gemini is not reachable, falling back")
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
