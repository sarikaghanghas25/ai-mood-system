"""
Puts your Gemini API key into backend/.env, checks that it works and makes
the backend pick it up. The key is never printed (only its last 4 letters).

Easiest way: run this, and when it asks, copy the key from
https://aistudio.google.com/apikey ("Copy key") and paste it (it stays hidden):

    cd backend
    venv/bin/python set_gemini_key.py

Or put the key on the clipboard first and run (don't copy anything else in
between, or that is what gets read):

    pbpaste | venv/bin/python set_gemini_key.py --stdin
"""

import argparse
import getpass
import json
import os
import re
import stat
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from app.services import gemini_models

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_ENV = BASE_DIR / ".env"
DEFAULT_URL = "https://generativelanguage.googleapis.com"
DEFAULT_MODEL = "gemini-2.5-flash"

KEY_LINE = re.compile(r"^\s*GEMINI_API_KEY\s*=")

# Google keys come in two shapes: the older "AIza" + 35 characters and the
# newer "AQ." + a long run of characters
KEY_SHAPE = re.compile(r"AIza[0-9A-Za-z_\-]{35}|AQ\.[0-9A-Za-z_\-]{30,}")


def mask(key: str) -> str:
    return f"...{key[-4:]}" if len(key) >= 8 else "(too short)"


def write_var(env_path: Path, name: str, value: str) -> None:
    """Set NAME=value in the file, keeping every other line as it is."""
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    pattern = re.compile(rf"^\s*{re.escape(name)}\s*=")

    replaced = False
    for index, line in enumerate(lines):
        if pattern.match(line):
            lines[index] = f"{name}={value}"
            replaced = True

    if not replaced:
        lines.append(f"{name}={value}")

    env_path.write_text("\n".join(lines) + "\n")
    # Only you should be able to read a file with a secret in it
    os.chmod(env_path, stat.S_IRUSR | stat.S_IWUSR)


def write_key(env_path: Path, key: str) -> None:
    write_var(env_path, "GEMINI_API_KEY", key)


def probe(key: str, model: str = DEFAULT_MODEL, url: str = DEFAULT_URL):
    """Ask Gemini one tiny question: (HTTP status or None if unreachable, text, seconds)."""
    body = {
        "contents": [{"role": "user", "parts": [{"text": "Say hello in one short Hinglish sentence."}]}],
        "generationConfig": {"maxOutputTokens": 60, "thinkingConfig": {"thinkingBudget": 0}},
    }
    request = urllib.request.Request(
        f"{url}/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )

    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, "", time.time() - started
    except (urllib.error.URLError, TimeoutError):
        return None, "", time.time() - started

    parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts).strip()

    return 200, text, time.time() - started


def explain(status, text: str, model: str):
    """(worked, what to tell the user) for a probe result."""
    if status == 200:
        if text:
            return True, f'It works. Gemini said: "{text}"'
        return False, "Gemini answered, but with no text (blocked?)."

    if status is None:
        return False, "Could not reach Google. Check your internet and try again."

    reasons = {
        400: "Gemini says the key is not valid. Copy it again, without spaces.",
        403: "Gemini refused the key (wrong key, or it was disabled).",
        404: f"The model '{model}' doesn't exist (Google retires old names).",
        429: "The key works, but today's free limit is used up. Try again later.",
    }
    return status == 429, reasons.get(status, f"Gemini answered with error {status}.")


def check_key(key: str, model: str = DEFAULT_MODEL, url: str = DEFAULT_URL):
    """(worked, what happened, seconds)."""
    status, text, seconds = probe(key, model, url)
    worked, message = explain(status, text, model)
    return worked, message, seconds


def find_working_model(key: str, url: str, say=print):
    """Ask Google which models exist and try the best ones: (model, status, text, seconds) or None."""
    try:
        names = gemini_models.candidates(gemini_models.list_models(key, url))
    except (urllib.error.URLError, TimeoutError, ValueError):
        say("  Could not get the list of models from Google.")
        return None

    for name in names[:6]:
        status, text, seconds = probe(key, name, url)
        worked, _ = explain(status, text, name)
        say(f"  trying {name}: {'works' if worked else f'no ({status})'}")

        if worked:
            return name, status, text, seconds

    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Save and test your Gemini API key.")
    parser.add_argument("--stdin", action="store_true", help="read the key from standard input (e.g. pbpaste)")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--model", default=os.environ.get("GEMINI_MODEL", DEFAULT_MODEL))
    parser.add_argument("--no-reload", action="store_true", help="don't ask the backend to restart")
    args = parser.parse_args()

    key = (sys.stdin.read() if args.stdin else getpass.getpass("Paste your Gemini API key (it stays hidden): ")).strip()

    if not key:
        print("No key given, nothing changed.")
        return 1

    if re.search(r"\s", key):
        # Often the whole row or page was copied, not just the key: take the
        # key out of it, but only if it is clearly one key
        found = set(KEY_SHAPE.findall(key))

        if len(found) == 1:
            key = found.pop()
            print("You copied more than the key; using only the key that was inside it.")
        else:
            words, lines = len(key.split()), len(key.strip().splitlines())
            print(
                f"That doesn't look like one key: the clipboard has {words} words "
                f"on {lines} line(s) and {'no' if not found else 'several'} Google key inside. "
                "Copy only the key: the copy icon next to it, or the \"Copy key\" "
                "button, in AI Studio (it starts with AIza or AQ.). Nothing changed."
            )
            return 1

    print(f"Checking the key ({mask(key)}) with Gemini...")
    model = args.model
    status, text, seconds = probe(key, model, args.url)

    if status == 404:
        # The key reached Google, but the model name has been retired
        print(f"  The model '{model}' doesn't exist any more. Looking for one that does...")
        found = find_working_model(key, args.url)

        if found:
            model, status, text, seconds = found

    worked, message = explain(status, text, model)
    print(f"  {message}  [{seconds:.1f}s]")

    if not worked:
        print("The key was NOT saved.")
        return 1

    write_key(args.env_file, key)
    print(f"Saved GEMINI_API_KEY={mask(key)} in {args.env_file}")

    if model != DEFAULT_MODEL:
        write_var(args.env_file, "GEMINI_MODEL", model)
        print(f"Saved GEMINI_MODEL={model} (the model that works today)")

    # uvicorn --reload restarts when a .py file changes; settings are read at start
    if not args.no_reload and args.env_file == DEFAULT_ENV:
        os.utime(BASE_DIR / "main.py")
        print("The backend will restart in a few seconds and then use Gemini for the chatbot.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
