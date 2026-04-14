"""
Rally Brain v2.0 — Main Engine
Orchestrates learn + generate cycle.

Usage:
    python -m rally_brain cycle --campaign-url <url>
    python -m rally_brain learn --campaign-url <url>
    python -m rally_brain predict --content "tweet text"
    python -m rally_brain status
"""

import json
import os
import sys
import argparse
from datetime import datetime
from typing import Optional

from .api import RallyAPI
from .knowledge import KnowledgeBase
from .patterns import PatternExtractor
from .predictor import ScorePredictor


class RallyBrain:
    """Main engine: Learn + Generate in one connected cycle."""

    def __init__(self, knowledge_path: Optional[str] = None):
        self.kb = KnowledgeBase(knowledge_path)
        self.api = RallyAPI()
        self.extractor = PatternExtractor()

    # ── LEARN ──

    def learn_campaign(self, campaign_address: str) -> dict:
        """Learn from a single campaign's submissions."""
        print(f"\n[LEARN] Fetching submissions for {campaign_address[:16]}...")

        submissions = self.api.fetch_submissions(campaign_address, limit=200)
        if not submissions:
            print("[LEARN] No submissions found.")
            return {"patterns_found": 0, "submissions_analyzed": 0}

        print(f"[LEARN] Analyzing {len(submissions)} submissions...")

        # Extract patterns
        all_patterns = self.extractor.extract_from_submissions(submissions)

        # Add to knowledge base
        new_patterns = 0
        for cat, patterns in all_patterns.items():
            for p in patterns:
                self.kb.add_pattern(
                    category=p["category"],
                    pattern=p["pattern"],
                    effect=p["effect"],
                    trigger=p.get("trigger", ""),
                    confidence=p.get("confidence", 0.8)
                )
                new_patterns += 1

        # Competitive analysis
        competitive = self.extractor.analyze_competitive_landscape(submissions)

        # Save campaign memory
        campaign_data = self.api.fetch_campaign_detail(campaign_address)
        summary = self.api.get_campaign_summary(campaign_data)

        self.kb.save_campaign_memory(campaign_address, {
            "name": summary.get("name", ""),
            "style": summary.get("style", ""),
            "submissions_analyzed": len(submissions),
            "avg_score": competitive.get("avg_score", 0),
            "max_score": competitive.get("max_score", 0),
            "score_distribution": competitive.get("score_distribution", {}),
            "common_angles": competitive.get("common_angles", [])[:5],
            "top_scorer_count": competitive.get("top_scorer_count", 0),
            "competitive_gaps": self._identify_gaps(submissions, competitive)
        })

        self.kb.save()
        self.kb.log_cycle("learn", campaign_address, {
            "submissions_analyzed": len(submissions),
            "new_patterns": new_patterns,
            "avg_score": competitive.get("avg_score", 0)
        })
        self.kb.save()

        print(f"[LEARN] Done. +{new_patterns} patterns.")
        print(f"[LEARN] Campaign avg score: {competitive.get('avg_score', 0)}/18")
        print(f"[LEARN] Top scorers: {competitive.get('top_scorer_count', 0)}")

        return {
            "patterns_found": new_patterns,
            "submissions_analyzed": len(submissions),
            "avg_score": competitive.get("avg_score", 0),
            "gaps": self._identify_gaps(submissions, competitive)
        }

    def learn_all_active(self) -> dict:
        """Learn from all active campaigns."""
        print("\n[LEARN] Fetching all active campaigns...")
        data = self.api.fetch_active_campaigns()
        campaigns = self.api.extract_campaigns_list(data)

        if not campaigns:
            print("[LEARN] No campaigns found.")
            return {"total_campaigns": 0, "total_patterns": 0}

        print(f"[LEARN] Found {len(campaigns)} active campaigns.")

        total_patterns = 0
        for c in campaigns:
            cid = self.api.extract_campaign_id(c)
            if cid:
                result = self.learn_campaign(cid)
                total_patterns += result.get("patterns_found", 0)

        print(f"\n[LEARN] All done. Total new patterns: {total_patterns}")
        return {"total_campaigns": len(campaigns), "total_patterns": total_patterns}

    # ── PREDICT ──

    def predict(self, content: str, campaign_style: str = "",
                campaign_rules: str = "") -> dict:
        """Predict Rally score for content."""
        patterns = self.kb.get_patterns()
        predictor = ScorePredictor(patterns)
        scores = predictor.predict(content, campaign_style, campaign_rules)
        recs = predictor.get_recommendations(content, scores, campaign_style)
        return {"scores": scores, "recommendations": recs}

    # ── GENERATE CONTEXT ──

    def get_creation_context(self, campaign_address: str = "") -> str:
        """Get creation context brief for content generation."""
        return self.kb.get_creation_context(campaign_address)

    # ── CALIBRATE ──

    def calibrate(self, predicted: float, actual: float,
                  content: str = "", rally_analysis: str = ""):
        """Calibrate with actual Rally score."""
        self.kb.add_calibration(predicted, actual, content, rally_analysis)
        self.kb.save()
        diff = abs(predicted - actual)
        print(f"[CALIBRATE] Predicted: {predicted} | Actual: {actual} | Diff: {diff}")
        print(f"[CALIBRATE] Avg prediction diff: {self.kb.db['scoring_model']['avg_prediction_diff']}")
        return {"predicted": predicted, "actual": actual, "diff": diff}

    # ── STATUS ──

    def status(self) -> dict:
        """Get system status."""
        stats = self.kb.get_stats()
        cal = self.kb.db["scoring_model"]
        return {
            "version": "2.0",
            "knowledge_stats": stats,
            "prediction_accuracy": cal.get("avg_prediction_diff"),
            "total_calibrations": cal.get("total_calibrations", 0),
            "campaigns_tracked": list(self.kb.db["campaign_memories"].keys()),
            "pattern_categories": {cat: len(p) for cat, p in self.kb.db["patterns"].items()},
            "last_updated": self.kb.db.get("last_updated")
        }

    # ── UTILITIES ──

    def _identify_gaps(self, submissions: list, competitive: dict) -> list:
        """Identify competitive gaps (angles nobody uses)."""
        gaps = []
        angles = competitive.get("common_angles", [])

        if not angles:
            return gaps

        # If top angle has >30% usage, find what's missing
        if angles:
            top = angles[0]
            gaps.append(f"Most common angle (avoid): '{top[0]}' ({top[1]} submissions)")

        # Check for missing angles
        common_themes = [
            "meta-self-referential", "personal anecdote", "data-driven",
            "counter-argument", "question-driven", "visual metaphor",
            "historical comparison", "first-principles"
        ]
        content_text = " ".join(
            str(sub.get("content", "")) for sub in submissions[:50]
        ).lower()

        for theme in common_themes:
            if theme not in content_text:
                gaps.append(f"Untapped angle: {theme} (0% usage)")

        return gaps


def main():
    parser = argparse.ArgumentParser(description="Rally Brain v2.0")
    subparsers = parser.add_subparsers(dest="command")

    # Learn
    learn_parser = subparsers.add_parser("learn", help="Learn from Rally submissions")
    learn_parser.add_argument("--campaign-url", help="Campaign URL or ID")
    learn_parser.add_argument("--all", action="store_true", help="Learn from all active campaigns")

    # Predict
    pred_parser = subparsers.add_parser("predict", help="Predict Rally score")
    pred_parser.add_argument("--content", "-c", required=True, help="Content to predict")
    pred_parser.add_argument("--style", "-s", default="", help="Campaign style")

    # Calibrate
    cal_parser = subparsers.add_parser("calibrate", help="Calibrate with actual score")
    cal_parser.add_argument("--predicted", type=float, required=True)
    cal_parser.add_argument("--actual", type=float, required=True)

    # Status
    subparsers.add_parser("status", help="Show system status")

    # Context
    ctx_parser = subparsers.add_parser("context", help="Get creation context")
    ctx_parser.add_argument("--campaign", default="", help="Campaign ID")

    args = parser.parse_args()
    brain = RallyBrain()

    if args.command == "learn":
        if args.all:
            result = brain.learn_all_active()
            print(json.dumps(result, indent=2, default=str))
        elif args.campaign_url:
            cid = args.campaign_url.split("/")[-1] if "/" in args.campaign_url else args.campaign_url
            result = brain.learn_campaign(cid)
            print(json.dumps(result, indent=2, default=str))
        else:
            print("Error: --campaign-url or --all required")

    elif args.command == "predict":
        result = brain.predict(args.content, args.style)
        print(json.dumps(result, indent=2))

    elif args.command == "calibrate":
        result = brain.calibrate(args.predicted, args.actual)
        print(json.dumps(result, indent=2))

    elif args.command == "status":
        result = brain.status()
        print(json.dumps(result, indent=2, default=str))

    elif args.command == "context":
        ctx = brain.get_creation_context(args.campaign)
        print(ctx)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
