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
    global _send_thinking_off

    for attempt in (1, 2):
        config = {"temperature": 0.7, "maxOutputTokens": MAX_OUTPUT_TOKENS}

        if _send_thinking_off:
            config["thinkingConfig"] = {"thinkingBudget": 0}

        request = urllib.request.Request(
            f"{settings.GEMINI_URL}/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
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
                and attempt == 1
                and _send_thinking_off
                and "thinking" in detail.lower()
            ):
                logger.info("Model %s needs thinking, retrying without the setting", settings.GEMINI_MODEL)
                _send_thinking_off = False
                continue

            if error.code == 429:
                logger.warning("Gemini free quota used up, falling back")
            else:
                # 400/403: wrong model name or key; 404: model no longer exists
                logger.error("Gemini error %s for model %s", error.code, settings.GEMINI_MODEL)
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
