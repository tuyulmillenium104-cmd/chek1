"""
Rally Brain v7.0 — Main Engine
Orchestrates the complete data → analysis → knowledge → prediction pipeline.

This is the central coordinator that ties all v7 modules together.

Pipeline:
  1. COLLECT: Fetch Rally.fun data (submissions, scores, analysis)
  2. ANALYZE: Extract patterns from scoring analysis
  3. LEARN: Update knowledge base with new patterns
  4. PREDICT: Score content using learned patterns
  5. EXPORT: Generate context for generate.js consumption

Usage:
  python v7_engine.py data-cycle          # Run one data collection + analysis cycle
  python v7_engine.py predict --content "..."  # Predict score
  python v7_engine.py status              # Show system status
  python v7_engine.py export --campaign marbmarket-m0  # Export for generate.js
  python v7_engine.py init                # Initialize from existing data
"""

import json
import sys
import logging
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from v7_config import (
    DATA_DIR, ACTIVE_CAMPAIGNS, CATEGORIES, CAMPAIGNS_DIR,
    QUALITY_THRESHOLD, QUALITY_GATE_REGEN, QUALITY_GATE_MIN,
    MAX_TOTAL_SCORE
)
from v7_collector import RallyDataCollector
from v7_analyzer import PatternExtractor
from v7_knowledge import V7KnowledgeBase
from v7_predictor import ScorePredictor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [V7 %(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("engine")


class RallyBrainV7:
    """
    Rally Brain v7.0 Engine
    Coordinates data collection, pattern analysis, knowledge management,
    and score prediction.
    """

    def __init__(self, data_dir: str = None):
        base = Path(data_dir) if data_dir else DATA_DIR
        base.mkdir(parents=True, exist_ok=True)

        self.collector = RallyDataCollector(str(base / "v7_collected"))
        self.analyzer = PatternExtractor()
        self.knowledge = V7KnowledgeBase(str(base / "v7_knowledge.json"))
        self.predictor = ScorePredictor()

        # Load knowledge patterns into predictor
        patterns = {cat: self.knowledge.db["patterns"].get(cat, {}) for cat in CATEGORIES.keys()}
        self.predictor.set_knowledge_patterns(patterns)

        logger.info(f"Rally Brain v7.0 initialized")
        logger.info(f"  Patterns: {self.knowledge.db['stats']['total_patterns']}")
        logger.info(f"  Submissions analyzed: {self.knowledge.db['stats']['total_submissions_analyzed']}")
        logger.info(f"  Total cycles: {self.knowledge.db['stats']['total_cycles']}")

    # ════════════════════════════════════════════════════
    # DATA CYCLE (runs every 15 min via cron)
    # ════════════════════════════════════════════════════

    def run_data_cycle(self) -> dict:
        """
        Full data collection and analysis cycle.
        
        This is the "always-on" cron job the user requested.
        It collects data from Rally.fun, analyzes patterns, and updates knowledge.
        """
        logger.info("=" * 60)
        logger.info("Starting v7.0 Data Cycle")
        logger.info("=" * 60)

        result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "phase": "data_cycle",
            "steps": {},
        }

        # Step 1: Collect data
        logger.info("[1/4] Collecting data from Rally.fun API + local cache...")
        collect_result = self.collector.collect_all()
        result["steps"]["collect"] = collect_result
        logger.info(f"  Collected: {collect_result.get('new_submissions', 0)} new, "
                     f"{collect_result.get('total_submissions', 0)} total")

        # Step 2: Get latest submissions for analysis
        submissions = self.collector.get_latest_submissions(500)
        if not submissions:
            logger.warning("No submissions available for analysis")
            result["steps"]["analyze"] = {"status": "skipped", "reason": "no_submissions"}
            return result

        # Step 3: Extract patterns
        logger.info(f"[2/4] Analyzing {len(submissions)} submissions for patterns...")
        patterns = self.analyzer.extract_patterns_from_submissions(submissions)
        result["steps"]["analyze"] = {
            "submissions_analyzed": len(submissions),
            "patterns_by_category": {cat: len(ps) for cat, ps in patterns.items()},
        }
        total_patterns = sum(len(ps) for ps in patterns.values())
        logger.info(f"  Extracted: {total_patterns} patterns across {len(patterns)} categories")

        # Step 4: Update knowledge base
        logger.info("[3/4] Updating knowledge base...")
        self.knowledge.add_patterns_batch(patterns)

        # Competitive analysis
        competitive = self.analyzer.analyze_competitive_landscape(submissions)
        self.knowledge.update_competitive(competitive)
        result["steps"]["competitive"] = {
            "recommendations": competitive.get("recommendations", [])[:5],
        }

        # Update stats
        self.knowledge.db["stats"]["total_submissions_analyzed"] = (
            self.collector.cache_dir.name, len(submissions)
        )
        self.knowledge.db["stats"]["last_collection"] = result["timestamp"]

        self.knowledge.save()
        logger.info("[4/4] Knowledge base updated and saved")

        # Step 5: Refresh predictor with updated patterns
        updated_patterns = {
            cat: self.knowledge.db["patterns"].get(cat, {})
            for cat in CATEGORIES.keys()
        }
        self.predictor.set_knowledge_patterns(updated_patterns)

        logger.info("=" * 60)
        logger.info(f"Data Cycle Complete: {total_patterns} patterns, "
                     f"{len(submissions)} submissions")
        logger.info("=" * 60)

        return result

    # ════════════════════════════════════════════════════
    # PREDICTION
    # ════════════════════════════════════════════════════

    def predict(self, content: str, campaign_id: str = "") -> dict:
        """Predict score for content."""
        config = self._load_campaign_config(campaign_id)
        return self.predictor.predict(content, config)

    def predict_and_advise(self, content: str, campaign_id: str = "") -> dict:
        """Predict score and provide detailed improvement advice."""
        result = self.predict(content, campaign_id)

        # Add knowledge context
        result["knowledge_context"] = self.knowledge.get_generation_context(campaign_id)

        # Category-specific advice from competitive analysis
        for cat, score in result["category_scores"].items():
            max_score = CATEGORIES[cat]["max"]
            pct = score / max_score if max_score > 0 else 0
            if pct < 0.7:
                gaps = self.knowledge.db["competitive"].get("category_gaps", {}).get(cat)
                if gaps:
                    result.setdefault("category_advice", {})[cat] = (
                        f"This is a common weak spot (avg: {gaps['avg']}/{gaps['max']}, "
                        f"{gaps['gap_pct']}% gap). Focus here for maximum improvement."
                    )

        return result

    # ════════════════════════════════════════════════════
    # GENERATION INTEGRATION
    # ════════════════════════════════════════════════════

    def export_for_generation(self, campaign_id: str = "") -> dict:
        """
        Export knowledge in format optimized for generate.js consumption.
        This is the BRIDGE between Python data pipeline and JS generation.
        """
        return self.knowledge.export_for_generate(campaign_id)

    def write_generation_context(self, campaign_id: str = "") -> str:
        """
        Write generation context to a file that generate.js can read.
        Returns the file path.
        """
        context = self.export_for_generation(campaign_id)
        output_file = Path(DATA_DIR) / "v7_context.json"
        output_file.write_text(json.dumps(context, indent=2, ensure_ascii=False))
        logger.info(f"Written generation context to {output_file}")
        return str(output_file)

    def record_generation_cycle(self, campaign_id: str, cycle_data: dict):
        """Record a generation cycle result for learning."""
        self.knowledge.log_cycle(campaign_id, cycle_data)
        self.knowledge.update_campaign_memory(campaign_id, cycle_data)

        # Calibrate predictor if we have both predicted and actual scores
        if cycle_data.get("predicted_score") and cycle_data.get("actual_score"):
            for cat in CATEGORIES.keys():
                predicted = cycle_data["predicted_score"].get(cat)
                actual = cycle_data["actual_score"].get(cat)
                if predicted is not None and actual is not None:
                    self.predictor.calibrate(cat, predicted, actual)

        self.knowledge.save()

    # ════════════════════════════════════════════════════
    # INITIALIZATION
    # ════════════════════════════════════════════════════

    def initialize_from_existing_data(self) -> dict:
        """
        Initialize knowledge base from existing data sources.
        One-time setup to bootstrap v7 from v6 data.
        """
        logger.info("Initializing v7 from existing data...")

        result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actions": [],
        }

        # 1. Collect from local cache
        collect_result = self.collector.collect_all()
        result["actions"].append(f"Collected {collect_result.get('new_submissions', 0)} submissions")

        # 2. Analyze patterns
        submissions = self.collector.get_latest_submissions(500)
        if submissions:
            patterns = self.analyzer.extract_patterns_from_submissions(submissions)
            self.knowledge.add_patterns_batch(patterns)

            competitive = self.analyzer.analyze_competitive_landscape(submissions)
            self.knowledge.update_competitive(competitive)

            result["actions"].append(
                f"Extracted {sum(len(ps) for ps in patterns.values())} patterns from "
                f"{len(submissions)} submissions"
            )
            result["actions"].append(
                f"Competitive analysis: {len(competitive.get('recommendations', []))} recommendations"
            )

        # 3. Import from existing v6 knowledge databases
        v6_kdb = Path(__file__).parent / "knowledge_db.json"
        if v6_kdb.exists():
            try:
                v6_data = json.loads(v6_kdb.read_text())
                migrated = self.knowledge._migrate(v6_data)
                result["actions"].append(f"Migrated from v6 knowledge_db.json")
            except Exception as e:
                result["actions"].append(f"v6 migration failed: {e}")

        # 4. Import per-campaign knowledge
        for campaign_id in ACTIVE_CAMPAIGNS:
            kdb_path = Path(DATA_DIR) / f"{campaign_id}_knowledge_db.json"
            if kdb_path.exists():
                try:
                    campaign_data = json.loads(kdb_path.read_text())
                    self.knowledge.update_campaign_memory(campaign_id, {
                        "total_cycles": campaign_data.get("stats", {}).get("total_cycles", 0),
                        "best_score": campaign_data.get("stats", {}).get("best_score_achieved", 0),
                        "avg_score": campaign_data.get("stats", {}).get("avg_score", 0),
                    })
                    result["actions"].append(
                        f"Imported {campaign_id}: {campaign_data.get('stats', {}).get('total_cycles', 0)} cycles"
                    )
                except Exception as e:
                    result["actions"].append(f"Import {campaign_id} failed: {e}")

        self.knowledge.save()
        logger.info("Initialization complete")
        return result

    # ════════════════════════════════════════════════════
    # STATUS
    # ════════════════════════════════════════════════════

    def status(self) -> dict:
        """Get full system status."""
        kb_stats = self.knowledge.get_stats()
        collection_stats = self.collector.get_score_distribution()

        return {
            "version": "7.0.0",
            "knowledge": kb_stats,
            "collection": collection_stats,
            "calibration": self.knowledge.db["calibration"],
            "competitive": {
                "recommendations": self.knowledge.db["competitive"].get("recommendations", [])[:5],
                "category_gaps": self.knowledge.db["competitive"].get("category_gaps", {}),
            },
            "campaigns": {
                cid: self.knowledge.db["campaign_memory"].get(cid, {})
                for cid in ACTIVE_CAMPAIGNS
            },
            "predictor_offsets": {
                cat: round(offset, 3)
                for cat, offset in self.predictor.calibration_offsets.items()
            },
        }

    # ════════════════════════════════════════════════════
    # HELPERS
    # ════════════════════════════════════════════════════

    def _load_campaign_config(self, campaign_id: str) -> dict:
        """Load campaign configuration."""
        if not campaign_id:
            return {}
        config_file = CAMPAIGNS_DIR / f"{campaign_id}.json"
        if config_file.exists():
            try:
                return json.loads(config_file.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, IOError):
                pass
        return {}


# ════════════════════════════════════════════════════════
# CLI
# ════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Rally Brain v7.0 — Data-Driven Content Intelligence",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python v7_engine.py init                    # Bootstrap from existing data
  python v7_engine.py data-cycle              # Run data collection + analysis
  python v7_engine.py predict -c "content"    # Predict score for content
  python v7_engine.py status                  # Show system status
  python v7_engine.py export --campaign m0    # Export context for generate.js
  python v7_engine.py write-context --campaign m0  # Write context file for generate.js
        """
    )

    subparsers = parser.add_subparsers(dest="command")

    # Init
    subparsers.add_parser("init", help="Initialize from existing data")

    # Data cycle
    subparsers.add_parser("data-cycle", help="Run data collection + analysis cycle")

    # Predict
    pred = subparsers.add_parser("predict", help="Predict score for content")
    pred.add_argument("--content", "-c", type=str, help="Content to predict")
    pred.add_argument("--file", "-f", type=str, help="Read content from file")
    pred.add_argument("--campaign", type=str, default="", help="Campaign ID")

    # Status
    subparsers.add_parser("status", help="Show system status")

    # Export
    exp = subparsers.add_parser("export", help="Export knowledge for generate.js")
    exp.add_argument("--campaign", type=str, default="", help="Campaign ID")

    # Write context
    wctx = subparsers.add_parser("write-context", help="Write generation context file")
    wctx.add_argument("--campaign", type=str, default="", help="Campaign ID")

    args = parser.parse_args()
    engine = RallyBrainV7()

    if args.command == "init":
        result = engine.initialize_from_existing_data()
        print(json.dumps(result, indent=2))
        print(f"\nKnowledge base saved to: {engine.knowledge.path}")

    elif args.command == "data-cycle":
        result = engine.run_data_cycle()
        print(json.dumps(result, indent=2, default=str))

    elif args.command == "predict":
        content = ""
        if args.file:
            content = Path(args.file).read_text()
        elif args.content:
            content = args.content
        else:
            # Demo
            content = (
                "Spent the weekend digging into vote-escrow mechanics. "
                "You lock MARB for veMARB, vote on emissions, and protocols "
                "bribe you for that vote. MarbMarket is first veDEX on MegaETH "
                "with no VC money. Following @RallyOnChain. "
                "Check x.com/Marb_market. "
                "Do you prefer pure AMM pools or the vote-escrow bribery model?"
            )

        result = engine.predict_and_advise(content, args.campaign)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "status":
        result = engine.status()
        print(json.dumps(result, indent=2, default=str))

    elif args.command == "export":
        result = engine.export_for_generation(args.campaign)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "write-context":
        path = engine.write_generation_context(args.campaign)
        print(f"Written to: {path}")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
