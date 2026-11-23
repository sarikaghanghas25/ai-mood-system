"""
Phrase bank used by build_multilabel_dataset.py.

Covers everyday life domains (work, study, family, relationships,
health, money, travel, social life, safety), idioms and slang, Hindi
script, emojis and question-style sentences.

Do NOT copy sentences from evaluate_mood_model.py into this file,
that would make the evaluation score meaningless.
"""

# Kind acts; reused by the builder for "helped them, but they betrayed me"
KINDNESS = [
        "I donated blood today and it saved a patient", "I helped an old man cross the road",
        "I saved a drowning kid at the beach", "I took an accident victim to the hospital in time",
        "I volunteered at the old age home today", "I fed stray dogs in my area",
        "I donated my old clothes to an orphanage", "I taught poor kids for free today",
        "I gave my seat to a pregnant lady and she blessed me",
        "the patient I donated blood to is out of danger now",
        "maine aaj blood donate kiya aur ek patient bach gaya",
        "maine ek aadmi ki jaan bachayi", "accident wale ko time pe hospital le gaya aur wo bach gaya",
        "aaj anaath ashram mein bachchon ke saath time bitaya",
        "maine ek budhi amma ki madad ki", "aaj garib bachchon ko padhaya",
        "maine apna khoon dekar kisi ki jaan bacha li", "aaj kisi ki madad karke bahut sukoon mila",
]

# What happens after a kind act goes wrong. Combined with KINDNESS as
# "<kind act> but <this>" and labelled angry + sad only, so "I helped"
# doesn't make the whole sentence happy.
BETRAYED_AFTER_HELP = [
    "he took all the credit", "she blamed me for it", "he got me caught instead",
    "she says she never borrowed the money", "he reported me to the teacher",
    "nobody even said thank you", "they made fun of me for it",
    "usne mujhe hi fasa diya", "ulta mujhe hi daant padi", "usne shukriya tak nahi bola",
    "wahi ab mukar gaya", "usne meri hi shikayat kar di", "sabne mujhe hi galat bataya",
]

# Helping or saving someone, still going on; reused by the builder for
# "I was saving them, but I got hurt"
RESCUE = [
    "I was helping an old lady cross the road", "I was pulling a kid out of the water",
    "I was saving a puppy from the traffic", "I was trying to stop two guys from fighting",
    "I was helping my neighbour carry the gas cylinder", "I was rescuing a cat from the tree",
    "main ek bachche ko pani se nikal rahi thi", "main ek aunty ki madad kar raha tha",
    "main ek ladke ko bacha raha tha", "ek kutte ke bachche ko road se hata rahi thi",
    "main dost ko ladai se rok raha tha", "papa ko seedhi se utarne mein madad kar rahi thi",
    "ek budhe aadmi ko sambhal raha tha", "ek ladki ko bike se girne se bacha rahi thi",
]

# Getting hurt while helping. Combined with RESCUE and labelled sad only:
# nobody did anything wrong, so it is not anger
HURT_WHILE_HELPING = [
    "I hurt my hand in the process", "I slipped and twisted my ankle",
    "I got a deep cut on my arm", "I fell and hurt my knee badly",
    "my back got hurt lifting it", "I got scratched all over",
    "isme mera haath chhil gaya", "main khud gir gayi aur ghutna phoot gaya",
    "mere pair mein moch aa gayi", "mujhe hi bahut zor se lag gayi",
    "mere haath se khoon nikalne laga", "meri kamar mein dard ho gaya",
]

# Happy occasions; reused by the builder for "it was a celebration, but it got ruined"
OCCASIONS = [
    "it was my birthday today", "we were celebrating diwali at home",
    "it was my sister's wedding", "we had planned an engagement party",
    "it was our anniversary dinner", "we threw a big party at home",
    "today was my graduation day", "it was the first day of our family trip",
    "aaj hamare ghar mein shaadi hai", "aaj bhai ki shaadi thi",
    "aaj meri sagai thi", "ghar mein party rakhi thi", "aaj mera birthday tha",
    "hum sab diwali mana rahe the", "aaj hamari anniversary thi",
]

# What ruined the occasion. Combined with OCCASIONS and labelled sad + angry only
RUINED_OCCASION = [
    "the bride ran away", "the groom never showed up", "the wedding got called off",
    "my parents had a huge fight in front of everyone", "nobody showed up",
    "the relatives created a big scene", "someone ruined everything",
    "dulhan bhaag gayi", "dulha aaya hi nahi", "shaadi toot gayi",
    "rishtedaaron ne bahut tamasha kiya", "sabke saamne bahut bada jhagda ho gaya",
    "koi aaya hi nahi", "kisi ne sab barbaad kar diya",
]

# Effort or a good start; reused as "I worked hard, but it was unfair"
EFFORT = [
    "I studied really hard for the test", "I wrote a really good answer sheet",
    "I worked day and night on the project", "I gave my best in the interview",
    "I prepared for months", "my presentation was the best in class",
    "maine bahut accha likha tha", "maine pura syllabus padha tha",
    "maine project pe din raat mehnat ki", "maine apna best diya tha",
    "maine sabse accha presentation diya", "maine poori taiyaari ki thi",
]

# Unfair result after effort. Combined with EFFORT, labelled angry + sad only
UNFAIR_RESULT = [
    "the teacher gave me low marks", "everyone else got better marks except me",
    "my boss gave the credit to someone else", "they selected someone with a reference",
    "the promotion went to someone else", "nobody even appreciated it",
    "mam ne mujhe kam marks diye", "sir ne mere marks kaat liye",
    "sabko acche marks mile siwaay mere", "kisi ne tareef tak nahi ki",
    "promotion kisi aur ko mil gaya", "sifarish wale ka selection ho gaya",
    "teacher ne meri baat hi nahi maani",
]

# Small mishaps; reused as "it broke, but I got a new one"
MISHAPS = [
    "my phone broke", "I lost my wallet", "my laptop stopped working",
    "my bike broke down", "I missed my bus", "my exam didn't go well",
    "I lost my earphones", "my order got cancelled",
    "mera phone toot gaya", "mera purse kho gaya", "meri bike kharab ho gayi",
    "meri bus chhoot gayi", "mera laptop band ho gaya", "mera order cancel ho gaya",
]

# How it got sorted out. Combined with MISHAPS and labelled happy only
RESOLVED = [
    "but I got a new one", "but my dad bought me a new one", "but it got fixed",
    "but I found it later", "but a friend helped me out", "but everything worked out",
    "lekin naya mil gaya", "par papa ne naya dila diya", "lekin theek ho gaya",
    "par baad mein mil gaya", "lekin dost ne madad kar di", "par sab sambhal gaya",
]

# Fun done without telling the family; reused by the builder for
# "I bunked with friends, but my dad saw me"
SECRET_FUN = [
    "I skipped class and went out with my friends", "I sneaked out to meet my friends",
    "I told mom I had tuition but went to the mall", "I bunked the lecture and watched a movie",
    "I went on a trip with friends without telling home", "I stayed out late at a party without permission",
    "aaj tuition chhodke dosto ke saath movie dekhne gaya", "mummy ko library bolke cafe chali gayi",
    "lecture bunk karke dosto ke saath ghoomne gayi", "ghar pe jhooth bolke party mein gaya tha",
    "class chhodke dosto ke saath bahar khaane gaye", "bina bataye dosto ke saath trip pe chali gayi",
    "I had a few drinks with my friends tonight and went home", "I drank at a friend's party without telling anyone",
    "aaj dosto ke saath party mein peeke ghar gaya", "maine pehli baar dosto ke saath daaru pi li",
    "ghar walon se chhupke dosto ke saath pub chali gayi thi",
]

# What happens next. Combined with SECRET_FUN and labelled anxious only:
# the fun doesn't matter, the fear of getting scolded does
CAUGHT_BY_FAMILY = [
    "but my dad saw me there", "but my uncle saw us and will tell mom",
    "but mom found out", "but a neighbour saw me and will tell my parents",
    "but my teacher called my father", "but my sister saw me and might tell everyone at home",
    "lekin wahan papa ne dekh liya", "par chacha ne dekh liya ab ghar pe bata denge",
    "lekin mummy ko pata chal gaya", "par padosi ne dekh liya ab ghar pe bol dega",
    "lekin teacher ne papa ko phone kar diya", "aur ghar pe call aa gaya",
    "and everyone at home was upset when I walked in", "and now my parents know about it",
    "aur ghar pe sab naraz the aur papa ko pata chal gaya", "par ghar pahunchte hi sabko pata chal gaya",
    "lekin papa ko kisi ne bata diya", "aur ghar pe sab gusse mein baithe the",
]

# (setup, the setup's own moods, what happened next, moods of the whole sentence)
CONTRAST_PATTERNS = [
    (KINDNESS, ["happy"], BETRAYED_AFTER_HELP, ["angry", "sad"]),
    (OCCASIONS, ["happy"], RUINED_OCCASION, ["sad", "angry"]),
    (EFFORT, ["happy"], UNFAIR_RESULT, ["angry", "sad"]),
    (MISHAPS, ["sad"], RESOLVED, ["happy"]),
    (RESCUE, ["neutral"], HURT_WHILE_HELPING, ["sad"]),
    (SECRET_FUN, ["happy"], CAUGHT_BY_FAMILY, ["anxious"]),
]

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
    # "lag gayi" with a job/placement is good news (unlike "chot lag gayi")
    (["happy"], [
        "I finally got a job", "I got placed in a good company",
        "my brother got a government job", "I landed my first job today",
        "meri job lag gayi", "meri naukri lag gayi", "mera placement lag gaya",
        "meri internship lag gayi", "bhai ki sarkari naukri lag gayi",
        "aakhirkar job lag gayi", "achhi company mein job lag gayi",
        "papa ki promotion ho gayi", "didi ki job lag gayi",
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
    # Marriage against someone's wishes: sadness and worry, not celebration
    (["sad", "anxious"], [
        "my friend is being forced to get married", "my sister doesn't want this marriage",
        "my parents are fixing my marriage without asking me",
        "she doesn't want to marry him but her family won't listen",
        "meri dost ki shaadi zabardasti ho rahi hai",
        "wo shaadi nahi karna chahti par ghar wale nahi maan rahe",
        "meri marzi ke bina meri shaadi fix kar di",
        "didi ye shaadi nahi karna chahti", "ghar wale zabardasti rishta pakka kar rahe hain",
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

    # Something bad happens to a friend (caught cheating, suspended, failed):
    # sadness and worry for them, not anger and not happiness
    (["sad", "anxious"], [
        "my friend got caught with a phone in the exam hall",
        "my friend was caught cheating and the teacher took his paper",
        "the invigilator caught my roommate copying and sent her out",
        "my friend got suspended from college for cheating",
        "my best friend failed the exam and can't stop crying",
        "my roommate got thrown out of the hostel",
        "my friend's whole year is wasted because he failed",
        "mere dost ko exam mein chitting karte hue pakad liya",
        "mera dost exam hall mein pakda gaya aur teacher ne copy cheen li",
        "teacher ne mere dost ki copy cheen li aur use bahar bhej diya",
        "mere dost ka UMC case ban gaya hai ab principal se milna hai",
        "meri roommate ko hostel se nikal diya gaya",
        "mera dost college se suspend ho gaya",
        "mera dost exam mein fail ho gaya aur bahut ro raha hai",
        "dost ko exam mein phone ke saath pakad liya ab pata nahi kya hoga",
        "mere dost ne exam mein cheating ki thi ab bahut darr raha hai",
    ]),

    # ---------------- HEALTH ----------------
    (["anxious"], [
        "I found a lump and I am waiting for the test results",
        "my chest has been hurting since morning", "I have a surgery next week",
        "the doctor wants to run more tests",
        "doctor ne aur tests karwane bole hain", "seene mein subah se dard ho raha hai",
        "agle hafte operation hai",
    ]),
    (["anxious", "sad"], [
        "my aunt was rushed to the emergency ward last night",
        "grandma fell down and was taken to the hospital",
        "dadi gir gayi aur unhe hospital le gaye", "bhai ki tabiyat achanak kharab ho gayi",
        "maa ko emergency mein bharti karna pada", "chachu ka BP bahut badh gaya, hospital mein hain",
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
    # Spent too much and now money is gone: worry about the rest of the month
    (["stressed", "anxious"], [
        "I spent all my money on shopping and now I have nothing left",
        "I blew my whole salary in the first week",
        "I ordered too much online and now my account is empty",
        "I have only a few hundred left for the rest of the month",
        "shopping mein saare paise uda diye, ab kuch nahi bacha",
        "mahine ki shuruaat mein hi saari salary khatam ho gayi",
        "online order karte karte account khaali ho gaya",
        "ab mahina kaise nikalega, paise khatam ho gaye",
        "pocket money ek hi hafte mein khatam ho gayi",
    ]),

    # Big unplanned expense (treatment, repairs): money pressure
    (["stressed"], [
        "the hospital bill was huge", "the car repair cost a fortune",
        "we spent all our savings on the treatment", "the operation cost more than we had",
        "ilaaj mein bahut saare paise lag gaye", "hospital ka bill bahut zyada aaya",
        "gaadi theek karwane mein bahut kharcha ho gaya", "saari savings ilaaj mein chali gayi",
        "operation ke liye udhaar lena pada",
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
        "I have to present my project to the whole class today",
        "my seminar is tomorrow and I am nervous about the questions",
        "I have to give a demo to the client this afternoon",
        "kal class ke saamne project present karna hai",
        "aaj seminar mein bolna hai aur pet mein dar hai",
        "mujhe kal sabke saamne demo dena hai",
        "aaj college mein group presentation hai",
        "kal panel ke saamne thesis defend karna hai",
        # Feminine and chat forms: "deni", "karni", "merko", "h"
        "kal mujhe speech deni hai aur bahut ghabrahat ho rahi hai",
        "mujhe sabke saamne report present karni hai",
        "aaj merko viva dena h", "kal merko class ke saamne bolna h",
        "mujhe interview deni hai aur pet mein dar hai",
        "merko aaj seminar deni h", "kal mujhe demo karni hai client ke saamne",
    ]),
    (["happy"], [
        "my post went viral", "I adopted a puppy today", "we won the cricket match",
        "I learned to ride a bike", "my painting got selected for the exhibition",
        "aaj ek pyaara sa puppy ghar laaye", "hamari team match jeet gayi",
        # Enjoying something, with "best" used the way people say it:
        # "a best movie", "best song", "ekdum best" (no "the")
        "I am watching a best web series right now", "listening to a best song on repeat",
        "this is a best match I have seen in years", "had a best dinner with my family",
        "what a best day today", "I am reading a best novel and cannot put it down",
        "aaj best match dekh raha hoon", "ye gaana ekdum best hai",
        "bahut best series mil gayi dekhne ko", "aaj ka khana ekdum best tha",
        "best din tha aaj", "aaj best picture dekhi dosto ke saath",
    ]),
    (["angry"], [
        "someone cut the queue in front of me", "people were rude to me at the store",
        "someone scratched my new car and drove off",
        "line mein kisi ne beech mein ghusne ki koshish ki", "bus mein mere saath badtameezi hui",
    ]),

    # ---------------- KINDNESS / PROUD MOMENTS ----------------
    # Helping someone feels good, even when the place (hospital, accident) sounds bad
    (["happy"], KINDNESS),

    # Catching a criminal and handing them to the police: pride and relief,
    # with the adrenaline of having faced danger. Not neutral.
    (["happy", "anxious"], [
        "I caught a pickpocket and handed him over to the police",
        "I stopped a thief who snatched a lady's bag and called the police",
        "I helped the police catch a criminal in my area",
        "I chased a robber down the street and the police arrested him",
        "I saw a man harassing a girl, caught him and gave him to the police",
        "I spotted a suspicious man at the station and the police caught him",
        "maine ek chor ko pakad ke police ke hawale kar diya",
        "maine ek chain snatcher ko pakda aur police ko de diya",
        "ek badmaash ko pakadne mein maine police ki madad ki",
        "bus mein jeb katre ko pakad ke police ko pakda diya",
        "maine ek sandigdh aadmi ko pakadwaya aur police le gayi",
    ]),

    # The opposite: it is someone I care about who got into trouble with the
    # police. Without these, "police" alone started to mean happy.
    (["sad", "anxious"], [
        "my brother was arrested by the police and we don't know what to do",
        "the police took my friend away last night",
        "my cousin got picked up by the police for fighting",
        "police came to our house looking for my uncle",
        "my father was called to the police station and mom is crying",
        "mere bhai ko police pakad ke le gayi",
        "police ne mere chacha ko utha liya aur ghar mein sab ro rahe hain",
        "mere dost par police case ho gaya hai",
        "ghar pe police aayi thi aur sab bahut dar gaye",
        "papa ko police station bulaya hai aur mummy ghabra gayi hain",
    ]),

    # ---------------- MISHAP + SCARED OF TELLING FAMILY ----------------
    # Nobody else is to blame, so this is sad + anxious, not angry
    (["sad", "anxious"], [
        "I dropped my dad's laptop and now I have to tell him",
        "I scratched the car and I don't know how to tell my parents",
        "I failed the test and I am scared to show the report card at home",
        "I lost the money mom gave me for fees",
        "my phone fell in the water, mom is going to kill me",
        "mujhse papa ka laptop gir gaya, ab unhe kaise bataun",
        "fees ke paise kho gaye, ghar pe kya bolunga",
        "report card mein number kam aaye, ghar dikhane mein darr lag raha hai",
        "mummy ka mehnga glass toot gaya mujhse, ab daant padegi",
        "naya phone gir ke screen toot gayi, ghar wale bahut gussa karenge",
        "bike ka accident karke aaya hoon, papa ko kaise bataun",
    ]),

    # ---------------- GOOD NEWS AT THE HOSPITAL ----------------
    (["happy"], [
        "my sister gave birth to a healthy baby in the hospital",
        "dad got discharged from the hospital today", "the surgery was successful",
        "the doctor said mom is completely fine now", "grandpa came back home from the ICU",
        "hospital mein bhabhi ko beta hua", "papa aaj hospital se discharge ho gaye",
        "operation successful raha", "doctor ne kaha maa ab bilkul theek hai",
        "dadaji ICU se bahar aa gaye",
    ]),

    # ---------------- SHYNESS / SOCIAL NERVES ----------------
    (["anxious"], [
        "I'm getting shy", "I feel so shy around new people",
        "I get nervous talking to strangers", "I felt awkward at the party",
        "I'm too shy to ask questions in class", "I feel embarrassed in front of everyone",
        "my crush looked at me and I got shy", "I couldn't speak in the meeting, I froze",
        "mujhe sharam aa rahi hai", "naye logon se baat karne mein jhijhak hoti hai",
        "sabke saamne bolne mein sharam aati hai", "class mein sawaal poochne mein darr lagta hai",
        "main bahut sharmeeli hoon", "uske saamne main sharma gayi",
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
        # Fed up with people
        "in logon se pak gaya hoon", "sabki baatein sun sun ke pak chuki hoon",
        "tang aa gayi hoon in sab se", "uski harkaton se tang aa gaya",
        "sach mein pak gayi yaar is insaan se",
    ],
    "tired": [
        "my feet are killing me", "I am running on empty", "I am dead on my feet",
        "I am completely wiped out", "I could sleep for a whole day", "my body is giving up",
        "body toot rahi hai", "aankhein khuli nahi reh rahi", "battery zero ho gayi hai meri",
        "ufff thak gaya", "neend se bura haal hai",
        # Feminine forms: "gayi" alone was pulling these towards happy
        "ufff thak gayi", "aaj to main poori thak gayi yaar", "kaam karte karte thak gayi hoon",
        "padhai karke thak chuki hoon", "aaj bahut thaki thaki si hoon",
        "main bilkul thak gayi, ab sona hai", "aaj kal bahut thakan rehti hai mujhe",
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
        # Fed up with work: "pak gayi" / "pareshan" are not happy
        "office ke kaam se pak gaya hoon", "roz ke assignments se pak chuki hoon",
        "padhai se bilkul pak gayi hoon", "bahut pareshan ho gayi hoon aaj kal",
        "kaam ne pareshan kar rakha hai", "is project ne pareshan kar diya",
        "deadlines se tang aa gayi hoon",
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
    "I have a dentist appointment at five", "I went to collect my blood test report",
    "the clinic is closed on sundays", "my yearly health checkup is next week",
    "doctor ke paas normal checkup ke liye gaya tha", "hospital se report leni hai",
    "clinic shaam ko khulta hai", "aankhon ka checkup karwana hai",
]
