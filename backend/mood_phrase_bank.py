"""
Phrase bank used by build_multilabel_dataset.py.

Covers everyday life domains (work, study, family, relationships,
health, money, travel, social life, safety), idioms and slang, Hindi
script, emojis and question-style sentences.

Do NOT copy sentences from evaluate_mood_model.py into this file,
that would make the evaluation score meaningless.
"""

# (moods, sentences): things that happen, mostly without emotion words
DOMAIN_EVENTS = [
    # ---------------- WORK ----------------
    (["happy"], [
        "I got a raise today", "my manager praised my work in the meeting",
        "I finally received the offer letter", "my presentation went really well",
        "the client loved our proposal", "I got employee of the month",
        "client ne mere kaam ki tareef ki", "salary badh gayi",
        "boss ne sabke saamne meri tareef ki", "mujhe nayi company se offer mil gaya",
    ]),
    (["stressed"], [
        "I have to finish the whole report by tonight",
        "the client changed the requirements a day before launch",
        "my boss wants everything done by Monday", "I am handling three projects at once",
        "the audit is tomorrow and the files are a mess", "my inbox has two hundred unread emails",
        "office mein target poora nahi ho raha", "kal client meeting hai aur slides ready nahi hain",
        "ek saath itne projects sambhalne pad rahe hain", "month end hai aur kaam khatam nahi ho raha",
    ]),
    (["angry"], [
        "my coworker took credit for my idea", "they cut my salary without telling me",
        "my colleague keeps dumping his work on me", "I was blamed for a mistake I didn't make",
        "manager ne bina wajah daanta", "colleague har baar apna kaam mujh pe daal deta hai",
        "mere idea ko apna bata ke present kar diya", "bina bataye meri salary kaat li",
    ]),
    (["anxious"], [
        "layoffs are happening at my company", "I have my performance review tomorrow",
        "I don't know if my contract will be renewed", "HR called me for a meeting without a reason",
        "company mein chhatni ho rahi hai, meri job ka pata nahi", "kal appraisal meeting hai",
        "HR ne achanak meeting mein bulaya hai",
    ]),
    (["tired"], [
        "I have been working twelve hours a day all week", "back to back calls since morning",
        "I came home from the office and collapsed on the bed", "I did overtime for the fifth day in a row",
        "office se aake bas bistar pe gir gaya", "subah se ek ke baad ek meeting",
        "lagatar teen din overtime kiya",
    ]),
    (["sad"], [
        "I was passed over for promotion again", "nobody at work talks to me",
        "my team had a farewell for everyone except me",
        "meri jagah kisi aur ko promotion mil gaya", "office mein koi mujhse baat nahi karta",
    ]),

    # ---------------- STUDY ----------------
    (["happy"], [
        "I topped my class", "I got admission in my dream college", "I cracked JEE",
        "I got a scholarship", "my research paper got accepted", "I passed all my subjects",
        "board exam mein 95 percent aaye", "mera college mein admission ho gaya",
        "scholarship mil gayi", "sab subjects mein pass ho gaya",
    ]),
    (["stressed"], [
        "the syllabus is huge and exams start in a week",
        "I have two assignments and a lab record due tomorrow",
        "practicals and exams are on the same week", "my thesis submission is in three days",
        "padhai bahut baaki hai aur time nahi hai", "practicals aur exams ek saath hain",
        "project report kal submit karni hai aur aadhi bhi nahi hui",
    ]),
    (["anxious"], [
        "my result comes out tomorrow", "I am scared I will not clear the entrance exam",
        "what if I fail the semester", "my viva is tomorrow and I can't remember anything",
        "kal viva hai aur kuch yaad nahi", "neet ka result aane wala hai",
        "agar fail ho gaya toh ghar pe kya bolunga",
    ]),
    (["sad"], [
        "I failed in maths again", "my marks were much lower than expected",
        "I couldn't get into the college I wanted", "all my friends got placed except me",
        "mere number bahut kam aaye", "sabka placement ho gaya mera nahi hua",
    ]),
    (["angry"], [
        "the teacher gave me less marks unfairly", "someone copied my assignment and I got punished",
        "the university postponed the exam for the third time",
        "sir ne poori class ke saamne beizzati ki", "galti kisi aur ki thi aur saza mujhe mili",
    ]),
    (["tired"], [
        "I studied all night for the exam", "back to back lectures from eight to five",
        "raat bhar padhai ki hai", "subah aath se shaam paanch tak lectures the",
    ]),

    # ---------------- FAMILY ----------------
    (["happy"], [
        "my whole family came together for diwali", "my parents surprised me on my birthday",
        "my grandparents are visiting us", "we bought our first house",
        "bhai ki shaadi fix ho gayi", "mummy ne mera favourite khana banaya",
        "aaj poori family saath mein dinner pe gayi", "hamne naya ghar le liya",
    ]),
    (["sad"], [
        "my parents are getting divorced", "I miss my family since I moved to another city",
        "my father doesn't talk to me anymore", "I couldn't go home for the festival",
        "ghar walon se door rehna bahut mushkil hai", "papa mujhse baat nahi karte",
        "is baar diwali pe ghar nahi ja paya",
    ]),
    (["angry"], [
        "my parents compare me with my cousins all the time",
        "my brother keeps reading my messages", "my relatives keep interfering in my life",
        "ghar wale meri baat kabhi nahi sunte", "mummy papa har baat pe rok tok karte hain",
        "rishtedaar har baar shaadi ki baat chhed dete hain",
    ]),
    (["anxious"], [
        "my parents are fighting a lot these days",
        "my sister is not picking up her phone since morning",
        "dad has not come home yet and it is midnight",
        "ghar mein roz jhagde ho rahe hain", "behen subah se phone nahi utha rahi",
    ]),
    (["stressed"], [
        "I have to take care of my sick father and also go to work",
        "ghar ki saari zimmedari mere upar hai", "ghar mein paison ko lekar tension chal rahi hai",
    ]),

    # ---------------- RELATIONSHIPS / FRIENDS ----------------
    (["happy"], [
        "she said yes when I proposed", "we celebrated our first anniversary",
        "I made new friends at college", "my friends planned a surprise for me",
        "mere best friend ne surprise party di", "usne mujhe propose kiya aur maine haan bol diya",
        "bahut dino baad purane dosto se mila",
    ]),
    (["sad"], [
        "my girlfriend broke up with me", "he stopped replying to my messages",
        "I feel like a burden to everyone", "my friends went on a trip without me",
        "dosto ne mujhe trip pe nahi bulaya", "usne mujhe block kar diya",
        "wo ab mujhse baat hi nahi karti",
    ]),
    (["angry"], [
        "my friend made fun of me in front of everyone", "he lied to me again",
        "she keeps cancelling plans at the last minute", "my friend never returned my money",
        "dost ne mere paise wapas nahi kiye", "usne phir se jhooth bola",
        "sabke saamne mera mazaak udaya",
    ]),
    (["anxious"], [
        "my partner is acting distant and I don't know why",
        "I am going to meet her parents tomorrow",
        "pata nahi wo mujhse naraz hai kya", "kal uske ghar walon se milna hai",
    ]),

    # ---------------- HEALTH ----------------
    (["anxious"], [
        "I found a lump and I am waiting for the test results",
        "my chest has been hurting since morning", "I have a surgery next week",
        "the doctor wants to run more tests",
        "doctor ne aur tests karwane bole hain", "seene mein subah se dard ho raha hai",
        "agle hafte operation hai",
    ]),
    (["sad"], [
        "I have been sick for two weeks and can't go out",
        "the doctor said it is a chronic illness",
        "do hafte se bimaar hoon, kahin ja nahi sakta",
    ]),
    (["tired"], [
        "I have fever and body ache", "I have not slept properly in days because of the pain",
        "the medicine makes me drowsy all day",
        "bukhar ki wajah se kamzori lag rahi hai", "dawai khake bas neend aa rahi hai",
        "badan dard aur bukhar hai",
    ]),
    (["happy"], [
        "my reports came back normal", "I finally recovered from covid",
        "I lost ten kilos and feel great",
        "doctor ne kaha sab theek hai", "reports normal aayi hain",
    ]),

    # ---------------- MONEY ----------------
    (["stressed"], [
        "rent is due and I don't have enough money", "the credit card bill is too high this month",
        "I have so many expenses this month", "the EMI is due and salary is late",
        "loan ki EMI bharni hai aur salary nahi aayi", "is mahine kharche bahut zyada hain",
    ]),
    (["anxious"], [
        "I invested all my savings and the market crashed",
        "I don't know how I will pay the fees next month",
        "paise kahan se aayenge samajh nahi aa raha", "agle mahine ki fees kaise bharunga",
    ]),
    (["happy"], [
        "I got my first salary", "I finally paid off my loan", "I got a big bonus",
        "pehli salary aa gayi", "bonus mil gaya", "loan poora chuka diya",
    ]),
    (["sad", "angry"], [
        "I lost a lot of money in an online scam", "someone hacked my account and took my savings",
        "online fraud mein saare paise kat gaye", "mere saath scam ho gaya",
    ]),
    (["angry"], [
        "the bank charged me hidden fees", "the shop refused to refund my money",
        "bank ne bina bataye charges kaat liye", "dukaandaar ne paise wapas karne se mana kar diya",
    ]),

    # ---------------- TRAVEL / COMMUTE ----------------
    (["angry"], [
        "the train got cancelled after I waited three hours", "the cab driver cancelled again",
        "the airline lost my luggage", "the bus driver didn't stop for me",
        "traffic mein do ghante phasa raha", "cab wale ne phir cancel kar diya",
        "airline ne mera saaman kho diya",
    ]),
    (["tired"], [
        "it was a fourteen hour journey", "I changed three trains to get home",
        "pura din safar karke thak gaya", "chaudah ghante ka safar tha",
    ]),
    (["happy"], [
        "we finally reached goa", "I am going on a trip to manali tomorrow",
        "the view from the mountain was beautiful", "I got a window seat on my first flight",
        "kal manali ja rahe hain", "pehli baar flight mein baitha",
    ]),
    (["anxious"], [
        "my flight is delayed and I might miss my connection",
        "I am travelling alone for the first time",
        "flight late hai aur connecting flight chhoot sakti hai", "pehli baar akele safar kar raha hoon",
    ]),

    # ---------------- SOCIAL / EVERYDAY ----------------
    (["sad"], [
        "nobody remembered my birthday", "I sat alone at lunch again",
        "everyone is busy and nobody has time for me",
        "kisi ko mera birthday yaad nahi tha", "sab apne mein busy hain, kisi ke paas time nahi",
    ]),
    (["anxious"], [
        "I have to give a speech in front of the whole school",
        "I have a job interview in an hour",
        "stage pe bolna hai aur haath kaanp rahe hain", "ek ghante mein interview hai",
    ]),
    (["happy"], [
        "my post went viral", "I adopted a puppy today", "we won the cricket match",
        "I learned to ride a bike", "my painting got selected for the exhibition",
        "aaj ek pyaara sa puppy ghar laaye", "hamari team match jeet gayi",
    ]),
    (["angry"], [
        "someone cut the queue in front of me", "people were rude to me at the store",
        "someone scratched my new car and drove off",
        "line mein kisi ne beech mein ghusne ki koshish ki", "bus mein mere saath badtameezi hui",
    ]),

    # ---------------- SAFETY / FEAR ----------------
    (["anxious"], [
        "someone was following me on my way home", "a man threatened me with a knife",
        "there was a robbery in our building last night", "I heard gunshots near my house",
        "there was an earthquake at night", "a stranger tried to break into my car",
        "a terrorist attack happened near our area", "someone shot at me but missed",
        "koi mera peecha kar raha tha", "kisi ne mujhe dhamki di hai",
        "raat ko ghar mein chor ghus gaya", "humare area mein dange ho gaye",
        "raat ko bhookamp aaya", "kisi ne chaku dikha ke lootne ki koshish ki",
    ]),
]

# Idioms and slang, per mood
IDIOMS = {
    "happy": [
        "I am over the moon", "I feel on top of the world", "best day ever",
        "I can't stop grinning", "my heart is full", "life is good", "this made my day",
        "dil garden garden ho gaya", "maza aa gaya", "khushi se pagal ho raha hoon",
        "aaj toh din ban gaya", "yay finally", "lets gooo", "woohoo",
    ],
    "sad": [
        "my heart is broken into pieces", "I feel like crying my eyes out",
        "I feel empty inside", "life has no meaning anymore", "I just want to disappear",
        "dil baith gaya", "aansu ruk nahi rahe", "andar se toot gaya hoon",
        "kuch accha nahi lagta ab", "sigh, nothing goes right",
    ],
    "angry": [
        "my blood is boiling", "I am about to lose my mind", "I have had it up to here",
        "I could punch the wall", "I am so done with these people", "this is driving me crazy",
        "dimag ka dahi ho gaya", "pagal kar diya hai sabne", "sar pe chadh gaye hain sab",
        "ugh so annoying", "kitna irritating hai yaar",
    ],
    "tired": [
        "my feet are killing me", "I am running on empty", "I am dead on my feet",
        "I am completely wiped out", "I could sleep for a whole day", "my body is giving up",
        "body toot rahi hai", "aankhein khuli nahi reh rahi", "battery zero ho gayi hai meri",
        "ufff thak gaya", "neend se bura haal hai",
    ],
    "anxious": [
        "my stomach is in knots", "I have a bad feeling about this",
        "I can't breathe properly when I think about it", "my mind won't stop racing",
        "dil ki dhadkan tez ho gayi hai", "haath pair thande pad gaye",
        "ajeeb si bechaini ho rahi hai", "mann mein ajeeb sa darr hai",
    ],
    "stressed": [
        "I am drowning in work", "I am pulling my hair out", "I am juggling too many things",
        "I am at my breaking point", "there is too much on my plate",
        "sar phat raha hai kaam se", "dimag pe bahut bojh hai", "saans lene ki fursat nahi",
        "kaam ka pahaad khada hai",
    ],
}

# Sentences in Hindi script
DEVANAGARI = {
    "happy": [
        "आज मैं बहुत खुश हूँ", "मेरा रिजल्ट अच्छा आया", "मज़ा आ गया",
        "मुझे नौकरी मिल गई", "आज का दिन बहुत अच्छा था",
    ],
    "sad": [
        "मुझे बहुत बुरा लग रहा है", "मेरा दिल टूट गया", "मैं बहुत उदास हूँ",
        "मुझे रोना आ रहा है", "कोई मेरी परवाह नहीं करता",
    ],
    "angry": [
        "मुझे बहुत गुस्सा आ रहा है", "उसने मेरे साथ गलत किया", "मैं उससे बहुत नाराज़ हूँ",
        "सब मुझे परेशान कर रहे हैं",
    ],
    "tired": [
        "मैं बहुत थक गया हूँ", "मुझे बहुत नींद आ रही है", "शरीर में ताकत नहीं बची",
        "रात भर सो नहीं पाया",
    ],
    "anxious": [
        "मुझे बहुत डर लग रहा है", "पता नहीं क्या होगा", "घबराहट हो रही है",
        "दिल ज़ोर से धड़क रहा है",
    ],
    "stressed": [
        "बहुत काम का दबाव है", "काम की बहुत टेंशन है", "परीक्षा का बहुत स्ट्रेस है",
        "सब कुछ एक साथ आ गया है",
    ],
    "neutral": [
        "आज कुछ खास नहीं हुआ", "मैं घर पर हूँ", "अभी खाना खा रहा हूँ",
        "कल रविवार है", "मैं बाज़ार जा रहा हूँ",
    ],
}

# Mood-carrying emojis, appended to some sentences
EMOJIS = {
    "happy": ["😊", "😁", "🥳", "😍", "🎉"],
    "sad": ["😢", "😭", "💔", "😞"],
    "angry": ["😡", "🤬", "😠"],
    "tired": ["😴", "🥱", "😪"],
    "anxious": ["😰", "😨", "😟"],
    "stressed": ["😩", "😫", "🤯"],
}

# Question-style sentences
QUESTIONS = {
    "sad": [
        "why does nobody care about me", "why do I always end up alone",
        "kya main kabhi khush reh paunga", "mere saath hi aisa kyun hota hai",
    ],
    "anxious": [
        "what if something goes wrong tomorrow", "what if they reject me",
        "agar result kharab aaya toh kya hoga", "kya hoga agar job chali gayi",
    ],
    "angry": [
        "why can't people mind their own business", "how can someone be this rude",
        "log itne badtameez kaise ho sakte hain", "har baar main hi kyun sunu",
    ],
    "stressed": [
        "how am I supposed to finish all this", "when will this workload end",
        "itna sab ek saath kaise karunga", "ye kaam kab khatam hoga",
    ],
    "tired": [
        "when can I finally sleep", "why am I so drained all the time",
        "kab sone ko milega", "itni thakan kyun ho rahi hai",
    ],
    "happy": [
        "can this day get any better", "how lucky am I",
        "isse accha din ho sakta hai kya",
    ],
}

# Everyday statements with no mood
EXTRA_NEUTRAL = [
    "it is raining outside", "I am charging my phone", "the meeting is at 3 pm",
    "I need to buy milk", "I am learning python these days", "my phone battery is at fifty percent",
    "I am watching the news", "I will call my friend later", "the shop opens at ten",
    "I have to renew my passport", "we are ordering pizza tonight", "I am cleaning my room",
    "the train leaves at six", "I am writing an email", "I just finished lunch",
    "aaj mausam saaf hai", "bus das baje aayegi", "kal sunday hai", "maine aaj daal chawal khaye",
    "main kapde dho raha hoon", "shaam ko gym jaunga", "abhi email likh raha hoon",
    "kal bank jaana hai", "main bazaar se sabzi laaya", "abhi news dekh raha hoon",
]
