"""
Free AI replies for the chatbot from a model running on this computer
through Ollama (https://ollama.com). No API key, no cost, works offline.

Uses the same system prompt, mood note and safety rules as the Claude
version. Returns None when Ollama isn't running, so the chatbot falls
back to its rule-based replies.
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

# Keep replies chat-sized; small local models ramble otherwise
MAX_REPLY_TOKENS = 300
TIMEOUT_SECONDS = 60


def generate_local_reply(message: str, history, mood_result: dict, intent: str):
    """The local model's reply text, or None if Ollama is not available."""
    if not settings.OLLAMA_MODEL:
        return None

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + build_messages(
        message, history, build_mood_note(mood_result, intent, message)
    )

    request = urllib.request.Request(
        f"{settings.OLLAMA_URL}/api/chat",
        data=json.dumps({
            "model": settings.OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0.7, "num_predict": MAX_REPLY_TOKENS},
        }).encode(),
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            data = json.load(response)
    except urllib.error.HTTPError as error:
        # 404 usually means the model hasn't been pulled yet
        logger.error("Ollama error %s for model %s", error.code, settings.OLLAMA_MODEL)
        return None
    except (urllib.error.URLError, TimeoutError):
        logger.warning("Ollama is not running, using rule-based reply")
        return None

    reply = (data.get("message") or {}).get("content", "").strip()

    if not reply:
        return None

    # Never let a self-harm conversation go without the helpline
    if intent == "self_harm" and "14416" not in reply:
        reply = f"{reply}\n\n{CRISIS_LINE}"

    return reply
