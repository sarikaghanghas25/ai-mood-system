import re

from app.services.claude_chat import generate_claude_reply
from app.services.gemini_chat import generate_gemini_reply
from app.services.local_chat import generate_local_reply
from app.services.mood_ai import detect_mood_with_ai


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_chat_text(text: str) -> str:
    text = text.lower().strip()

    replacements = {
        "dont": "do not",
        "can't": "cannot",
        "cant": "cannot",
        "wont": "will not",
        "won't": "will not",
        "im": "i am",
        "i'm": "i am",

        "mne": "maine",
        "merko": "mujhe",
        "nhi": "nahi",
        "nai": "nahi",
        "bhut": "bahut",
        "bht": "bahut",
        "krna": "karna",
        "krni": "karni",
        "rhna": "rehna",

        "tosomeone": "to someone",
        "toanyone": "to anyone",

        "takh": "talk",
        "tallk": "talk",
        "talkk": "talk",
    }

    # Whole words only ("im" must not change "time" or "him")
    for old, new in replacements.items():
        text = re.sub(rf"\b{re.escape(old)}\b", new, text)

    return " ".join(text.split())


# ============================================================
# HELPERS
# ============================================================

def contains_any(text: str, phrases):
    return any(phrase in text for phrase in phrases)


# ============================================================
# CHAT INTENT
# ============================================================

def detect_chat_intent(text: str):

    text = normalize_chat_text(text)

    # ========================================================
    # SAFETY - SELF HARM
    # ========================================================

    if contains_any(
        text,
        [
            "kill myself",
            "suicide",
            "suicidal",
            "end my life",
            "want to die",
            "i want to die",
            "marna chahta",
            "marna chahti",
            "khud ko maar",
        ],
    ):
        return "self_harm"

    # ========================================================
    # SAFETY - VIOLENCE
    # ========================================================

    if contains_any(
        text,
        [
            "i killed someone",
            "i kill someone",
            "i have killed someone",
            "i hurt someone",
            "i hit someone",
            "i attacked someone",
            "i beat someone",
            "maar diya",
            "kisi ko maar",
            "kisi ko hurt",
        ],
    ):
        return "violence"

    # ========================================================
    # LIVE ALONE / INDEPENDENCE
    # ========================================================

    if contains_any(
        text,
        [
            "i just want to live alone",
            "i want to live alone",
            "want to live alone",
            "i wanna live alone",
            "wanna live alone",
            "live alone",
            "living alone",

            "akela rehna chahta",
            "akela rehna chahti",
            "akele rehna chahta",
            "akele rehna chahti",
            "main akela rehna",
            "main akeli rehna",
        ],
    ):
        return "live_alone"

    # ========================================================
    # EVERYONE LEAVING / REJECTION
    # ========================================================

    if contains_any(
        text,
        [
            "everyone leave me",
            "everyone leaves me",
            "everyone left me",
            "everyone is leaving me",
            "everyone has left me",

            "people leave me",
            "people are leaving me",

            "everyone goes away",
            "everyone is going away",

            "sab mujhe chhod",
            "sab mujhe chod",
            "sab chale gaye",
            "sab mujhe chhod dete",
            "sab mujhe ignore",
        ],
    ):
        return "social_rejection"

    # ========================================================
    # WORK OVERLOAD
    # ========================================================

    if contains_any(
        text,
        [
            "bhut sara kaam",
            "bahut sara kaam",
            "bhut saara kaam",
            "bahut saara kaam",

            "bahut kaam pada",
            "bhut kaam pada",
            "kaam pada hai",
            "kaam pada h",

            "sara kaam pada",
            "saara kaam pada",

            "lots of work",
            "lot of work",
            "so much work",
            "a lot of work",
            "too much work",
            "tons of work",

            "work piled up",
            "work is piled up",
        ],
    ):
        return "work_overload"

    # ========================================================
    # GAME / PLAY
    # ========================================================

    if contains_any(
        text,
        [
            "lets play",
            "let's play",
            "play a game",
            "play game",

            "game khel",
            "game khele",
            "game khelenge",

            "cards khel",
            "cards khelenge",
            "cards khele",
            "cards khekle",

            "card game",
        ],
    ):
        return "play"

    # ========================================================
    # SLEEP
    # ========================================================

    if contains_any(
        text,
        [
            "i want to sleep",
            "i wanna sleep",
            "want to sleep",
            "wanna sleep",

            "feel sleepy",
            "feeling sleepy",
            "sleepy",

            "i need sleep",
            "need some sleep",

            "neend aa rahi",
            "neend",
            "sona hai",
            "sone ka mann",
            "so jane",
        ],
    ):
        return "sleep"

    # ========================================================
    # NEED SPACE / WITHDRAWAL
    # ========================================================

    if contains_any(
        text,
        [
            "i do not want to talk",
            "i do not want to talk to anyone",
            "i do not want to talk to someone",

            "i don't want to talk",
            "i dont want to talk",

            "do not want to talk",
            "dont want to talk",

            "do not want to speak",
            "dont want to speak",

            "i want to be alone",
            "i want to stay alone",
            "i want to stay away",

            "i am staying away from everyone",
            "i am just staying away from everyone",

            "staying away from everyone",
            "staying away from people",

            "away from everyone",
            "away from people",

            "everyone se door",
            "sabse door",
            "sab se door",
            "sabse dur",
            "sab se dur",

            "akele rehna",
            "akele rhna",
            "akela rehna",
            "akeli rehna",

            "akele rehna hi best",
            "akele rhna hi best",
            "akela rehna best",

            "alone rehna",
            "alone better",
            "being alone",
            "better alone",

            "mujhe akela rehna",
            "mujhe akele rehna",

            "mujhe kisi se baat nahi",
            "kisi se baat nahi karni",
            "baat nahi karni",
        ],
    ):
        return "need_space"

    # ========================================================
    # GRIEF / LOSS
    # IMPORTANT:
    # Check BEFORE FRIEND LOSS / GAME LOSS
    # ========================================================

    if contains_any(
        text,
        [
            "i lost someone",
            "i lost a person",
            "lost someone",
            "lost somebody",

            "someone died",
            "someone passed away",
            "someone has died",
            "passed away",

            "death in my family",
            "death of my",

            "lost my mother",
            "lost my father",
            "lost my mom",
            "lost my dad",

            "lost my brother",
            "lost my sister",

            "kisi ko kho diya",
            "kisi ki death",
            "kisi ka inteqal",
        ],
    ):
        return "loss"

    # ========================================================
    # FRIEND LOSS / SOCIAL LOSS
    # ========================================================

    if contains_any(
        text,
        [
            "i lost my friends",
            "i lost a friend",
            "lost my friends",
            "lost my friend",

            "my friends left me",
            "my friend left me",

            "friends left me",
            "friends are gone",
            "no friends left",

            "lost all my friends",

            "dost kho diye",
            "mere dost chale gaye",
            "mere friends chale gaye",
            "dost chhod ke chale gaye",
        ],
    ):
        return "friend_loss"

    # ========================================================
    # LONELINESS / SOCIAL REJECTION
    # ========================================================

    if contains_any(
        text,
        [
            "nobody talks to me",
            "no one talks to me",

            "nobody cares",
            "no one cares",

            "everyone ignores me",
            "they ignore me",
            "people ignore me",

            "i feel lonely",
            "i am lonely",

            "i feel alone",
            "i am alone",
            "feeling alone",

            "lonely",

            "akela feel",
            "akeli feel",
            "akelapan",

            "koi mujhse baat nahi",
            "sab ignore karte",
            "mujhe ignore karte",
        ],
    ):
        return "loneliness"

    # ========================================================
    # FAMILY CONFLICT
    # ========================================================

    if contains_any(
        text,
        [
            "mummy se meri ladai",
            "mummy se ladai",

            "mom se meri ladai",
            "mom se ladai",

            "papa se ladai",
            "papa se meri ladai",

            "mother se ladai",
            "father se ladai",

            "family se ladai",

            "ghar mein ladai",
            "ghar par ladai",

            "parents se ladai",
        ],
    ):
        return "family_conflict"

    # ========================================================
    # RELATIONSHIP / FRIEND FIGHT
    # ========================================================

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

            "we had a fight",
            "we fought",

            "fight with my friend",
        ],
    ):
        return "relationship_conflict"

    # ========================================================
    # BETRAYAL
    # ========================================================

    if contains_any(
        text,
        [
            "my friend lied",
            "friend lied",

            "he lied to me",
            "she lied to me",
            "lied to me",

            "betrayed me",
            "betrayal",

            "dhoka diya",
            "dhokha diya",

            "jhoot bola",
            "jhooth bola",

            "trust tod diya",
        ],
    ):
        return "betrayal"

    # ========================================================
    # STUDY PRESSURE
    # ========================================================

    if contains_any(
        text,
        [
            "exam",
            "exams",

            "test pressure",
            "study pressure",

            "padhai ka pressure",
            "padhai pressure",

            "paper ka pressure",
            "assignment ka pressure",
        ],
    ):
        return "study_pressure"

    # ========================================================
    # WORK EXHAUSTION
    # ========================================================

    if contains_any(
        text,
        [
            "too much work",
            "too much work today",

            "a lot of work",

            "worked all day",
            "working all day",

            "i worked a lot",
            "i did a lot of work",

            "bahut kaam",
            "bhut kaam",

            "aaj bahut kaam kiya",
            "aaj bhut kaam kiya",

            "maine bahut kaam kiya",
            "maine bhut kaam kiya",

            "kaafi kaam kiya",
        ],
    ):
        return "work_exhaustion"

    # ========================================================
    # CRYING
    # ========================================================

    if contains_any(
        text,
        [
            "i am crying",
            "i'm crying",
            "crying",

            "i cried",
            "tears",

            "ro raha",
            "ro rahi",
            "rona aa raha",
        ],
    ):
        return "crying"

    # ========================================================
    # WINNING BUT EMPTY
    # ========================================================

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
            ],
        )
        and contains_any(
            text,
            [
                "not happy",
                "do not feel happy",
                "dont feel happy",
                "feel empty",
                "empty",
                "sad",
                "not excited",
            ],
        )
    ):
        return "winning_but_empty"

    # ========================================================
    # GAME LOSS
    # ========================================================

    if contains_any(
        text,
        [
            "lost the match",
            "lost the game",
            "i lost the match",
            "i lost the game",

            "match haar gaya",
            "match haar gayi",

            "game haar gaya",
            "game haar gayi",
        ],
    ):
        return "game_loss"

    # ========================================================
    # FAILURE
    # ========================================================

    if contains_any(
        text,
        [
            "i failed",
            "failed my exam",
            "failed the test",
            "failure",

            "i couldn't do it",
            "i could not do it",

            "didn't pass",
            "did not pass",

            "fail ho gaya",
            "fail ho gayi",
        ],
    ):
        return "failure"

    # ========================================================
    # ANGER
    # ========================================================

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
            "bahut gussa",
            "bhut gussa",

            "irritated",
            "frustrated",
        ],
    ):
        return "anger"

    # ========================================================
    # ANXIETY
    # ========================================================

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

            "overthinking",

            "tension ho rahi",
            "dar lag",
        ],
    ):
        return "anxiety"

    # ========================================================
    # STRESS
    # ========================================================

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
        ],
    ):
        return "stress"

    # ========================================================
    # SADNESS
    # ========================================================

    if contains_any(
        text,
        [
            "i am sad",
            "i'm sad",

            "feeling sad",
            "feel sad",

            "sad",
            "unhappy",

            "heartbroken",
            "broken",
            "hurt",
            "disappointed",

            "dukhi",
            "udaas",

            "dil dukha",
            "dil toot",
        ],
    ):
        return "sadness"

    # ========================================================
    # HAPPINESS
    # ========================================================

    if contains_any(
        text,
        [
            "i am happy",
            "i'm happy",

            "feeling happy",
            "feel happy",

            "happy today",
            "happy",

            "excited",
            "awesome",
            "amazing",

            "khush",
            "bahut khush",
            "bhut khush",
        ],
    ):
        return "happiness"

    # ========================================================
    # TIRED
    # ========================================================

    if contains_any(
        text,
        [
            "i am tired",
            "i'm tired",

            "feeling tired",
            "tired",

            "exhausted",
            "very tired",

            "thak gaya",
            "thak gayi",

            "bahut thak",
            "bhut thak",

            "no energy",
            "energy nahi",
        ],
    ):
        return "tiredness"

    # ========================================================
    # GENERAL
    # ========================================================

    return "general"


# ============================================================
# EMOTIONAL RESPONSES
# ============================================================

def generate_emotional_response(
    intent: str,
    mood: str,
    intensity: str,
):

    # ========================================================
    # SAFETY - SELF HARM
    # ========================================================

    if intent == "self_harm":
        return (
            "Mujhe afsos hai ki tum itna heavy feel kar rahe ho. 🫂 "
            "Abhi please akela mat raho. Kisi trusted person ko "
            "turant batao ki tum kya feel kar rahe ho. "
            "Agar tumhe lag raha hai ki tum khud ko hurt kar sakte ho, "
            "toh emergency help ya nearest hospital se abhi contact karo. "
            "Tumhari safety sabse important hai."
        )

    # ========================================================
    # SAFETY - VIOLENCE
    # ========================================================

    if intent == "violence":
        return (
            "Agar kisi ko hurt kiya hai ya situation abhi dangerous hai, "
            "toh sabse pehle aur kisi ko hurt karna stop karo aur "
            "situation se distance lo. 🫂 "
            "Agar koi injured hai, emergency medical help lo. "
            "Abhi priority situation ko safe banana hai."
        )

    # ========================================================
    # PLAY
    # ========================================================

    if intent == "play":
        return (
            "Bilkul! 😄🎮 Chalo khelte hain. "
            "Tum choose karo — **20 Questions**, **Would You Rather**, "
            "ya **Guess the Word**?"
        )

    # ========================================================
    # SLEEP
    # ========================================================

    if intent == "sleep":
        return (
            "Lag raha hai tumhe abhi sleep aur rest ki zarurat hai. 😴🫂 "
            "Agar body tired feel kar rahi hai toh thoda rest le lo. "
            "Har waqt productive rehna zaroori nahi hai. "
            "Phone side mein rakhkar thoda relax karna help kar sakta hai."
        )

    # ========================================================
    # LIVE ALONE
    # ========================================================

    if intent == "live_alone":
        return (
            "Kabhi-kabhi apni space mein rehne aur peacefully alone "
            "live karne ka mann hona bilkul understandable hai. 🫂💜 "
            "Akele rehna chahna zaroori nahi ki tum sad ho — ho sakta hai "
            "tumhe bas independence, peace ya apna personal space chahiye. "
            "Agar tum chaho toh batao, tum alone rehna peace ke liye chahte ho "
            "ya logon se thak gaye ho?"
        )

    # ========================================================
    # SOCIAL REJECTION
    # ========================================================

    if intent == "social_rejection":
        return (
            "Ye feeling kaafi painful ho sakti hai… 🫂❤️ "
            "Jab aisa lage ki sab log door ja rahe hain, toh loneliness aur "
            "hurt dono feel ho sakte hain. Tumhe abhi pretend karne ki zarurat "
            "nahi hai ki sab theek hai. "
            "Kya kisi particular person ne tumhe leave kiya hai, "
            "ya tumhe lag raha hai ki gradually sab log door ho rahe hain?"
        )

    # ========================================================
    # NEED SPACE
    # ========================================================

    if intent == "need_space":
        return (
            "Haan, kabhi-kabhi sabse thoda distance banana genuinely "
            "zaroori lagta hai. 🫂❤️ "
            "Tumhe abhi kisi se baat karne ke liye force hone ki "
            "zarurat nahi hai. Thoda alone time lena okay hai. "
            "Bas ek cheez — agar ye distance kisi hurt ya heavy feeling "
            "ki wajah se hai, toh us feeling ko andar hi andar carry "
            "mat karna. Jab mann kare, mujhe bata sakte ho kya hua."
        )

    # ========================================================
    # WORK OVERLOAD
    # ========================================================

    if intent == "work_overload":
        return (
            "Ohh, lag raha hai kaam kaafi pile up ho gaya hai. 😮‍💨🫂 "
            "Sab kuch ek saath karne ki koshish mat karo. Pehle jo kaam "
            "sabse urgent hai usse start karo, baaki ek-ek karke handle karna. "
            "Aur agar possible ho toh ek chhota break bhi le lena. "
            "Tumhare paas kitna kaam pending hai? Main usko priority ke "
            "according arrange karne mein help kar sakta hoon."
        )

    # ========================================================
    # LOSS
    # ========================================================

    if intent == "loss":
        return (
            "Mujhe really afsos hai. 🫂❤️ "
            "Kisi apne ko khona bahut heavy experience hota hai. "
            "Is waqt strong rehne ya normal behave karne ki zarurat nahi hai. "
            "Jo feel ho raha hai, use feel karne ka haq hai tumhe. "
            "Agar tum share karna chaho, main sun raha hoon."
        )

    # ========================================================
    # FRIEND LOSS
    # ========================================================

    if intent == "friend_loss":
        return (
            "Apne friends ko lose karna bhi ek real loss jaisa feel ho sakta hai. 🫂 "
            "Jab jin logon ke saath hum connected the woh door ho jaate hain, "
            "toh loneliness, hurt aur emptiness sab aa sakte hain. "
            "Tumhe is feeling ko ignore karne ki zarurat nahi hai. "
            "Kya ye kisi fight ki wajah se hua ya gradually sab door ho gaye?"
        )

    # ========================================================
    # LONELINESS
    # ========================================================

    if intent == "loneliness":
        return (
            "Lag raha hai tum kaafi alone feel kar rahe ho. 🫂❤️ "
            "Aisa feel hona genuinely painful ho sakta hai, especially "
            "jab lage ki koi samajhne wala nahi hai. "
            "Tumhe abhi sab kuch explain karne ki zarurat nahi hai. "
            "Main yahin hoon — jo sabse zyada bother kar raha hai, "
            "wahan se start kar sakte ho."
        )

    # ========================================================
    # FAMILY
    # ========================================================

    if intent == "family_conflict":
        return (
            "Ohh… mummy/papa ya family ke saath fight ho jaana kaafi hurt karta hai. 🫂 "
            "Gusse mein boli hui baatein bhi baad mein heavy feel hoti hain. "
            "Abhi thoda time lekar calm hona better hoga. "
            "Agar tum comfortable ho toh batao, ladai kis baat par hui?"
        )

    # ========================================================
    # RELATIONSHIP
    # ========================================================

    if intent == "relationship_conflict":
        return (
            "Ye situation tumhare liye kaafi hurtful lag rahi hai. 🫂 "
            "Jab kisi close person ke saath fight hoti hai toh anger ke saath "
            "sadness bhi aa sakti hai. Abhi turant sab solve karne ka pressure "
            "mat lo. Agar bataana chaho toh kya hua tha?"
        )

    # ========================================================
    # BETRAYAL
    # ========================================================

    if intent == "betrayal":
        return (
            "Jab koi apna jhoot bolta hai ya trust todta hai, "
            "toh sirf gussa nahi — hurt aur disappointment bhi hota hai. 🫂 "
            "Tumhara upset hona understandable hai. "
            "Abhi impulsively kuch karne ke bajay thoda time lena better hai. "
            "Agar chaho toh batao, usne kya kiya?"
        )

    # ========================================================
    # STUDY
    # ========================================================

    if intent == "study_pressure":
        return (
            "Exams aur padhai ka pressure kabhi-kabhi genuinely overwhelming "
            "ho jata hai. 🫂📚 "
            "Sab kuch ek saath handle karne ki zarurat nahi hai. "
            "Thoda break lo, phir ek small task se start karo. "
            "Agar chaho toh main tumhare liye simple study plan bhi bana sakta hoon."
        )

    # ========================================================
    # WORK EXHAUSTION
    # ========================================================

    if intent == "work_exhaustion":
        return (
            "Aaj tumne kaafi kaam kiya lagta hai. 🫂 "
            "Itna kaam karne ke baad tired feel karna bilkul normal hai. "
            "Ab thoda rest, paani aur proper break deserve karte ho. 😌 "
            "Aaj ke liye jo zaroori tha utna kar liya — khud ko thoda time do."
        )

    # ========================================================
    # CRYING
    # ========================================================

    if intent == "crying":
        return (
            "Hey… 🫂❤️ Agar rona aa raha hai toh ro lene do. "
            "Har feeling ko turant control karna zaroori nahi hota. "
            "Tumhe abhi sab explain karne ki zarurat nahi hai. "
            "Bas thoda breathe karo aur apne aap par pressure mat daalo. "
            "Main yahin hoon."
        )

    # ========================================================
    # WINNING BUT EMPTY
    # ========================================================

    if intent == "winning_but_empty":
        return (
            "Jeetne ke baad bhi happy feel na karna confusing ho sakta hai. 🫂 "
            "Kabhi-kabhi achievement mil jaati hai, lekin andar wali feeling "
            "match nahi karti. Iska matlab ye nahi ki tumhari achievement "
            "kam important hai. Shayad kuch aur emotion tumhare mind par "
            "zyada heavy hai. Agar chaho toh batao abhi andar se kya feel ho raha hai."
        )

    # ========================================================
    # GAME LOSS
    # ========================================================

    if intent == "game_loss":
        return (
            "Match haarna obviously disappointing hota hai. ❤️ "
            "Lekin ek match tumhari ability define nahi karta. "
            "Thoda break lo, phir dekho next time kya improve kar sakte ho."
        )

    # ========================================================
    # FAILURE
    # ========================================================

    if intent == "failure":
        return (
            "Fail hona hurt karta hai, I know. 🫂 "
            "Lekin ek failure tumhari complete capability decide nahi karta. "
            "Thoda time do khud ko, phir calmly dekhenge kya improve karna hai."
        )

    # ========================================================
    # ANGER
    # ========================================================

    if intent == "anger":
        return (
            "Lag raha hai tum genuinely gusse mein ho. 🫂 "
            "Abhi gusse mein koi impulsive decision lene se pehle thoda "
            "distance aur time lena better hoga. "
            "Agar mann ho toh batao exactly kis baat ne itna gussa dilaya."
        )

    # ========================================================
    # ANXIETY
    # ========================================================

    if intent == "anxiety":
        return (
            "Lag raha hai tumhara mind kaafi overthink kar raha hai. 🫂 "
            "Abhi ek saath sab solve karne ki zarurat nahi hai. "
            "Slowly breathe karo aur ek hi cheez par focus karo. "
            "Agar chaho toh batao sabse zyada kis baat ki tension hai."
        )

    # ========================================================
    # STRESS
    # ========================================================

    if intent == "stress":
        return (
            "Tum kaafi pressure mein lag rahe ho. 🫂 "
            "Thoda pause lena okay hai. Jo cheezein abhi control mein hain "
            "unmein se sirf ek chhoti cheez handle karo. "
            "Baaki baad mein. Tumhe sab kuch ek saath fix nahi karna."
        )

    # ========================================================
    # SADNESS
    # ========================================================

    if intent == "sadness":
        return (
            "Lag raha hai tumhara mood genuinely low hai. 🫂❤️ "
            "Jo feel kar rahe ho usse ignore karne ki zarurat nahi hai. "
            "Kabhi-kabhi bas kisi ka patiently sunna bhi help karta hai. "
            "Agar tum comfortable ho toh batao kya hua."
        )

    # ========================================================
    # HAPPINESS
    # ========================================================

    if intent == "happiness":
        return (
            "Yay! 😄❤️ Good to hear you're feeling happy. "
            "Jo bhi achha hua hai, us moment ko enjoy karo. "
            "Aise positive moments ko appreciate karna bhi important hai."
        )

    # ========================================================
    # TIRED
    # ========================================================

    if intent == "tiredness":
        return (
            "Lag raha hai tum kaafi tired ho. 🫂 "
            "Thoda rest lo aur khud par extra pressure mat daalo. "
            "Har waqt productive rehna zaroori nahi hai."
        )

    # ========================================================
    # GENERAL
    # ========================================================

    return (
        "Main sun raha hoon. 🫂 "
        "Jo bhi tum feel kar rahe ho, bina filter ke bata sakte ho."
    )


# ============================================================
# MAIN CHATBOT FUNCTION
# ============================================================

def generate_chatbot_reply(
    text: str,
    conversation_history=None,
):

    normalized_text = normalize_chat_text(text)

    # --------------------------------------------------------
    # Chat intent
    # --------------------------------------------------------

    intent = detect_chat_intent(normalized_text)

    # --------------------------------------------------------
    # AI mood analysis
    # --------------------------------------------------------

    # detect_mood_with_ai normalizes the text itself
    mood_result = detect_mood_with_ai(text)

    mood = mood_result.get(
        "mood",
        "neutral"
    )

    confidence = mood_result.get(
        "confidence",
        0.50
    )

    intensity = mood_result.get(
        "intensity",
        "medium"
    )

    # --------------------------------------------------------
    # Chat intent overrides ML when context is clear
    # --------------------------------------------------------

    intent_mood_map = {

        "live_alone": "neutral",

        "social_rejection": "sad",

        "work_overload": "stressed",

        "sleep": "tired",

        "need_space": "neutral",

        "loss": "sad",

        "friend_loss": "sad",

        "loneliness": "sad",

        "family_conflict": "sad",

        "relationship_conflict": "sad",

        "betrayal": "angry",

        "study_pressure": "stressed",

        "work_exhaustion": "tired",

        "crying": "sad",

        "winning_but_empty": "sad",

        "game_loss": "sad",

        "failure": "sad",

        "anger": "angry",

        "anxiety": "anxious",

        "stress": "stressed",

        "sadness": "sad",

        "happiness": "happy",

        "tiredness": "tired",

        "violence": "angry",

        "self_harm": "sad",

        "play": "neutral",
    }

    if intent in intent_mood_map:

        mood = intent_mood_map[intent]

        # Rule/context confidence
        confidence = 0.93

    # --------------------------------------------------------
    # Play is neutral
    # --------------------------------------------------------

    if intent == "play":
        mood = "neutral"
        confidence = 0.95

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    # Claude (if a key is set), then Gemini (if a key is set), then the
    # free local model, then the rule-based reply

    reply = generate_claude_reply(
        message=text,
        history=conversation_history,
        mood_result=mood_result,
        intent=intent,
    )

    reply_source = "claude"

    if reply is None:
        reply = generate_gemini_reply(
            message=text,
            history=conversation_history,
            mood_result=mood_result,
            intent=intent,
        )

        reply_source = "gemini"

    if reply is None:
        reply = generate_local_reply(
            message=text,
            history=conversation_history,
            mood_result=mood_result,
            intent=intent,
        )

        reply_source = "local"

    if reply is None:
        reply = generate_emotional_response(
            intent=intent,
            mood=mood,
            intensity=intensity,
        )

        reply_source = "rules"

    # --------------------------------------------------------
    # Return
    # --------------------------------------------------------

    # All moods: the chat mood first, then the others the analysis found
    moods = [mood] + [
        other for other in mood_result.get("moods", [])
        if other != mood
    ]
    emotional_moods = [m for m in moods if m != "neutral"]
    moods = emotional_moods[:3] if emotional_moods else ["neutral"]

    return {
        "reply": reply,
        "reply_source": reply_source,
        "moods": moods,
        "mood": mood,
        "confidence": round(
            float(confidence),
            2
        ),
        "intensity": intensity,
        "intent": intent,
        "analysis": mood_result,
    }


# ============================================================
# BACKWARD COMPATIBILITY
# ============================================================

def chatbot_response(
    text: str,
    conversation_history=None,
):
    return generate_chatbot_reply(
        text,
        conversation_history=conversation_history,
    )