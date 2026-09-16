from pathlib import Path

import joblib
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


# =========================================================
# PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

DATASET_PATH = (
    BASE_DIR
    / "app"
    / "ai"
    / "mood_dataset.csv"
)

MODEL_PATH = (
    BASE_DIR
    / "app"
    / "ai"
    / "mood_model.joblib"
)


# =========================================================
# LOAD DATASET
# =========================================================

print("=" * 60)
print("AI MOOD MODEL TRAINING")
print("=" * 60)

print(f"\nDataset: {DATASET_PATH}")

if not DATASET_PATH.exists():
    raise FileNotFoundError(
        f"Dataset not found:\n{DATASET_PATH}"
    )


df = pd.read_csv(DATASET_PATH)


# =========================================================
# CHECK DATA
# =========================================================

required_columns = ["text", "mood"]

for column in required_columns:
    if column not in df.columns:
        raise ValueError(
            f"Missing required column: {column}"
        )


df = df.dropna(subset=["text", "mood"])

df["text"] = df["text"].astype(str).str.strip()
df["mood"] = df["mood"].astype(str).str.lower().str.strip()

df = df[
    (df["text"] != "")
    & (df["mood"] != "")
]


print(f"\nTotal samples: {len(df)}")

print("\nMood distribution:")
print(df["mood"].value_counts())


# =========================================================
# FEATURES / LABELS
# =========================================================

X = df["text"]
y = df["mood"]


# =========================================================
# TRAIN / TEST SPLIT
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# =========================================================
# MODEL PIPELINE
# =========================================================
#
# TF-IDF:
# Converts text into numerical features.
#
# ngram_range=(1, 2):
# Uses both individual words and two-word combinations.
#
# sublinear_tf=True:
# Helps reduce the impact of very frequent words.
#
# LogisticRegression:
# Provides class probabilities which we use as
# the AI confidence score.
# =========================================================

model = Pipeline(
    [
        (
            "tfidf",
            TfidfVectorizer(
                lowercase=True,
                strip_accents="unicode",
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.95,
                sublinear_tf=True,
                max_features=10000,
            ),
        ),
        (
            "classifier",
            LogisticRegression(
                max_iter=3000,
                C=4.0,
                class_weight="balanced",
                random_state=42,
            ),
        ),
    ]
)


# =========================================================
# TRAIN
# =========================================================

print("\nTraining model...")

model.fit(
    X_train,
    y_train
)


# =========================================================
# EVALUATION
# =========================================================

predictions = model.predict(X_test)

accuracy = accuracy_score(
    y_test,
    predictions
)


print("\n" + "=" * 60)
print(
    f"MODEL ACCURACY: {accuracy * 100:.2f}%"
)
print("=" * 60)


print("\nClassification Report:\n")

print(
    classification_report(
        y_test,
        predictions,
        zero_division=0
    )
)


# =========================================================
# SAVE MODEL
# =========================================================

joblib.dump(
    model,
    MODEL_PATH
)


print("\n" + "=" * 60)
print("MODEL SAVED SUCCESSFULLY")
print("=" * 60)

print(f"\nSaved at:")
print(MODEL_PATH)


# =========================================================
# QUICK TESTS
# =========================================================

test_sentences = [
    "I am very tired today and I need some rest.",
    "I have too much work and I feel overwhelmed.",
    "I feel lonely and disappointed today.",
    "I am extremely happy because I achieved my goal.",
    "I am furious because they treated me unfairly.",
    "I feel normal and everything is okay.",
]


print("\n" + "=" * 60)
print("QUICK MODEL TESTS")
print("=" * 60)


for sentence in test_sentences:

    prediction = model.predict(
        [sentence]
    )[0]

    probabilities = model.predict_proba(
        [sentence]
    )[0]

    classes = model.classes_

    confidence = max(probabilities) * 100

    print("\nText:")
    print(sentence)

    print(
        f"Prediction: {prediction}"
    )

    print(
        f"Confidence: {confidence:.2f}%"
    )

    print("Probabilities:")

    probability_map = sorted(
        zip(classes, probabilities),
        key=lambda item: item[1],
        reverse=True
    )

    for mood, probability in probability_map:
        print(
            f"  {mood}: "
            f"{probability * 100:.2f}%"
        )