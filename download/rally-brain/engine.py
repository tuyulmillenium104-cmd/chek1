"""
Rally Brain Engine v2.0 — Level 2 Content Generation System

Core engine: pattern extraction, prediction, content generation with quality philosophy.
Philosophy: "Rally minta 1 kita beri 2" — exceed quality expectations, not quantity.
"""

import json
import re
import hashlib
from datetime import datetime, timezone
from typing import Optional


class PatternExtractor:
    """Extract 3-level patterns from Rally scoring data."""

    def __init__(self, knowledge_db: dict):
        self.kdb = knowledge_db

    def extract_from_submission(self, content: str, scores: dict, analysis: dict):
        """Extract patterns from a single submission with scores and Rally analysis."""
        patterns = {"surface": [], "structural": [], "semantic": []}

        # Surface patterns — format rules from Compliance & Technical scores
        if scores.get("compliance", 2) < 2:
            patterns["surface"].append(self._extract_compliance_issue(content, analysis.get("compliance", "")))
        if scores.get("technical", 5) < 5:
            patterns["surface"].append(self._extract_technical_issue(content, analysis.get("technical", "")))

        # Structural patterns — engagement & CTA patterns
        if scores.get("engagement", 5) < 4:
            patterns["structural"].append(self._extract_engagement_pattern(content, analysis.get("engagement", "")))

        # Semantic patterns — accuracy, alignment, originality deep analysis
        if scores.get("accuracy", 2) < 2:
            patterns["semantic"].append(self._extract_accuracy_pattern(content, analysis.get("accuracy", "")))
        if scores.get("alignment", 2) < 2:
            patterns["semantic"].append(self._extract_alignment_pattern(content, analysis.get("alignment", "")))
        if scores.get("originality", 2) < 2:
            patterns["semantic"].append(self._extract_originality_pattern(content, analysis.get("originality", "")))

        return patterns

    def _extract_compliance_issue(self, content: str, analysis_text: str):
        return {
            "type": "compliance_violation",
            "content_hash": hashlib.md5(content.encode()).hexdigest()[:8],
            "analysis_snippet": analysis_text[:200] if analysis_text else "",
            "rule": self._generalize_compliance(analysis_text),
            "severity": "high"
        }

    def _extract_technical_issue(self, content: str, analysis_text: str):
        return {
            "type": "technical_issue",
            "content_hash": hashlib.md5(content.encode()).hexdigest()[:8],
            "analysis_snippet": analysis_text[:200] if analysis_text else "",
            "rule": self._generalize_technical(analysis_text, content),
            "severity": "medium"
        }

    def _extract_engagement_pattern(self, content: str, analysis_text: str):
        has_cta = any(phrase in content.lower() for phrase in [
            "?", "what about", "how do", "share your", "thoughts", "opinion",
            "try it", "join", "tell me", "why", "when"
        ])
        return {
            "type": "engagement_gap",
            "has_cta": has_cta,
            "analysis_snippet": analysis_text[:200] if analysis_text else "",
            "rule": "Include a clear CTA — question, invitation, or direct ask for engagement" if not has_cta else "CTA exists but may need optimization",
            "severity": "medium"
        }

    def _extract_accuracy_pattern(self, content: str, analysis_text: str):
        return {
            "type": "accuracy_issue",
            "analysis_snippet": analysis_text[:200] if analysis_text else "",
            "rule": self._generalize_accuracy(analysis_text, content),
            "severity": "high"
        }

    def _extract_alignment_pattern(self, content: str, analysis_text: str):
        return {
            "type": "alignment_gap",
            "analysis_snippet": analysis_text[:200] if analysis_text else "",
            "rule": self._generalize_alignment(analysis_text, content),
            "severity": "high"
        }

    def _extract_originality_pattern(self, content: str, analysis_text: str):
        return {
            "type": "originality_issue",
            "analysis_snippet": analysis_text[:200] if analysis_text else "",
            "rule": "Avoid generic statements — provide unique angle, personal insight, or contrarian take",
            "severity": "medium"
        }

    def _generalize_compliance(self, text: str) -> str:
        text_lower = (text or "").lower()
        if "mysterious" in text_lower or "thread" in text_lower:
            return "Avoid mysterious/thread-like openings — be direct and clear"
        if "mention" in text_lower or "@" in text:
            return "Ensure @RallyOnChain mention follows placement and spacing rules"
        if "length" in text_lower or "word count" in text_lower:
            return "Respect minimum/maximum length requirements"
        return "Review all compliance rules — see specific analysis for details"

    def _generalize_technical(self, text: str, content: str) -> str:
        text_lower = (text or "").lower()
        if "space" in text_lower or "whitespace" in text_lower:
            return "No extra whitespace — check spaces before mentions, trailing spaces, empty lines"
        if "format" in text_lower:
            return "Check formatting — proper line breaks, no extra characters"
        # Check for extra spaces in content
        if "  " in content:
            return "Double spaces detected — remove all extra whitespace"
        return "Check technical formatting — spacing, characters, structure"

    def _generalize_accuracy(self, text: str, content: str) -> str:
        text_lower = (text or "").lower()
        if "exaggerat" in text_lower or "absolute" in text_lower:
            rule = "Avoid exaggerated/absolute claims — use precise, verifiable language"
            # Find specific exaggerated words
            abs_words = re.findall(r'\b(zero|every|all|none|never|always|everyone|nobody|impossible|guaranteed)\b', content, re.IGNORECASE)
            if abs_words:
                rule += f" (detected: {', '.join(set(abs_words))})"
            return rule
        if "vague" in text_lower or "specific" in text_lower:
            return "Be specific — vague statements lose accuracy points. Include concrete details."
        if "factual" in text_lower or "claim" in text_lower:
            return "Claims must be factual and verifiable — avoid unsubstantiated assertions"
        return "Ensure all claims are accurate, specific, and verifiable"

    def _generalize_alignment(self, text: str, content: str) -> str:
        text_lower = (text or "").lower()
        if "vague" in text_lower or "generic" in text_lower:
            return "Tie content directly to campaign theme — no vague/generic statements about the topic"
        if "relevance" in text_lower or "off-topic" in text_lower:
            return "Stay tightly focused on campaign topic — every sentence must serve the theme"
        return "Ensure strong alignment with campaign — connect every point to the core theme"

    def merge_patterns(self, new_patterns: list, category: str = "semantic"):
        """Merge new extracted patterns into knowledge DB, avoiding duplicates."""
        if category not in self.kdb["patterns"]:
            self.kdb["patterns"][category] = {}

        rules = self.kdb["patterns"].get(category, {})
        for pattern in new_patterns:
            rule = pattern.get("rule", "")
            if not rule:
                continue
            # Avoid duplicate rules
            existing = [r.get("rule", "") for r in rules.get("learned_rules", [])]
            if rule not in existing:
                if "learned_rules" not in rules:
                    rules["learned_rules"] = []
                rules["learned_rules"].append({
                    "rule": rule,
                    "severity": pattern.get("severity", "medium"),
                    "source": pattern.get("type", "unknown"),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "examples_bad": [pattern.get("analysis_snippet", "")[:100]]
                })
                if pattern.get("type") in ["accuracy_issue"]:
                    self.kdb["patterns"]["semantic"]["exaggeration_risk"]["learned_rules"].append({
                        "rule": rule,
                        "severity": pattern.get("severity", "high"),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

        self.kdb["stats"]["total_patterns"] = sum(
            len(v.get("learned_rules", []))
            for v in self.kdb["patterns"].get("semantic", {}).values()
        )
        return self.kdb


class ScorePredictor:
    """Predict Rally scores based on knowledge DB patterns."""

    def __init__(self, knowledge_db: dict):
        self.kdb = knowledge_db
        self.model = knowledge_db.get("scoring_model", {})
        self.max_scores = self.model.get("max_scores", {})
        self.calibration_log = self.model.get("calibration_log", [])

    def predict(self, content: str, campaign_info: dict) -> dict:
        """Predict scores for content. Returns per-category predictions and total."""
        predictions = {}
        total = 0

        for category, max_score in self.max_scores.items():
            score = self._predict_category(content, campaign_info, category)
            score = max(0, min(score, max_score))
            predictions[category] = round(score, 1)
            total += score

        # Apply cross-category tradeoff awareness
        total = self._apply_tradeoff_adjustment(content, predictions, total)

        predictions["total"] = round(total, 1)
        predictions["grade"] = self._calculate_grade(total)
        return predictions

    def _predict_category(self, content: str, campaign_info: dict, category: str) -> float:
        base_scores = {
            "originality": 1.5,
            "alignment": 1.5,
            "accuracy": 1.5,
            "compliance": 1.8,
            "engagement": 3.5,
            "technical": 4.5
        }

        score = base_scores.get(category, 3.0)
        penalties = 0
        bonuses = 0

        # Apply learned rules
        semantic = self.kdb.get("patterns", {}).get("semantic", {})
        for pattern_key, pattern_data in semantic.items():
            for rule in pattern_data.get("learned_rules", []):
                rule_text = rule.get("rule", "").lower()
                severity = rule.get("severity", "medium")

                if self._rule_violated(content, rule_text):
                    if category == "accuracy" and pattern_key == "exaggeration_risk":
                        penalties += 1.0 if severity == "critical" else 0.5
                    elif category == "engagement" and "cta" in rule_text:
                        penalties += 0.5
                    elif category == "compliance" and ("formatting" in rule_text or "space" in rule_text or "mysterious" in rule_text):
                        penalties += 1.0 if severity == "high" else 0.5
                    elif category == "alignment" and ("vague" in rule_text or "theme" in rule_text):
                        penalties += 0.5
                    elif category == "originality" and ("generic" in rule_text or "unique" in rule_text):
                        penalties += 0.5

        # Bonus checks
        if category == "engagement":
            if self._has_strong_cta(content):
                bonuses += 0.5
            if self._has_hook(content):
                bonuses += 0.3

        if category == "originality":
            if self._has_unique_angle(content):
                bonuses += 0.3

        if category == "technical":
            if not re.search(r'  ', content) and content.strip() == content:
                bonuses += 0.5

        return score - penalties + bonuses

    def _rule_violated(self, content: str, rule_text: str) -> bool:
        content_lower = content.lower()
        if "exaggerat" in rule_text or "absolute" in rule_text:
            abs_words = ["zero cost", "everyone", "nobody", "always", "never", "impossible", "guaranteed"]
            return any(w in content_lower for w in abs_words)
        if "cta" in rule_text and "no cta" in rule_text:
            return not self._has_strong_cta(content)
        if "space" in rule_text or "whitespace" in rule_text:
            return "  " in content or "\n\n\n" in content
        if "mysterious" in rule_text or "thread" in rule_text:
            # Check if opening is vague/mysterious
            lines = [l.strip() for l in content.split("\n") if l.strip()]
            if lines:
                first = lines[0].lower()
                mysterious_markers = ["even this", "what if i told", "nobody talks about", "the secret"]
                return any(m in first for m in mysterious_markers)
        if "vague" in rule_text:
            vague_words = ["figured it out", "something like that", "kind of", "sort of", "stuff like"]
            return any(v in content_lower for v in vague_words)
        if "specific" in rule_text:
            return False  # Hard to detect automatically
        return False

    def _has_strong_cta(self, content: str) -> bool:
        cta_patterns = [
            r'\?$',
            r'what do you think',
            r'share your',
            r'try it',
            r'join',
            r'what about you',
            r'tell me',
            r'your thoughts',
            r'agree\?',
            r'disagree\?'
        ]
        return any(re.search(p, content, re.IGNORECASE | re.MULTILINE) for p in cta_patterns)

    def _has_hook(self, content: str) -> bool:
        lines = [l.strip() for l in content.split("\n") if l.strip()]
        if not lines:
            return False
        first = lines[0]
        # Good hooks: direct statements, questions, bold claims with specificity
        return len(first) < 100 and (first.endswith("?") or len(first.split()) <= 12)

    def _has_unique_angle(self, content: str) -> bool:
        # Simple heuristic — content that references specific details is more likely unique
        specific_markers = ["dollar", "percent", "%", "specific", "exactly", "on chain", "protocol"]
        return any(m in content.lower() for m in specific_markers)

    def _apply_tradeoff_adjustment(self, content: str, predictions: dict, total: float) -> float:
        """Adjust for cross-category tradeoffs learned from data."""
        # If accuracy is low but originality is high, slight accuracy penalty
        if predictions.get("accuracy", 2) < 1.5 and predictions.get("originality", 2) >= 1.8:
            total -= 0.3

        # If compliance is perfect but engagement is low, content may be too rigid
        if predictions.get("compliance", 2) >= 2 and predictions.get("engagement", 5) < 3:
            total -= 0.2

        return total

    def _calculate_grade(self, total: float) -> str:
        if total >= 17: return "A+"
        if total >= 16: return "A"
        if total >= 14: return "B+"
        if total >= 12: return "B"
        if total >= 10: return "C"
        return "D"

    def calibrate(self, predicted: dict, actual: dict):
        """Update prediction model with actual Rally scores for calibration."""
        diff = abs(predicted.get("total", 0) - actual.get("total", 0))
        self.calibration_log.append({
            "predicted": predicted.get("total", 0),
            "actual": actual.get("total", 0),
            "diff": round(diff, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "per_category": {
                k: {"predicted": predicted.get(k, 0), "actual": actual.get(k, 0)}
                for k in self.max_scores.keys() if k in actual
            }
        })

        total_preds = self.model.get("prediction_accuracy", {}).get("total_predictions", 0) + 1
        avg_diff = ((self.model.get("prediction_accuracy", {}).get("avg_diff", 0) * (total_preds - 1)) + diff) / total_preds

        self.model["prediction_accuracy"] = {
            "total_predictions": total_preds,
            "avg_diff": round(avg_diff, 2),
            "last_diff": round(diff, 2)
        }
        self.model["calibration_log"] = self.calibration_log[-50:]  # Keep last 50
        self.kdb["stats"]["avg_prediction_diff"] = round(avg_diff, 2)


class ContentGenerator:
    """Generate Level 2 content with 'Rally minta 1 kita beri 2' philosophy."""

    def __init__(self, knowledge_db: dict):
        self.kdb = knowledge_db

    def generate_variations(self, campaign_info: dict, num_variations: int = 3) -> list:
        """
        Generate content variations based on campaign info and learned patterns.
        Returns list of content strings.
        
        This method prepares the generation prompt with all knowledge.
        The actual AI generation happens via z-ai-web-dev-sdk in cron_generator.
        """
        prompt = self._build_generation_prompt(campaign_info)
        return prompt  # Returns the prompt for external AI to use

    def _build_generation_prompt(self, campaign_info: dict) -> str:
        """Build a comprehensive generation prompt using all learned knowledge."""
        v3_lessons = self.kdb.get("v3_lessons", {})
        generalized = v3_lessons.get("generalized_rules", [])
        losses = v3_lessons.get("losses", {})

        semantic_rules = []
        for key, data in self.kdb.get("patterns", {}).get("semantic", {}).items():
            for rule in data.get("learned_rules", []):
                semantic_rules.append(f"- [{data.get('description', key)}] {rule['rule']}")

        campaign_name = campaign_info.get("title", "Unknown Campaign")
        campaign_desc = campaign_info.get("description", campaign_info.get("mission", ""))
        campaign_rlp = campaign_info.get("rewardAmount", campaign_info.get("rlp", ""))

        prompt = f"""You are a Rally.fun content creator. Your philosophy: "Rally minta 1, kita beri 2" — exceed quality expectations.

CAMPAIGN: "{campaign_name}"
{campaign_desc}
Reward: {campaign_rlp} RLP

=== MANDATORY RULES (learned from real Rally scoring) ===
{chr(10).join(generalized) if generalized else 'No rules learned yet'}

=== SPECIFIC PATTERN RULES ===
{chr(10).join(semantic_rules) if semantic_rules else 'No semantic patterns learned yet'}

=== PAST MISTAKES TO AVOID ===
{chr(10).join(f'- {v}' for v in losses.values()) if losses else 'No past mistakes recorded'}

=== CONTENT REQUIREMENTS ===
1. Open directly — no mysterious/thread openings
2. Be specific and concrete — no vague claims or exaggerations
3. @RallyOnChain mention must be natural, contextual, with concrete mechanism
4. Include a clear CTA (question, invitation, direct ask)
5. No extra spaces, no formatting issues
6. Stay tightly aligned with campaign theme
7. Provide unique angle or personal insight
8. Keep it punchy — short sentences, strong rhythm
9. Every claim must be verifiable — no "zero cost", "everyone", "nobody"
10. Maximum impact per word

Write a single tweet/X post that would score 16+/18 on Rally. Do NOT include explanations or meta-commentary. Output ONLY the content."""
        return prompt

    def generate_qa(self, content: str, campaign_info: dict) -> list:
        """Generate engagement Q&A comments based on content."""
        return [
            {
                "type": "question",
                "template": f"How does this relate to {campaign_info.get('title', 'the campaign')}?"
            },
            {
                "type": "agreement",
                "template": f"Spot on. The key insight about distribution is underrated."
            },
            {
                "type": "extension",
                "template": f"Adding to this — the network effect makes distribution exponential, not linear."
            }
        ]


class RallyBrainEngine:
    """Main engine orchestrating pattern extraction, prediction, and generation."""

    def __init__(self, knowledge_db_path: str = "knowledge_db.json"):
        self.kdb_path = knowledge_db_path
        self.kdb = self._load_knowledge_db()
        self.extractor = PatternExtractor(self.kdb)
        self.predictor = ScorePredictor(self.kdb)
        self.generator = ContentGenerator(self.kdb)

    def _load_knowledge_db(self) -> dict:
        try:
            with open(self.kdb_path, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return self._default_knowledge_db()

    def _default_knowledge_db(self) -> dict:
        return {
            "version": "2.0.0",
            "last_updated": None,
            "stats": {
                "total_patterns": 0,
                "total_campaigns_analyzed": 0,
                "total_submissions_analyzed": 0,
                "avg_prediction_diff": 0.0,
                "last_learned": None,
                "best_score_achieved": 0
            },
            "patterns": {
                "surface": {},
                "structural": {},
                "semantic": {
                    "claim_specificity": {"description": "Concrete verifiable claims score higher", "level": "high", "learned_rules": []},
                    "tone_style_match": {"description": "Tone must match campaign context", "level": "high", "learned_rules": []},
                    "engagement_hook": {"description": "Opening hooks + CTA for engagement", "level": "high", "learned_rules": []},
                    "rally_mention": {"description": "Natural contextual mention with concrete mechanism", "level": "high", "learned_rules": []},
                    "exaggeration_risk": {"description": "Absolute claims risk Accuracy deductions", "level": "critical", "learned_rules": []},
                    "cross_category_tradeoff": {"description": "Balance categories, don't over-optimize one", "level": "medium", "learned_rules": []}
                }
            },
            "scoring_model": {
                "calibration_log": [],
                "category_weights": {"originality": 2, "alignment": 2, "accuracy": 2, "compliance": 2, "engagement": 5, "technical": 5},
                "max_scores": {"originality": 2, "alignment": 2, "accuracy": 2, "compliance": 2, "engagement": 5, "technical": 5},
                "prediction_accuracy": {"total_predictions": 0, "avg_diff": 0.0}
            },
            "campaign_memories": {},
            "v3_lessons": {
                "source": "Rally actual scoring of v3 content (14/18 predicted 17.5)",
                "losses": {
                    "accuracy_minus_1": "Exaggerated claim 'zero cost' — use precise language",
                    "accuracy_minus_05": "Vague phrase 'figured it out' — be specific about what/how",
                    "compliance_minus_1_mysterious_thread": "Mysterious thread opening flagged as violation",
                    "compliance_minus_1_extra_space": "Extra whitespace before @RallyOnChain",
                    "engagement_minus_05": "No CTA included — direct ask improves engagement"
                },
                "generalized_rules": [
                    "Never use absolute/exaggerated language unless factually verifiable",
                    "Always include concrete mechanisms, not vague references",
                    "Opening must be directly relevant, not mysterious or clickbait",
                    "Check formatting: no extra spaces, no trailing whitespace",
                    "Always include a CTA for engagement points"
                ]
            }
        }

    def save_knowledge_db(self):
        """Save current knowledge DB to disk."""
        self.kdb["last_updated"] = datetime.now(timezone.utc).isoformat()
        with open(self.kdb_path, "w") as f:
            json.dump(self.kdb, f, indent=2, ensure_ascii=False)

    def learn_from_submissions(self, submissions: list, campaign_id: str, campaign_info: dict):
        """Learn from Rally API submission data — the core learning cycle."""
        learned_count = 0

        for sub in submissions:
            content = sub.get("content", sub.get("text", ""))
            scores = sub.get("scores", {})
            analysis = sub.get("analysis", sub.get("feedback", {}))

            if not content or not scores:
                continue

            # Extract patterns
            patterns = self.extractor.extract_from_submission(content, scores, analysis)

            # Merge into knowledge DB
            for pattern in patterns.get("surface", []):
                existing_rules = self.kdb["patterns"]["surface"].get("format_rules", [])
                if pattern["rule"] not in [r.get("rule", "") for r in existing_rules]:
                    self.kdb["patterns"]["surface"].setdefault("format_rules", []).append(pattern)
                    learned_count += 1

            for pattern in patterns.get("structural", []):
                existing_rules = self.kdb["patterns"]["structural"].get("cta_patterns", [])
                if pattern["rule"] not in [r.get("rule", "") for r in existing_rules]:
                    self.kdb["patterns"]["structural"].setdefault("cta_patterns", []).append(pattern)
                    learned_count += 1

            for pattern in patterns.get("semantic", []):
                self.extractor.merge_patterns([pattern], "semantic")
                learned_count += 1

            # Calibrate predictor if we have both predicted and actual
            if sub.get("predicted_scores") and scores:
                self.predictor.calibrate(sub["predicted_scores"], scores)

            learned_count += 1

        # Update campaign memory
        if campaign_id not in self.kdb["campaign_memories"]:
            self.kdb["campaign_memories"][campaign_id] = {}

        memory = self.kdb["campaign_memories"][campaign_id]
        memory["last_analyzed"] = datetime.now(timezone.utc).isoformat()
        memory["total_submissions"] = memory.get("total_submissions", 0) + len(submissions)
        memory["title"] = campaign_info.get("title", "")
        memory["patterns_found"] = memory.get("patterns_found", 0) + learned_count

        # Track best score
        for sub in submissions:
            total = sum(sub.get("scores", {}).values())
            if total > self.kdb["stats"].get("best_score_achieved", 0):
                self.kdb["stats"]["best_score_achieved"] = total

        # Update stats
        self.kdb["stats"]["total_submissions_analyzed"] += len(submissions)
        self.kdb["stats"]["last_learned"] = datetime.now(timezone.utc).isoformat()

        self.save_knowledge_db()
        return learned_count

    def predict_content(self, content: str, campaign_info: dict) -> dict:
        """Predict Rally scores for content."""
        return self.predictor.predict(content, campaign_info)

    def get_generation_prompt(self, campaign_info: dict) -> str:
        """Get the optimized generation prompt with all learned knowledge."""
        return self.generator.generate_variations(campaign_info)

    def get_qa_prompt(self, content: str, campaign_info: dict) -> str:
        """Get Q&A generation prompt."""
        return f"""Based on this Rally.fun campaign content, generate 3 short engagement comments (each 1-2 sentences max) that would naturally appear in the reply section. Mix of: agreements, questions, and extensions. Be natural, not promotional.

Content:
{content}

Campaign: {campaign_info.get('title', '')}

Output format: one comment per line, no numbering, no labels."""

    def get_stats(self) -> dict:
        """Get current system stats."""
        return self.kdb.get("stats", {})
