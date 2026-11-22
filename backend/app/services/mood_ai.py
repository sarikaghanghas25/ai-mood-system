from pathlib import Path
import re
import joblib

from app.ai.mood_model import predict_moods


# ============================================================
# CONFIG
# ============================================================

EMOTIONS = [
    "happy",
    "sad",
    "angry",
    "stressed",
    "anxious",
    "tired",
    "neutral",
]

MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "ai"
    / "mood_model.joblib"
)

_model = None

# ML probability above which the ML model's mood beats the keyword rules
ML_TRUST_THRESHOLD = 0.6


# ============================================================
# TEXT NORMALIZATION
# ============================================================

SHORT_FORMS = {
    "mne": "maine",
    "mujhe": "mujhe",
    "merko": "mujhe",
    "mra": "mera",
    "meri": "meri",
    "h": "hai",
    "hn": "haan",
    "ha": "haan",
    "nhi": "nahi",
    "nai": "nahi",
    "ni": "nahi",
    "kr": "kar",
    "krna": "karna",
    "krni": "karni",
    "krr": "kar",
    "bhut": "bahut",
    "bht": "bahut",
    "aaj": "aaj",
    "kal": "kal",
    "rhna": "rehna",
    "rh": "reh",
    "lakin": "lekin",
    "lkin": "lekin",
    "gya": "gaya",
    "gyi": "gayi",
    "hogya": "ho gaya",
    "hogyi": "ho gayi",
    "akele": "akele",
    "sone": "sona",
    "tired": "tired",

    # Common chat spellings (Hinglish)
    "m": "main",
    "p": "pe",
    "pr": "par",
    "fr": "phir",
    "mko": "mujhe",
    "mjhe": "mujhe",
    "mrko": "mujhe",
    "hu": "hoon",
    "hun": "hoon",
    "rha": "raha",
    "rhi": "rahi",
    "rhe": "rahe",
    "kese": "kaise",
    "kaese": "kaise",
    "kyu": "kyun",
    "kyo": "kyun",
    "ghr": "ghar",
    "clg": "college",
    "skl": "school",
    "exm": "exam",
    "ppr": "paper",
    "rslt": "result",
    "tut": "toot",
    "tuta": "toota",
    "tuti": "tooti",
    "btau": "bataun",
    "batau": "bataun",
    "btaya": "bataya",
    "btana": "batana",
    "fsa": "fasa",
    "dia": "diya",
    "lia": "liya",
    "kia": "kiya",
    "pta": "pata",
    "kch": "kuch",
    "sb": "sab",
    "sbko": "sabko",
    "jb": "jab",
    "tb": "tab",
    "bhot": "bahut",
    "pese": "paise",
    "hmare": "hamare",
    "hmara": "hamara",
    "hmari": "hamari",
    "tmhare": "tumhare",
    "shadi": "shaadi",
    "bhag": "bhaag",
    "bhagi": "bhaagi",
    "paise": "paise",
    "dere": "de rahe",
    "dera": "de raha",
    "derhe": "de rahe",
    "kra": "kara",
    "kri": "kari",
    "lg": "lag",
    "yr": "yaar",
    "yrr": "yaar",
    "frnd": "friend",
    "frnds": "friends",
    "gf": "girlfriend",
    "bf": "boyfriend",

    # Common chat spellings (English)
    "u": "you",
    "ur": "your",
    "r": "are",
    "bt": "but",
    "nd": "and",
    "coz": "because",
    "bcoz": "because",
    "bcz": "because",
    "pls": "please",
    "plz": "please",
    "tym": "time",
    "msg": "message",
}


EMOJI_WORDS = {
    **dict.fromkeys(
        ["😊", "😀", "😁", "😄", "😃", "🥳", "😍", "🥰", "🤩", "😇", "🙂", "❤️", "❤", "💖", "🎉", "👍", "😂", "🤣"],
        "emojihappy",
    ),
    **dict.fromkeys(
        ["😢", "😭", "💔", "😞", "😔", "☹️", "☹", "🙁", "🥺", "😿"],
        "emojisad",
    ),
    **dict.fromkeys(
        ["😡", "🤬", "😠", "👿", "💢", "😤"],
        "emojiangry",
    ),
    **dict.fromkeys(
        ["😴", "🥱", "😪", "💤"],
        "emojitired",
    ),
    **dict.fromkeys(
        ["😰", "😨", "😟", "😱", "😧", "😥", "😬"],
        "emojianxious",
    ),
    **dict.fromkeys(
        ["😩", "😫", "🤯", "😵", "😓"],
        "emojistressed",
    ),
}


def normalize_text(text: str) -> str:
    """
    Cleans common Hinglish/English short forms and small typos.
    """

    text = text.lower().strip()

    # Common joined words
    replacements = {
        "tosomeone": "to someone",
        "toanyone": "to anyone",
        "talktosomeone": "talk to someone",
        "talktoanyone": "talk to anyone",

        "dont": "do not",
        "can't": "cannot",
        "cant": "cannot",
        "wont": "will not",
        "won't": "will not",
        "isnt": "is not",
        "isn't": "is not",
        "im": "i am",
        "i'm": "i am",

        # Common typos
        "takh": "talk",
        "tallk": "talk",
        "talkk": "talk",
        "ton talk": "do not want to talk",
        "dont want ton talk": "do not want to talk",
        "do not want ton talk": "do not want to talk",

        # Hinglish
        "kisi se baat nhi": "kisi se baat nahi",
        "kisi se baat nai": "kisi se baat nahi",
        "baat nhi": "baat nahi",
        "baat nai": "baat nahi",
    }

    # Whole words only ("im" must not change "time" or "him"),
    # longest phrases first so "dont want ton talk" wins over "ton talk"
    for old in sorted(replacements, key=len, reverse=True):
        text = re.sub(
            rf"\b{re.escape(old)}\b",
            replacements[old],
            text
        )

    # Remove repeated characters:
    # "tallkk" -> "talk"
    text = re.sub(r"(.)\1{2,}", r"\1", text)

    # Word-level replacements
    words = text.split()

    cleaned_words = []

    for word in words:
        cleaned_words.append(
            SHORT_FORMS.get(word, word)
        )

    text = " ".join(cleaned_words)

    # Emojis carry mood, turn them into words before punctuation is removed
    for emoji, word in EMOJI_WORDS.items():
        text = text.replace(emoji, f" {word} ")

    # Remove unnecessary punctuation
    # (Devanagari range keeps Hindi matras: "मुझे" must not become "म झ";
    # ।-॥ are the danda full stops, which are removed)
    text = re.sub(r"[^\w\s'ऀ-ॣ०-ॿ]", " ", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()

    return text


# ============================================================
# MODEL
# ============================================================

def load_model():
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"ML model not found at {MODEL_PATH}. "
                "Please run train_model.py first."
            )

        _model = joblib.load(MODEL_PATH)

    return _model


def predict_with_ml(text: str):
    """
    ML model is used as a supporting signal.
    Rule/context understanding has higher priority.
    """

    try:
        multilabel_result = predict_moods(text)

        return {
            "mood": multilabel_result["mood"],
            "moods": multilabel_result["moods"],
            "confidence": multilabel_result["probabilities"][multilabel_result["mood"]],
            "probabilities": multilabel_result["probabilities"],
        }

    except FileNotFoundError:
        pass

    try:
        model = load_model()

        probabilities = model.predict_proba([text])[0]
        classes = model.classes_

        raw = {
            mood: float(probability)
            for mood, probability in zip(classes, probabilities)
        }

        prediction = model.predict([text])[0]

        return {
            "mood": prediction,
            "moods": [prediction],
            "confidence": float(max(probabilities)),
            "probabilities": raw,
        }

    except Exception:
        return {
            "mood": "neutral",
            "moods": ["neutral"],
            "confidence": 0.50,
            "probabilities": {
                mood: 0.0
                for mood in EMOTIONS
            },
        }


# ============================================================
# BASIC HELPERS
# ============================================================

def contains_any(text: str, words):
    return any(word in text for word in words)


def word_present(text: str, word: str):
    return re.search(
        rf"\b{re.escape(word)}\b",
        text
    ) is not None


# ============================================================
# INTENSITY
# ============================================================

VERY_HIGH_INTENSITY_WORDS = [
    "extremely",
    "completely",
    "totally",
    "destroyed",
    "devastated",
    "heartbroken",
    "furious",
    "terrified",
    "panic",
    "cannot take it",
]

HIGH_INTENSITY_WORDS = [
    "very",
    "really",
    "so much",
    "too much",
    "extremely",
    "a lot",
    "bahut",
    "bohot",
    "zyada",
    "bilkul",
    "completely",
]

LOW_INTENSITY_WORDS = [
    "little",
    "slightly",
    "thoda",
    "thodi",
    "maybe",
    "kind of",
    "sort of",
]


def detect_intensity(text: str) -> str:

    if contains_any(text, VERY_HIGH_INTENSITY_WORDS):
        return "very_high"

    if contains_any(text, HIGH_INTENSITY_WORDS):
        return "high"

    if contains_any(text, LOW_INTENSITY_WORDS):
        return "low"

    return "medium"


# ============================================================
# SAFETY
# ============================================================

SELF_HARM_WORDS = [
    "kill myself",
    "suicide",
    "suicidal",
    "end my life",
    "ending my life",
    "want to die",
    "i want to die",
    "marna chahta",
    "marna chahti",
    "khud ko maar",
    "khud ko mar",
]

VIOLENCE_WORDS = [
    "hit someone",
    "hurt someone",
    "beat someone",
    "kill someone",
    "attack someone",
    "maar diya",
    "maar du",
    "maar doon",
    "peet diya",
    "kisi ko hurt",
]


# ============================================================
# SITUATION DETECTION
# ============================================================

def detect_situation(text: str):

    # --------------------------------------------------------
    # NEED SPACE
    # --------------------------------------------------------

    if (
        contains_any(
            text,
            [
                "do not want to talk",
                "do not want to talk to someone",
                "do not want to talk to anyone",
                "i dont want to talk",
                "i do not want to talk",
                "i don't want to talk",
                "don't want to talk",
                "do not want anyone",
                "do not want to speak",
                "dont want to speak",
                "kisi se baat nahi",
                "kisi se baat nahi karni",
                "mujhe kisi se baat nahi",
                "baat nahi karni",
                "baat nahi karna",
                "akele rehna",
                "akele rhna",
                "akela rehna",
                "alone rehna",
                "want to be alone",
                "need some space",
                "need space",
            ],
        )
    ):
        return "need_space"

    # --------------------------------------------------------
    # SLEEP
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "sleeping mood",
            "sleep mood",
            "want to sleep",
            "feel sleepy",
            "feeling sleepy",
            "sleepy",
            "neend aa rahi",
            "neend",
            "sona hai",
            "sone ka mann",
            "so jane",
            "so jaunga",
            "so jaungi",
            "sleep karna",
        ],
    ):
        return "sleep"

    # --------------------------------------------------------
    # FAMILY CONFLICT
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "mummy se meri ladai",
            "mummy se ladai",
            "mom se meri ladai",
            "mom se ladai",
            "papa se ladai",
            "papa se meri ladai",
            "family se ladai",
            "ghar par ladai",
            "ghar mein ladai",
            "parents se ladai",
            "maa se ladai",
            "father se ladai",
            "mother se ladai",
        ],
    ):
        return "family_conflict"

    # --------------------------------------------------------
    # FRIEND / RELATIONSHIP CONFLICT
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "friend se ladai",
            "friend se fight",
            "dost se ladai",
            "dost se fight",
            "girlfriend se ladai",
            "boyfriend se ladai",
            "partner se ladai",
            "relationship problem",
            "relationship issue",
            "we had a fight",
            "we fought",
            "had a fight with",
            "fight with my friend",
        ],
    ):
        return "relationship_conflict"

    # --------------------------------------------------------
    # BETRAYAL
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "friend lied",
            "my friend lied",
            "she lied to me",
            "he lied to me",
            "lied to me",
            "betrayed me",
            "betrayal",
            "dhoka diya",
            "dhokha diya",
            "jhoot bola",
            "jhooth bola",
            "trust tod diya",
            "trust break",
        ],
    ):
        return "betrayal"

    # --------------------------------------------------------
    # SOCIAL REJECTION
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "nobody talks to me",
            "no one talks to me",
            "everyone ignores me",
            "they ignore me",
            "ignored me",
            "left me out",
            "nobody cares",
            "no one cares",
            "koi mujhse baat nahi",
            "sab ignore",
            "mujhe ignore",
            "akela feel",
            "alone feel",
        ],
    ):
        return "social_rejection"

    # --------------------------------------------------------
    # STUDY PRESSURE
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "exam",
            "exams",
            "study pressure",
            "studies",
            "padhai ka pressure",
            "padhai pressure",
            "paper ka pressure",
            "test ka pressure",
            "assignment ka pressure",
            "assignment pending",
            "homework pending",
        ],
    ):
        return "study_pressure"

    # --------------------------------------------------------
    # WORK PRESSURE
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "work pressure",
            "office pressure",
            "workload",
            "too much work",
            "bahut kaam",
            "bhut kaam",
            "aaj bahut kaam",
            "aaj bhut kaam",
            "kaam kiya",
            "kaam karte karte",
            "working all day",
        ],
    ):
        return "work_pressure"

    # --------------------------------------------------------
    # WINNING BUT EMPTY
    # --------------------------------------------------------

    if (
        contains_any(
            text,
            [
                "won but",
                "i won but",
                "won the match but",
                "won a match but",
                "won the game but",
                "winning but",
                "won and still",
                "won yet",
            ],
        )
        and contains_any(
            text,
            [
                "not happy",
                "dont feel happy",
                "do not feel happy",
                "feel empty",
                "empty",
                "sad",
                "nothing",
                "not excited",
            ],
        )
    ):
        return "winning_but_empty"

    # --------------------------------------------------------
    # FAILURE
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "failed",
            "failure",
            "i lost",
            "lost the match",
            "lost the game",
            "couldn't do it",
            "could not do it",
            "didn't pass",
            "did not pass",
            "haar gaya",
            "haar gayi",
            "fail ho gaya",
            "fail ho gayi",
        ],
    ):
        return "failure"

    # --------------------------------------------------------
    # LOSS / GRIEF
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "someone died",
            "lost someone",
            "death",
            "passed away",
            "miss him",
            "miss her",
            "miss my father",
            "miss my mother",
            "miss my friend",
            "kisi ko kho diya",
            "kisi ki death",
        ],
    ):
        return "loss"

    # --------------------------------------------------------
    # FOOD
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "hungry",
            "bhook",
            "bhuk",
            "khana hai",
            "khane ka mann",
            "eat something",
            "want to eat",
        ],
    ):
        return "food"

    # --------------------------------------------------------
    # VIOLENCE
    # --------------------------------------------------------

    if contains_any(text, VIOLENCE_WORDS):
        return "violence"

    return None


# ============================================================
# INTENT DETECTION
# ============================================================

def detect_intent(text: str):

    text = normalize_text(text)

    # Safety first
    if contains_any(text, SELF_HARM_WORDS):
        return "self_harm"

    situation = detect_situation(text)

    if situation:
        return situation

    # --------------------------------------------------------
    # GREETING
    # --------------------------------------------------------

    if text in [
        "hi",
        "hii",
        "hiii",
        "hello",
        "hey",
        "heyy",
        "namaste",
        "good morning",
        "good evening",
        "good night",
    ]:
        return "greeting"

    # --------------------------------------------------------
    # FAREWELL
    # --------------------------------------------------------

    if text in [
        "bye",
        "goodbye",
        "good bye",
        "see you",
        "gn",
        "goodnight",
    ]:
        return "farewell"

    # --------------------------------------------------------
    # CRYING
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "i am crying",
            "im crying",
            "crying",
            "cry",
            "tears",
            "ro raha",
            "ro rahi",
            "rona aa raha",
            "aankhon mein aansu",
        ],
    ):
        return "crying"

    # --------------------------------------------------------
    # ANGER
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "i am angry",
            "i'm angry",
            "angry",
            "furious",
            "so mad",
            "very mad",
            "gussa",
            "gussa aa raha",
            "bahut gussa",
            "bhut gussa",
            "irritated",
            "frustrated",
            "frustration",
        ],
    ):
        return "anger"

    # --------------------------------------------------------
    # ANXIETY
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "anxious",
            "anxiety",
            "worried",
            "worry",
            "nervous",
            "panic",
            "scared",
            "afraid",
            "fear",
            "dar lag",
            "tension ho rahi",
            "overthinking",
            "overthinking kar raha",
            "overthinking kar rahi",
        ],
    ):
        return "anxiety"

    # --------------------------------------------------------
    # STRESS
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "stressed",
            "stress",
            "pressure",
            "overwhelmed",
            "too much pressure",
            "bahut pressure",
            "bhut pressure",
            "dimag kharab",
            "thak gaya pressure se",
        ],
    ):
        return "stress"

    # --------------------------------------------------------
    # SADNESS
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "i am sad",
            "i'm sad",
            "sad",
            "feeling sad",
            "feel sad",
            "depressed",
            "unhappy",
            "hurt",
            "heartbroken",
            "broken",
            "lonely",
            "empty",
            "disappointed",
            "dukhi",
            "udaas",
            "akela",
            "akelapan",
            "dil dukha",
            "dil toot",
        ],
    ):
        return "sadness"

    # --------------------------------------------------------
    # HAPPY
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "i am happy",
            "i'm happy",
            "happy",
            "feeling happy",
            "feel happy",
            "excited",
            "excited today",
            "great",
            "awesome",
            "amazing",
            "khush",
            "bahut khush",
            "bhut khush",
            "acha feel",
            "accha feel",
        ],
    ):
        return "happiness"

    # --------------------------------------------------------
    # TIRED
    # --------------------------------------------------------

    if contains_any(
        text,
        [
            "i am tired",
            "i'm tired",
            "tired",
            "feeling tired",
            "exhausted",
            "exhausted today",
            "so exhausted",
            "very tired",
            "thak gaya",
            "thak gayi",
            "bahut thak",
            "bhut thak",
            "energy nahi",
            "no energy",
        ],
    ):
        return "tiredness"

    return "general"


# ============================================================
# DETAILED EMOTIONS
# ============================================================

DETAILED_KEYWORDS = {

    "joy": [
        "happy",
        "khush",
        "joy",
    ],

    "excitement": [
        "excited",
        "exciting",
        "can't wait",
        "cannot wait",
    ],

    "relief": [
        "relieved",
        "relief",
        "finally",
        "sukoon",
    ],

    "pride": [
        "proud",
        "proud of myself",
        "achievement",
        "accomplished",
    ],

    "gratitude": [
        "grateful",
        "thankful",
        "thanks",
        "blessed",
    ],

    "hurt": [
        "hurt",
        "pain",
        "dil dukha",
        "hurt me",
    ],

    "heartbreak": [
        "heartbroken",
        "heart break",
        "dil toot",
    ],

    "loneliness": [
        "lonely",
        "alone",
        "akelapan",
        "akela",
    ],

    "rejection": [
        "rejected",
        "rejection",
        "ignored",
        "ignore me",
    ],

    "disappointment": [
        "disappointed",
        "disappointment",
        "disappoint",
    ],

    "emptiness": [
        "empty",
        "feel empty",
        "nothing inside",
        "khali",
    ],

    "grief": [
        "grief",
        "lost someone",
        "death",
        "passed away",
    ],

    "anger": [
        "angry",
        "gussa",
        "furious",
        "mad",
    ],

    "frustration": [
        "frustrated",
        "frustration",
        "annoyed",
        "irritated",
    ],

    "irritation": [
        "irritated",
        "annoying",
        "annoyed",
    ],

    "betrayal": [
        "betrayed",
        "betrayal",
        "lied to me",
        "dhoka",
        "dhokha",
    ],

    "resentment": [
        "resent",
        "resentment",
    ],

    "worry": [
        "worried",
        "worry",
    ],

    "fear": [
        "fear",
        "scared",
        "afraid",
        "dar",
    ],

    "nervousness": [
        "nervous",
        "nervousness",
    ],

    "panic": [
        "panic",
        "panic attack",
    ],

    "insecurity": [
        "insecure",
        "insecurity",
        "not good enough",
    ],

    "overthinking": [
        "overthinking",
        "overthink",
        "thinking too much",
    ],

    "pressure": [
        "pressure",
        "pressured",
    ],

    "overwhelm": [
        "overwhelmed",
        "too much",
        "can't handle",
        "cannot handle",
    ],

    "burnout": [
        "burnout",
        "burned out",
        "burnt out",
    ],

    "guilt": [
        "guilty",
        "guilt",
        "meri galti",
    ],

    "regret": [
        "regret",
        "regretting",
        "kaash",
    ],

    "jealousy": [
        "jealous",
        "jealousy",
    ],

    "embarrassment": [
        "embarrassed",
        "embarrassing",
        "sharminda",
    ],

    "shame": [
        "ashamed",
        "shame",
        "sharam",
    ],

    "confusion": [
        "confused",
        "confusion",
        "samajh nahi aa raha",
    ],

    "boredom": [
        "bored",
        "boring",
        "boredom",
    ],

    "numbness": [
        "numb",
        "nothing feel",
        "feel nothing",
    ],

    "calm": [
        "calm",
        "peaceful",
        "relaxed",
        "sukoon",
    ],

    "motivation": [
        "motivated",
        "motivation",
        "inspired",
    ],
}


DETAILED_TO_BASIC = {
    "joy": "happy",
    "excitement": "happy",
    "relief": "happy",
    "pride": "happy",
    "gratitude": "happy",
    "motivation": "happy",

    "hurt": "sad",
    "heartbreak": "sad",
    "loneliness": "sad",
    "rejection": "sad",
    "disappointment": "sad",
    "emptiness": "sad",
    "grief": "sad",

    "anger": "angry",
    "frustration": "angry",
    "irritation": "angry",
    "betrayal": "angry",
    "resentment": "angry",

    "worry": "anxious",
    "fear": "anxious",
    "nervousness": "anxious",
    "panic": "anxious",
    "insecurity": "anxious",
    "overthinking": "anxious",

    "pressure": "stressed",
    "overwhelm": "stressed",
    "burnout": "stressed",

    "guilt": "sad",
    "regret": "sad",
    "jealousy": "sad",
    "embarrassment": "sad",
    "shame": "sad",
    "confusion": "neutral",
    "boredom": "neutral",
    "numbness": "sad",

    "calm": "neutral",
}


def detect_detailed_emotions(text: str):

    found = []

    for emotion, keywords in DETAILED_KEYWORDS.items():

        if contains_any(text, keywords):
            found.append(emotion)

    return found


# ============================================================
# EXPLICIT BASIC EMOTION
# ============================================================

def detect_explicit_basic_emotion(text: str):

    if contains_any(
        text,
        [
            "i am happy",
            "i'm happy",
            "i feel happy",
            "feeling happy",
            "happy today",
            "khush hoon",
            "khush hu",
        ],
    ):
        return "happy"

    if contains_any(
        text,
        [
            "i am sad",
            "i'm sad",
            "i feel sad",
            "feeling sad",
            "sad today",
            "dukhi hoon",
            "dukhi hu",
            "udaas hoon",
        ],
    ):
        return "sad"

    if contains_any(
        text,
        [
            "i am angry",
            "i'm angry",
            "i feel angry",
            "feeling angry",
            "gussa hoon",
            "gussa hu",
        ],
    ):
        return "angry"

    if contains_any(
        text,
        [
            "i am stressed",
            "i'm stressed",
            "i feel stressed",
            "feeling stressed",
            "stress ho raha",
        ],
    ):
        return "stressed"

    if contains_any(
        text,
        [
            "i am anxious",
            "i'm anxious",
            "i feel anxious",
            "feeling anxious",
            "anxiety ho rahi",
        ],
    ):
        return "anxious"

    if contains_any(
        text,
        [
            "i am tired",
            "i'm tired",
            "i feel tired",
            "feeling tired",
            "thak gaya",
            "thak gayi",
        ],
    ):
        return "tired"

    return None


# ============================================================
# RELATED EMOTIONS
# ============================================================

RELATED_EMOTIONS = {

    "happy": [
        "joy",
        "excitement",
        "relief",
        "pride",
        "gratitude",
    ],

    "sad": [
        "hurt",
        "loneliness",
        "disappointment",
        "emptiness",
        "heartbreak",
    ],

    "angry": [
        "frustration",
        "irritation",
        "betrayal",
        "resentment",
    ],

    "stressed": [
        "pressure",
        "overwhelm",
        "burnout",
    ],

    "anxious": [
        "worry",
        "fear",
        "nervousness",
        "overthinking",
        "insecurity",
    ],

    "tired": [
        "exhaustion",
        "burnout",
        "low energy",
    ],

    "neutral": [
        "calm",
        "confusion",
        "boredom",
    ],
}


# ============================================================
# MOOD DETECTION
# ============================================================

NEGATED_MOOD_PATTERN = re.compile(
    r"\b(?:not|never|no longer)\s+(?:feeling\s+|very\s+|really\s+|so\s+|that\s+|too\s+)*"
    r"(?:happy|sad|upset|angry|mad|irritated|frustrated|stressed|anxious|"
    r"worried|nervous|scared|tired|exhausted)\b"
)


def remove_negated_moods(text: str) -> str:
    """
    "i am not angry just really tired" -> "i am  just really tired"

    The keyword rules below don't understand negation, so negated
    mood words are removed before they run. The ML model handles
    negation on its own and still gets the full text.
    """
    return NEGATED_MOOD_PATTERN.sub("", text)


def detect_mood_with_ai(text: str):

    original_text = text
    text = normalize_text(text)
    rule_text = remove_negated_moods(text)

    # --------------------------------------------------------
    # Intent
    # --------------------------------------------------------

    intent = detect_intent(rule_text)

    # --------------------------------------------------------
    # Intensity
    # --------------------------------------------------------

    intensity = detect_intensity(text)

    # --------------------------------------------------------
    # Situation
    # --------------------------------------------------------

    situation = detect_situation(rule_text)

    # --------------------------------------------------------
    # Detailed emotions
    # --------------------------------------------------------

    detailed_emotions = detect_detailed_emotions(rule_text)

    primary_detailed = (
        detailed_emotions[0]
        if detailed_emotions
        else None
    )

    # --------------------------------------------------------
    # Explicit emotion gets priority
    # --------------------------------------------------------

    explicit_mood = detect_explicit_basic_emotion(rule_text)

    # --------------------------------------------------------
    # ML
    # --------------------------------------------------------

    ml_result = predict_with_ml(text)

    ml_mood = ml_result["mood"]
    ml_confidence = ml_result["confidence"]
    ml_probabilities = ml_result["probabilities"]

    # --------------------------------------------------------
    # Situation-based mood
    # --------------------------------------------------------

    situation_mood = None

    situation_moods = {
        "need_space": "neutral",
        "sleep": "tired",
        "family_conflict": "sad",
        "relationship_conflict": "sad",
        "betrayal": "angry",
        "social_rejection": "sad",
        "study_pressure": "stressed",
        "work_pressure": "tired",
        "winning_but_empty": "sad",
        "failure": "sad",
        "loss": "sad",
        "food": "neutral",
        "violence": "angry",
    }

    if situation in situation_moods:
        situation_mood = situation_moods[situation]

    # --------------------------------------------------------
    # Intent-based mood
    # --------------------------------------------------------

    intent_moods = {
        "anger": "angry",
        "anxiety": "anxious",
        "stress": "stressed",
        "sadness": "sad",
        "happiness": "happy",
        "tiredness": "tired",
        "crying": "sad",
        "self_harm": "sad",
        "violence": "angry",
    }

    intent_mood = intent_moods.get(intent)

    # --------------------------------------------------------
    # Detailed emotion -> basic mood
    # --------------------------------------------------------

    detailed_mood = None

    if primary_detailed:
        detailed_mood = DETAILED_TO_BASIC.get(
            primary_detailed
        )

    # --------------------------------------------------------
    # Final mood priority
    #
    # Safety intents (self harm, violence)
    # Explicit emotion ("i am happy")
    # ML model, when it is confident
    # Situation
    # Intent
    # Detailed emotion
    # ML
    #
    # The keyword rules can't read context ("exam" always meant
    # stressed, even in "my friend framed me in the exam"), so a
    # confident ML prediction now wins over them.
    # --------------------------------------------------------

    safety_mood = (
        intent_mood
        if intent in ("self_harm", "violence")
        else None
    )

    ml_is_confident = (
        ml_mood != "neutral"
        and ml_confidence >= ML_TRUST_THRESHOLD
    )

    if safety_mood:
        final_mood = safety_mood
        confidence = 0.91

    elif explicit_mood:
        final_mood = explicit_mood
        confidence = 0.96

    elif ml_is_confident:
        final_mood = ml_mood
        confidence = ml_confidence

    elif situation_mood:
        final_mood = situation_mood
        confidence = 0.93

    elif intent_mood:
        final_mood = intent_mood
        confidence = 0.91

    elif detailed_mood:
        final_mood = detailed_mood
        confidence = 0.88

    else:
        final_mood = ml_mood
        confidence = ml_confidence

    # --------------------------------------------------------
    # All moods present (mixed emotions)
    #
    # Final mood first, then any other moods the ML model found.
    # Neutral only stays when nothing else was detected.
    # --------------------------------------------------------

    moods = [final_mood] + [
        mood for mood in ml_result["moods"]
        if mood != final_mood
    ]

    emotional_moods = [mood for mood in moods if mood != "neutral"]

    moods = emotional_moods[:3] if emotional_moods else ["neutral"]

    # --------------------------------------------------------
    # Related emotions
    # --------------------------------------------------------

    related_emotions = RELATED_EMOTIONS.get(
        final_mood,
        []
    )

    # If detailed emotions were detected,
    # use them instead of unrelated emotions.
    if detailed_emotions:
        related_emotions = detailed_emotions[:5]

    # --------------------------------------------------------
    # Explanation
    # --------------------------------------------------------

    explanation_map = {

        "happy":
            "Tumhari baat se positive ya pleasant feeling appear ho rahi hai.",

        "sad":
            "Tumhari baat mein sadness, hurt ya emotional heaviness nazar aa rahi hai.",

        "angry":
            "Tumhari baat mein anger, frustration ya irritation ka signal hai.",

        "stressed":
            "Tumhari baat se pressure ya mental overload feel ho raha hai.",

        "anxious":
            "Tumhari baat mein worry, fear ya overthinking ka signal hai.",

        "tired":
            "Tumhari baat se tiredness ya low-energy feeling appear ho rahi hai.",

        "neutral":
            "Tumhari baat mein koi strong basic emotion clearly dominant nahi hai.",
    }

    explanation = explanation_map.get(
        final_mood,
        explanation_map["neutral"]
    )

    # --------------------------------------------------------
    # Safety explanation
    # --------------------------------------------------------

    if intent == "self_harm":
        explanation = (
            "Tumhari baat se serious emotional distress ka signal mil raha hai."
        )

    # --------------------------------------------------------
    # Return
    # --------------------------------------------------------

    return {
        "mood": final_mood,
        "moods": moods,
        "confidence": round(float(confidence), 4),
        "intensity": intensity,
        "explanation": explanation,

        "probabilities": {
            mood: round(
                float(probability),
                4
            )
            for mood, probability
            in ml_probabilities.items()
        },

        "related_emotions": related_emotions,

        "detailed_emotions": detailed_emotions,

        "primary_detailed_emotion":
            primary_detailed,

        "situation": situation,

        "intent": intent,

        "normalized_text": text,

        "original_text": original_text,
    }


# ============================================================
# BACKWARD COMPATIBILITY
# ============================================================

def analyze_mood(text: str):
    return detect_mood_with_ai(text)


def detect_mood(text: str):
    return detect_mood_with_ai(text)


def predict_mood(text: str):
    return detect_mood_with_ai(text)