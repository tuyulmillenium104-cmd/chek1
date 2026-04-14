"""
Pattern Extractor — Extract semantic patterns from Rally AI analysis text.

Each submission from Rally has analysis text per category explaining
WHY a score was given. This module extracts actionable patterns from
those explanations.
"""

import re
from typing import List, Dict


class PatternExtractor:
    """Extract semantic patterns from Rally submission analysis."""

    def extract_from_submission(self, submission: dict) -> List[dict]:
        """Extract all patterns from a single submission."""
        patterns = []
        analysis_list = submission.get("analysis", [])
        if not analysis_list:
            return patterns

        content = submission.get("content", "")
        content_lower = content.lower()

        for item in analysis_list:
            category = item.get("category", "")
            score_raw = self._parse_atto(item.get("atto_score", "0"))
            score_max = self._parse_atto(item.get("atto_max_score", "0"))
            analysis_text = item.get("analysis", "")

            if not analysis_text or score_max == 0:
                continue

            score_pct = score_raw / score_max

            extracted = self._extract_by_category(
                category, analysis_text, score_pct, content, content_lower
            )
            patterns.extend(extracted)

        return patterns

    def extract_from_submissions(self, submissions: List[dict]) -> Dict[str, List[dict]]:
        """Extract patterns from multiple submissions, grouped by category."""
        all_patterns = {}
        for sub in submissions:
            patterns = self.extract_from_submission(sub)
            for p in patterns:
                cat = p["category"]
                if cat not in all_patterns:
                    all_patterns[cat] = []
                all_patterns[cat].append(p)
        return all_patterns

    def analyze_competitive_landscape(self, submissions: List[dict]) -> dict:
        """Analyze competitive landscape from submissions."""
        if not submissions:
            return {"total": 0, "score_distribution": {}, "common_angles": []}

        scores = []
        angles = []

        for sub in submissions:
            raw = self._parse_atto(sub.get("attoRawScore", "0"))
            # Convert raw score to 18-scale (approximate)
            score_18 = min(18, max(0, raw / 1e18 * 18))
            scores.append(round(score_18, 2))

            # Extract angle/topic from analysis
            for item in sub.get("analysis", []):
                text = item.get("analysis", "")
                if "originality" in item.get("category", "").lower():
                    angle = self._extract_angle(text)
                    if angle:
                        angles.append(angle)

        # Score distribution
        buckets = {"low": 0, "mid": 0, "high": 0, "top": 0}
        for s in scores:
            if s < 9:
                buckets["low"] += 1
            elif s < 12:
                buckets["mid"] += 1
            elif s < 15:
                buckets["high"] += 1
            else:
                buckets["top"] += 1

        # Most common angles
        angle_counts = {}
        for a in angles:
            angle_counts[a] = angle_counts.get(a, 0) + 1
        sorted_angles = sorted(angle_counts.items(), key=lambda x: x[1], reverse=True)

        return {
            "total": len(submissions),
            "avg_score": round(sum(scores) / len(scores), 2) if scores else 0,
            "max_score": max(scores) if scores else 0,
            "min_score": min(scores) if scores else 0,
            "score_distribution": buckets,
            "common_angles": sorted_angles[:10],
            "top_scorer_count": buckets["top"]
        }

    # ── Internal Methods ──

    def _extract_by_category(self, category: str, analysis_text: str,
                              score_pct: float, content: str, content_lower: str) -> List[dict]:
        patterns = []
        text_lower = analysis_text.lower()

        # Accuracy patterns
        if "accuracy" in category.lower() or "information" in category.lower():
            if score_pct < 0.8:
                if "exaggeration" in text_lower or "not verifiable" in text_lower:
                    patterns.append(self._make_pattern(
                        "claim_specificity",
                        "absolute/exaggerated claim drops Accuracy",
                        f"Accuracy drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text)
                    ))
                if "lacks specificity" in text_lower or "no concrete" in text_lower:
                    patterns.append(self._make_pattern(
                        "claim_specificity",
                        "claim lacks concrete backing drops Accuracy",
                        f"Accuracy drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text)
                    ))
                if "overly promotional" in text_lower or "broad" in text_lower:
                    patterns.append(self._make_pattern(
                        "rally_mention_depth",
                        "broad promotional mention drops Accuracy/Alignment",
                        f"Score: {score_pct:.0%}",
                        self._find_trigger(content, analysis_text)
                    ))
            elif score_pct >= 0.9:
                patterns.append(self._make_pattern(
                    "claim_specificity",
                    "specific verifiable claim maintains Accuracy",
                    f"Accuracy high at {score_pct:.0%}",
                    self._find_trigger(content, analysis_text),
                    confidence=0.85
                ))

        # Alignment patterns
        elif "alignment" in category.lower():
            if score_pct < 0.8:
                if "vague" in text_lower or "broad" in text_lower:
                    patterns.append(self._make_pattern(
                        "rally_mention_depth",
                        "vague rally mention drops Alignment",
                        f"Alignment drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text)
                    ))
                if "style" in text_lower and ("mismatch" in text_lower or "tone" in text_lower):
                    patterns.append(self._make_pattern(
                        "tone_style_match",
                        "style-tone mismatch drops Alignment",
                        f"Alignment drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text)
                    ))
            elif score_pct >= 0.9:
                patterns.append(self._make_pattern(
                    "rally_mention_depth",
                    "concrete specific mention maintains Alignment",
                    f"Alignment high at {score_pct:.0%}",
                    self._find_trigger(content, analysis_text),
                    confidence=0.85
                ))

        # Engagement patterns
        elif "engagement" in category.lower():
            if score_pct < 0.8:
                if "no explicit cta" in text_lower or "no invitation" in text_lower:
                    patterns.append(self._make_pattern(
                        "engagement_hook",
                        "no CTA/response hook drops Engagement",
                        f"Engagement drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.88
                    ))
                if "generic" in text_lower and "question" in text_lower:
                    patterns.append(self._make_pattern(
                        "engagement_hook",
                        "generic question ending drops Engagement",
                        f"Engagement drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.75
                    ))
                if "no hook" in text_lower or "weak opening" in text_lower:
                    patterns.append(self._make_pattern(
                        "engagement_hook",
                        "weak or no hook drops Engagement",
                        f"Engagement drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.7
                    ))
            elif score_pct >= 0.8:
                if "specific question" in text_lower or "genuine" in text_lower:
                    patterns.append(self._make_pattern(
                        "engagement_hook",
                        "specific response hook raises Engagement",
                        f"Engagement high at {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.82
                    ))
                if "strong hook" in text_lower or "compelling" in text_lower:
                    patterns.append(self._make_pattern(
                        "engagement_hook",
                        "strong opening hook raises Engagement",
                        f"Engagement high at {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.8
                    ))

        # Compliance patterns
        elif "compliance" in category.lower():
            if score_pct < 0.8:
                if "violat" in text_lower:
                    violation = self._extract_violation_type(analysis_text)
                    patterns.append(self._make_pattern(
                        "compliance_traps",
                        f"compliance violation: {violation}",
                        f"Compliance drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.9
                    ))

        # Originality patterns
        elif "originality" in category.lower():
            if score_pct < 0.8:
                if "ai-generated" in text_lower or "generic" in text_lower:
                    patterns.append(self._make_pattern(
                        "originality_markers",
                        "AI-generated or generic patterns drop Originality",
                        f"Originality drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.8
                    ))
                if "overlap" in text_lower or "similar" in text_lower or "derivative" in text_lower:
                    patterns.append(self._make_pattern(
                        "originality_markers",
                        "content overlaps with competitors drops Originality",
                        f"Originality drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.75
                    ))
                if "template" in text_lower or "formulaic" in text_lower:
                    patterns.append(self._make_pattern(
                        "originality_markers",
                        "template/formulaic structure drops Originality",
                        f"Originality drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.8
                    ))
            elif score_pct >= 0.9:
                if "unique" in text_lower or "fresh" in text_lower:
                    patterns.append(self._make_pattern(
                        "originality_markers",
                        "unique/fresh angle raises Originality",
                        f"Originality high at {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.8
                    ))

        # Technical patterns
        elif "technical" in category.lower():
            if score_pct < 0.8:
                if "extra space" in text_lower or "formatting" in text_lower:
                    patterns.append(self._make_pattern(
                        "structure_optimal",
                        "formatting issues (extra spaces) drop Technical",
                        f"Technical drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.85
                    ))
                if "uniform" in text_lower or "monoton" in text_lower:
                    patterns.append(self._make_pattern(
                        "structure_optimal",
                        "uniform/monotone structure drops Technical",
                        f"Technical drops to {score_pct:.0%}",
                        self._find_trigger(content, analysis_text),
                        confidence=0.8
                    ))

        return patterns

    def _make_pattern(self, category: str, pattern: str, effect: str,
                       trigger: str = "", confidence: float = 0.8) -> dict:
        return {
            "category": category,
            "pattern": pattern,
            "effect": effect,
            "trigger": trigger,
            "confidence": confidence
        }

    def _find_trigger(self, content: str, analysis: str) -> str:
        quotes = re.findall(r'"([^"]+)"', analysis)
        if quotes:
            for q in quotes:
                if q.lower() in content.lower() and len(q) > 3:
                    return q
        # Find sentence in analysis that contains content words
        content_words = set(content.lower().split()) - {"the", "a", "an", "is", "and", "or", "to", "in", "of"}
        sentences = analysis.split(". ")
        for s in sentences:
            s_words = set(s.lower().split())
            if len(s_words & content_words) > 2:
                return s[:150]
        return analysis[:100]

    def _extract_violation_type(self, analysis: str) -> str:
        text = analysis.lower()
        if "single-tweet" in text or "not-thread" in text or "thread" in text:
            return "possible thread format violation"
        if "em-dash" in text or "em dash" in text:
            return "em-dash usage"
        if "hashtag" in text:
            return "hashtag violation"
        if "mention" in text and "start" in text:
            return "starts with mention"
        if "char" in text or "length" in text or "long" in text:
            return "character limit violation"
        return "format violation"

    def _extract_angle(self, text: str) -> str:
        text_lower = text.lower()
        angle_indicators = [
            "angle", "perspective", "framing", "approach", "theme",
            "narrative", "thesis", "argument"
        ]
        sentences = text.split(". ")
        for s in sentences:
            for indicator in angle_indicators:
                if indicator in s.lower() and len(s) > 20:
                    return s.strip()[:150]
        return ""

    def _parse_atto(self, value) -> int:
        try:
            if isinstance(value, str):
                return int(value)
            return int(value)
        except (ValueError, TypeError):
            return 0
