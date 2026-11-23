"""
Which model to try first when Google has retired the configured one:

    cd backend && venv/bin/python -m unittest tests.test_gemini_models -v
"""

import json
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from app.services.gemini_models import by_speed, candidates, probe, rank, usable

DELAYS = {"gemini-fast": 0.0, "gemini-slow": 0.4, "gemini-no-thinking": 0.05}
OK = {"candidates": [{"content": {"parts": [{"text": "Namaste!"}]}}]}


class FakeGoogle(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        model = self.path.split("/models/")[-1].split(":")[0]
        time.sleep(DELAYS.get(model, 0))

        status, payload = 200, OK
        if model == "gemini-busy":
            status, payload = 503, {}
        elif model == "gemini-omni":
            status, payload = 429, {}
        elif model == "gemini-gone":
            status, payload = 404, {}
        elif model == "gemini-no-thinking" and "thinkingConfig" in body.get("generationConfig", {}):
            status, payload = 400, {"error": {"message": "Request contains an invalid argument."}}
        elif model == "gemini-silent":
            payload = {"candidates": [{"finishReason": "SAFETY"}]}

        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), FakeGoogle)
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{server.server_port}"


class GeminiModelsTest(unittest.TestCase):
    def test_chat_models_only(self):
        for name in ("gemini-embedding-001", "gemini-2.5-flash-image", "gemini-2.5-flash-preview-tts",
                     "gemini-live-2.5-flash", "gemini-2.5-computer-use-preview", "gemma-3-27b-it"):
            self.assertFalse(usable(name), name)

        for name in ("gemini-3-flash", "gemini-flash-latest", "gemini-2.5-pro"):
            self.assertTrue(usable(name), name)

    def test_fast_stable_newest_first_and_pro_last(self):
        names = [
            "gemini-2.5-pro", "gemini-2.5-flash-lite", "gemini-3-flash-preview", "gemini-3-flash",
            "gemini-2.5-flash", "gemini-embedding-001", "gemini-2.5-flash-image", "gemini-3-pro",
        ]
        self.assertEqual(
            candidates(names),
            ["gemini-3-flash", "gemini-2.5-flash", "gemini-3-flash-preview",
             "gemini-2.5-flash-lite", "gemini-3-pro", "gemini-2.5-pro"],
        )

    def test_the_latest_alias_wins_inside_its_group(self):
        self.assertEqual(candidates(["gemini-3-flash", "gemini-flash-latest"])[0], "gemini-flash-latest")

    def test_repeats_are_dropped_and_nothing_is_fine(self):
        self.assertEqual(candidates(["gemini-3-flash", "gemini-3-flash"]), ["gemini-3-flash"])
        self.assertEqual(candidates([]), [])

    def test_rank_orders_versions_numerically(self):
        self.assertLess(rank("gemini-3-flash"), rank("gemini-2.5-flash"))
        self.assertLess(rank("gemini-2.5-flash"), rank("gemini-2-flash"))


class SpeedTest(unittest.TestCase):
    def test_probe_reports_success_failure_and_time(self):
        worked, seconds = probe("k", URL, "gemini-slow")
        self.assertTrue(worked)
        self.assertGreaterEqual(seconds, 0.4)

        for name in ("gemini-busy", "gemini-omni", "gemini-gone", "gemini-silent"):
            self.assertFalse(probe("k", URL, name)[0], name)

    def test_a_model_that_refuses_the_thinking_setting_is_tried_without_it(self):
        self.assertTrue(probe("k", URL, "gemini-no-thinking")[0])

    def test_by_speed_keeps_only_working_models_fastest_first(self):
        names = ["gemini-slow", "gemini-busy", "gemini-fast", "gemini-omni",
                 "gemini-no-thinking", "gemini-gone", "gemini-silent"]
        ranked = by_speed("k", URL, names)

        self.assertEqual([name for name, _ in ranked], ["gemini-fast", "gemini-no-thinking", "gemini-slow"])
        self.assertEqual(sorted(s for _, s in ranked), [s for _, s in ranked])

    def test_models_are_tried_at_the_same_time_not_one_after_another(self):
        started = time.time()
        by_speed("k", URL, ["gemini-slow"] * 6)
        self.assertLess(time.time() - started, 1.0)  # six 0.4s waits overlap

    def test_by_speed_with_nothing_or_nobody_answering(self):
        self.assertEqual(by_speed("k", URL, []), [])
        self.assertEqual(by_speed("k", URL, ["gemini-busy", "gemini-gone"]), [])

    def test_only_the_first_few_are_tried(self):
        names = [f"gemini-busy-{i}" for i in range(20)]
        calls = []
        original = FakeGoogle.do_POST
        FakeGoogle.do_POST = lambda handler: (calls.append(handler.path), original(handler))[1]
        try:
            by_speed("k", URL, names, limit=3)
        finally:
            FakeGoogle.do_POST = original

        self.assertEqual(len(calls), 3)


if __name__ == "__main__":
    unittest.main()
