import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

INPUT_FILE = BASE_DIR / "app" / "ai" / "mood_dataset.csv"

OUTPUT_FILE = BASE_DIR / "app" / "ai" / "mood_dataset_multilabel.csv"

MOODS = [
    "happy",
    "sad",
    "angry",
    "tired",
    "anxious",
    "stressed",
    "neutral"
]

# Load existing dataset
df = pd.read_csv(INPUT_FILE)

df = df.dropna(subset=["text", "mood"])

df["text"] = df["text"].astype(str).str.strip()
df["mood"] = df["mood"].astype(str).str.lower().str.strip()

# Validate labels
invalid = set(df["mood"]) - set(MOODS)

if invalid:
    raise ValueError(f"Unknown moods found: {invalid}")

# Convert existing single labels into binary columns
result = pd.DataFrame()

result["text"] = df["text"]

for mood in MOODS:
    result[mood] = (
        df["mood"] == mood
    ).astype(int)

# Add genuine mixed-emotion examples
mixed_examples = [
    ("I am happy but worried about my future",
     ["happy", "anxious"]),

    ("I feel sad and angry after our argument",
     ["sad", "angry"]),

    ("I am tired and stressed because of work",
     ["tired", "stressed"]),

    ("I am excited but nervous about my exam",
     ["happy", "anxious"]),

    ("Mujhe khushi bhi ho rahi hai aur darr bhi lag raha hai",
     ["happy", "anxious"]),

    ("Mujhe gussa bhi aa raha hai aur rona bhi",
     ["angry", "sad"]),

    ("I feel lonely and emotionally exhausted",
     ["sad", "tired"]),

    ("I am worried and mentally exhausted",
     ["anxious", "tired"]),

    ("I am angry and stressed because of my project",
     ["angry", "stressed"]),

    ("Aaj bahut khush hoon lekin thakan bhi hai",
     ["happy", "tired"]),

    ("I feel sad but I am trying to stay positive",
     ["sad", "happy"]),

    ("Mujhe future ki tension hai aur bahut stress ho raha hai",
     ["anxious", "stressed"]),

    ("I am tired, frustrated and angry",
     ["tired", "angry"]),

    ("I feel anxious and lonely",
     ["anxious", "sad"]),

    ("I am happy but physically exhausted",
     ["happy", "tired"]),

    ("I am stressed and unable to sleep",
     ["stressed", "tired"]),

    ("I am angry but also disappointed",
     ["angry", "sad"]),

    ("I feel nervous and scared about my results",
     ["anxious", "stressed"]),

    ("Mera mood acha hai but andar se tension ho rahi hai",
     ["happy", "anxious"]),

    ("I am sad, tired and stressed today",
     ["sad", "tired", "stressed"])
]

new_rows = []

for text, labels in mixed_examples:

    row = {"text": text}

    for mood in MOODS:
        row[mood] = int(mood in labels)

    new_rows.append(row)

mixed_df = pd.DataFrame(new_rows)

# Combine datasets
final_df = pd.concat(
    [result, mixed_df],
    ignore_index=True
)

# Remove duplicate sentences
final_df["text"] = final_df["text"].str.strip()

final_df = final_df.drop_duplicates(
    subset=["text"]
)

# Save new dataset
OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

final_df.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\nDataset conversion completed!")

print("Total samples:", len(final_df))

print("\nMood distribution:")

print(final_df[MOODS].sum())

print("\nMixed emotion samples:")

print(
    (final_df[MOODS].sum(axis=1) > 1).sum()
)

print("\nSaved at:")
print(OUTPUT_FILE)
