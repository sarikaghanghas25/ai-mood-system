"""
Checks set_gemini_key.py against a fake Gemini server (no real key):

    cd backend && venv/bin/python -m unittest tests.test_set_gemini_key -v
"""

import json
import os
import stat
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import set_gemini_key as tool

state = {"status": 200, "body": None, "seen_key": None, "dead": set(), "models": [], "delay": {}}


class FakeGemini(BaseHTTPRequestHandler):
    def do_GET(self):
        payload = json.dumps({
            "models": [
                {"name": f"models/{name}", "supportedGenerationMethods": ["generateContent"]}
                for name in state["models"]
            ]
        }).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        state["seen_key"] = self.headers.get("x-goog-api-key")
        status, body = state["status"], state["body"]

        model = self.path.split("/models/")[-1].split(":")[0]
        time.sleep(state["delay"].get(model, 0))
        if model in state["dead"]:
            status, body = 404, {}

        payload = json.dumps(body or {}).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), FakeGemini)
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{server.server_port}"
GOOD = {"candidates": [{"content": {"parts": [{"text": "Namaste dost!"}]}}]}


class SetGeminiKeyTest(unittest.TestCase):
    def setUp(self):
        state.update(status=200, body=GOOD, seen_key=None, dead=set(), models=[], delay={})
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

    def run_args(self, pasted, *extra):
        import io
        import contextlib
        import sys

        out = io.StringIO()
        old_stdin, old_argv = sys.stdin, sys.argv
        sys.stdin = io.StringIO(pasted)
        sys.argv = ["set_gemini_key.py", "--stdin", "--env-file", str(self.env), "--url", URL,
                    "--no-reload", *extra]

        try:
            with contextlib.redirect_stdout(out):
                code = tool.main()
        finally:
            sys.stdin, sys.argv = old_stdin, old_argv

        return code, out.getvalue()

    def test_the_fastest_model_is_picked_not_the_newest(self):
        state.update(
            dead={"gemini-2.5-flash"},
            models=["gemini-3.8-flash", "gemini-3-flash", "gemini-3.5-flash"],
            delay={"gemini-3.8-flash": 0.5, "gemini-3.5-flash": 0.3},
        )
        code, output = self.run_command("AIza-good-key-0042\n")

        self.assertEqual(code, 0)
        self.assertIn("GEMINI_MODEL=gemini-3-flash", self.env.read_text())
        self.assertIn("Timing the", output)

    def test_a_slow_working_model_is_swapped_for_a_faster_one(self):
        tool.SLOW_SECONDS = 0.2
        self.addCleanup(setattr, tool, "SLOW_SECONDS", 6)
        state.update(models=["gemini-2.5-flash", "gemini-quick"], delay={"gemini-2.5-flash": 0.5})
        code, output = self.run_command("AIza-good-key-0042\n")

        self.assertEqual(code, 0)
        self.assertIn("which is slow", output)
        self.assertIn("GEMINI_MODEL=gemini-quick", self.env.read_text())

    def test_pick_model_keeps_the_saved_key_and_changes_only_the_model(self):
        self.env.write_text("JWT_SECRET_KEY=abc\nGEMINI_API_KEY=AIza-saved-key-7777\nGEMINI_MODEL=gemini-slow\n")
        state.update(models=["gemini-slow", "gemini-fast"], delay={"gemini-slow": 0.4})
        code, output = self.run_args("", "--pick-model")

        self.assertEqual(code, 0)
        self.assertEqual(
            self.env.read_text().splitlines(),
            ["JWT_SECRET_KEY=abc", "GEMINI_API_KEY=AIza-saved-key-7777", "GEMINI_MODEL=gemini-fast"],
        )
        self.assertNotIn("AIza-saved-key-7777", output)

    def test_pick_model_without_a_saved_key_says_so(self):
        code, output = self.run_args("", "--pick-model")

        self.assertEqual(code, 1)
        self.assertIn("No GEMINI_API_KEY", output)
        self.assertFalse(self.env.exists())

    def run_command(self, pasted):
        import io
        import contextlib
        import sys

        out = io.StringIO()
        old_stdin, old_argv = sys.stdin, sys.argv
        sys.stdin = io.StringIO(pasted)
        sys.argv = ["set_gemini_key.py", "--stdin", "--env-file", str(self.env), "--url", URL,
                    "--model", "gemini-2.5-flash", "--no-reload"]

        try:
            with contextlib.redirect_stdout(out):
                code = tool.main()
        finally:
            sys.stdin, sys.argv = old_stdin, old_argv

        return code, out.getvalue()

    def test_key_is_taken_out_of_a_longer_paste(self):
        key = "AIza" + "x" * 35
        code, output = self.run_command(f"Name  Key  Created\nmy key  {key}  Nov 23\n")

        self.assertEqual(code, 0)
        self.assertEqual(self.env.read_text(), f"GEMINI_API_KEY={key}\n")
        self.assertIn("using only the key", output)
        self.assertNotIn(key, output)

    def test_newer_key_shape_is_taken_out_of_a_longer_paste_too(self):
        key = "AQ." + "Ab8x-_" * 8
        code, output = self.run_command(f"API Key\n{key}\nName  Default Gemini API Key\n")

        self.assertEqual(code, 0)
        self.assertEqual(self.env.read_text(), f"GEMINI_API_KEY={key}\n")
        self.assertNotIn(key, output)

    def test_a_copied_command_is_refused(self):
        code, output = self.run_command("pbpaste | wc -w\n")

        self.assertEqual(code, 1)
        self.assertFalse(self.env.exists())

    def test_text_with_no_key_or_two_keys_is_refused_and_not_echoed(self):
        two = "AIza" + "a" * 35 + " and " + "AIza" + "b" * 35
        for pasted in ("some command I copied by mistake\nsecond line", two):
            code, output = self.run_command(pasted)

            self.assertEqual(code, 1)
            self.assertFalse(self.env.exists())
            self.assertIn("Copy only the key", output)
            self.assertNotIn("mistake", output)       # nothing of the paste is echoed
            self.assertNotIn("a" * 35, output)

    def test_retired_model_is_replaced_and_its_name_is_saved_with_the_key(self):
        state.update(
            dead={"gemini-2.5-flash"},
            models=["gemini-2.5-flash", "gemini-embedding-001", "gemini-3-flash", "gemini-3-pro"],
        )
        code, output = self.run_command("AIza-good-key-0042\n")

        self.assertEqual(code, 0)
        saved = self.env.read_text().splitlines()
        self.assertEqual(saved, ["GEMINI_API_KEY=AIza-good-key-0042", "GEMINI_MODEL=gemini-3-flash"])
        self.assertIn("gemini-3-flash", output)
        self.assertNotIn("AIza-good-key-0042", output)

    def test_nothing_is_saved_when_no_model_works(self):
        state.update(dead={"gemini-2.5-flash", "gemini-3-flash"}, models=["gemini-3-flash"])
        code, output = self.run_command("AIza-good-key-0042\n")

        self.assertEqual(code, 1)
        self.assertFalse(self.env.exists())
        self.assertIn("NOT saved", output)

    def test_working_default_model_adds_no_model_line(self):
        code, _ = self.run_command("AIza-good-key-0042\n")

        self.assertEqual(code, 0)
        self.assertNotIn("GEMINI_MODEL", self.env.read_text())

    def test_command_saves_a_working_key(self):
        code, output = self.run_command("AIza-good-key-0042\n")

        self.assertEqual(code, 0)
        self.assertEqual(self.env.read_text(), "GEMINI_API_KEY=AIza-good-key-0042\n")
        self.assertNotIn("AIza-good-key-0042", output)


if __name__ == "__main__":
    unittest.main()
