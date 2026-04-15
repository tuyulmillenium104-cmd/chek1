"""
Rally Brain v7.0 — Pattern Analyzer
Extracts scoring patterns from Rally.fun submission analysis text.

This is the BRAIN of the system — it reads Rally's own scoring analysis
and distills them into actionable rules for content generation.

Each submission has per-category analysis text explaining WHY a score
was given. This module extracts those rules into a structured format.
"""

import re
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional
from collections import Counter

from v7_config import CATEGORIES, MAX_PATTERNS_PER_CATEGORY

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [V7 %(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("analyzer")


class PatternExtractor:
    """
    Extracts scoring patterns from Rally's analysis text.
    
    For each category, Rally provides analysis text like:
    "The tweet provides a detailed and personal account..." (positive)
    "The tweet lacks specificity and uses vague language..." (negative)
    
    This module extracts actionable rules from these texts.
    """

    # ── Positive Pattern Signals ──
    POSITIVE_SIGNALS = {
        "originality": [
            "personal", "genuine", "unique", "fresh", "distinctive",
            "authentic", "original", "creative", "novel", "insightful",
            "specific examples", "personal anecdote", "personal touch",
            "stands out", "fresh perspective", "distinctive voice",
            "natural", "conversational", "human-like",
        ],
        "alignment": [
            "aligns closely", "tightly focused", "directly relevant",
            "closely with campaign", "strong alignment", "on-topic",
            "addresses the core", "demonstrates understanding",
            "clearly connected", "well-integrated",
        ],
        "accuracy": [
            "accurately describes", "correctly states", "factually correct",
            "precise", "verifiable", "well-researched", "specific",
            "concrete details", "quantifiable", "measurable",
        ],
        "compliance": [
            "complies with", "mention is present", "satisfying the mandatory",
            "follows the rules", "meets the requirements",
            "proper tagging", "required elements", "correct format",
        ],
        "engagement": [
            "strong hook", "compelling", "inviting", "thought-provoking",
            "generates curiosity", "encourages discussion", "direct question",
            "personal voice", "relatable", "conversational tone",
            "emotional resonance", "vulnerability",
        ],
        "technical": [
            "solid", "clean", "well-structured", "proper grammar",
            "correct punctuation", "appropriate length", "well-formatted",
            "coherent", "clear structure", "natural flow",
        ],
        "reply_quality": [
            "substantive", "thoughtful", "in-depth", "specific",
            "demonstrates understanding", "meaningful", "constructive",
            "adds value", "relevant follow-up",
        ],
    }

    # ── Negative Pattern Signals ──
    NEGATIVE_SIGNALS = {
        "originality": [
            "generic", "template", "formulaic", "derivative", "overlap",
            "similar to", "repetitive", "cliched", "overused",
            "ai-generated", "bot-like", "manufactured",
            "promotional tone", "overly promotional", "marketing speak",
        ],
        "alignment": [
            "vague", "broad", "generic statements", "off-topic",
            "loosely connected", "tangential", "not directly relevant",
            "fails to connect", "lacks focus", "superficial",
        ],
        "accuracy": [
            "exaggerated", "absolute", "unverifiable", "inaccurate",
            "misleading", "overstated", "vague claims", "unsubstantiated",
            "not factually", "incorrect", "imprecise",
        ],
        "compliance": [
            "violates", "missing", "fails to include", "does not contain",
            "incorrect format", "exceeds limit", "too long",
            "starts with", "improper", "formatting issue",
            "hashtag", "em-dash", "extra space",
        ],
        "engagement": [
            "no cta", "no hook", "weak opening", "generic question",
            "lacks invitation", "no explicit", "fails to engage",
            "rhetorical", "thoughts?", "what do you think",
            "no personal voice", "impersonal",
        ],
        "technical": [
            "extra space", "double space", "formatting issue",
            "incorrect punctuation", "grammar error", "spelling",
            "poorly structured", "run-on", "fragment",
            "uniform", "monotonous", "repetitive structure",
        ],
        "reply_quality": [
            "generic", "shallow", "low effort", "one-word",
            "no substantive", "spam", "irrelevant",
            "copy-paste", "automated", "template reply",
        ],
    }

    def __init__(self):
        self._signal_cache = {}

    def extract_patterns_from_submission(self, submission: dict) -> List[dict]:
        """
        Extract all scoring patterns from a single normalized submission.
        
        Each pattern describes WHAT Rally penalizes or rewards and WHY.
        """
        patterns = []
        analysis = submission.get("category_analysis", {})
        scores = submission.get("category_scores", {})

        for category in CATEGORIES.keys():
            cat_score = scores.get(category, 0)
            cat_max = CATEGORIES[category]["max"]
            analysis_text = analysis.get(category, "")

            if not analysis_text:
                continue

            # Determine if this is a positive or negative example
            score_pct = cat_score / cat_max if cat_max > 0 else 0

            if score_pct >= 0.8:
                # High score — extract positive patterns
                patterns.extend(
                    self._extract_positive_patterns(category, analysis_text, score_pct)
                )
            elif score_pct < 0.6:
                # Low score — extract negative patterns (violations)
                patterns.extend(
                    self._extract_negative_patterns(category, analysis_text, score_pct)
                )

        return patterns

    def extract_patterns_from_submissions(self, submissions: List[dict]) -> Dict[str, List[dict]]:
        """
        Extract patterns from multiple submissions, grouped by category.
        Returns patterns with deduplication and confidence scoring.
        """
        all_patterns = {cat: [] for cat in CATEGORIES.keys()}
        pattern_counts = Counter()  # Track pattern frequency

        for sub in submissions:
            patterns = self.extract_patterns_from_submission(sub)
            for p in patterns:
                key = f"{p['category']}:{p['rule'][:60]}"
                pattern_counts[key] += 1
                all_patterns[p["category"]].append(p)

        # Boost confidence for frequently occurring patterns
        for cat in all_patterns:
            for p in all_patterns[cat]:
                key = f"{p['category']}:{p['rule'][:60]}"
                count = pattern_counts.get(key, 1)
                if count >= 3:
                    p["confidence"] = min(1.0, p["confidence"] + 0.1 * (count - 2))
                p["frequency"] = count

        # Deduplicate: keep highest confidence version of each rule
        deduped = {}
        for cat in all_patterns:
            for p in all_patterns[cat]:
                rule_key = p["rule"][:80]
                if rule_key not in deduped or p["confidence"] > deduped[rule_key]["confidence"]:
                    deduped[rule_key] = p
            all_patterns[cat] = sorted(
                deduped.values(), key=lambda x: x["confidence"], reverse=True
            )[:MAX_PATTERNS_PER_CATEGORY]

        logger.info(
            f"Extracted patterns: "
            + ", ".join(f"{cat}={len(ps)}" for cat, ps in all_patterns.items() if ps)
        )

        return all_patterns

    def analyze_competitive_landscape(self, submissions: List[dict]) -> dict:
        """
        Analyze the competitive landscape from collected submissions.
        Returns insights about what works and what doesn't in real Rally submissions.
        """
        if not submissions:
            return {"error": "No submissions to analyze"}

        # Filter submissions with scores
        scored = [s for s in submissions if s.get("total_score", 0) > 0]
        if not scored:
            return {"error": "No scored submissions"}

        scores = [s["total_score"] for s in scored]
        sorted_subs = sorted(scored, key=lambda x: x["total_score"], reverse=True)

        # Top performers analysis
        top_subs = sorted_subs[:10]
        bottom_subs = sorted_subs[-10:]

        # Category analysis for top vs bottom
        top_cat_avgs = self._category_averages(top_subs)
        bottom_cat_avgs = self._category_averages(bottom_subs)

        # Identify category gaps (where most submissions lose points)
        category_gaps = {}
        all_cat_avgs = self._category_averages(scored)
        for cat, avg in all_cat_avgs.items():
            max_score = CATEGORIES[cat]["max"]
            gap = max_score - avg
            if gap > max_score * 0.3:  # More than 30% gap
                category_gaps[cat] = {
                    "avg": avg,
                    "max": max_score,
                    "gap_pct": round(gap / max_score * 100, 1),
                }

        # Common analysis themes from top performers
        top_themes = self._extract_themes(top_subs, positive=True)
        bottom_themes = self._extract_themes(bottom_subs, positive=False)

        return {
            "total_analyzed": len(scored),
            "score_stats": {
                "min": round(min(scores), 2),
                "max": round(max(scores), 2),
                "avg": round(sum(scores) / len(scores), 2),
                "median": round(sorted(scores)[len(scores) // 2], 2),
            },
            "grade_distribution": self._grade_distribution(scores),
            "top_performer_averages": top_cat_avgs,
            "bottom_performer_averages": bottom_cat_avgs,
            "category_gaps": category_gaps,
            "what_works": top_themes[:10],
            "what_fails": bottom_themes[:10],
            "recommendations": self._generate_recommendations(
                category_gaps, top_themes, bottom_themes
            ),
        }

    # ── Private Methods ──

    def _extract_positive_patterns(self, category: str, text: str, score_pct: float) -> List[dict]:
        """Extract patterns from high-scoring analysis text."""
        patterns = []
        text_lower = text.lower()

        signals = self.POSITIVE_SIGNALS.get(category, [])
        found_signals = [s for s in signals if s in text_lower]

        if found_signals:
            # Extract the context around each signal
            for signal in found_signals[:3]:  # Max 3 signals per analysis
                context = self._extract_context(text, signal)
                patterns.append({
                    "category": category,
                    "type": "positive",
                    "signal": signal,
                    "rule": f"Include {signal} for higher {category}",
                    "context": context[:200],
                    "score_when_present": round(score_pct * CATEGORIES[category]["max"], 2),
                    "confidence": min(0.9, score_pct),
                    "discovered_at": datetime.now(timezone.utc).isoformat(),
                })

        return patterns

    def _extract_negative_patterns(self, category: str, text: str, score_pct: float) -> List[dict]:
        """Extract patterns from low-scoring analysis text."""
        patterns = []
        text_lower = text.lower()

        signals = self.NEGATIVE_SIGNALS.get(category, [])
        found_signals = [s for s in signals if s in text_lower]

        if found_signals:
            for signal in found_signals[:3]:
                context = self._extract_context(text, signal)
                patterns.append({
                    "category": category,
                    "type": "negative",
                    "signal": signal,
                    "rule": f"Avoid {signal} — drops {category}",
                    "context": context[:200],
                    "score_when_present": round(score_pct * CATEGORIES[category]["max"], 2),
                    "confidence": min(0.9, 1.0 - score_pct),
                    "discovered_at": datetime.now(timezone.utc).isoformat(),
                })

        return patterns

    def _extract_context(self, text: str, signal: str) -> str:
        """Extract the sentence containing a signal word."""
        text_lower = text.lower()
        idx = text_lower.find(signal)
        if idx == -1:
            return text[:200]

        # Find sentence boundaries
        start = max(0, text.rfind(".", 0, idx) + 1)
        end = text.find(".", idx)
        if end == -1:
            end = len(text)
        else:
            end += 1

        return text[start:end].strip()

    def _extract_themes(self, submissions: List[dict], positive: bool = True) -> List[str]:
        """Extract recurring themes from analysis text."""
        themes = []
        signals = (
            {cat: self.POSITIVE_SIGNALS[cat] for cat in self.POSITIVE_SIGNALS}
            if positive
            else {cat: self.NEGATIVE_SIGNALS[cat] for cat in self.NEGATIVE_SIGNALS}
        )

        signal_counts = Counter()
        for sub in submissions:
            analysis = sub.get("category_analysis", {})
            for cat, cat_signals in signals.items():
                text = (analysis.get(cat, "") or "").lower()
                for signal in cat_signals:
                    if signal in text:
                        signal_counts[f"{cat}:{signal}"] += 1

        # Return top themes
        for theme, count in signal_counts.most_common(15):
            cat, signal = theme.split(":", 1)
            themes.append(f"[{cat}] {signal} (x{count})")

        return themes

    def _generate_recommendations(
        self, category_gaps: dict, top_themes: list, bottom_themes: list
    ) -> List[str]:
        """Generate actionable recommendations based on analysis."""
        recs = []

        # Category gap recommendations
        for cat, gap in sorted(
            category_gaps.items(), key=lambda x: x[1]["gap_pct"], reverse=True
        ):
            max_score = gap["max"]
            recs.append(
                f"{cat.upper()} has the biggest gap ({gap['gap_pct']}% room for improvement). "
                f"Current avg: {gap['avg']}/{max_score}. "
                f"Focus on this category for maximum score gain."
            )

        # Top theme recommendations
        if top_themes:
            recs.append(f"What works in top submissions: {top_themes[0]}")

        if bottom_themes:
            recs.append(f"What fails in bottom submissions: {bottom_themes[0]}")

        return recs

    def _category_averages(self, subs: List[dict]) -> dict:
        """Calculate per-category averages for a list of submissions."""
        avgs = {}
        for cat in CATEGORIES.keys():
            vals = [s["category_scores"].get(cat, 0) for s in subs if cat in s.get("category_scores", {})]
            if vals:
                avgs[cat] = round(sum(vals) / len(vals), 2)
        return avgs

    def _grade_distribution(self, scores: list) -> dict:
        """Calculate grade distribution."""
        from v7_config import GRADE_THRESHOLDS
        dist = {}
        prev_threshold = float("inf")
        for threshold, grade in GRADE_THRESHOLDS:
            count = sum(1 for s in scores if prev_threshold > s >= threshold)
            dist[grade] = count
            prev_threshold = threshold
        return dist
