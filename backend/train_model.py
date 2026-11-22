from pathlib import Path

import joblib
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


# ============================================================
# PATHS
# ============================================================

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


# ============================================================
# START
# ============================================================

print("=" * 70)
print("AI MOOD MODEL TRAINING")
print("=" * 70)

print(f"\nDataset path:")
print(DATASET_PATH)

print(f"\nModel will be saved at:")
print(MODEL_PATH)


# ============================================================
# CHECK DATASET
# ============================================================

if not DATASET_PATH.exists():

    raise FileNotFoundError(
        f"\nDataset not found:\n{DATASET_PATH}\n\n"
        "Make sure mood_dataset.csv exists inside:\n"
        "backend/app/ai/"
    )


# ============================================================
# LOAD DATASET
# ============================================================

print("\nLoading dataset...")

df = pd.read_csv(DATASET_PATH)


# ============================================================
# CHECK REQUIRED COLUMNS
# ============================================================

required_columns = [
    "text",
    "mood"
]

for column in required_columns:

    if column not in df.columns:

        raise ValueError(
            f"\nMissing required column: '{column}'\n\n"
            "CSV must contain:\n"
            "text,mood"
        )


# ============================================================
# CLEAN DATA
# ============================================================

print("\nCleaning dataset...")

df = df.dropna(
    subset=[
        "text",
        "mood"
    ]
)

df["text"] = (
    df["text"]
    .astype(str)
    .str.strip()
)

df["mood"] = (
    df["mood"]
    .astype(str)
    .str.lower()
    .str.strip()
)


# Remove empty rows

df = df[
    (df["text"] != "")
    & (df["mood"] != "")
]


# Remove exact duplicate rows

df = df.drop_duplicates(
    subset=[
        "text",
        "mood"
    ]
)


print(
    f"\nTotal usable samples: {len(df)}"
)


# ============================================================
# MOOD DISTRIBUTION
# ============================================================

mood_counts = (
    df["mood"]
    .value_counts()
)


print("\n" + "=" * 70)
print("MOOD DISTRIBUTION")
print("=" * 70)

print(mood_counts)


# ============================================================
# CHECK MINIMUM SAMPLES
# ============================================================

print("\nChecking mood classes...")


too_small_classes = mood_counts[
    mood_counts < 2
]


if len(too_small_classes) > 0:

    print(
        "\nWARNING: These moods have fewer than 2 examples:"
    )

    print(
        too_small_classes
    )

    print(
        "\nAdd at least 2 examples for every mood."
    )

    raise ValueError(
        "\nTraining stopped because at least one mood "
        "has fewer than 2 samples.\n\n"
        f"Problematic moods:\n"
        f"{too_small_classes}"
    )


# ============================================================
# FEATURE / TARGET
# ============================================================

X = df["text"]
y = df["mood"]


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

print("\nCreating train/test split...")

# Calculate a safe test size.
#
# For small datasets, 20% may not provide enough
# samples for every class.
#
# We make sure the test set has at least as many
# samples as the number of mood classes.

number_of_classes = y.nunique()

minimum_test_samples = number_of_classes

calculated_test_samples = int(
    len(df) * 0.20
)

test_samples = max(
    calculated_test_samples,
    minimum_test_samples
)


# Make sure test set is not too large

maximum_test_samples = len(df) - number_of_classes

test_samples = min(
    test_samples,
    maximum_test_samples
)


test_size = test_samples / len(df)


print(
    f"\nNumber of classes: {number_of_classes}"
)

print(
    f"Training samples target: "
    f"{len(df) - test_samples}"
)

print(
    f"Testing samples target: "
    f"{test_samples}"
)


X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=test_size,
    random_state=42,
    stratify=y
)


print(
    f"\nActual training samples: "
    f"{len(X_train)}"
)

print(
    f"Actual testing samples: "
    f"{len(X_test)}"
)


# ============================================================
# CREATE MODEL
# ============================================================

print("\nCreating AI model...")


model = Pipeline(
    [
        (
            "tfidf",

            TfidfVectorizer(

                lowercase=True,

                strip_accents="unicode",

                ngram_range=(
                    1,
                    2
                ),

                min_df=1,

                max_df=0.95,

                sublinear_tf=True,

                max_features=10000,

                analyzer="word",
            )
        ),

        (
            "classifier",

            LogisticRegression(

                max_iter=3000,

                C=4.0,

                class_weight="balanced",

                random_state=42,
            )
        ),
    ]
)


# ============================================================
# TRAIN
# ============================================================

print("\n" + "=" * 70)
print("TRAINING MODEL")
print("=" * 70)

model.fit(
    X_train,
    y_train
)


print(
    "\nModel training completed."
)


# ============================================================
# TEST MODEL
# ============================================================

print("\n" + "=" * 70)
print("MODEL EVALUATION")
print("=" * 70)


predictions = model.predict(
    X_test
)


accuracy = accuracy_score(
    y_test,
    predictions
)


print(
    f"\nMODEL ACCURACY: "
    f"{accuracy * 100:.2f}%"
)


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print(
    "\nClassification Report:\n"
)


print(
    classification_report(
        y_test,
        predictions,
        zero_division=0
    )
)


# ============================================================
# SAVE MODEL
# ============================================================

print("\nSaving trained model...")


MODEL_PATH.parent.mkdir(
    parents=True,
    exist_ok=True
)


joblib.dump(
    model,
    MODEL_PATH
)


print(
    "\n" + "=" * 70
)

print(
    "MODEL SAVED SUCCESSFULLY"
)

print(
    "=" * 70
)

print(
    f"\nSaved at:\n{MODEL_PATH}"
)


# ============================================================
# QUICK TESTS
# ============================================================

test_sentences = [

    "I am very happy today.",

    "I finally achieved my goal and I feel amazing.",

    "I am feeling sad today.",

    "I feel lonely and empty.",

    "I am extremely angry right now.",

    "They made me really angry.",

    "I am very stressed about my exams.",

    "I have too much work and pressure.",

    "I am anxious about my future.",

    "I keep worrying about what will happen.",

    "I am scared about the result.",

    "I am very tired today.",

    "I have no energy left.",

    "Everything is normal today.",
]


print(
    "\n" + "=" * 70
)

print(
    "QUICK MODEL TESTS"
)

print(
    "=" * 70
)


for sentence in test_sentences:

    prediction = model.predict(
        [sentence]
    )[0]

    probabilities = model.predict_proba(
        [sentence]
    )[0]

    classes = model.classes_


    probability_map = {
        mood: round(
            float(probability) * 100,
            2
        )

        for mood, probability
        in zip(
            classes,
            probabilities
        )
    }


    sorted_probabilities = sorted(
        probability_map.items(),
        key=lambda item: item[1],
        reverse=True
    )


    confidence = max(
        probability_map.values()
    )


    print(
        "\n----------------------------------------"
    )

    print(
        "Text:"
    )

    print(
        sentence
    )

    print(
        f"\nPrediction: {prediction}"
    )

    print(
        f"Model confidence: {confidence:.2f}%"
    )

    print(
        "\nMood probabilities:"
    )


    for mood, probability in sorted_probabilities:

        print(
            f"  {mood:<12} "
            f"{probability:>6.2f}%"
        )


print(
    "\n" + "=" * 70
)

print(
    "TRAINING FINISHED"
)

print(
    "=" * 70
)