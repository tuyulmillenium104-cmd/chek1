"""
Score Predictor — Predict Rally scores based on learned patterns.

Uses programmatic checks + learned patterns from knowledge base.
NOT a judge panel. A data-driven predictor that gets better with calibration.
"""

import re
from typing import Dict, Optional

# Static detection lists
AI_WORDS = [
    "delve", "leverage", "paradigm", "tapestry", "landscape", "nuance",
    "crucial", "pivotal", "embark", "harness", "foster", "utilize",
    "elevate", "streamline", "empower", "comprehensive", "realm",
    "ecosystem", "flywheel", "unpack", "navigate", "pioneering",
    "transformative", "disrupt", "innovate"
]

TEMPLATE_PHRASES = [
    "key takeaways", "let's dive in", "nobody is talking about",
    "here's the thing", "picture this", "at the end of the day",
    "hot take", "unpopular opinion", "thread alert", "game changer"
]

BANNED_STARTERS = [
    "honestly", "like", "kind of wild", "ngl", "tbh", "tbf",
    "fr fr", "lowkey"
]

AI_PATTERN_PHRASES = [
    "on the other hand", "at its core", "the reality is",
    "it goes without saying", "make no mistake", "it's worth noting"
]


class ScorePredictor:
    def __init__(self, knowledge_patterns: list = None):
        self.knowledge_patterns = knowledge_patterns or []

    def predict(self, content: str, campaign_style: str = "",
                campaign_rules: str = "") -> Dict[str, float]:
        """Predict score for content across 6 Rally categories."""
        cl = content.lower()

        scores = {
            "originality": self._predict_originality(content, cl),
            "alignment": self._predict_alignment(content, cl, campaign_style),
            "accuracy": self._predict_accuracy(content, cl),
            "compliance": self._predict_compliance(content, cl, campaign_rules),
            "engagement": self._predict_engagement(content, cl),
            "technical": self._predict_technical(content, cl),
        }
        scores["total"] = round(sum(scores.values()), 1)
        scores["max"] = 18
        return scores

    def get_recommendations(self, content: str, scores: Dict[str, float],
                            campaign_style: str = "") -> list:
        """Get specific recommendations to improve score."""
        recs = []
        cl = content.lower()

        if scores["originality"] < 2:
            ai_found = [w for w in AI_WORDS if w in cl]
            if ai_found:
                recs.append(f"Remove AI-sounding words: {', '.join(ai_found[:3])}")
            template_found = [p for p in TEMPLATE_PHRASES if p in cl]
            if template_found:
                recs.append(f"Remove template phrases: {', '.join(template_found[:3])}")
            if self._sentence_cv(content) < 0.2:
                recs.append("Vary sentence lengths (current text too uniform)")

        if scores["alignment"] < 2:
            if "@rallyonchain" in cl:
                recs.append("Make Rally mention more concrete/specific (avoid vague phrases like 'figured it out')")
            if campaign_style == "banger" or "banger" in campaign_style.lower():
                recs.append("Match tone to banger style: short, bold, declarative")

        if scores["accuracy"] < 2:
            absolute = ["zero cost", "free", "always", "never", "everyone", "nobody"]
            found = [w for w in absolute if w in cl]
            if found:
                recs.append(f"Soften absolute claims: {', '.join(found)}. Use 'almost', 'nearly', or specific numbers instead.")

        if scores["compliance"] < 2:
            if "—" in content or "–" in content or "--" in content:
                recs.append("Remove em-dashes")
            if re.search(r'#\w+', content):
                recs.append("Remove hashtags")
            if content.strip().startswith("@"):
                recs.append("Don't start with @mention")
            if "  " in content:
                recs.append("Remove extra spaces")
            if len(content) > 1200:
                recs.append(f"Content too long ({len(content)} chars). Aim for under 1200.")

        if scores["engagement"] < 5:
            if "?" not in content:
                recs.append("Add a specific question or response hook at the end")
            else:
                if "what do you think" in cl or "thoughts?" in cl:
                    recs.append("Replace generic question with specific one related to campaign theme")

        if scores["technical"] < 5:
            if self._sentence_cv(content) < 0.2:
                recs.append("Mix short and long sentences for natural rhythm")
            if any(c in content for c in ['\u201c', '\u201d', '\u2018', '\u2019']):
                recs.append("Replace smart quotes with straight quotes")

        return recs

    # ── Category Predictors ──

    def _predict_originality(self, content: str, cl: str) -> float:
        score = 2.0

        # AI words
        ai_found = [w for w in AI_WORDS if w in cl]
        if ai_found:
            score -= min(0.8, len(ai_found) * 0.2)

        # Template phrases
        tpl_found = [p for p in TEMPLATE_PHRASES if p in cl]
        if tpl_found:
            score -= min(0.6, len(tpl_found) * 0.3)

        # AI pattern phrases
        pattern_found = [p for p in AI_PATTERN_PHRASES if p in cl]
        if pattern_found:
            score -= min(0.4, len(pattern_found) * 0.2)

        # Banned starters
        for starter in BANNED_STARTERS:
            if content.strip().lower().startswith(starter):
                score -= 0.3

        # Sentence variety bonus
        if self._sentence_cv(content) >= 0.3:
            score = min(2.0, score + 0.1)

        # Contraction bonus
        contractions = ["don't", "can't", "won't", "isn't", "that's", "i'm", "it's",
                        "didn't", "doesn't", "wasn't", "shouldn't"]
        if sum(1 for c in contractions if c in cl) >= 2:
            score = min(2.0, score + 0.1)

        # Knowledge-based penalty
        for p in self.knowledge_patterns:
            if (p.get("category") == "originality_markers" and
                    p.get("confidence", 0) > 0.7 and
                    p.get("trigger", "").lower() in cl):
                score -= 0.3

        return max(0, min(2, round(score, 1)))

    def _predict_alignment(self, content: str, cl: str, style: str) -> float:
        score = 2.0

        if "@rallyonchain" in cl:
            vague = ["figured it out", "gets it", "understands"]
            concrete = ["pays", "rewards", "protocol", "earn", "distribution",
                        "reach", "campaign", "on-chain", "onchain", "scoring", "evaluate"]

            if any(v in cl for v in vague) and not any(c in cl for c in concrete):
                score -= 0.5
            elif any(c in cl for c in concrete):
                score = min(2.0, score + 0.1)

        # Style-tone check
        if style:
            sl = style.lower()
            if "banger" in sl or "high" in sl:
                # Banger should be short/punchy
                sentences = self._get_sentences(content)
                if sentences:
                    avg_len = sum(len(s.split()) for s in sentences) / len(sentences)
                    if avg_len > 15:
                        score -= 0.3  # Too long for banger

        return max(0, min(2, round(score, 1)))

    def _predict_accuracy(self, content: str, cl: str) -> float:
        score = 2.0

        absolute_words = ["zero cost", "free", "always", "never", "everyone",
                          "nobody", "guaranteed", "impossible", "100%", "infinite"]
        found = [w for w in absolute_words if w in cl]
        if found:
            score -= min(1.0, len(found) * 0.3)

        vague_claims = ["figured it out", "game changer", "revolutionary"]
        if any(v in cl for v in vague_claims):
            score -= 0.3

        # Knowledge-based patterns
        for p in self.knowledge_patterns:
            if (p.get("category") == "claim_specificity" and
                    p.get("confidence", 0) > 0.7 and
                    "drops" in p.get("effect", "").lower() and
                    p.get("trigger", "").lower() in cl):
                score -= 0.3

        return max(0, min(2, round(score, 1)))

    def _predict_compliance(self, content: str, cl: str, rules: str) -> float:
        score = 2.0

        # Em-dashes
        if "\u2014" in content or "\u2013" in content or "--" in content:
            score -= 1.0

        # Hashtags
        if re.search(r'#\w+', content):
            score -= 1.0

        # Starts with mention
        if content.strip().startswith("@"):
            score -= 1.0

        # Extra spaces
        if "  " in content:
            score -= 0.5

        # Hidden character limit
        if len(content) > 1200:
            score -= 0.5

        # Smart quotes
        if any(c in content for c in ["\u201c", "\u201d", "\u2018", "\u2019"]):
            score -= 0.3

        return max(0, min(2, round(score, 1)))

    def _predict_engagement(self, content: str, cl: str) -> float:
        score = 4.0

        sentences = self._get_sentences(content)
        if sentences:
            first = sentences[0]
            wc = len(first.split())
            if 3 <= wc <= 9:
                score += 0.5
            elif wc > 15:
                score -= 0.5
            elif wc == 1:
                score += 0.3  # Very short hook can work

        # CTA / response hook
        if "?" in content:
            if any(w in cl for w in ["what", "how", "why"]):
                score += 0.5
            elif "what do you think" in cl or "thoughts?" in cl:
                score -= 0.5
            else:
                score += 0.2
        else:
            score -= 0.5  # No hook

        # Vulnerability
        if any(w in cl for w in ["genuinely", "honestly", "i can't figure", "not sure"]):
            score += 0.3

        # Meta-self-awareness (unique pattern)
        if any(w in cl for w in ["this tweet", "this post", "this thread"]):
            score += 0.3

        return max(0, min(5, round(score, 1)))

    def _predict_technical(self, content: str, cl: str) -> float:
        score = 5.0

        # Sentence variety
        cv = self._sentence_cv(content)
        if cv < 0.15:
            score -= 1.5  # Very monotonous
        elif cv < 0.25:
            score -= 0.5
        elif cv > 0.35:
            score += 0.2  # Good variety

        # Smart quotes
        if any(c in content for c in ["\u201c", "\u201d", "\u2018", "\u2019"]):
            score -= 0.5

        # Markdown
        if "**" in content or "__" in content:
            score -= 0.5

        # Extra spaces
        if "  " in content:
            score -= 0.5

        return max(0, min(5, round(score, 1)))

    # ── Utilities ──

    def _get_sentences(self, content: str) -> list:
        raw = re.split(r'[.!?]+', content)
        return [s.strip() for s in raw if s.strip() and len(s.strip()) > 1]

    def _sentence_cv(self, content: str) -> float:
        sentences = self._get_sentences(content)
        if len(sentences) < 3:
            return 0.0
        lengths = [len(s.split()) for s in sentences]
        mean = sum(lengths) / len(lengths)
        if mean == 0:
            return 0.0
        variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
        return (variance ** 0.5) / mean
