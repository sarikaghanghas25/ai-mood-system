"""
Which model to try first when Google has retired the configured one:

    cd backend && venv/bin/python -m unittest tests.test_gemini_models -v
"""

import unittest

from app.services.gemini_models import candidates, rank, usable


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


if __name__ == "__main__":
    unittest.main()
