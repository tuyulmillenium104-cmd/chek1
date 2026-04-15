"""
Knowledge Base — Persistent storage for patterns, memories, and calibration.
JSON-based, simple, fast, no external dependencies.
"""

import json
import os
from datetime import datetime
from typing import Optional


DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "knowledge_db.json")


class KnowledgeBase:
    def __init__(self, path: str = DB_PATH):
        self.path = path
        self.db = self._load()

    def _load(self) -> dict:
        if os.path.exists(self.path):
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return self._default()

    def save(self):
        self.db["last_updated"] = datetime.now().isoformat()
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.db, f, indent=2, ensure_ascii=False)

    def _default(self) -> dict:
        return {
            "version": "2.0",
            "created": datetime.now().isoformat(),
            "last_updated": None,
            "patterns": {
                "claim_specificity": [],
                "rally_mention_depth": [],
                "engagement_hook": [],
                "tone_style_match": [],
                "structure_optimal": [],
                "compliance_traps": [],
                "originality_markers": []
            },
            "scoring_model": {
                "calibration_log": [],
                "avg_prediction_diff": None,
                "total_calibrations": 0
            },
            "campaign_memories": {},
            "cycle_log": [],
            "stats": {
                "total_patterns": 0,
                "total_submissions_analyzed": 0,
                "total_campaigns": 0,
                "total_cycles": 0,
                "total_content_generated": 0
            }
        }

    # ── Patterns ──

    def add_pattern(self, category: str, pattern: str, effect: str,
                    trigger: str = "", confidence: float = 0.8):
        if category not in self.db["patterns"]:
            self.db["patterns"][category] = []
        self.db["patterns"][category].append({
            "pattern": pattern,
            "effect": effect,
            "trigger": trigger,
            "confidence": confidence,
            "discovered_at": datetime.now().isoformat(),
            "confirmed_count": 1
        })
        self._refresh_stats()

    def get_patterns(self, category: Optional[str] = None) -> list:
        if category:
            return self.db["patterns"].get(category, [])
        all_patterns = []
        for cat, patterns in self.db["patterns"].items():
            for p in patterns:
                all_patterns.append({"category": cat, **p})
        return all_patterns

    def get_high_confidence_patterns(self, min_confidence: float = 0.7) -> list:
        return [p for p in self.get_patterns() if p.get("confidence", 0) >= min_confidence]

    # ── Campaign Memory ──

    def save_campaign_memory(self, campaign_id: str, memory: dict):
        existing = self.db["campaign_memories"].get(campaign_id, {})
        existing.update(memory)
        existing["updated_at"] = datetime.now().isoformat()
        self.db["campaign_memories"][campaign_id] = existing
        self._refresh_stats()

    def get_campaign_memory(self, campaign_id: str) -> Optional[dict]:
        return self.db["campaign_memories"].get(campaign_id)

    # ── Calibration ──

    def add_calibration(self, predicted: float, actual: float,
                        content_snippet: str = "", rally_analysis: str = ""):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "predicted": predicted,
            "actual": actual,
            "diff": round(abs(predicted - actual), 2),
            "content_snippet": content_snippet[:300],
            "rally_analysis": rally_analysis[:800] if rally_analysis else None
        }
        self.db["scoring_model"]["calibration_log"].append(entry)
        self.db["scoring_model"]["total_calibrations"] += 1
        logs = self.db["scoring_model"]["calibration_log"]
        if logs:
            avg = sum(l["diff"] for l in logs) / len(logs)
            self.db["scoring_model"]["avg_prediction_diff"] = round(avg, 2)

    # ── Cycle Log ──

    def log_cycle(self, cycle_type: str, campaign_id: str = "", details: dict = None):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "type": cycle_type,
            "campaign_id": campaign_id,
            "details": details or {}
        }
        self.db["cycle_log"].append(entry)
        self.db["stats"]["total_cycles"] += 1

    # ── Stats ──

    def _refresh_stats(self):
        self.db["stats"]["total_patterns"] = sum(
            len(p) for p in self.db["patterns"].values()
        )
        self.db["stats"]["total_campaigns"] = len(self.db["campaign_memories"])
        self.db["stats"]["total_submissions_analyzed"] = sum(
            m.get("submissions_analyzed", 0)
            for m in self.db["campaign_memories"].values()
        )

    def get_stats(self) -> dict:
        self._refresh_stats()
        return self.db["stats"]

    def get_creation_context(self, campaign_id: str = "") -> str:
        """Generate a concise context brief for content creation."""
        lines = []
        stats = self.get_stats()
        lines.append(f"Knowledge: {stats['total_patterns']} patterns, "
                     f"{stats['total_campaigns']} campaigns analyzed")
        if stats["total_calibrations"] > 0:
            lines.append(f"Prediction accuracy: avg diff {self.db['scoring_model']['avg_prediction_diff']}")

        # High confidence patterns
        hc = self.get_high_confidence_patterns(0.75)
        if hc:
            lines.append(f"Top {min(10, len(hc))} patterns:")
            for p in hc[:10]:
                lines.append(f"  [{p['category']}] {p['pattern']} → {p['effect']}")

        # Campaign memory
        if campaign_id:
            mem = self.get_campaign_memory(campaign_id)
            if mem:
                lines.append(f"Campaign memory ({campaign_id}):")
                if mem.get("best_score"):
                    lines.append(f"  Best score: {mem['best_score']}")
                if mem.get("competitive_gaps"):
                    lines.append(f"  Gaps: {mem['competitive_gaps']}")
                if mem.get("lessons"):
                    lines.append(f"  Lessons: {mem['lessons']}")

        return "\n".join(lines)

    def export(self) -> dict:
        """Export full database."""
        return self.db.copy()

    def import_data(self, data: dict):
        """Import data into database (merge)."""
        if "patterns" in data:
            for cat, patterns in data["patterns"].items():
                if cat not in self.db["patterns"]:
                    self.db["patterns"][cat] = []
                self.db["patterns"][cat].extend(patterns)
        if "campaign_memories" in data:
            self.db["campaign_memories"].update(data["campaign_memories"])
        if "scoring_model" in data and "calibration_log" in data["scoring_model"]:
            self.db["scoring_model"]["calibration_log"].extend(
                data["scoring_model"]["calibration_log"]
            )
        self._refresh_stats()
