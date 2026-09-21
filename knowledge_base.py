import ast
import operator
import re

KNOWLEDGE = {
    "digital marketing": "Digital marketing is the promotion of products or services through digital channels such as social media, search engines, websites, email, and online advertising.",
    "marketing": "Marketing is the process of understanding customer needs and promoting products or services to satisfy those needs.",
    "artificial intelligence": "Artificial Intelligence is technology that enables computers to perform tasks that normally require human intelligence, such as learning, reasoning, understanding language, and solving problems.",
    "ai": "Artificial Intelligence is technology that enables computers to perform tasks that normally require human intelligence, such as learning, reasoning, understanding language, and solving problems.",
    "photosynthesis": "Photosynthesis is how green plants use sunlight, water, and carbon dioxide to make food and release oxygen.",
    "business": "A business creates and delivers value to customers through products or services, usually in exchange for revenue.",
    "management": "Management is the process of planning, organizing, staffing, directing, and controlling resources to achieve goals efficiently.",
    "economics": "Economics is the study of how people, businesses, and governments use limited resources to satisfy needs and wants.",
    "accounting": "Accounting is the systematic recording, summarizing, and reporting of a business's financial transactions.",
    "computer": "A computer is an electronic device that accepts input, processes data, stores information, and produces output.",
    "computer basics": "The basic functions of a computer are input, processing, storage, and output. Hardware is physical; software is the instructions that control it.",
    "grammar": "Grammar is the set of rules that explains how words are arranged to form clear and correct sentences.",
    "english grammar": "English grammar covers word classes, sentence structure, tense, subject-verb agreement, articles, and punctuation.",
    "photosynthesis": "Photosynthesis is how green plants use sunlight, water, and carbon dioxide to make food and release oxygen.",
    "prime minister of india": "As of my locally maintained knowledge, Narendra Modi is the Prime Minister of India. This political information may change, so verify current officeholders from an official government source.",
    "social media marketing": "Social media marketing uses platforms such as Instagram, YouTube, LinkedIn, and Facebook to build awareness, engage audiences, and support business goals.",
    "branding": "Branding is the process of creating a recognizable identity, promise, and reputation for a product, service, or organization.",
    "entrepreneurship": "Entrepreneurship is the process of identifying an opportunity, organizing resources, taking calculated risks, and creating value through a business.",
    "leadership": "Leadership is the ability to guide, influence, and support people toward a shared goal.",
    "finance": "Finance is the management of money, investments, income, spending, and financial risk.",
    "statistics": "Statistics is the science of collecting, organizing, analyzing, and interpreting data to make better decisions.",
    "programming": "Programming is writing instructions that a computer can execute to solve problems or perform tasks.",
    "python": "Python is a beginner-friendly programming language used for web development, automation, data analysis, and artificial intelligence.",
    "communication": "Communication is the exchange of ideas, information, or feelings through speaking, writing, listening, or visual signals.",
    "market segmentation": "Market segmentation divides a broad market into smaller groups with similar needs, characteristics, or behavior so marketing can be more relevant.",
    "target market": "A target market is the specific group of customers a business chooses to serve with its product, pricing, and promotion.",
    "customer relationship management": "Customer relationship management, or CRM, is the process of managing customer interactions to improve satisfaction, loyalty, and business results.",
    "entrepreneur": "An entrepreneur identifies an opportunity, accepts calculated risk, and organizes resources to create value through a business.",
    "gross domestic product": "Gross domestic product, or GDP, is the total monetary value of final goods and services produced within a country during a period.",
    "gdp": "GDP is the total monetary value of final goods and services produced within a country during a period.",
    "opportunity cost": "Opportunity cost is the value of the next best alternative given up when a choice is made.",
    "microeconomics": "Microeconomics studies individual consumers, firms, prices, demand, supply, and markets.",
    "macroeconomics": "Macroeconomics studies the economy as a whole, including inflation, unemployment, national income, and economic growth.",
    "balance sheet": "A balance sheet reports a business's assets, liabilities, and owner's equity at a specific date. Assets = Liabilities + Equity.",
    "assets": "Assets are resources controlled by a business that are expected to provide future economic benefit, such as cash, inventory, or equipment.",
    "liabilities": "Liabilities are amounts a business owes to others, such as loans, unpaid bills, or accounts payable.",
    "profit": "Profit is the amount left when total revenue is greater than total cost: Profit = Revenue - Cost.",
    "noun": "A noun is a word that names a person, place, thing, or idea, such as student, school, book, or freedom.",
    "verb": "A verb expresses an action, state, or occurrence, such as learn, is, write, or grow.",
    "adjective": "An adjective describes or gives more information about a noun, such as useful, large, or academic.",
    "tenses": "English tenses show when an action happens. The three basic time groups are present, past, and future.",
    "cpu": "The CPU is the central processing unit. It executes instructions and performs calculations, acting as a computer's main processor.",
    "ram": "RAM is temporary working memory used by a computer to hold data and programs that are currently active.",
    "operating system": "An operating system manages computer hardware and software and provides an interface for users and applications. Examples include Windows, macOS, Linux, Android, and iOS.",
    "html": "HTML is the markup language used to structure content on web pages, such as headings, paragraphs, links, images, and forms.",
    "css": "CSS controls the presentation of web pages, including colors, spacing, layout, fonts, and responsive design.",
    "javascript": "JavaScript is a programming language commonly used to make web pages interactive and dynamic.",
    "cybersecurity": "Cybersecurity protects computers, networks, accounts, and data from unauthorized access, attacks, and damage.",
    "study tips": "Useful study habits include setting a clear goal, studying in focused sessions, practicing recall, reviewing over several days, and taking short breaks.",
    "time management": "Time management means planning and prioritizing tasks so important work is completed efficiently and on time.",
    "resume": "A resume is a concise document showing your education, skills, experience, projects, and achievements for a job or internship.",
}

FOLLOW_UPS = {
    "swot": "SWOT analysis studies Strengths and Weaknesses inside an organization, plus Opportunities and Threats outside it.",
    "4ps": "The 4Ps of marketing are Product, Price, Place, and Promotion.",
    "stp": "STP means Segmentation, Targeting, and Positioning: divide the market, select an audience, and create a clear market image.",
    "roi": "ROI measures return compared with investment: ROI = (Gain - Investment) / Investment x 100.",
    "seo": "SEO improves a website's visibility in unpaid search results through useful content, relevant keywords, technical quality, and trusted links.",
    "machine learning": "Machine learning is a branch of AI in which systems learn patterns from data to make predictions or decisions.",
    "database": "A database is an organized collection of data that software can store, search, update, and manage.",
    "internet": "The internet is a worldwide network of connected computers that exchange data using standard communication protocols.",
    "inflation": "Inflation is a sustained rise in the general price level, which reduces the purchasing power of money.",
    "demand": "Demand is the quantity of a product or service that consumers are willing and able to buy at a given price.",
    "supply": "Supply is the quantity of a product or service that producers are willing and able to offer at a given price.",
}

OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def calculate(expression):
    expression = expression.replace("x", "*").replace("X", "*")
    expression = expression.replace("÷", "/")
    if not re.fullmatch(r"[\d\s+\-*/%.()]+", expression):
        return None
    try:
        tree = ast.parse(expression, mode="eval")
        result = _evaluate(tree.body)
        if abs(result) > 1e100:
            return None
        return int(result) if float(result).is_integer() else round(result, 8)
    except (ArithmeticError, SyntaxError, ValueError, TypeError):
        return None


def _evaluate(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in OPERATORS:
        left = _evaluate(node.left)
        right = _evaluate(node.right)
        return OPERATORS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in OPERATORS:
        return OPERATORS[type(node.op)](_evaluate(node.operand))
    raise ValueError("Unsupported expression")


def answer_question(question):
    normalized = re.sub(r"[^\w+*/%.()÷ -]", " ", question.strip().lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if normalized in {"hello", "hi", "hey", "namaste", "good morning", "good afternoon", "good evening"}:
        return "Hello! How can I help you with your studies today?"
    if normalized in {"thanks", "thank you", "thx"}:
        return "You're welcome! Ask me another study question whenever you like."
    if normalized in {"bye", "goodbye"}:
        return "Goodbye! Keep learning and have a productive study session."

    aliases = {
        "digital marketing strategy": "digital marketing",
        "online marketing": "digital marketing",
        "artificial intelligence": "artificial intelligence",
        "what is ai": "ai",
        "what does ai mean": "ai",
        "plant food process": "photosynthesis",
        "search engine optimization": "seo",
        "search engine marketing": "sem",
        "human resource management": "management",
        "business management": "management",
        "basic computer": "computer basics",
    }
    for phrase, replacement in aliases.items():
        if phrase in normalized:
            normalized += f" {replacement}"

    calculation_text = re.sub(r"^(what is|calculate|solve|find)\s+", "", normalized).rstrip("?")
    if re.fullmatch(r"[\d\s+\-*/%.()xX÷]+", calculation_text) and any(char.isdigit() for char in calculation_text):
        result = calculate(calculation_text)
        if result is not None:
            return str(result)

    for phrase, response in sorted(KNOWLEDGE.items(), key=lambda item: len(item[0]), reverse=True):
        if phrase in normalized:
            return response
    for phrase, response in sorted(FOLLOW_UPS.items(), key=lambda item: len(item[0]), reverse=True):
        if phrase in normalized:
            return response

    if any(word in normalized for word in {"explain", "define", "meaning", "difference", "example", "formula"}):
        return (
            "I can explain that step by step, but I need the topic name to match my local study notes. "
            "Try: 'Explain marketing', 'Define AI', 'Give an example of SWOT', or 'What is ROI?'"
        )

    return (
        "I do not have that exact topic in my local notes yet. I can answer questions about marketing, "
        "AI, business, management, economics, accounting, grammar, computers, mathematics, and study skills."
    )

"""
StudySmart AI Tutor - Knowledge Base
====================================
Maps user queries (phrases) to canonical topics/subjects.
Supports short answers, long answers, and worldwide/general knowledge.
"""

# ---------------------------------------------------------------------------
# TOPIC / SUBJECT ALIASES
# Key = user phrase (lowercase), Value = canonical topic name
# ---------------------------------------------------------------------------
TOPIC_ALIASES = {
    # ----- Digital Marketing & Online Marketing -----
    "digital marketing strategy": "digital marketing",
    "online marketing": "digital marketing",
    "digital marketing": "digital marketing",
    "internet marketing": "digital marketing",
    "social media marketing": "digital marketing",
    "content marketing": "digital marketing",
    "email marketing": "digital marketing",
    "affiliate marketing": "digital marketing",
    "influencer marketing": "digital marketing",
    "search engine optimization": "seo",
    "seo": "seo",
    "search engine marketing": "sem",
    "sem": "sem",
    "google ads": "sem",
    "ppc": "sem",
    "pay per click": "sem",

    # ----- Artificial Intelligence -----
    "artificial intelligence": "artificial intelligence",
    "what is ai": "ai",
    "what does ai mean": "ai",
    "ai": "ai",
    "machine learning": "machine learning",
    "ml": "machine learning",
    "deep learning": "deep learning",
    "neural network": "deep learning",
    "chatgpt": "ai",
    "generative ai": "ai",
    "llm": "ai",
    "large language model": "ai",

    # ----- Science (Biology / Photosynthesis etc.) -----
    "plant food process": "photosynthesis",
    "photosynthesis": "photosynthesis",
    "how plants make food": "photosynthesis",
    "respiration": "respiration",
    "cell": "cell biology",
    "dna": "genetics",
    "genetics": "genetics",
    "evolution": "evolution",
    "ecology": "ecology",
    "human body": "human anatomy",
    "anatomy": "human anatomy",
    "physiology": "physiology",

    # ----- Management & Business -----
    "human resource management": "management",
    "business management": "management",
    "hrm": "management",
    "management": "management",
    "marketing management": "management",
    "financial management": "management",
    "operations management": "management",
    "strategic management": "management",
    "entrepreneurship": "entrepreneurship",
    "startup": "entrepreneurship",
    "business plan": "entrepreneurship",

    # ----- Computer Basics & IT -----
    "basic computer": "computer basics",
    "computer basics": "computer basics",
    "what is computer": "computer basics",
    "hardware": "computer hardware",
    "software": "computer software",
    "operating system": "operating system",
    "ms word": "ms office",
    "ms excel": "ms office",
    "ms powerpoint": "ms office",
    "ms office": "ms office",
    "internet": "internet basics",
    "www": "internet basics",
    "email": "internet basics",
    "programming": "programming",
    "coding": "programming",
    "python": "python",
    "java": "java",
    "c++": "cpp",
    "html": "web development",
    "css": "web development",
    "javascript": "web development",
    "web development": "web development",
    "database": "database",
    "sql": "database",
    "cyber security": "cybersecurity",
    "cybersecurity": "cybersecurity",
    "networking": "computer networking",

    # ----- Accountancy / Accounting -----
    "accountancy": "accountancy",
    "accounting": "accountancy",
    "book keeping": "accountancy",
    "bookkeeping": "accountancy",
    "financial accounting": "accountancy",
    "cost accounting": "accountancy",
    "management accounting": "accountancy",
    "balance sheet": "accountancy",
    "profit and loss": "accountancy",
    "journal entry": "accountancy",
    "ledger": "accountancy",
    "trial balance": "accountancy",
    "gst": "taxation",
    "income tax": "taxation",
    "taxation": "taxation",
    "audit": "auditing",
    "auditing": "auditing",

    # ----- Mathematics -----
    "mathematica": "mathematics",
    "mathematics": "mathematics",
    "maths": "mathematics",
    "math": "mathematics",
    "algebra": "algebra",
    "geometry": "geometry",
    "trigonometry": "trigonometry",
    "calculus": "calculus",
    "statistics": "statistics",
    "probability": "probability",
    "arithmetic": "arithmetic",
    "number system": "number system",
    "percentage": "percentage",
    "ratio and proportion": "ratio proportion",
    "simple interest": "simple interest",
    "compound interest": "compound interest",
    "mensuration": "mensuration",
    "coordinate geometry": "coordinate geometry",
    "linear equations": "linear equations",
    "quadratic equations": "quadratic equations",
    "matrices": "matrices",
    "determinants": "determinants",
    "vectors": "vectors",
    "integration": "integration",
    "differentiation": "differentiation",

    # ----- Physics -----
    "physics": "physics",
    "force": "force and motion",
    "motion": "force and motion",
    "newton laws": "newton laws",
    "gravity": "gravity",
    "light": "optics",
    "optics": "optics",
    "electricity": "electricity",
    "magnetism": "magnetism",
    "sound": "sound",
    "heat": "heat and thermodynamics",
    "thermodynamics": "heat and thermodynamics",
    "atomic structure": "atomic structure",
    "nuclear physics": "nuclear physics",
    "waves": "waves",
    "energy": "energy",

    # ----- Chemistry -----
    "chemistry": "chemistry",
    "periodic table": "periodic table",
    "atoms and molecules": "atoms and molecules",
    "chemical bonding": "chemical bonding",
    "acids and bases": "acids and bases",
    "organic chemistry": "organic chemistry",
    "inorganic chemistry": "inorganic chemistry",
    "physical chemistry": "physical chemistry",
    "chemical reactions": "chemical reactions",
    "mole concept": "mole concept",
    "stoichiometry": "stoichiometry",

    # ----- Economics -----
    "economics": "economics",
    "microeconomics": "microeconomics",
    "macroeconomics": "macroeconomics",
    "demand and supply": "demand and supply",
    "inflation": "inflation",
    "gdp": "gdp",
    "national income": "national income",
    "money and banking": "money and banking",
    "fiscal policy": "fiscal policy",
    "monetary policy": "monetary policy",
    "international trade": "international trade",

    # ----- History -----
    "history": "history",
    "world history": "world history",
    "indian history": "indian history",
    "ancient history": "ancient history",
    "medieval history": "medieval history",
    "modern history": "modern history",
    "world war": "world wars",
    "world war 1": "world wars",
    "world war 2": "world wars",
    "independence of india": "indian independence",
    "freedom struggle": "indian independence",

    # ----- Geography -----
    "geography": "geography",
    "world geography": "world geography",
    "physical geography": "physical geography",
    "human geography": "human geography",
    "climate": "climate",
    "weather": "climate",
    "continents": "continents",
    "oceans": "oceans",
    "rivers": "rivers",
    "mountains": "mountains",
    "india geography": "india geography",

    # ----- English / Language -----
    "english": "english",
    "grammar": "english grammar",
    "tenses": "english grammar",
    "vocabulary": "vocabulary",
    "essay writing": "essay writing",
    "letter writing": "letter writing",
    "comprehension": "comprehension",
    "parts of speech": "english grammar",

    # ----- Political Science / Civics -----
    "political science": "political science",
    "civics": "civics",
    "constitution": "constitution",
    "indian constitution": "indian constitution",
    "democracy": "democracy",
    "government": "government",
    "parliament": "parliament",
    "fundamental rights": "fundamental rights",

    # ----- Psychology -----
    "psychology": "psychology",
    "human behavior": "psychology",
    "learning theory": "learning theory",
    "personality": "personality",
    "motivation": "motivation",

    # ----- Commerce / Business Studies -----
    "commerce": "commerce",
    "business studies": "business studies",
    "trade": "trade",
    "banking": "banking",
    "insurance": "insurance",
    "stock market": "stock market",
    "share market": "stock market",

    # ----- Environment / Current Affairs -----
    "environment": "environment",
    "climate change": "climate change",
    "global warming": "climate change",
    "pollution": "pollution",
    "sustainable development": "sustainable development",
    "current affairs": "current affairs",
    "general knowledge": "general knowledge",
    "gk": "general knowledge",
    "world gk": "general knowledge",
    "india gk": "general knowledge",

    # ----- Health & Medicine (basic) -----
    "health": "health",
    "nutrition": "nutrition",
    "first aid": "first aid",
    "diseases": "diseases",
    "covid": "covid",
    "vaccines": "vaccines",

    # ----- Philosophy / Ethics -----
    "philosophy": "philosophy",
    "ethics": "ethics",
    "moral values": "ethics",

    # ----- Law (basic) -----
    "law": "law",
    "legal studies": "law",
    "ipc": "indian penal code",
    "constitution of india": "indian constitution",
}

# ---------------------------------------------------------------------------
# SUBJECT LIST (for menu / discovery)
# ---------------------------------------------------------------------------
SUBJECTS = [
    "Accountancy",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Basics / IT",
    "Digital Marketing",
    "Artificial Intelligence",
    "Management / Business",
    "Economics",
    "History",
    "Geography",
    "English",
    "Political Science / Civics",
    "Psychology",
    "Commerce / Business Studies",
    "Environment & Current Affairs",
    "General Knowledge (World + India)",
    "Health & Nutrition",
    "Programming & Web Development",
    "Taxation & GST",
    "Banking & Finance",
]

# ---------------------------------------------------------------------------
# ANSWER STYLE TEMPLATES
# The tutor can return both SHORT and LONG answers for any mapped topic.
# ---------------------------------------------------------------------------
ANSWER_STYLES = {
    "short": "Give a clear, concise definition or key points (2-5 sentences).",
    "long": "Give a detailed explanation with examples, steps, formulas, and real-world applications (paragraphs).",
    "worldwide": "Include global perspective, important facts from different countries, international organizations, or universal concepts.",
}

# ---------------------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------------------
def normalize_query(query: str) -> str:
    """Lowercase and strip the user query for matching."""
    return query.strip().lower()


def get_topic(query: str) -> str | None:
    """
    Return the canonical topic for a user query.
    Tries exact match first, then partial/substring match.
    """
    q = normalize_query(query)

    # Exact match
    if q in TOPIC_ALIASES:
        return TOPIC_ALIASES[q]

    # Partial match (contains key)
    for key, topic in TOPIC_ALIASES.items():
        if key in q or q in key:
            return topic

    return None


def get_subjects() -> list[str]:
    """Return the list of supported subjects."""
    return SUBJECTS.copy()


def suggest_related(topic: str) -> list[str]:
    """Return related topics for further learning."""
    related_map = {
        "digital marketing": ["seo", "sem", "content marketing", "social media marketing"],
        "ai": ["machine learning", "deep learning", "generative ai"],
        "accountancy": ["taxation", "auditing", "financial management"],
        "mathematics": ["algebra", "calculus", "statistics", "geometry"],
        "photosynthesis": ["respiration", "cell biology", "ecology"],
        "management": ["hrm", "marketing management", "entrepreneurship"],
        "computer basics": ["ms office", "internet basics", "operating system"],
        "physics": ["force and motion", "electricity", "optics"],
        "chemistry": ["periodic table", "chemical bonding", "organic chemistry"],
        "history": ["world history", "indian history", "world wars"],
        "geography": ["physical geography", "climate", "world geography"],
        "economics": ["microeconomics", "macroeconomics", "gdp"],
    }
    return related_map.get(topic, [])


# ---------------------------------------------------------------------------
# SAMPLE SHORT + LONG ANSWERS (can be expanded or generated dynamically)
# ---------------------------------------------------------------------------
SAMPLE_ANSWERS = {
    "photosynthesis": {
        "short": (
            "Photosynthesis is the process by which green plants make their own food "
            "using sunlight, carbon dioxide and water. The green pigment chlorophyll "
            "traps sunlight. Oxygen is released as a by-product."
        ),
        "long": (
            "Photosynthesis is the process used by plants, algae and some bacteria to "
            "convert light energy into chemical energy (food). It mainly occurs in the "
            "chloroplasts of plant cells.\n\n"
            "Word equation:\n"
            "Carbon dioxide + Water → Glucose + Oxygen (in presence of sunlight & chlorophyll)\n\n"
            "Chemical equation:\n"
            "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂\n\n"
            "Two main stages:\n"
            "1. Light-dependent reactions (in thylakoid membranes) – produce ATP & NADPH, release O₂.\n"
            "2. Light-independent reactions / Calvin cycle (in stroma) – fix CO₂ into glucose.\n\n"
            "Importance: It is the primary source of food for almost all living organisms "
            "and maintains the oxygen level in the atmosphere."
        ),
    },
    "ai": {
        "short": (
            "AI (Artificial Intelligence) is the ability of machines to perform tasks "
            "that normally require human intelligence, such as learning, reasoning, "
            "problem-solving and understanding language."
        ),
        "long": (
            "Artificial Intelligence (AI) refers to computer systems that can perform "
            "tasks typically requiring human intelligence. These include learning from "
            "data (Machine Learning), understanding natural language, recognizing "
            "images, making decisions, and even generating content (Generative AI).\n\n"
            "Main branches:\n"
            "• Machine Learning (ML)\n"
            "• Deep Learning (Neural Networks)\n"
            "• Natural Language Processing (NLP)\n"
            "• Computer Vision\n"
            "• Robotics\n\n"
            "Real-world uses: Chatbots (ChatGPT), self-driving cars, medical diagnosis, "
            "recommendation systems (YouTube, Netflix), fraud detection, and smart "
            "assistants (Siri, Alexa).\n\n"
            "AI is transforming education, healthcare, business and almost every industry worldwide."
        ),
    },
    "seo": {
        "short": (
            "SEO (Search Engine Optimization) is the practice of improving a website "
            "so that it ranks higher in search engine results (like Google) and gets "
            "more organic (free) traffic."
        ),
        "long": (
            "Search Engine Optimization (SEO) is a digital marketing technique used to "
            "increase the quantity and quality of traffic to a website through organic "
            "search engine results.\n\n"
            "Main types of SEO:\n"
            "1. On-page SEO – content, keywords, title tags, meta descriptions, headings, "
            "internal linking, page speed.\n"
            "2. Off-page SEO – backlinks, social signals, brand mentions.\n"
            "3. Technical SEO – crawlability, sitemap, robots.txt, mobile-friendliness, "
            "HTTPS, Core Web Vitals.\n\n"
            "Goal: Rank on the first page of Google for relevant keywords so that more "
            "people visit the website without paying for ads."
        ),
    },
    "accountancy": {
        "short": (
            "Accountancy is the process of recording, classifying, summarizing and "
            "interpreting financial transactions of a business so that stakeholders "
            "can make informed decisions."
        ),
        "long": (
            "Accountancy (or Accounting) is the systematic process of identifying, "
            "measuring, recording, classifying, summarizing, analyzing and communicating "
            "financial information about an organization.\n\n"
            "Key branches:\n"
            "• Financial Accounting – preparation of financial statements (Balance Sheet, "
            "Profit & Loss Account, Cash Flow Statement).\n"
            "• Cost Accounting – ascertaining cost of products/services.\n"
            "• Management Accounting – providing information for internal decision-making.\n"
            "• Tax Accounting – compliance with tax laws (GST, Income Tax).\n\n"
            "Basic principles: Dual Aspect, Going Concern, Accrual, Consistency, "
            "Prudence, Materiality.\n\n"
            "Users of accounting information: Owners, managers, investors, creditors, "
            "government, employees and the public."
        ),
    },
    "mathematics": {
        "short": (
            "Mathematics is the science of numbers, quantities, shapes, patterns and "
            "logical reasoning. It is used in almost every field of life and study."
        ),
        "long": (
            "Mathematics is a fundamental discipline that deals with numbers, structure, "
            "space and change. It provides tools for solving problems in science, "
            "engineering, economics, technology and daily life.\n\n"
            "Major branches:\n"
            "• Arithmetic – basic operations with numbers\n"
            "• Algebra – symbols and equations\n"
            "• Geometry – shapes, sizes and properties of space\n"
            "• Trigonometry – relationships between angles and sides of triangles\n"
            "• Calculus – rates of change and accumulation (differentiation & integration)\n"
            "• Statistics & Probability – data analysis and chance\n\n"
            "Mathematics develops logical thinking, problem-solving skills and is "
            "essential for careers in engineering, data science, finance, AI and research."
        ),
    },
}


def get_answer(topic: str, style: str = "short") -> str | None:
    """
    Return a sample answer for the given topic and style ('short' or 'long').
    Returns None if no sample is available (the AI can then generate one).
    """
    topic = topic.lower()
    if topic in SAMPLE_ANSWERS:
        return SAMPLE_ANSWERS[topic].get(style)
    return None


# ---------------------------------------------------------------------------
# QUICK TEST (run this file directly to see examples)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    test_queries = [
        "What is AI",
        "plant food process",
        "search engine optimization",
        "Accountancy",
        "Mathematics",
        "digital marketing strategy",
        "photosynthesis",
        "human resource management",
        "basic computer",
    ]

    print("=" * 60)
    print("StudySmart AI Tutor – Knowledge Base Test")
    print("=" * 60)

    for q in test_queries:
        topic = get_topic(q)
        print(f"\nQuery : {q}")
        print(f"Topic : {topic}")
        if topic:
            short = get_answer(topic, "short")
            if short:
                print(f"Short : {short[:80]}...")
            related = suggest_related(topic)
            if related:
                print(f"Related: {', '.join(related)}")

    print("\n" + "=" * 60)
    print("Supported Subjects:")
    for s in SUBJECTS:
        print(f"  • {s}")
    print("=" * 60)
