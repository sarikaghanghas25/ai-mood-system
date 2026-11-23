"""
Checks the Gemini chatbot step against a fake Gemini server on this
computer, so no real key or internet is needed:

    cd backend && venv/bin/python -m unittest tests.test_gemini_chat -v
"""

import json
import logging
import os
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

FAKE_KEY = "fake-key-do-not-log-12345"

# Fake server behaviour for the next request, and what it was sent
state = {
    "status": 200, "body": None, "requests": [], "reject_thinking": False,
    "dead": set(), "models": [], "list_status": 200, "list_calls": 0,
}


class FakeGemini(BaseHTTPRequestHandler):
    def do_GET(self):
        # "Which models do you have?"
        state["list_calls"] += 1
        payload = json.dumps({
            "models": [
                {"name": f"models/{name}", "supportedGenerationMethods": ["generateContent"]}
                for name in state["models"]
            ]
        }).encode()
        self.send_response(state["list_status"])
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        state["requests"].append({
            "path": self.path,
            "key": self.headers.get("x-goog-api-key"),
            "body": json.loads(self.rfile.read(length) or b"{}"),
        })

        sent_body = state["requests"][-1]["body"]
        status, body = state["status"], state["body"]

        # A model name Google has retired
        model = self.path.split("/models/")[-1].split(":")[0]
        if model in state["dead"]:
            status, body = 404, {"error": {"message": f"models/{model} is not found"}}

        # Some real models refuse "thinking off"
        if state["reject_thinking"] and "thinkingConfig" in sent_body.get("generationConfig", {}):
            status = 400
            body = {"error": {"message": "Budget 0 is invalid. This model only works in thinking mode."}}

        payload = json.dumps(body or {}).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


server = HTTPServer(("127.0.0.1", 0), FakeGemini)
threading.Thread(target=server.serve_forever, daemon=True).start()

# Settings are read when the app is imported, so set them first
os.environ["GEMINI_API_KEY"] = FAKE_KEY
os.environ["GEMINI_MODEL"] = "test-model"
os.environ["GEMINI_URL"] = f"http://127.0.0.1:{server.server_port}"
os.environ["OLLAMA_MODEL"] = ""
os.environ["ANTHROPIC_API_KEY"] = ""

from app.services.claude_chat import SYSTEM_PROMPT  # noqa: E402
from app.services import gemini_chat  # noqa: E402
from app.services.gemini_chat import build_contents, generate_gemini_reply  # noqa: E402
from app.services.mood_ai import detect_mood_with_ai  # noqa: E402
from app.services import chatbot  # noqa: E402


def reply_body(text):
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


def ask(message="I am tired of everything", history=None, intent="general"):
    return generate_gemini_reply(message, history or [], detect_mood_with_ai(message), intent)


class GeminiChatTest(unittest.TestCase):
    def setUp(self):
        state.update(
            status=200, body=reply_body("Main yahin hoon. Kya hua?"),
            requests=[], reject_thinking=False,
        )
        gemini_chat._send_thinking_off = True
        state.update(dead=set(), models=[], list_status=200, list_calls=0)
        gemini_chat._model_override = None
        gemini_chat._dead_models = set()
        gemini_chat._candidates = None

    def test_returns_the_text_and_sends_what_gemini_expects(self):
        history = [
            {"role": "assistant", "content": "Hi, I'm here to listen."},  # greeting first: skipped
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "Hi! How are you?"},
        ]

        self.assertEqual(ask("kuch theek nahi lag raha", history), "Main yahin hoon. Kya hua?")

        sent = state["requests"][0]
        self.assertEqual(sent["path"], "/v1beta/models/test-model:generateContent")
        self.assertEqual(sent["key"], FAKE_KEY)

        roles = [turn["role"] for turn in sent["body"]["contents"]]
        self.assertEqual(roles, ["user", "model", "user"])
        # The safety rules (crisis line, injuries first...) travel with every request
        instruction = sent["body"]["systemInstruction"]["parts"][0]["text"]
        self.assertTrue(instruction.startswith(SYSTEM_PROMPT))
        # ...together with the mood note, and the message itself is the last user turn
        self.assertIn("Detected moods:", instruction)
        self.assertIn("Reply language:", instruction)
        self.assertIn("kuch theek nahi lag raha", sent["body"]["contents"][-1]["parts"][0]["text"])

    def test_thinking_is_switched_off_for_speed(self):
        ask()
        config = state["requests"][0]["body"]["generationConfig"]
        self.assertEqual(config["thinkingConfig"], {"thinkingBudget": 0})

    def test_model_that_needs_thinking_is_retried_once_then_remembered(self):
        state.update(reject_thinking=True)

        self.assertEqual(ask(), "Main yahin hoon. Kya hua?")
        self.assertEqual(len(state["requests"]), 2)  # refused, then retried
        self.assertNotIn("thinkingConfig", state["requests"][1]["body"]["generationConfig"])

        # The next question goes out without it straight away
        state["requests"].clear()
        ask()
        self.assertEqual(len(state["requests"]), 1)
        self.assertNotIn("thinkingConfig", state["requests"][0]["body"]["generationConfig"])

    def test_bad_key_does_not_switch_thinking_off_for_good(self):
        state.update(status=400, body={"error": {"message": "API key not valid. Please pass a valid API key."}})

        self.assertIsNone(ask())
        self.assertEqual(len(state["requests"]), 1)  # no retry
        self.assertTrue(gemini_chat._send_thinking_off)

    def test_a_retired_model_is_replaced_by_one_google_still_has(self):
        from app.config import settings

        configured = settings.GEMINI_MODEL
        settings.GEMINI_MODEL = "gemini-2.5-flash"
        state.update(
            dead={"gemini-2.5-flash"},
            models=["gemini-2.5-flash", "gemini-embedding-001", "gemini-3-pro", "gemini-3-flash"],
        )

        try:
            self.assertEqual(ask(), "Main yahin hoon. Kya hua?")
            # retired model refused, then the best one that exists (a flash, not pro or embedding)
            paths = [r["path"] for r in state["requests"]]
            self.assertTrue(paths[0].endswith("gemini-2.5-flash:generateContent"))
            self.assertTrue(paths[-1].endswith("gemini-3-flash:generateContent"))
            self.assertEqual(state["list_calls"], 1)

            # From then on it goes straight to the working one, no more asking
            state["requests"].clear()
            ask()
            self.assertEqual(len(state["requests"]), 1)
            self.assertTrue(state["requests"][0]["path"].endswith("gemini-3-flash:generateContent"))
            self.assertEqual(state["list_calls"], 1)
        finally:
            settings.GEMINI_MODEL = configured

    def test_when_every_model_is_gone_it_falls_back(self):
        from app.config import settings

        configured = settings.GEMINI_MODEL
        settings.GEMINI_MODEL = "gemini-2.5-flash"
        state.update(dead={"gemini-2.5-flash", "gemini-3-flash"}, models=["gemini-3-flash"])

        try:
            self.assertIsNone(ask())
        finally:
            settings.GEMINI_MODEL = configured

    def test_if_google_cannot_list_models_it_falls_back(self):
        from app.config import settings

        configured = settings.GEMINI_MODEL
        settings.GEMINI_MODEL = "gemini-2.5-flash"
        state.update(dead={"gemini-2.5-flash"}, list_status=500)

        try:
            self.assertIsNone(ask())
        finally:
            settings.GEMINI_MODEL = configured

    def test_same_side_turns_are_joined(self):
        contents = build_contents([
            {"role": "user", "content": "one"},
            {"role": "user", "content": "two"},
            {"role": "assistant", "content": "ok"},
            {"role": "system", "content": "note for the model"},
        ])
        self.assertEqual([c["role"] for c in contents], ["user", "model"])
        self.assertEqual(contents[0]["parts"][0]["text"], "one\ntwo")

    def test_quota_exhausted_falls_back(self):
        state.update(status=429, body={"error": {"message": "quota"}})
        self.assertIsNone(ask())

    def test_bad_key_or_model_falls_back(self):
        for status in (400, 403, 404):
            state.update(status=status, body={"error": {"message": "nope"}})
            self.assertIsNone(ask(), status)

    def test_blocked_message_falls_back(self):
        state.update(body={"promptFeedback": {"blockReason": "SAFETY"}})
        self.assertIsNone(ask())

        state.update(body={"candidates": [{"finishReason": "SAFETY"}]})
        self.assertIsNone(ask())

    def test_server_down_falls_back(self):
        from app.config import settings

        working_url = settings.GEMINI_URL
        settings.GEMINI_URL = "http://127.0.0.1:9"  # nothing listens here
        try:
            self.assertIsNone(ask())
        finally:
            settings.GEMINI_URL = working_url

    def test_no_key_means_no_request(self):
        from app.config import settings

        settings.GEMINI_API_KEY = ""
        try:
            self.assertIsNone(ask())
            self.assertEqual(state["requests"], [])
        finally:
            settings.GEMINI_API_KEY = FAKE_KEY

    def test_helpline_added_when_self_harm_reply_lacks_it(self):
        state.update(body=reply_body("I'm really glad you told me."))
        reply = ask("I want to end my life", intent="self_harm")
        self.assertIn("14416", reply)

    def test_key_never_appears_in_logs(self):
        state.update(status=403, body={"error": {"message": "bad key"}})

        with self.assertLogs("app.services.gemini_chat", level=logging.WARNING) as logs:
            ask()
            logging.getLogger("app.services.gemini_chat").warning("end of test")

        self.assertNotIn(FAKE_KEY, "\n".join(logs.output))

    def test_chatbot_uses_gemini_then_rules(self):
        result = chatbot.generate_chatbot_reply("kuch theek nahi lag raha", [])
        self.assertEqual(result["reply_source"], "gemini")
        self.assertEqual(result["reply"], "Main yahin hoon. Kya hua?")

        state.update(status=429, body={})
        result = chatbot.generate_chatbot_reply("kuch theek nahi lag raha", [])
        self.assertEqual(result["reply_source"], "rules")
        self.assertTrue(result["reply"])


if __name__ == "__main__":
    unittest.main()
