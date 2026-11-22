"""
Claude-powered replies for the AI Companion chatbot.

Our own mood model detects how the user feels; Claude uses that, plus the
recent conversation, to reply like a caring friend. If there is no API
key or the call fails, generate_claude_reply() returns None and the
chatbot falls back to its rule-based replies.
"""

import logging

import anthropic

from app.config import settings


logger = logging.getLogger(__name__)


CLAUDE_MODEL = "claude-opus-5-5"

# Short chat replies; effort "low" keeps them fast and cheap
MAX_TOKENS = 4000
EFFORT = "low"

# How many earlier chat messages Claude sees
MAX_HISTORY_MESSAGES = 12
MAX_MESSAGE_CHARS = 2000

CRISIS_LINE = (
    "Agar tum khud ko hurt karne ka soch rahe ho, toh please abhi "
    "Tele-MANAS helpline 14416 pe call karo (free, 24x7), ya emergency "
    "mein 112 dial karo. Tum akele nahi ho."
)

SYSTEM_PROMPT = f"""You are the AI Companion inside "AI Mood System", an app where people write about how they feel and get support and recommendations.

How to talk:
- Reply in the same language and style the user writes in. If they write Hinglish (Hindi in Roman letters, often with chat spellings like "nhi", "mne", "kese"), reply in natural, simple Hinglish. If they write in Hindi script, reply in Hindi script. If they write in English, reply in English.
- Sound like a warm, caring friend, not a therapist or a textbook. Keep replies short: usually 2 to 4 sentences. No bullet lists or headings unless the user asks for them.
- First show that you understood what happened and how they feel, in your own words. Then, if it fits, offer one small, practical idea or ask one gentle question. Never ask more than one question at a time.
- Match their energy: celebrate good news with them, slow down and be gentle with pain.
- Do not lecture, judge, or tell them how they "should" feel. Do not diagnose any condition or give medical or medication advice.
- Never guess the user's gender. Don't call them "bhai", "bro", "didi", "sir" or similar; just talk to them directly with "tum" (or "you").
- Read carefully who is doing what. For example "mujhse koi baat nahi kar raha" means nobody is talking to the user (they feel left out), not that the user doesn't want to talk.

About the mood note:
- Each user message is followed by a short note from the app. It has the moods the app's mood detector found (for example: "Detected moods: sad, anxious; intensity: high") and, for chat-style spelling, the same message with the words written out in full. Use the written-out version to understand the message. The detected moods are a hint and can be wrong; if the user's words say something different, trust the user's words. Never mention the detector, the note, or percentages to the user.

Safety:
- If the user mentions wanting to die, self-harm, suicide, being in danger, or harming someone, respond with care and without panic, encourage them to reach out to someone they trust right now, and include this information: {CRISIS_LINE}
- If a situation sounds physically dangerous right now (accident, attack, medical emergency), gently make sure they are safe and point them to emergency help (112).
- If they got hurt (fell down, injury, accident), first ask whether they are hurt and how badly, and suggest getting it checked by a doctor if it hurts. Feelings come after that.
"""

_client = None


def get_client():
    """Created once. Returns None when no API key is configured."""
    global _client

    if _client is None and settings.ANTHROPIC_API_KEY:
        _client = anthropic.Anthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=60.0,
        )

    return _client


def build_messages(message: str, history, mood_note: str):
    """
    Earlier turns (oldest first) + the new message + the mood note.

    history items are {"role": "user" | "assistant", "content": str}.
    """
    messages = []

    for turn in (history or [])[-MAX_HISTORY_MESSAGES:]:
        role = turn.get("role")
        content = str(turn.get("content", "")).strip()[:MAX_MESSAGE_CHARS]

        if role not in ("user", "assistant") or not content:
            continue

        # The conversation must start with the user (the app's greeting
        # message comes first in the chat window)
        if not messages and role == "assistant":
            continue

        messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message.strip()[:MAX_MESSAGE_CHARS]})

    # Operator note after the user's message: keeps the system prompt
    # identical across requests so it can be cached
    messages.append({"role": "system", "content": mood_note})

    return messages


HINGLISH_WORDS = {
    "hai", "hain", "h", "nahi", "nhi", "ni", "mera", "meri", "mere", "mujhe",
    "merko", "mne", "maine", "kya", "kyu", "kyun", "yaar", "yr", "gaya", "gya",
    "gayi", "gyi", "ho", "hu", "hoon", "kaise", "kese", "bahut", "bhut", "aaj",
    "kal", "lekin", "lakin", "par", "aur", "bhi", "tha", "thi", "raha", "rha",
    "rahi", "rhi", "karna", "kr", "kar", "ab", "toh", "to", "se", "ke", "ki",
    "ko", "mein", "me", "m", "dost", "ghar", "ghr", "pata", "pta", "bas",
}


def detect_reply_language(message: str) -> str:
    """Which language the user wrote in, so the reply can match it."""
    if any("ऀ" <= char <= "ॿ" for char in message):
        return "Hindi written in Devanagari script"

    words = message.lower().split()
    hinglish = sum(word.strip(".,!?") in HINGLISH_WORDS for word in words)

    if words and hinglish / len(words) >= 0.2:
        return "Hinglish (Hindi written in Roman/English letters, simple everyday words, like a friend texting)"

    return "English"


def build_mood_note(mood_result: dict, intent: str, message: str = "") -> str:
    moods = mood_result.get("moods") or [mood_result.get("mood", "neutral")]
    intensity = mood_result.get("intensity", "medium")

    note = f"Detected moods: {', '.join(moods)}; intensity: {intensity}."

    # Chat spellings expanded ("merse koi baat nhi kr rha" ->
    # "mujhse koi baat nahi kar raha"), so smaller models understand them
    expanded = mood_result.get("normalized_text", "")
    if message and expanded and expanded != message.lower().strip():
        note += f' Message written out in full: "{expanded}".'

    if message:
        note += f" Reply language: {detect_reply_language(message)}."

    if intent in ("self_harm", "violence"):
        note += f" Safety flag: possible {intent.replace('_', ' ')}. Follow the safety instructions."

    return note


def generate_claude_reply(message: str, history, mood_result: dict, intent: str):
    """Claude's reply text, or None if Claude is not available."""
    client = get_client()

    if client is None:
        return None

    try:
        response = client.beta.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            system=[{
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=build_messages(message, history, build_mood_note(mood_result, intent, message)),
            output_config={"effort": EFFORT},
            # If a safety classifier declines, retry on a fallback model
            # inside the same call instead of failing
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )

    except anthropic.AuthenticationError:
        logger.error("Claude: invalid ANTHROPIC_API_KEY, using rule-based replies")
        return None
    except anthropic.RateLimitError:
        logger.warning("Claude: rate limited, using rule-based reply")
        return None
    except anthropic.APIStatusError as error:
        logger.error("Claude API error %s: %s", error.status_code, error.message)
        return None
    except anthropic.APIConnectionError:
        logger.warning("Claude: network error, using rule-based reply")
        return None

    if response.stop_reason == "refusal":
        return None

    reply = "".join(
        block.text for block in response.content if block.type == "text"
    ).strip()

    if not reply:
        return None

    # Never let a self-harm conversation go without the helpline
    if intent == "self_harm" and "14416" not in reply:
        reply = f"{reply}\n\n{CRISIS_LINE}"

    return reply
