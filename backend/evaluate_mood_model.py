"""
Measures how well the full mood pipeline handles sentences it has
never seen. None of these sentences (or close copies) may be added to
the dataset, otherwise the score stops meaning anything.

Run:
    python evaluate_mood_model.py
"""

from app.services.mood_ai import detect_mood_with_ai


HELD_OUT = [
    # English, single mood
    ("I aced my driving test today", {"happy"}),
    ("My little brother got into IIT and the whole family is celebrating", {"happy"}),
    ("I've been crying in the bathroom at work", {"sad"}),
    ("Nobody showed up to my birthday dinner", {"sad"}),
    ("My roommate ate my food again without asking", {"angry"}),
    ("The delivery guy threw my parcel and broke it", {"angry"}),
    ("I pulled an all-nighter and can barely function", {"tired"}),
    ("Three hours of sleep in two days", {"tired"}),
    ("My heart won't stop racing before tomorrow's interview", {"anxious"}),
    ("Someone kept knocking on my door at 2am", {"anxious"}),
    ("Four deadlines this week and my manager added another", {"stressed"}),
    ("I'm juggling college, a part-time job and family stuff", {"stressed"}),
    ("I am making tea and then I will read the newspaper", {"neutral"}),
    ("The bus usually comes at nine", {"neutral"}),
    ("I need to update my phone software", {"neutral"}),

    # Hinglish
    ("Aaj interview clear ho gaya, bahut khushi hai", {"happy"}),
    ("Usne mera phone utha ke tod diya, bahut gussa aaya", {"angry"}),
    ("Raat ko neend nahi aayi, din bhar aankhein jal rahi hain", {"tired"}),
    ("Kal result hai, pet mein ajeeb sa ho raha hai", {"anxious"}),
    ("Ghar ka kiraya, college fees, sab ek saath dena hai", {"stressed"}),
    ("Nani ki bahut yaad aa rahi hai, wo ab nahi rahi", {"sad"}),
    ("Abhi bas metro mein baitha hoon, ghar ja raha hoon", {"neutral"}),
    ("Mummy ne aaj rajma banaya, mast laga", {"happy"}),

    # Hindi script
    ("आज मेरा प्रमोशन हो गया", {"happy"}),
    ("मुझे बहुत अकेलापन महसूस हो रहा है", {"sad"}),
    ("कल परीक्षा है और बहुत घबराहट हो रही है", {"anxious"}),
    ("पूरे दिन काम करके थक गई हूँ", {"tired"}),

    # Emojis
    ("got the internship 🥳🥳", {"happy"}),
    ("why does this always happen to me 😭", {"sad"}),
    ("this traffic 😡😡", {"angry"}),
    ("need sleep 😴", {"tired"}),

    # Idioms
    ("I'm walking on air", {"happy"}),
    ("I'm at the end of my rope with this project", {"stressed"}),
    ("My legs feel like jelly after the hike", {"tired"}),
    ("My palms are sweaty thinking about the exam", {"anxious"}),

    # Mixed moods
    ("Got promoted but I have to move away from my family", {"happy", "sad"}),
    ("I'm exhausted and my boss still yelled at me", {"tired", "angry"}),
    ("Exam kal hai, kuch padha nahi aur darr bhi lag raha hai", {"stressed", "anxious"}),
    ("I'm thrilled about the wedding but planning it is overwhelming", {"happy", "stressed"}),
    ("My dog is sick and I couldn't sleep all night", {"anxious", "tired"}),
    ("Dost ne dhokha diya aur ab main akela hoon", {"angry", "sad"}),
    ("Happy for my friend but jealous I didn't get selected", {"happy", "sad"}),
    ("Car broke down on the highway at night and my phone is dead", {"anxious", "stressed"}),

    # Negation
    ("I'm not worried anymore, the results came out fine", {"happy"}),
    ("main naraz nahi hoon, bas thoda thaka hua hoon", {"tired"}),

    # Questions
    ("Why does everyone leave me?", {"sad"}),
    ("What if I never find a job?", {"anxious"}),

    # Life events without emotion words
    ("There was a fire in the building next door", {"anxious"}),
    ("My grandfather is in the ICU", {"anxious", "sad"}),
    ("I lost my job today", {"sad", "anxious"}),
    ("The bank froze my account for no reason", {"angry"}),
    ("My best friend is moving abroad forever", {"sad"}),
    ("We won the inter-college debate", {"happy"}),
    ("Stuck in traffic for two hours and I'm already late", {"angry", "stressed"}),
    ("I worked out for two hours and now I can't move", {"tired"}),
]


def main():
    exact = 0
    primary_hit = 0
    true_positive = predicted_total = expected_total = 0

    for text, expected in HELD_OUT:
        result = detect_mood_with_ai(text)
        predicted = set(result["moods"])

        exact += predicted == expected
        primary_hit += result["mood"] in expected
        true_positive += len(predicted & expected)
        predicted_total += len(predicted)
        expected_total += len(expected)

        if predicted != expected:
            print(f"MISS  {text}")
            print(f"      expected {sorted(expected)}, got {result['moods']}")

    total = len(HELD_OUT)
    print(f"\nSentences:            {total}")
    print(f"All moods correct:    {exact}/{total} ({exact / total * 100:.0f}%)")
    print(f"Main mood correct:    {primary_hit}/{total} ({primary_hit / total * 100:.0f}%)")
    print(f"Precision (no extra): {true_positive / predicted_total * 100:.0f}%")
    print(f"Recall (none missed): {true_positive / expected_total * 100:.0f}%")


if __name__ == "__main__":
    main()
