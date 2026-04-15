"""
Rally Brain v7.0 — Configuration
Single source of truth for all constants and paths.
"""

import os
from pathlib import Path

# ── Paths ──
BASE_DIR = Path(__file__).parent
CAMPAIGNS_DIR = BASE_DIR / "campaigns"
DATA_DIR = BASE_DIR / "campaign_data"
EXTERNAL_DATA = Path("/home/z/my-project/upload/rally_logs_extracted")

# ── Rally.fun API ──
RALLY_API_BASE = "https://app.rally.fun/api"
RALLY_API_TIMEOUT = 30  # seconds

# ── Scoring System (7 categories, max 23) ──
CATEGORIES = {
    "originality": {"max": 2, "weight": 1.0},
    "alignment": {"max": 2, "weight": 1.0},
    "accuracy": {"max": 2, "weight": 1.0},
    "compliance": {"max": 2, "weight": 1.0},
    "engagement": {"max": 5, "weight": 1.0},
    "technical": {"max": 5, "weight": 1.0},
    "reply_quality": {"max": 5, "weight": 1.0},
}
MAX_TOTAL_SCORE = sum(c["max"] for c in CATEGORIES.values())  # 23

# ── Grade Thresholds ──
GRADE_THRESHOLDS = [
    (21.0, "S"),
    (18.0, "A+"),
    (16.0, "A"),
    (14.0, "B+"),
    (12.0, "B"),
    (10.0, "C"),
    (0.0, "D"),
]

# ── Rally Analysis Category Mapping ──
# Maps Rally API category names to our internal category names
RALLY_CATEGORY_MAP = {
    "Originality and Authenticity": "originality",
    "Content Alignment": "alignment",
    "Information Accuracy": "accuracy",
    "Campaign Compliance": "compliance",
    "Engagement Potential": "engagement",
    "Technical Quality": "technical",
    "Reply Quality": "reply_quality",
    # Engagement metric categories (not scored, informational)
    "Retweets": None,
    "Likes": None,
    "Replies": None,
    "Followers of Repliers": None,
    "Impressions": None,
}

# ── AI Word Lists ──
AI_WORDS_STRICT = [
    "delve", "leverage", "paradigm", "tapestry", "landscape", "nuance",
    "crucial", "pivotal", "embark", "harness", "foster", "utilize",
    "elevate", "streamline", "empower", "comprehensive", "realm",
    "ecosystem", "flywheel", "unpack", "navigate", "pioneering",
    "transformative", "disrupt", "innovate", "seamless", "robust",
    "revolutionary", "cutting-edge", "game-changer", "synergy",
]

AI_WORDS_RALLY_SPECIFIC = [
    "vibe coding", "skin in the game", "trust layer", "agent era",
    "frictionless",
]

TEMPLATE_PHRASES = [
    "key takeaways", "let's dive in", "nobody is talking about",
    "here's the thing", "picture this", "at the end of the day",
    "hot take", "unpopular opinion", "thread alert",
]

BANNED_STARTERS = [
    "honestly", "like", "kind of wild", "ngl", "tbh", "tbf",
    "fr fr", "lowkey",
]

# ── Tier 1 Banned Words (Instant Fail) ──
TIER1_BANNED = [
    "guaranteed", "100%", "risk-free", "buy now", "get rich",
    "passive income",
]

# ── Contractions (human-like writing) ──
CONTRACTIONS = [
    "don't", "can't", "won't", "isn't", "that's", "i'm", "it's",
    "didn't", "doesn't", "wasn't", "shouldn't", "couldn't", "wouldn't",
    "they're", "you're", "we're", "there's", "here's",
]

# ── Quality Thresholds ──
QUALITY_THRESHOLD = 18.0  # Minimum acceptable score
QUALITY_GATE_REGEN = 2    # Max regeneration attempts
QUALITY_GATE_MIN = 15.0   # Auto-inject fix directive below this

# ── Data Collection Settings ──
DATA_COLLECT_INTERVAL_MIN = 15  # Minutes between data collection cycles
MAX_SUBMISSIONS_PER_FETCH = 200
DATA_RETENTION_DAYS = 30

# ── Generation Settings ──
MAX_GENERATE_LOOPS = 3
VARIATIONS_PER_LOOP = 2
GENERATE_COOLDOWN_SEC = 10  # Seconds between API calls

# ── Knowledge Base Settings ──
MAX_CYCLE_HISTORY = 100
MAX_CALIBRATION_LOG = 200
MAX_PATTERNS_PER_CATEGORY = 50

# ── Log Settings ──
LOG_DIR = BASE_DIR / "campaign_data"
LOG_FORMAT = "%(asctime)s [V7 %(name)s] %(levelname)s: %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# ── Campaign Rotation ──
ACTIVE_CAMPAIGNS = ["campaign_3", "marbmarket-m0", "marbmarket-m1"]

# ── API Endpoints ──
ENDPOINTS = {
    "campaigns": f"{RALLY_API_BASE}/campaigns",
    "campaign_detail": f"{RALLY_API_BASE}/campaigns/{{campaign_id}}",
    "submissions": f"{RALLY_API_BASE}/campaigns/{{campaign_id}}/submissions",
}
