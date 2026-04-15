"""
Rally Brain v7.0 — Unified Knowledge Base
Single source of truth for all learned patterns, calibration data, and campaign memory.

Replaces:
- knowledge_db.json (v6 per-campaign, fragmented)
- learning_db.json (v6 separate)
- rally_pattern_cache.json (v6 separate)

This is the BRIDGE between the data pipeline and the generation pipeline.
The data cron writes to it, and generate.js reads from it.
"""

import json
import os
import copy
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict

from v7_config import (
    CATEGORIES, MAX_CYCLE_HISTORY, MAX_CALIBRATION_LOG,
    MAX_PATTERNS_PER_CATEGORY, DATA_DIR, ACTIVE_CAMPAIGNS
)


class V7KnowledgeBase:
    """
    Unified knowledge base for Rally Brain v7.0.

    Schema v7.0:
    - patterns: scoring rules extracted from Rally analysis
    - calibration: prediction accuracy tracking
    - campaign_memory: per-campaign learning
    - cycle_history: generation cycle log
    - competitive_intel: market analysis from collected data
    - directives: actionable instructions for content generation
    """

    VERSION = "7.0.0"

    def __init__(self, path: str = None):
        self.path = Path(path) if path else DATA_DIR / "v7_knowledge.json"
        self.db = self._load()

    def _load(self) -> dict:
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text(encoding="utf-8"))
                # Version migration
                if data.get("version", "0") != self.VERSION:
                    return self._migrate(data)
                return data
            except (json.JSONDecodeError, IOError):
                pass
        return self._default()

    def _migrate(self, old_data: dict) -> dict:
        """Migrate from older knowledge base versions."""
        new = self._default()

        # Import patterns from v6 format if present
        old_patterns = old_data.get("patterns", {})
        if isinstance(old_patterns, dict):
            for cat, patterns in old_patterns.items():
                if isinstance(patterns, dict) and "learned_rules" in patterns:
                    for rule in patterns["learned_rules"]:
                        self.add_pattern(
                            category=cat,
                            rule=rule.get("rule", ""),
                            pattern_type="migrated",
                            severity=rule.get("severity", "medium"),
                            confidence=0.6,  # Lower confidence for migrated data
                        )

        # Import cycle history
        old_history = old_data.get("cycle_history", [])
        if isinstance(old_history, list):
            self.db["cycle_history"] = old_history[:MAX_CYCLE_HISTORY]

        # Import v3 lessons
        v3 = old_data.get("v3_lessons", {})
        if v3:
            for rule in v3.get("generalized_rules", []):
                self.add_directive(rule, source="v3_migration", priority="medium")
            for key, loss in v3.get("losses", {}).items():
                self.add_directive(
                    f"Avoid: {loss}", source="v3_migration", priority="high"
                )

        return new

    def _default(self) -> dict:
        """Create default knowledge base structure."""
        now = datetime.now(timezone.utc).isoformat()
        return {
            "version": self.VERSION,
            "created": now,
            "last_updated": now,
            "stats": {
                "total_patterns": 0,
                "total_calibrations": 0,
                "total_cycles": 0,
                "total_submissions_analyzed": 0,
                "avg_prediction_error": None,
                "best_score_achieved": 0,
                "avg_score": 0,
                "last_collection": None,
                "last_generation": None,
            },
            # ── Patterns: Rules extracted from Rally's scoring analysis ──
            "patterns": {
                cat: {
                    "positive": [],  # What to DO
                    "negative": [],  # What to AVOID
                }
                for cat in CATEGORIES.keys()
            },
            # ── Directives: Actionable instructions for generate.js ──
            "directives": {
                "must_do": [
                    "Include all required @mentions and links from campaign config",
                    "Write in natural human voice — no AI-sounding words",
                    "End with a specific, non-generic question",
                    "No em-dashes, no hashtags, no markdown formatting",
                    "Vary sentence length for natural rhythm",
                ],
                "must_avoid": [
                    "AI words: delve, leverage, paradigm, tapestry, ecosystem, flywheel, seamless, robust",
                    "Template phrases: key takeaways, let's dive in, hot take",
                    "Absolute claims: guaranteed, 100%, risk-free, everyone, never",
                    "Generic questions: Thoughts? What do you think?",
                    "Starting with @mention",
                ],
                "campaign_specific": {},  # Per-campaign overrides
            },
            # ── Calibration: Prediction vs actual score tracking ──
            "calibration": {
                "log": [],
                "avg_error": None,
                "mae_by_category": {},
                "last_actual_score": None,
            },
            # ── Campaign Memory ──
            "campaign_memory": {
                cid: {
                    "total_cycles": 0,
                    "best_score": 0,
                    "avg_score": 0,
                    "last_score": 0,
                    "score_trend": "unknown",
                    "ai_words_found": [],
                    "hooks_used": [],
                    "weak_categories": [],
                }
                for cid in ACTIVE_CAMPAIGNS
            },
            # ── Competitive Intelligence ──
            "competitive": {
                "score_distribution": {},
                "category_gaps": {},
                "what_works": [],
                "what_fails": [],
                "recommendations": [],
                "last_analysis": None,
            },
            # ── Cycle History ──
            "cycle_history": [],
        }

    def save(self):
        """Save knowledge base to disk."""
        self.db["last_updated"] = datetime.now(timezone.utc).isoformat()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(self.db, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    # ════════════════════════════════════════════════════
    # PATTERNS
    # ════════════════════════════════════════════════════

    def add_pattern(
        self,
        category: str,
        rule: str,
        pattern_type: str = "negative",
        severity: str = "medium",
        confidence: float = 0.7,
        context: str = "",
    ):
        """Add a scoring pattern (what Rally rewards or penalizes)."""
        if category not in self.db["patterns"]:
            self.db["patterns"][category] = {"positive": [], "negative": []}

        if pattern_type not in ("positive", "negative"):
            pattern_type = "negative"

        patterns_list = self.db["patterns"][category][pattern_type]

        # Deduplicate by rule text
        existing_rules = [p.get("rule", "") for p in patterns_list]
        if rule in existing_rules:
            # Update confidence if higher
            for p in patterns_list:
                if p["rule"] == rule and confidence > p.get("confidence", 0):
                    p["confidence"] = confidence
                    p["updated_at"] = datetime.now(timezone.utc).isoformat()
            return

        patterns_list.append({
            "rule": rule,
            "severity": severity,
            "confidence": round(confidence, 2),
            "context": context[:200] if context else "",
            "discovered_at": datetime.now(timezone.utc).isoformat(),
            "source": "rally_analysis",
        })

        # Trim to max
        if len(patterns_list) > MAX_PATTERNS_PER_CATEGORY:
            patterns_list.sort(key=lambda x: x["confidence"], reverse=True)
            self.db["patterns"][category][pattern_type] = patterns_list[:MAX_PATTERNS_PER_CATEGORY]

        self._refresh_stats()

    def add_patterns_batch(self, patterns: Dict[str, List[dict]]):
        """Add multiple patterns at once (from analyzer output)."""
        for category, pattern_list in patterns.items():
            for p in pattern_list:
                self.add_pattern(
                    category=category,
                    rule=p.get("rule", ""),
                    pattern_type=p.get("type", "negative"),
                    severity=p.get("severity", "medium"),
                    confidence=p.get("confidence", 0.7),
                    context=p.get("context", ""),
                )

    def get_patterns(self, category: str = None, pattern_type: str = None) -> list:
        """Get patterns, optionally filtered by category and type."""
        results = []

        cats = [category] if category else list(self.db["patterns"].keys())
        for cat in cats:
            cat_data = self.db["patterns"].get(cat, {})
            types = [pattern_type] if pattern_type else ["positive", "negative"]
            for t in types:
                for p in cat_data.get(t, []):
                    results.append({"category": cat, "type": t, **p})

        return sorted(results, key=lambda x: x.get("confidence", 0), reverse=True)

    def get_high_confidence_patterns(self, min_confidence: float = 0.7) -> list:
        """Get only high-confidence patterns."""
        return [p for p in self.get_patterns() if p.get("confidence", 0) >= min_confidence]

    # ════════════════════════════════════════════════════
    # DIRECTIVES (for generate.js)
    # ════════════════════════════════════════════════════

    def add_directive(self, text: str, source: str = "system", priority: str = "medium"):
        """Add a directive for content generation."""
        list_name = "must_do" if priority == "high" else "must_avoid" if "avoid" in text.lower()[:20] else "must_do"

        # Check for duplicates
        if text in self.db["directives"][list_name]:
            return

        self.db["directives"][list_name].append(text)

        # Keep lists manageable
        if len(self.db["directives"][list_name]) > 20:
            self.db["directives"][list_name] = self.db["directives"][list_name][-20:]

    def add_campaign_directive(self, campaign_id: str, directive: str):
        """Add a campaign-specific directive."""
        if campaign_id not in self.db["directives"]["campaign_specific"]:
            self.db["directives"]["campaign_specific"][campaign_id] = []

        directives = self.db["directives"]["campaign_specific"][campaign_id]
        if directive not in directives:
            directives.append(directive)

        if len(directives) > 10:
            self.db["directives"]["campaign_specific"][campaign_id] = directives[-10:]

    def get_generation_context(self, campaign_id: str = "") -> str:
        """
        Generate a context string for content generation.
        This is what generate.js will inject into the prompt.
        """
        lines = []

        # Statistics
        stats = self.db["stats"]
        lines.append(f"[V7 Knowledge: {stats['total_patterns']} patterns, "
                     f"{stats['total_submissions_analyzed']} submissions analyzed]")

        if stats.get("avg_prediction_error") is not None:
            lines.append(f"[Prediction MAE: {stats['avg_prediction_error']}/23]")

        # Top negative patterns (what to avoid) — highest confidence first
        neg_patterns = [p for p in self.get_patterns(pattern_type="negative") if p.get("confidence", 0) >= 0.75]
        if neg_patterns:
            lines.append(f"[Top {min(8, len(neg_patterns))} penalty patterns:]")
            for p in neg_patterns[:8]:
                lines.append(f"  - {p['rule']} (conf:{p['confidence']})")

        # Top positive patterns (what works)
        pos_patterns = [p for p in self.get_patterns(pattern_type="positive") if p.get("confidence", 0) >= 0.8]
        if pos_patterns:
            lines.append(f"[Top {min(5, len(pos_patterns))} success patterns:]")
            for p in pos_patterns[:5]:
                lines.append(f"  + {p['rule']} (conf:{p['confidence']})")

        # Category gaps (where most submissions lose points)
        gaps = self.db["competitive"].get("category_gaps", {})
        if gaps:
            sorted_gaps = sorted(gaps.items(), key=lambda x: x[1].get("gap_pct", 0), reverse=True)
            lines.append("[Category gaps (biggest opportunity):]")
            for cat, gap in sorted_gaps[:3]:
                lines.append(f"  - {cat}: {gap['gap_pct']}% improvement room (avg: {gap['avg']}/{gap['max']})")

        # Campaign-specific directives
        if campaign_id:
            campaign_dirs = self.db["directives"]["campaign_specific"].get(campaign_id, [])
            if campaign_dirs:
                lines.append(f"[Campaign-specific directives ({campaign_id}):]")
                for d in campaign_dirs[:5]:
                    lines.append(f"  ! {d}")

            # Campaign memory
            mem = self.db["campaign_memory"].get(campaign_id, {})
            if mem.get("ai_words_found"):
                lines.append(f"[AI words detected in past: {', '.join(mem['ai_words_found'][:5])}]")
            if mem.get("weak_categories"):
                lines.append(f"[Weak categories: {', '.join(mem['weak_categories'][:3])}]")

        return "\n".join(lines)

    # ════════════════════════════════════════════════════
    # CALIBRATION
    # ════════════════════════════════════════════════════

    def add_calibration(self, predicted: float, actual: float, content_preview: str = ""):
        """Record a prediction vs actual score for calibration."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "predicted": round(predicted, 2),
            "actual": round(actual, 2),
            "error": round(abs(predicted - actual), 2),
            "content_preview": content_preview[:200],
        }
        self.db["calibration"]["log"].append(entry)
        self.db["calibration"]["last_actual_score"] = actual

        # Trim log
        if len(self.db["calibration"]["log"]) > MAX_CALIBRATION_LOG:
            self.db["calibration"]["log"] = self.db["calibration"]["log"][-MAX_CALIBRATION_LOG:]

        # Recalculate MAE
        errors = [e["error"] for e in self.db["calibration"]["log"]]
        mae = sum(errors) / len(errors) if errors else None
        self.db["calibration"]["avg_error"] = round(mae, 2) if mae else None
        self.db["stats"]["avg_prediction_error"] = self.db["calibration"]["avg_error"]
        self.db["stats"]["total_calibrations"] = len(errors)

        self._refresh_stats()

    # ════════════════════════════════════════════════════
    # CAMPAIGN MEMORY
    # ════════════════════════════════════════════════════

    def update_campaign_memory(self, campaign_id: str, cycle_data: dict):
        """Update per-campaign memory after a generation cycle."""
        if campaign_id not in self.db["campaign_memory"]:
            self.db["campaign_memory"][campaign_id] = {
                "total_cycles": 0, "best_score": 0, "avg_score": 0,
                "last_score": 0, "score_trend": "unknown",
                "ai_words_found": [], "hooks_used": [], "weak_categories": [],
            }

        mem = self.db["campaign_memory"][campaign_id]
        mem["total_cycles"] = mem.get("total_cycles", 0) + 1
        mem["last_score"] = cycle_data.get("score", 0)

        if cycle_data.get("score", 0) > mem["best_score"]:
            mem["best_score"] = cycle_data["score"]

        # Track AI words
        if cycle_data.get("ai_words"):
            for word in cycle_data["ai_words"]:
                if word not in mem["ai_words_found"]:
                    mem["ai_words_found"].append(word)
            mem["ai_words_found"] = mem["ai_words_found"][-20:]

        # Track hooks
        if cycle_data.get("hook"):
            mem["hooks_used"].append(cycle_data["hook"][:100])
            mem["hooks_used"] = mem["hooks_used"][-20:]

        # Track weak categories
        if cycle_data.get("weak_categories"):
            mem["weak_categories"] = cycle_data["weak_categories"]

        # Calculate trend
        history = [
            h for h in self.db["cycle_history"]
            if h.get("campaign_id") == campaign_id and h.get("score")
        ]
        if len(history) >= 3:
            recent = [h["score"] for h in history[-3:]]
            if all(recent[i] >= recent[i-1] for i in range(1, len(recent))):
                mem["score_trend"] = "improving"
            elif all(recent[i] <= recent[i-1] for i in range(1, len(recent))):
                mem["score_trend"] = "declining"
            else:
                mem["score_trend"] = "volatile"

        self._refresh_stats()

    # ════════════════════════════════════════════════════
    # CYCLE HISTORY
    # ════════════════════════════════════════════════════

    def log_cycle(self, campaign_id: str, cycle_data: dict):
        """Record a generation cycle in history."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "campaign_id": campaign_id,
            "score": cycle_data.get("score"),
            "grade": cycle_data.get("grade"),
            "loops_used": cycle_data.get("loops_used", 1),
            "variations_tested": cycle_data.get("variations_tested", 1),
            "ai_words_found": cycle_data.get("ai_words_found", []),
        }
        self.db["cycle_history"].append(entry)

        # Trim history
        if len(self.db["cycle_history"]) > MAX_CYCLE_HISTORY:
            self.db["cycle_history"] = self.db["cycle_history"][-MAX_CYCLE_HISTORY:]

        self.db["stats"]["total_cycles"] = len(self.db["cycle_history"])

        if cycle_data.get("score"):
            if cycle_data["score"] > self.db["stats"]["best_score_achieved"]:
                self.db["stats"]["best_score_achieved"] = cycle_data["score"]

            # Update running average
            scores = [
                h["score"] for h in self.db["cycle_history"] if h.get("score")
            ]
            self.db["stats"]["avg_score"] = round(sum(scores) / len(scores), 2) if scores else 0

        self.db["stats"]["last_generation"] = entry["timestamp"]

    # ════════════════════════════════════════════════════
    # COMPETITIVE INTELLIGENCE
    # ════════════════════════════════════════════════════

    def update_competitive(self, analysis: dict):
        """Update competitive intelligence from analyzer output."""
        self.db["competitive"]["score_distribution"] = analysis.get("score_stats", {})
        self.db["competitive"]["category_gaps"] = analysis.get("category_gaps", {})
        self.db["competitive"]["what_works"] = analysis.get("what_works", [])[:15]
        self.db["competitive"]["what_fails"] = analysis.get("what_fails", [])[:15]
        self.db["competitive"]["recommendations"] = analysis.get("recommendations", [])[:10]
        self.db["competitive"]["last_analysis"] = datetime.now(timezone.utc).isoformat()

    # ════════════════════════════════════════════════════
    # STATS
    # ════════════════════════════════════════════════════

    def _refresh_stats(self):
        """Refresh statistics."""
        total_patterns = 0
        for cat, data in self.db["patterns"].items():
            total_patterns += len(data.get("positive", []))
            total_patterns += len(data.get("negative", []))
        self.db["stats"]["total_patterns"] = total_patterns

    def get_stats(self) -> dict:
        """Get current knowledge base statistics."""
        self._refresh_stats()
        return self.db["stats"]

    def export(self) -> dict:
        """Export full knowledge base."""
        return copy.deepcopy(self.db)

    def export_for_generate(self, campaign_id: str = "") -> dict:
        """
        Export knowledge in a format optimized for generate.js consumption.
        This is the interface between the Python data pipeline and the JS generation pipeline.
        """
        return {
            "version": self.VERSION,
            "generation_context": self.get_generation_context(campaign_id),
            "directives": self.db["directives"],
            "campaign_memory": self.db["campaign_memory"].get(campaign_id, {}),
            "competitive": self.db["competitive"],
            "stats": self.db["stats"],
            "patterns_summary": {
                cat: {
                    "positive_count": len(data.get("positive", [])),
                    "negative_count": len(data.get("negative", [])),
                    "top_negative": [p["rule"] for p in data.get("negative", [])[:5]],
                    "top_positive": [p["rule"] for p in data.get("positive", [])[:5]],
                }
                for cat, data in self.db["patterns"].items()
            },
        }


# ── CLI ──

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Rally Brain v7.0 Knowledge Base")
    parser.add_argument("--status", action="store_true", help="Show knowledge base status")
    parser.add_argument("--context", type=str, default="", help="Get generation context for campaign")
    parser.add_argument("--export", type=str, default="", help="Export for generate.js (campaign_id)")
    parser.add_argument("--stats", action="store_true", help="Show statistics")

    args = parser.parse_args()
    kb = V7KnowledgeBase()

    if args.status or args.stats:
        stats = kb.get_stats()
        print(json.dumps(stats, indent=2))
        print(f"\nPatterns: {json.dumps({cat: {'+': len(d.get('positive', [])), '-': len(d.get('negative', []))} for cat, d in kb.db['patterns'].items()}, indent=2)}")

    elif args.context:
        print(kb.get_generation_context(args.context))

    elif args.export:
        data = kb.export_for_generate(args.export)
        print(json.dumps(data, indent=2, ensure_ascii=False))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
