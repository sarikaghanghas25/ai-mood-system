"""
Builds a multi-label mood dataset (English + Hinglish).

Every row has a text column plus one 0/1 column per mood, so a
sentence can carry several moods at once:

    "I got the job but I am exhausted"  -> happy=1, tired=1

What the dataset contains:
  1. Existing single-label rows from mood_dataset.csv
  2. Generated single-mood sentences
  3. Generated 2-mood combinations (all 15 pairs, both orders)
  4. Generated 3-mood combinations
  5. Negation examples ("I am not angry, just tired" -> tired only),
     so the model does not tag a mood just because its word appears
  6. Neutral sentences (neutral is never mixed with other moods)
  7. Optional: GoEmotions rows that 2+ raters agreed on

Run:
    python3 build_multilabel_dataset.py
    python3 build_multilabel_dataset.py --no-goemotions
"""

import argparse
import itertools
import random
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
AI_DIR = BASE_DIR / "app" / "ai"

SINGLE_LABEL_FILE = AI_DIR / "mood_dataset.csv"
GOEMOTIONS_DIR = AI_DIR / "raw_datasets" / "goemotions"
OUTPUT_FILE = AI_DIR / "mood_dataset_multilabel.csv"

MOODS = ["happy", "sad", "angry", "tired", "anxious", "stressed", "neutral"]
EMOTIONAL_MOODS = [m for m in MOODS if m != "neutral"]

SEED = 42

# How many sentences to generate
SINGLES_PER_MOOD = 350
PAIRS_PER_COMBO = 130
TRIPLES_PER_COMBO = 30
NEGATIONS_PER_COMBO = 40
NEUTRAL_COUNT = 450
GOEMOTIONS_PER_MOOD = 350


# ============================================================
# PHRASE BANKS
# ============================================================

# Short adjectives, used as "I feel {a} and {b}"
ADJECTIVES = {
    "happy": [
        "happy", "excited", "glad", "cheerful", "joyful", "grateful",
        "proud", "relieved", "content", "thrilled", "on cloud nine",
        "in a great mood", "delighted", "hopeful", "relaxed", "calm and happy",
        "at peace",
    ],
    "sad": [
        "sad", "lonely", "heartbroken", "down", "hurt", "depressed",
        "low", "upset", "disappointed", "miserable", "empty", "gloomy",
        "unwanted", "broken",
    ],
    "angry": [
        "angry", "furious", "irritated", "annoyed", "frustrated", "mad",
        "pissed off", "fed up", "enraged", "livid", "outraged",
        "really irritated",
    ],
    "tired": [
        "tired", "exhausted", "drained", "sleepy", "worn out", "fatigued",
        "burnt out", "low on energy", "dead tired", "physically exhausted",
        "completely drained", "sleep deprived",
    ],
    "anxious": [
        "anxious", "nervous", "worried", "scared", "afraid", "uneasy",
        "restless", "panicky", "fearful", "on edge", "jittery",
        "terrified",
    ],
    "stressed": [
        "stressed", "overwhelmed", "under pressure", "overloaded",
        "stressed out", "swamped", "pressured", "stretched too thin",
        "buried under work", "maxed out", "under a lot of pressure",
    ],
}

# Full English clauses describing a situation
EN_CLAUSES = {
    "happy": [
        "I got the job I wanted", "today was a really good day",
        "I passed my exam", "my friends threw me a surprise party",
        "everything is going well", "I can't stop smiling",
        "I finally achieved my goal", "I feel amazing today",
        "my family is proud of me", "I had a great time with my friends",
        "life feels good right now", "I got promoted",
        "my crush texted me back", "I won the match today",
        "I got selected", "I cleared the interview", "my results came out great",
        "I finally got good news",
        "I am really enjoying my vacation", "I got great marks",
    ],
    "sad": [
        "I miss my old friends", "nobody cares about me",
        "I feel like crying", "my heart feels heavy",
        "I lost someone close to me", "I feel left out",
        "we broke up last week", "I feel so alone",
        "nothing makes me happy anymore", "I feel hopeless",
        "my best friend stopped talking to me", "I cried all night",
        "I feel like nobody understands me", "my pet passed away",
    ],
    "angry": [
        "my friend lied to me", "people keep disrespecting me",
        "I want to scream at someone", "my boss blamed me for their mistake",
        "nobody listens to me and it makes my blood boil",
        "I hate how they treated me", "they cheated me",
        "my brother broke my phone again", "I am sick of being ignored",
        "this is so unfair", "someone insulted me in front of everyone",
        "my roommate keeps taking my stuff", "they took credit for my work",
    ],
    "tired": [
        "I could not sleep last night", "I have no energy left",
        "I just want to lie down", "my body is aching",
        "I need a long nap", "I worked a double shift",
        "my eyes keep closing", "I barely slept for two days",
        "I can't keep my eyes open", "I am running on two hours of sleep",
        "I can barely move after the long day", "I need rest badly",
    ],
    "anxious": [
        "I keep overthinking everything", "my heart is racing",
        "I am scared about my results",
        "I don't know what will happen tomorrow",
        "I can't stop worrying about the future",
        "I have butterflies in my stomach before the interview",
        "I feel like something bad will happen", "my hands are shaking",
        "I am afraid I will fail", "the uncertainty is eating me up",
        "I keep thinking about the worst case", "I can't calm my mind down",
    ],
    "stressed": [
        "I have too many deadlines",
        "exams are next week and I haven't studied",
        "there is too much work on my plate",
        "my boss keeps piling on tasks",
        "I have three assignments due tomorrow", "bills are piling up",
        "I can't handle all this pressure",
        "everything is due at the same time", "I have no time to breathe",
        "my workload is insane", "I have to manage work and college together",
        "there is so much pressure at home",
    ],
}

HI_CLAUSES = {
    "happy": [
        "aaj main bahut khush hoon", "mujhe bahut khushi ho rahi hai",
        "aaj ka din bahut acha tha", "mera result acha aaya",
        "mood ekdum mast hai", "mujhe job mil gayi", "dil khush ho gaya",
        "aaj bahut maza aaya", "main bahut excited hoon",
        "sab kuch acha chal raha hai", "aaj dil se khush hoon",
        "mera promotion ho gaya",
    ],
    "sad": [
        "mujhe bahut bura lag raha hai", "main bahut udaas hoon",
        "mujhe rona aa raha hai", "dil bahut bhaari hai",
        "main akela feel kar raha hoon", "koi meri parwah nahi karta",
        "mera dil toot gaya", "kuch acha nahi lag raha",
        "mujhe uski bahut yaad aa rahi hai",
        "andar se khaali khaali lag raha hai", "mann bahut dukhi hai",
        "sab ne mujhe chhod diya",
    ],
    "angry": [
        "mujhe bahut gussa aa raha hai", "mera dimag kharab ho gaya hai",
        "usne mere saath galat kiya", "main usse bahut naraz hoon",
        "sab mujhe irritate kar rahe hain",
        "mann kar raha hai sab tod doon",
        "mujhe uski baaton pe gussa aa raha hai",
        "koi meri baat nahi sunta aur gussa aata hai",
        "main bahut chidh gaya hoon", "yeh bilkul unfair hai",
        "usne sabke saamne meri insult ki", "mera khoon khaul raha hai",
    ],
    "tired": [
        "main bahut thak gaya hoon", "mujhe bahut neend aa rahi hai",
        "body mein energy nahi hai", "raat bhar so nahi paya",
        "bas aaram karna hai", "thakan se bura haal hai",
        "aankhein band ho rahi hain", "pura din kaam karke thak gayi hoon",
        "mujhe bas sona hai", "sharir toot raha hai",
        "bilkul energy nahi bachi", "main bahut thaki hui hoon",
    ],
    "anxious": [
        "mujhe bahut darr lag raha hai", "mujhe ghabrahat ho rahi hai",
        "future ki tension ho rahi hai", "dil zor zor se dhadak raha hai",
        "result ko lekar bahut nervous hoon", "pata nahi kya hoga",
        "mujhe bahut overthinking ho rahi hai",
        "lag raha hai kuch bura hone wala hai",
        "interview ko lekar darr lag raha hai", "mann bechain hai",
        "mujhe fail hone ka darr hai", "haath kaanp rahe hain",
    ],
    "stressed": [
        "bahut pressure hai", "kaam ka bahut load hai",
        "exams ki wajah se bahut stress hai", "deadlines sar pe hain",
        "itna kaam hai ki saans lene ka time nahi",
        "assignments khatam hi nahi ho rahe",
        "office mein bahut pressure hai", "mere upar bahut zimmedari hai",
        "sab kuch ek saath aa gaya hai", "bahut stress ho raha hai",
        "padhai ka bahut burden hai", "exams sar pe hain",
        "kal submission hai aur kuch ready nahi hai", "ghar aur kaam dono sambhalna pad raha hai",
    ],
}

NEUTRAL_SENTENCES = [
    "I am just having a normal day", "nothing special happened today",
    "I had lunch and watched tv", "today was an ordinary day",
    "I am going to the market", "I am fine, nothing much",
    "just another regular day", "I am working on my project",
    "I am reading a book", "the weather is okay today",
    "I finished my homework", "I am waiting for the bus",
    "I am at home right now", "I am cooking dinner",
    "I went for a walk in the evening", "I am watching a movie",
    "I have a class at ten", "I am sitting in the library",
    "I just woke up and had tea", "I am doing my usual routine",
    "aaj kuch khaas nahi hua", "sab normal hai", "bas aise hi baitha hoon",
    "main theek hoon", "abhi khana kha raha hoon", "din normal tha",
    "kuch nahi bas time pass", "main ghar pe hoon",
    "abhi college ja raha hoon", "chai pi raha hoon",
    "aaj ka din theek thaak tha", "bas routine kaam chal raha hai",
    "abhi tv dekh raha hoon", "market se saaman laana hai",
    "I had dinner with my family", "I talked to my friend on the phone",
    "I went to college and came back", "family ke saath khana khaya",
]

# Short Hinglish phrases for negation templates
HI_NEGATED = {
    "sad": ["udaas nahi hoon", "dukhi nahi hoon"],
    "angry": ["gussa nahi hoon", "naraz nahi hoon"],
    "tired": ["thaka nahi hoon", "thaki nahi hoon"],
    "anxious": ["darr nahi lag raha", "nervous nahi hoon"],
    "stressed": ["stress nahi hai", "pressure nahi hai"],
}

HI_SHORT = {
    "happy": ["khush hoon", "mood acha hai"],
    "sad": ["udaas hoon", "bura lag raha hai"],
    "angry": ["gussa aa raha hai", "irritate ho raha hoon"],
    "tired": ["thaka hua hoon", "neend aa rahi hai"],
    "anxious": ["thodi ghabrahat hai", "darr lag raha hai"],
    "stressed": ["kaam ka pressure hai", "stress ho raha hai"],
}

# Nouns for the "X bhi hai aur Y bhi" pattern
HI_NOUNS = {
    "happy": ["khushi", "excitement"],
    "sad": ["dukh", "udaasi"],
    "angry": ["gussa", "chidchidapan"],
    "tired": ["thakan", "neend"],
    "anxious": ["darr", "ghabrahat", "bechaini"],
    "stressed": ["stress", "pressure"],
}

PREFIXES = [
    "", "", "", "Honestly, ", "Today ", "Right now ", "Yaar, ",
    "These days ", "To be honest, ", "Aaj ",
]


# ============================================================
# TEMPLATES
# ============================================================

def pick(rng, items):
    return rng.choice(items)


def single_sentence(rng, mood):
    templates = [
        lambda: f"I feel {pick(rng, ADJECTIVES[mood])}",
        lambda: f"I am so {pick(rng, ADJECTIVES[mood])} today",
        lambda: pick(rng, EN_CLAUSES[mood]),
        lambda: f"{pick(rng, EN_CLAUSES[mood])}, I feel {pick(rng, ADJECTIVES[mood])}",
        lambda: pick(rng, HI_CLAUSES[mood]),
        lambda: f"{pick(rng, HI_CLAUSES[mood])} yaar",
        lambda: f"{pick(rng, EN_CLAUSES[mood])} aur {pick(rng, HI_CLAUSES[mood])}",
    ]
    return pick(rng, PREFIXES) + pick(rng, templates)()


def pair_sentence(rng, a, b):
    adj_a, adj_b = pick(rng, ADJECTIVES[a]), pick(rng, ADJECTIVES[b])
    en_a, en_b = pick(rng, EN_CLAUSES[a]), pick(rng, EN_CLAUSES[b])
    hi_a, hi_b = pick(rng, HI_CLAUSES[a]), pick(rng, HI_CLAUSES[b])

    templates = [
        f"I feel {adj_a} and {adj_b}",
        f"I am {adj_a} but also {adj_b}",
        f"I'm {adj_a}, yet at the same time {adj_b}",
        f"Feeling {adj_a} and {adj_b} today",
        f"Part of me is {adj_a} and part of me is {adj_b}",
        f"On one hand I am {adj_a}, on the other hand I am {adj_b}",
        f"{en_a}, and {en_b}",
        f"{en_a} but {en_b}",
        f"{en_a}. Also {en_b}",
        f"{en_a} so I am {adj_a}, plus I am {adj_b}",
        f"{hi_a}, lekin {hi_b}",
        f"{hi_a} aur {hi_b}",
        f"{hi_a}, par saath mein {hi_b}",
        f"{hi_a}. Upar se {hi_b}",
        f"Ek taraf {hi_a}, doosri taraf {hi_b}",
        f"{en_a} lekin {hi_b}",
        f"{hi_a} but {en_b}",
        f"main {adj_a} bhi hoon aur {adj_b} bhi",
        f"{pick(rng, HI_SHORT[a])}, lekin {pick(rng, HI_SHORT[b])}",
        f"{pick(rng, HI_NOUNS[a])} bhi hai aur {pick(rng, HI_NOUNS[b])} bhi",
        f"mujhe {pick(rng, HI_NOUNS[a])} bhi ho rahi hai aur {pick(rng, HI_NOUNS[b])} bhi",
        f"{hi_a} lekin {pick(rng, HI_NOUNS[b])} bhi hai",
    ]
    return pick(rng, PREFIXES) + pick(rng, templates)


def triple_sentence(rng, a, b, c):
    adj = [pick(rng, ADJECTIVES[m]) for m in (a, b, c)]
    en = [pick(rng, EN_CLAUSES[m]) for m in (a, b, c)]
    hi = [pick(rng, HI_CLAUSES[m]) for m in (a, b, c)]

    templates = [
        f"I feel {adj[0]}, {adj[1]} and {adj[2]}",
        f"I am {adj[0]} and {adj[1]}, and honestly a bit {adj[2]} too",
        f"{en[0]}, {en[1]} and {en[2]}",
        f"{en[0]}. {en[1]}. On top of that {en[2]}",
        f"{hi[0]}, {hi[1]} aur {hi[2]}",
        f"{en[0]}, {hi[1]}, and on top of that {en[2]}",
    ]
    return pick(rng, PREFIXES) + pick(rng, templates)


def negation_sentence(rng, negated, actual):
    """Text mentions `negated` mood but only `actual` mood is true."""
    neg_adj = pick(rng, ADJECTIVES[negated])
    real_adj = pick(rng, ADJECTIVES[actual])

    templates = [
        f"I am not {neg_adj}, just {real_adj}",
        f"I'm not {neg_adj} anymore, now I feel {real_adj}",
        f"I am {real_adj}, not {neg_adj}",
        f"I used to be {neg_adj} but now I am {real_adj}",
        f"It's not that I am {neg_adj}, I am just {real_adj}",
        f"I am not {neg_adj} anymore, I am {real_adj}",
        f"I don't feel {neg_adj}, I feel {real_adj}",
        f"never been less {neg_adj}, but I am really {real_adj}",
        f"main {pick(rng, HI_NEGATED[negated])}, bas {pick(rng, HI_SHORT[actual])}",
        f"{pick(rng, HI_NEGATED[negated])} yaar, bas {pick(rng, HI_SHORT[actual])}",
    ]
    return pick(rng, templates)


# ============================================================
# BUILD
# ============================================================

def make_row(text, labels):
    row = {"text": text.strip()}
    for mood in MOODS:
        row[mood] = int(mood in labels)
    return row


def generate_rows(rng):
    rows = []

    for mood in EMOTIONAL_MOODS:
        for _ in range(SINGLES_PER_MOOD):
            rows.append(make_row(single_sentence(rng, mood), [mood]))

    for a, b in itertools.combinations(EMOTIONAL_MOODS, 2):
        for i in range(PAIRS_PER_COMBO):
            # Alternate order so the model doesn't learn "first mood wins"
            first, second = (a, b) if i % 2 == 0 else (b, a)
            rows.append(make_row(pair_sentence(rng, first, second), [a, b]))

    for combo in itertools.combinations(EMOTIONAL_MOODS, 3):
        for _ in range(TRIPLES_PER_COMBO):
            order = list(combo)
            rng.shuffle(order)
            rows.append(make_row(triple_sentence(rng, *order), combo))

    # "not happy" usually means sad, so happy is never the negated mood
    for negated in HI_NEGATED:
        for actual in EMOTIONAL_MOODS:
            if actual == negated:
                continue
            for _ in range(NEGATIONS_PER_COMBO):
                rows.append(make_row(negation_sentence(rng, negated, actual), [actual]))

    for _ in range(NEUTRAL_COUNT):
        rows.append(make_row(pick(rng, PREFIXES) + pick(rng, NEUTRAL_SENTENCES), ["neutral"]))

    return rows


def load_single_label_rows():
    df = pd.read_csv(SINGLE_LABEL_FILE).dropna(subset=["text", "mood"])
    df["mood"] = df["mood"].astype(str).str.lower().str.strip()

    invalid = set(df["mood"]) - set(MOODS)
    if invalid:
        raise ValueError(f"Unknown moods found: {invalid}")

    return [make_row(str(t), [m]) for t, m in zip(df["text"], df["mood"])]


# GoEmotions has no tired/stressed labels, so only these map over
GOEMOTIONS_MAP = {
    "happy": ["joy", "amusement", "excitement", "gratitude", "optimism",
              "pride", "relief", "love"],
    "sad": ["sadness", "grief", "disappointment", "remorse"],
    "angry": ["anger", "annoyance", "disgust"],
    "anxious": ["fear", "nervousness"],
    "neutral": ["neutral"],
}


def load_goemotions_rows(rng):
    files = sorted(GOEMOTIONS_DIR.glob("*.csv"))
    if not files:
        print("GoEmotions files not found, skipping.")
        return []

    source_cols = sorted({c for cols in GOEMOTIONS_MAP.values() for c in cols})
    raw = pd.concat(
        [pd.read_csv(f, usecols=["text", "id", "example_very_unclear"] + source_cols)
         for f in files],
        ignore_index=True,
    )
    raw = raw[~raw["example_very_unclear"]]

    # One row per comment; a label counts only if 2+ raters chose it
    votes = raw.groupby("id")[source_cols].sum()
    texts = raw.groupby("id")["text"].first()
    agreed = votes >= 2

    mood_flags = pd.DataFrame(index=agreed.index)
    for mood, cols in GOEMOTIONS_MAP.items():
        mood_flags[mood] = agreed[cols].any(axis=1)

    # Neutral must stay exclusive
    has_emotion = mood_flags.drop(columns="neutral").any(axis=1)
    mood_flags.loc[has_emotion, "neutral"] = False
    mood_flags = mood_flags[mood_flags.any(axis=1)]

    # Short, clean comments only
    texts = texts.loc[mood_flags.index]
    keep = (
        texts.str.len().between(15, 160)
        & ~texts.str.contains(r"\[NAME\]|\[RELIGION\]|http|/r/", regex=True)
    )
    mood_flags, texts = mood_flags[keep], texts[keep]

    rows = []
    for mood in GOEMOTIONS_MAP:
        ids = list(mood_flags.index[mood_flags[mood]])
        rng.shuffle(ids)
        for comment_id in ids[:GOEMOTIONS_PER_MOOD]:
            labels = [m for m in GOEMOTIONS_MAP if mood_flags.at[comment_id, m]]
            rows.append(make_row(texts[comment_id], labels))

    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-goemotions", action="store_true")
    args = parser.parse_args()

    rng = random.Random(SEED)

    rows = load_single_label_rows() + generate_rows(rng)
    if not args.no_goemotions:
        rows += load_goemotions_rows(rng)

    df = pd.DataFrame(rows)
    df["text"] = df["text"].str.replace(r"\s+", " ", regex=True).str.strip()
    df = df[df["text"] != ""]

    # Same text with conflicting labels would confuse the model: drop all copies
    conflicting = df.groupby("text")[MOODS].nunique().gt(1).any(axis=1)
    df = df[~df["text"].isin(conflicting[conflicting].index)]
    df = df.drop_duplicates(subset=["text"])
    df = df.sample(frac=1, random_state=SEED).reset_index(drop=True)

    df.to_csv(OUTPUT_FILE, index=False)

    label_count = df[MOODS].sum(axis=1)
    print("Total samples:", len(df))
    print("\nMood distribution:")
    print(df[MOODS].sum().to_string())
    print("\nRows by number of moods:")
    print(label_count.value_counts().sort_index().to_string())
    print("\nSaved at:", OUTPUT_FILE)


if __name__ == "__main__":
    main()
