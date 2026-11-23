"""
Checks set_gemini_key.py against a fake Gemini server (no real key):

    cd backend && venv/bin/python -m unittest tests.test_set_gemini_key -v
"""

import json
import os
import stat
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import set_gemini_key as tool

state = {"status": 200, "body": None, "seen_key": None}


class FakeGemini(BaseHTTPRequestHandler):
    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        state["seen_key"] = self.headers.get("x-goog-api-key")
        payload = json.dumps(state["body"] or {}).encode()
        self.send_response(state["status"])
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


server = HTTPServer(("127.0.0.1", 0), FakeGemini)
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{server.server_port}"
GOOD = {"candidates": [{"content": {"parts": [{"text": "Namaste dost!"}]}}]}


class SetGeminiKeyTest(unittest.TestCase):
    def setUp(self):
        state.update(status=200, body=GOOD, seen_key=None)
        self.dir = tempfile.TemporaryDirectory()
        self.env = Path(self.dir.name) / ".env"

    def tearDown(self):
        self.dir.cleanup()

    def test_mask_shows_only_the_last_four(self):
        self.assertEqual(tool.mask("AIzaSyABCDEFGH1234"), "...1234")
        self.assertEqual(tool.mask("abc"), "(too short)")

    def test_new_file_gets_the_key_and_is_private(self):
        tool.write_key(self.env, "AIza-secret-1")
        self.assertEqual(self.env.read_text(), "GEMINI_API_KEY=AIza-secret-1\n")
        self.assertEqual(stat.S_IMODE(os.stat(self.env).st_mode), 0o600)

    def test_other_lines_are_kept_and_an_old_key_is_replaced(self):
        self.env.write_text("JWT_SECRET_KEY=abc\nGEMINI_API_KEY=old\nOLLAMA_MODEL=gemma2:9b\n")
        tool.write_key(self.env, "new-key")
        self.assertEqual(
            self.env.read_text().splitlines(),
            ["JWT_SECRET_KEY=abc", "GEMINI_API_KEY=new-key", "OLLAMA_MODEL=gemma2:9b"],
        )

    def test_key_is_added_once_when_missing(self):
        self.env.write_text("JWT_SECRET_KEY=abc\n")
        tool.write_key(self.env, "k1")
        tool.write_key(self.env, "k2")
        self.assertEqual(self.env.read_text().count("GEMINI_API_KEY"), 1)
        self.assertIn("GEMINI_API_KEY=k2", self.env.read_text())

    def test_working_key(self):
        worked, message, _ = tool.check_key("good-key", "m", URL)
        self.assertTrue(worked)
        self.assertIn("Namaste dost!", message)
        self.assertEqual(state["seen_key"], "good-key")

    def test_bad_key_model_and_quota_messages(self):
        for status, expected_ok, words in [
            (400, False, "not valid"), (403, False, "refused"),
            (404, False, "doesn't exist"), (429, True, "limit"),
        ]:
            state.update(status=status, body={})
            worked, message, _ = tool.check_key("k", "m", URL)
            self.assertEqual(worked, expected_ok, status)
            self.assertIn(words, message)

    def test_empty_answer_is_not_a_success(self):
        state.update(body={"promptFeedback": {"blockReason": "SAFETY"}})
        worked, _, _ = tool.check_key("k", "m", URL)
        self.assertFalse(worked)

    def test_unreachable_server(self):
        worked, message, _ = tool.check_key("k", "m", "http://127.0.0.1:9")
        self.assertFalse(worked)
        self.assertIn("Could not reach", message)

    def test_command_never_saves_a_key_that_failed_and_never_prints_it(self):
        import io
        import contextlib
        import sys

        state.update(status=403, body={})
        secret = "AIza-super-secret-VALUE-9999"
        out = io.StringIO()
        old_stdin = sys.stdin
        sys.stdin = io.StringIO(secret + "\n")
        old_argv = sys.argv
        sys.argv = ["set_gemini_key.py", "--stdin", "--env-file", str(self.env), "--url", URL, "--no-reload"]

        try:
            with contextlib.redirect_stdout(out):
                code = tool.main()
        finally:
            sys.stdin, sys.argv = old_stdin, old_argv

        self.assertEqual(code, 1)
        self.assertFalse(self.env.exists())          # not saved
        self.assertNotIn(secret, out.getvalue())      # never printed
        self.assertIn("9999", out.getvalue())         # only the last four

    def test_command_saves_a_working_key(self):
        import io
        import contextlib
        import sys

        out = io.StringIO()
        old_stdin, old_argv = sys.stdin, sys.argv
        sys.stdin = io.StringIO("AIza-good-key-0042\n")
        sys.argv = ["set_gemini_key.py", "--stdin", "--env-file", str(self.env), "--url", URL, "--no-reload"]

        try:
            with contextlib.redirect_stdout(out):
                code = tool.main()
        finally:
            sys.stdin, sys.argv = old_stdin, old_argv

        self.assertEqual(code, 0)
        self.assertEqual(self.env.read_text(), "GEMINI_API_KEY=AIza-good-key-0042\n")
        self.assertNotIn("AIza-good-key-0042", out.getvalue())


if __name__ == "__main__":
    unittest.main()
