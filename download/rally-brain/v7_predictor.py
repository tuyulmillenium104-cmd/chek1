"""
Rally Brain v7.0 — Score Predictor
Predicts Rally.fun content scores based on learned patterns.

This is the PREDICTION ENGINE:
- Rule-based scoring from extracted Rally patterns
- Feature extraction from content text
- Calibration loop: predict → submit → fetch real score → calibrate

Architecture:
  Features(content) → RuleWeights × Features → Score
  Score → Compare(ActualScore) → Calibrate → Update RuleWeights
"""

import re
import math
import logging
from typing import Dict, List, Optional

from v7_config import (
    CATEGORIES, MAX_TOTAL_SCORE, GRADE_THRESHOLDS,
    AI_WORDS_STRICT, AI_WORDS_RALLY_SPECIFIC, TEMPLATE_PHRASES,
    BANNED_STARTERS, TIER1_BANNED, CONTRACTIONS,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [V7 %(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("predictor")


class FeatureExtractor:
    """
    Extracts quantitative features from content text.
    These features are used by the predictor to estimate scores.
    
    Features include:
    - Structural: length, sentence count, paragraph count
    - Linguistic: AI words, contractions, pronouns, questions
    - Content: numbers, hashtags, mentions, links
    - Readability: sentence variety (coefficient of variation)
    - Compliance: banned words, formatting issues
    """

    def extract(self, content: str) -> dict:
        """Extract all features from content."""
        cl = content.lower()
        sentences = self._get_sentences(content)
        words = content.split()

        features = {
            # ── Structural Features ──
            "char_count": len(content),
            "word_count": len(words),
            "sentence_count": len(sentences),
            "avg_sentence_length": len(words) / max(1, len(sentences)),
            "sentence_cv": self._sentence_cv(sentences),
            "paragraph_count": max(1, content.count("\n\n") + 1),

            # ── Linguistic Features ──
            "ai_word_count": sum(1 for w in AI_WORDS_STRICT if w in cl),
            "ai_rally_word_count": sum(1 for w in AI_WORDS_RALLY_SPECIFIC if w in cl),
            "template_phrase_count": sum(1 for p in TEMPLATE_PHRASES if p in cl),
            "banned_starter": any(content.strip().lower().startswith(s) for s in BANNED_STARTERS),
            "contraction_count": sum(1 for c in CONTRACTIONS if c in cl),
            "pronoun_count": sum(1 for p in ["i ", "i'", "my ", "me ", "we ", "our ", "us "] if p in cl),
            "question_count": cl.count("?"),
            "exclamation_count": cl.count("!"),

            # ── Content Features ──
            "has_number": bool(re.search(r'\d', content)),
            "number_count": len(re.findall(r'\b\d+\.?\d*\b', content)),
            "has_hashtag": bool(re.search(r'#\w+', content)),
            "hashtag_count": len(re.findall(r'#\w+', content)),
            "mention_count": len(re.findall(r'@\w+', content)),
            "has_link": bool(re.search(r'https?://\S+', content)),
            "emoji_count": len(re.findall(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF]', content)),

            # ── Compliance Features ──
            "has_emdash": bool(re.search(r'[\u2014\u2013]|--', content)),
            "has_double_space": bool(re.search(r'  ', content)),
            "has_smart_quotes": bool(re.search(r'[\u201c\u201d\u2018\u2019]', content)),
            "has_markdown": bool(re.search(r'\*\*|__|`', content)),
            "starts_with_mention": content.strip().startswith("@"),
            "tier1_banned_count": sum(1 for w in TIER1_BANNED if w in cl),

            # ── Readability Features ──
            "has_short_sentences": any(len(s.split()) <= 5 for s in sentences),
            "has_long_sentences": any(len(s.split()) > 20 for s in sentences),
            "starts_with_question": content.strip().startswith("?") or content.lstrip()[:1] == "?",
            "ends_with_question": content.rstrip().endswith("?"),

            # ── Engagement Features ──
            "has_generic_question": any(
                q in cl for q in ["thoughts?", "what do you think", "agree?", "your thoughts"]
            ),
            "has_specific_question": bool(
                re.search(r'\b(what|how|why|when|where|which)\b.*\?', content, re.IGNORECASE)
            ),
            "has_vulnerability": any(
                w in cl for w in ["genuinely", "honestly", "not sure", "i can't figure", "admit"]
            ),
            "has_personal_voice": any(
                p in cl for p in ["i ", "i've", "i'm", "my ", "i think", "i feel"]
            ),
        }

        return features

    def _get_sentences(self, content: str) -> list:
        """Split content into sentences."""
        raw = re.split(r'[.!?]+', content)
        return [s.strip() for s in raw if s.strip() and len(s.strip()) > 1]

    def _sentence_cv(self, sentences: list) -> float:
        """Calculate coefficient of variation of sentence lengths."""
        if len(sentences) < 3:
            return 0.0
        lengths = [len(s.split()) for s in sentences]
        mean = sum(lengths) / len(lengths)
        if mean == 0:
            return 0.0
        variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
        return (variance ** 0.5) / mean


class ScorePredictor:
    """
    Predicts Rally.fun scores based on extracted features and learned patterns.
    
    Two scoring modes:
    1. RULE-BASED: Uses extracted Rally scoring patterns (default)
    2. CALIBRATED: Adjusts rule-based scores using calibration data
    
    The predictor gets smarter over time as more calibration data accumulates.
    """

    def __init__(self, knowledge_patterns: dict = None):
        self.knowledge_patterns = knowledge_patterns or {}
        self.extractor = FeatureExtractor()

        # Per-category base scores (from Rally data analysis)
        self.base_scores = {
            "originality": 1.4,
            "alignment": 1.5,
            "accuracy": 1.5,
            "compliance": 1.8,
            "engagement": 3.5,
            "technical": 4.5,
            "reply_quality": 3.0,
        }

        # Calibration offsets (learned from prediction vs actual)
        self.calibration_offsets = {}

    def predict(self, content: str, campaign_config: dict = None) -> dict:
        """
        Predict Rally.fun score for content.
        
        Returns per-category scores, total score, grade, and recommendations.
        """
        features = self.extractor.extract(content)
        campaign_config = campaign_config or {}

        # Predict each category
        category_scores = {}
        for category in CATEGORIES.keys():
            raw = self._predict_category(category, features, content, campaign_config)
            # Apply calibration offset
            offset = self.calibration_offsets.get(category, 0)
            adjusted = raw + offset
            # Clamp to valid range
            max_score = CATEGORIES[category]["max"]
            category_scores[category] = round(max(0, min(max_score, adjusted)), 2)

        # Calculate total and grade
        total = sum(category_scores.values())
        grade = self._calculate_grade(total)

        # Generate recommendations
        recommendations = self._get_recommendations(category_scores, features, content, campaign_config)

        return {
            "category_scores": category_scores,
            "total": round(total, 2),
            "max": MAX_TOTAL_SCORE,
            "grade": grade,
            "features": features,
            "recommendations": recommendations,
        }

    def predict_score(self, content: str, campaign_config: dict = None) -> float:
        """Quick score prediction (just the number)."""
        result = self.predict(content, campaign_config)
        return result["total"]

    def calibrate(self, category: str, predicted: float, actual: float):
        """Update calibration offset for a category."""
        if category not in self.calibration_offsets:
            self.calibration_offsets[category] = 0.0

        # Exponential moving average
        error = actual - predicted
        alpha = 0.3  # Learning rate
        self.calibration_offsets[category] = (
            (1 - alpha) * self.calibration_offsets[category] + alpha * error
        )

        logger.info(
            f"Calibrated {category}: pred={predicted:.2f}, actual={actual:.2f}, "
            f"error={error:.2f}, offset={self.calibration_offsets[category]:.3f}"
        )

    def set_knowledge_patterns(self, patterns: dict):
        """Update patterns from knowledge base."""
        self.knowledge_patterns = patterns

    # ── Category Predictors ──

    def _predict_category(self, category: str, features: dict, content: str, config: dict) -> float:
        """Predict score for a single category."""
        cl = content.lower()

        score = self.base_scores.get(category, 2.0)

        # Apply knowledge-based patterns
        score += self._apply_knowledge(category, content, cl)

        # Apply category-specific rules
        if category == "originality":
            score = self._score_originality(score, features, content, cl)
        elif category == "alignment":
            score = self._score_alignment(score, features, content, cl, config)
        elif category == "accuracy":
            score = self._score_accuracy(score, features, content, cl)
        elif category == "compliance":
            score = self._score_compliance(score, features, content, cl, config)
        elif category == "engagement":
            score = self._score_engagement(score, features, content, cl)
        elif category == "technical":
            score = self._score_technical(score, features, content, cl)
        elif category == "reply_quality":
            score = self._score_reply_quality(score, features, content, cl)

        return score

    def _apply_knowledge(self, category: str, content: str, cl: str) -> float:
        """Apply learned patterns from knowledge base."""
        adjustment = 0.0
        cat_patterns = self.knowledge_patterns.get(category, {})

        # Negative patterns (penalties)
        for p in cat_patterns.get("negative", []):
            rule = p.get("rule", "").lower()
            confidence = p.get("confidence", 0.7)

            if confidence < 0.7:
                continue

            if self._rule_matches(rule, cl):
                adjustment -= 0.2 * confidence

        # Positive patterns (bonuses)
        for p in cat_patterns.get("positive", []):
            rule = p.get("rule", "").lower()
            confidence = p.get("confidence", 0.7)

            if confidence < 0.8:
                continue

            if self._rule_matches(rule, cl):
                adjustment += 0.1 * confidence

        return adjustment

    def _rule_matches(self, rule: str, content_lower: str) -> bool:
        """Check if a rule matches against content."""
        # Extract keywords from rule
        keywords = re.findall(r'\b\w{4,}\b', rule)
        if not keywords:
            return False

        # Match if enough keywords are present
        matches = sum(1 for kw in keywords if kw in content_lower)
        return matches >= max(1, len(keywords) // 3)

    # ── Category Scoring Functions ──

    def _score_originality(self, score: float, f: dict, content: str, cl: str) -> float:
        """Score originality and authenticity."""
        # AI word penalties
        if f["ai_word_count"] > 0:
            score -= min(0.8, f["ai_word_count"] * 0.2)
        if f["ai_rally_word_count"] > 0:
            score -= min(0.4, f["ai_rally_word_count"] * 0.2)

        # Template phrase penalties
        if f["template_phrase_count"] > 0:
            score -= min(0.5, f["template_phrase_count"] * 0.25)

        # Banned starter penalty
        if f["banned_starter"]:
            score -= 0.3

        # Sentence variety bonus (natural writing)
        if f["sentence_cv"] >= 0.3:
            score += 0.15
        elif f["sentence_cv"] < 0.15:
            score -= 0.3

        # Contraction bonus (human-like)
        if f["contraction_count"] >= 3:
            score += 0.15
        elif f["contraction_count"] >= 1:
            score += 0.05

        # Personal voice bonus
        if f["has_personal_voice"]:
            score += 0.1

        # Tier 1 banned = instant fail
        if f["tier1_banned_count"] > 0:
            score = 0.0

        return score

    def _score_alignment(self, score: float, f: dict, content: str, cl: str, config: dict) -> float:
        """Score content alignment with campaign."""
        compliance = config.get("compliance_checks", {})

        # Check project name
        project_name = compliance.get("project_name", "")
        if project_name and project_name.lower() in cl:
            score += 0.2

        # Check unique markers
        markers = compliance.get("unique_markers", [])
        marker_count = sum(1 for m in markers if m.lower() in cl)
        if marker_count >= 3:
            score += 0.3
        elif marker_count >= 1:
            score += 0.15

        # Check keywords
        keywords = compliance.get("project_keywords", [])
        keyword_count = sum(1 for k in keywords if k.lower() in cl)
        if keyword_count >= 4:
            score += 0.2
        elif keyword_count >= 2:
            score += 0.1

        # Style matching
        style = config.get("style", "")
        if "banger" in style.lower() or "short" in style.lower():
            if f["avg_sentence_length"] > 15:
                score -= 0.2  # Too long for banger style
            elif f["avg_sentence_length"] < 10:
                score += 0.1  # Good for banger

        return score

    def _score_accuracy(self, score: float, f: dict, content: str, cl: str) -> float:
        """Score information accuracy."""
        # Absolute/exaggerated claims
        abs_words = ["zero cost", "free", "always", "never", "everyone", "nobody",
                     "guaranteed", "impossible", "100%", "infinite"]
        abs_found = [w for w in abs_words if w in cl]
        if abs_found:
            score -= min(1.0, len(abs_found) * 0.3)

        # Vague claims
        vague_words = ["figured it out", "game changer", "revolutionary", "transform"]
        vague_found = [w for w in vague_words if w in cl]
        if vague_found:
            score -= min(0.4, len(vague_found) * 0.2)

        # Specificity bonus (numbers, data)
        if f["has_number"] and f["number_count"] >= 2:
            score += 0.2
        elif f["has_number"]:
            score += 0.1

        return score

    def _score_compliance(self, score: float, f: dict, content: str, cl: str, config: dict) -> float:
        """Score campaign compliance."""
        compliance = config.get("compliance_checks", {})

        # Must-include checks
        must_include = compliance.get("must_include", [])
        for item in must_include:
            if item not in content and item not in cl:
                score -= 0.5  # Major penalty for missing required items

        # Formatting violations
        if f["has_emdash"]:
            score -= 1.0
        if f["has_hashtag"]:
            score -= 0.8
        if f["starts_with_mention"]:
            score -= 0.5
        if f["has_double_space"]:
            score -= 0.3
        if f["has_smart_quotes"]:
            score -= 0.3
        if f["has_markdown"]:
            score -= 0.3

        # Length check (Rally hidden limit ~1200 chars)
        if f["char_count"] > 1200:
            score -= 0.5
        elif f["char_count"] < 100:
            score -= 0.5

        # Tier 1 banned words = compliance fail
        if f["tier1_banned_count"] > 0:
            score = 0.0

        return score

    def _score_engagement(self, score: float, f: dict, content: str, cl: str) -> float:
        """Score engagement potential."""
        sentences = f["sentence_count"]

        # Opening hook analysis
        first_sentence = content.strip().split(".")[0]
        first_wc = len(first_sentence.split())
        if 3 <= first_wc <= 9:
            score += 0.4  # Good hook length
        elif first_wc > 15:
            score -= 0.3  # Too long for opening
        elif first_wc <= 2:
            score += 0.2  # Very short can work

        # Question/CTA analysis
        if f["ends_with_question"]:
            if f["has_generic_question"]:
                score -= 0.4  # Generic question penalty
            elif f["has_specific_question"]:
                score += 0.5  # Specific question bonus
            else:
                score += 0.2  # Any question is better than none
        else:
            score -= 0.5  # No question at all

        # Additional question bonuses
        if f["question_count"] >= 2 and f["has_specific_question"]:
            score += 0.2

        # Personal vulnerability bonus
        if f["has_vulnerability"]:
            score += 0.3

        # Personal voice bonus
        if f["has_personal_voice"]:
            score += 0.2
        elif f["pronoun_count"] >= 2:
            score += 0.1

        # Sentence variety
        if f["sentence_cv"] >= 0.35:
            score += 0.15
        elif f["sentence_cv"] < 0.15:
            score -= 0.2

        # Multi-paragraph bonus
        if f["paragraph_count"] >= 2:
            score += 0.1

        return score

    def _score_technical(self, score: float, f: dict, content: str, cl: str) -> float:
        """Score technical quality."""
        # Formatting issues
        if f["has_double_space"]:
            score -= 0.5
        if f["has_smart_quotes"]:
            score -= 0.5
        if f["has_markdown"]:
            score -= 0.5
        if f["has_emdash"]:
            score -= 0.3

        # Sentence variety
        cv = f["sentence_cv"]
        if cv < 0.15:
            score -= 1.5  # Very monotonous
        elif cv < 0.25:
            score -= 0.5
        elif cv > 0.4:
            score += 0.2  # Good variety

        # Clean formatting bonus
        if (not f["has_double_space"] and not f["has_smart_quotes"]
                and not f["has_markdown"] and not f["has_emdash"]):
            score += 0.2

        # Length appropriateness
        if 200 <= f["char_count"] <= 1200:
            score += 0.1

        return score

    def _score_reply_quality(self, score: float, f: dict, content: str, cl: str) -> float:
        """
        Score reply quality.
        Note: We can't predict replies accurately since they're external.
        Base this on how the content INVITES quality replies.
        """
        # Specific questions invite better replies
        if f["has_specific_question"]:
            score += 0.5
        elif f["has_generic_question"]:
            score -= 0.3

        # Content that educates invites thoughtful replies
        if f["has_number"] and f["number_count"] >= 2:
            score += 0.3

        # Controversial/interesting claims invite discussion
        debate_words = ["disagree", "wrong", "overrated", "underrated", "debate", "controversial"]
        if any(w in cl for w in debate_words):
            score += 0.3

        # Technical content invites expert replies
        tech_words = ["mechanism", "protocol", "tokenomics", "yield", "liquidity", "staking"]
        if any(w in cl for w in tech_words):
            score += 0.2

        return score

    # ── Helpers ──

    def _calculate_grade(self, total: float) -> str:
        """Calculate grade from total score."""
        for threshold, grade in GRADE_THRESHOLDS:
            if total >= threshold:
                return grade
        return "D"

    def _get_recommendations(
        self, scores: dict, features: dict, content: str, config: dict
    ) -> List[str]:
        """Generate specific recommendations to improve score."""
        recs = []
        cl = content.lower()
        maxes = {cat: CATEGORIES[cat]["max"] for cat in scores}

        for cat, score in scores.items():
            pct = score / maxes[cat] if maxes[cat] > 0 else 0
            if pct >= 0.85:
                continue  # Good enough

            if cat == "originality" and pct < 0.7:
                if features["ai_word_count"] > 0:
                    ai_words_found = [w for w in AI_WORDS_STRICT if w in cl]
                    recs.append(f"ORIGINALITY: Remove AI words: {', '.join(ai_words_found[:3])}")
                if features["template_phrase_count"] > 0:
                    recs.append(f"ORIGINALITY: Remove template phrases")
                if features["sentence_cv"] < 0.2:
                    recs.append("ORIGINALITY: Vary sentence lengths for natural rhythm")

            elif cat == "alignment" and pct < 0.7:
                markers = (config.get("compliance_checks", {}).get("unique_markers", []))
                missing = [m for m in markers if m.lower() not in cl]
                if missing:
                    recs.append(f"ALIGNMENT: Add unique markers: {', '.join(missing[:3])}")

            elif cat == "accuracy" and pct < 0.7:
                recs.append("ACCURACY: Use specific, verifiable claims. Avoid absolutes.")

            elif cat == "compliance" and pct < 0.8:
                must_include = config.get("compliance_checks", {}).get("must_include", [])
                missing = [m for m in must_include if m not in content]
                if missing:
                    recs.append(f"COMPLIANCE: Missing required: {', '.join(missing)}")
                if features["has_emdash"]:
                    recs.append("COMPLIANCE: Remove em-dashes")
                if features["has_hashtag"]:
                    recs.append("COMPLIANCE: Remove hashtags")
                if features["starts_with_mention"]:
                    recs.append("COMPLIANCE: Don't start with @mention")

            elif cat == "engagement" and pct < 0.7:
                if not features["ends_with_question"]:
                    recs.append("ENGAGEMENT: End with a specific question")
                elif features["has_generic_question"]:
                    recs.append("ENGAGEMENT: Replace generic question with specific one")
                if not features["has_personal_voice"]:
                    recs.append("ENGAGEMENT: Add personal perspective")

            elif cat == "technical" and pct < 0.8:
                if features["has_double_space"]:
                    recs.append("TECHNICAL: Remove double spaces")
                if features["has_smart_quotes"]:
                    recs.append("TECHNICAL: Use straight quotes")

        return recs[:8]  # Max 8 recommendations


# ── CLI ──

def main():
    import argparse
    import json
    parser = argparse.ArgumentParser(description="Rally Brain v7.0 Score Predictor")
    parser.add_argument("--content", "-c", type=str, help="Content to predict")
    parser.add_argument("--file", "-f", type=str, help="Read content from file")
    parser.add_argument("--campaign", type=str, default="", help="Campaign ID for config")

    args = parser.parse_args()

    if args.file:
        from pathlib import Path
        content = Path(args.file).read_text()
    elif args.content:
        content = args.content
    else:
        # Demo mode
        content = """Spent the weekend digging into the vote-escrow model again. It is fascinating how locking tokens for longer periods actually controls the entire reward flow of a DEX. You lock MARB, you get veTokens to vote on emissions, and protocols pay bribes to direct those emissions to their pools. MarbMarket is bringing this exact ve(3,3) mechanic to MegaETH. Following @RallyOnChain for updates. Check the details at x.com/Marb_market. Do you prefer pure AMM pools or the vote-escrow bribery model?"""

    predictor = ScorePredictor()

    # Load knowledge patterns if available
    from v7_knowledge import V7KnowledgeBase
    kb = V7KnowledgeBase()
    patterns = {cat: kb.db["patterns"].get(cat, {}) for cat in CATEGORIES.keys()}
    predictor.set_knowledge_patterns(patterns)

    # Load campaign config if specified
    campaign_config = {}
    if args.campaign:
        from pathlib import Path
        config_file = Path(f"campaigns/{args.campaign}.json")
        if config_file.exists():
            import json
            campaign_config = json.loads(config_file.read_text())

    result = predictor.predict(content, campaign_config)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
