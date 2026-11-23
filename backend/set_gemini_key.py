"""
Puts your Gemini API key into backend/.env, checks that it works and makes
the backend pick it up. The key is never printed (only its last 4 letters).

Easiest way: copy the key from https://aistudio.google.com/apikey, then

    cd backend
    pbpaste | venv/bin/python set_gemini_key.py --stdin

or run without --stdin and paste when asked (typing is hidden):

    venv/bin/python set_gemini_key.py
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

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_ENV = BASE_DIR / ".env"
DEFAULT_URL = "https://generativelanguage.googleapis.com"
DEFAULT_MODEL = "gemini-2.5-flash"

KEY_LINE = re.compile(r"^\s*GEMINI_API_KEY\s*=")


def mask(key: str) -> str:
    return f"...{key[-4:]}" if len(key) >= 8 else "(too short)"


def write_key(env_path: Path, key: str) -> None:
    """Set GEMINI_API_KEY in the file, keeping every other line as it is."""
    lines = env_path.read_text().splitlines() if env_path.exists() else []

    replaced = False
    for index, line in enumerate(lines):
        if KEY_LINE.match(line):
            lines[index] = f"GEMINI_API_KEY={key}"
            replaced = True

    if not replaced:
        lines.append(f"GEMINI_API_KEY={key}")

    env_path.write_text("\n".join(lines) + "\n")
    # Only you should be able to read a file with a secret in it
    os.chmod(env_path, stat.S_IRUSR | stat.S_IWUSR)


def check_key(key: str, model: str = DEFAULT_MODEL, url: str = DEFAULT_URL):
    """Ask Gemini one tiny question: (worked, what happened, seconds)."""
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
        seconds = time.time() - started
        reasons = {
            400: "Gemini says the key is not valid. Copy it again, without spaces.",
            403: "Gemini refused the key (wrong key, or it was disabled).",
            404: f"The model '{model}' doesn't exist any more. Set GEMINI_MODEL in .env to a current free one from AI Studio.",
            429: "The key works, but today's free limit is used up. Try again later.",
        }
        worked = error.code == 429
        return worked, reasons.get(error.code, f"Gemini answered with error {error.code}."), seconds
    except (urllib.error.URLError, TimeoutError):
        return False, "Could not reach Google. Check your internet and try again.", time.time() - started

    seconds = time.time() - started
    parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts).strip()

    if not text:
        return False, "Gemini answered, but with no text (blocked?).", seconds

    return True, f'It works. Gemini said: "{text}"', seconds


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
        found = set(re.findall(r"AIza[0-9A-Za-z_\-]{35}", key))

        if len(found) == 1:
            key = found.pop()
            print("You copied more than the key; using only the key that was inside it.")
        else:
            words, lines = len(key.split()), len(key.strip().splitlines())
            print(
                f"That doesn't look like one key: the clipboard has {words} words "
                f"on {lines} line(s) and {'no' if not found else 'several'} Google key inside. "
                "Copy only the key with the copy icon next to it in AI Studio "
                "(it starts with AIza). Nothing changed."
            )
            return 1

    print(f"Checking the key ({mask(key)}) with Gemini...")
    worked, message, seconds = check_key(key, args.model, args.url)
    print(f"  {message}  [{seconds:.1f}s]")

    if not worked:
        print("The key was NOT saved.")
        return 1

    write_key(args.env_file, key)
    print(f"Saved GEMINI_API_KEY={mask(key)} in {args.env_file}")

    # uvicorn --reload restarts when a .py file changes; settings are read at start
    if not args.no_reload and args.env_file == DEFAULT_ENV:
        os.utime(BASE_DIR / "main.py")
        print("The backend will restart in a few seconds and then use Gemini for the chatbot.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
