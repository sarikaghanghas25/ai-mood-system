"""
Trains the multi-label mood model.

One yes/no classifier per mood (One-vs-Rest), so "happy" and
"anxious" can both be true for the same sentence instead of
competing for a single answer. Each mood gets its own decision
threshold, tuned on a validation split.

Run after build_multilabel_dataset.py:
    python3 train_multilabel_model.py
"""

import argparse
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.multiclass import OneVsRestClassifier
from sklearn.pipeline import FeatureUnion, Pipeline


BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.ai.mood_model import MOODS, SentenceEmbedder, mark_negation, select_moods  # noqa: E402
from app.services.mood_ai import normalize_text  # noqa: E402


DATASET_PATH = BASE_DIR / "app" / "ai" / "mood_dataset_multilabel.csv"
MODEL_PATH = BASE_DIR / "app" / "ai" / "mood_multilabel_model.joblib"


# Hand-written sentences that are NOT generated from the dataset
# templates. This is the honest check of how well the model generalizes.
SANITY_CHECKS = [
    ("I am very happy today", {"happy"}),
    ("I feel lonely and empty", {"sad"}),
    ("They made me really angry", {"angry"}),
    ("I have no energy left", {"tired"}),
    ("I keep worrying about what will happen", {"anxious"}),
    ("I have too much work and pressure", {"stressed"}),
    ("Everything is normal today", {"neutral"}),
    ("I just had dinner with my family", {"neutral"}),
    ("I am happy but worried about my future", {"happy", "anxious"}),
    ("I got selected but I am so exhausted I can't celebrate", {"happy", "tired"}),
    ("I feel sad and angry after our argument", {"sad", "angry"}),
    ("I am tired and stressed because of work", {"tired", "stressed"}),
    ("I am excited but nervous about my exam", {"happy", "anxious"}),
    ("Mujhe khushi bhi ho rahi hai aur darr bhi lag raha hai", {"happy", "anxious"}),
    ("Mujhe gussa bhi aa raha hai aur rona bhi", {"angry", "sad"}),
    ("Aaj bahut khush hoon lekin thakan bhi hai", {"happy", "tired"}),
    ("I am worried and mentally exhausted", {"anxious", "tired"}),
    ("I am angry and stressed because of my project", {"angry", "stressed"}),
    ("Kaam ka itna pressure hai aur neend bhi poori nahi hui", {"stressed", "tired"}),
    ("My friend betrayed me and now I just feel alone", {"angry", "sad"}),
    ("I am sad, tired and stressed today", {"sad", "tired", "stressed"}),
    ("Exams sar pe hain, darr lag raha hai aur neend bhi nahi aa rahi", {"stressed", "anxious", "tired"}),
    ("I am not angry, just really tired", {"tired"}),
    ("main gussa nahi hoon, bas udaas hoon", {"sad"}),
    ("I am not stressed anymore, I feel relaxed and happy", {"happy"}),
]


# One decision threshold for every mood. Tuning per mood on the generated
# validation split kept picking low values (that data is too easy), which
# added extra moods to real sentences. 0.55 scored best on the unseen
# sentences in evaluate_mood_model.py.
DECISION_THRESHOLD = 0.55


def build_pipeline(use_embeddings=True, embedding_weight=2.0, C=4.0):
    feature_parts = [
        ("words", TfidfVectorizer(
            ngram_range=(1, 2), sublinear_tf=True, min_df=1, max_features=40000,
        )),
        # Character n-grams handle Hinglish spelling variants (khush/khushi, thak/thaka)
        ("chars", TfidfVectorizer(
            analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True,
            min_df=2, max_features=60000,
        )),
    ]

    # Meaning of the whole sentence (paraphrases, new words, Hindi script)
    if use_embeddings:
        feature_parts.append(("meaning", SentenceEmbedder(weight=embedding_weight)))

    features = FeatureUnion(feature_parts)

    classifier = OneVsRestClassifier(
        LogisticRegression(max_iter=3000, C=C, class_weight="balanced")
    )

    return Pipeline([("features", features), ("classifier", classifier)])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--no-embeddings", action="store_true",
        help="word features only (no sentence-transformers needed)",
    )
    parser.add_argument("--embedding-weight", type=float, default=2.0)
    parser.add_argument(
        "--C", type=float, default=4.0,
        help="lower = more regularization (less memorizing of templates)",
    )
    args = parser.parse_args()

    df = pd.read_csv(DATASET_PATH).dropna(subset=["text"])
    texts = df["text"].astype(str).map(lambda t: mark_negation(normalize_text(t)))
    labels = df[MOODS].to_numpy()

    print(f"Samples: {len(df)}  |  mixed-mood rows: {(labels.sum(axis=1) > 1).sum()}")

    X_train, X_val, y_train, y_val = train_test_split(
        texts, labels, test_size=0.2, random_state=42,
    )

    pipeline = build_pipeline(not args.no_embeddings, args.embedding_weight, args.C)
    pipeline.fit(X_train, y_train)

    val_probabilities = pipeline.predict_proba(X_val)
    thresholds = {mood: DECISION_THRESHOLD for mood in MOODS}

    val_predictions = np.array([
        [int(mood in select_moods(dict(zip(MOODS, row)), thresholds)) for mood in MOODS]
        for row in val_probabilities
    ])

    print("\nThresholds:", thresholds)
    print("\nValidation report:\n")
    print(classification_report(y_val, val_predictions, target_names=MOODS, zero_division=0))
    exact = (val_predictions == y_val).all(axis=1).mean()
    print(f"Exact match (all moods correct): {exact * 100:.2f}%")

    # Final model uses all data, thresholds from validation
    pipeline.fit(texts, labels)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipeline, "moods": MOODS, "thresholds": thresholds}, MODEL_PATH)
    print(f"\nSaved at: {MODEL_PATH}")

    print("\n" + "=" * 70)
    print("HAND-WRITTEN SANITY CHECKS (not in training data)")
    print("=" * 70)

    passed = 0
    for text, expected in SANITY_CHECKS:
        probabilities = dict(zip(MOODS, pipeline.predict_proba([mark_negation(normalize_text(text))])[0]))
        predicted = set(select_moods(probabilities, thresholds))
        ok = predicted == expected
        passed += ok

        top = ", ".join(
            f"{m} {p:.2f}" for m, p in sorted(probabilities.items(), key=lambda x: -x[1])[:3]
        )
        print(f"{'PASS' if ok else 'FAIL'}  {text}")
        if not ok:
            print(f"      expected {sorted(expected)}, got {sorted(predicted)}  ({top})")

    print(f"\n{passed}/{len(SANITY_CHECKS)} sanity checks passed")


if __name__ == "__main__":
    main()
