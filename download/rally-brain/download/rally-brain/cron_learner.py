"""
Rally Brain Cron Learner v2.0
Fetches campaign data from Rally API, extracts patterns, updates knowledge DB.
This is the LEARN part of the connected learn→generate pipeline.
"""

import json
import os
import sys
import logging
import asyncio
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

import aiohttp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [LEARNER] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

RALLY_API_BASE = "https://app.rally.fun/api"
CAMPAIGNS_ENDPOINT = f"{RALLY_API_BASE}/campaigns"
SUBMISSIONS_ENDPOINT = f"{RALLY_API_BASE}/campaigns/{{campaign_id}}/submissions"


class RallyLearner:
    """Fetches Rally data and feeds it to the engine for learning."""

    def __init__(self, engine=None, data_dir: str = "campaign_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        if engine is None:
            from engine import RallyBrainEngine
            knowledge_path = Path(__file__).parent / "knowledge_db.json"
            self.engine = RallyBrainEngine(str(knowledge_path))
        else:
            self.engine = engine

    async def fetch_active_campaigns(self) -> list:
        """Fetch all active campaigns from Rally API."""
        logger.info("Fetching active campaigns from Rally API...")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{CAMPAIGNS_ENDPOINT}?status=active",
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        campaigns = data if isinstance(data, list) else data.get("campaigns", data.get("data", []))
                        logger.info(f"Found {len(campaigns)} active campaigns")
                        return campaigns
                    else:
                        logger.error(f"API error: {resp.status} - {await resp.text()}")
                        return []
        except Exception as e:
            logger.error(f"Failed to fetch campaigns: {e}")
            return []

    async def fetch_campaign_submissions(self, campaign_id: str) -> list:
        """Fetch submissions for a specific campaign."""
        logger.info(f"Fetching submissions for campaign {campaign_id}...")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    SUBMISSIONS_ENDPOINT.format(campaign_id=campaign_id),
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        submissions = data if isinstance(data, list) else data.get("submissions", data.get("data", []))
                        logger.info(f"Found {len(submissions)} submissions for campaign {campaign_id}")
                        return submissions
                    elif resp.status == 404:
                        logger.warning(f"No submissions endpoint for campaign {campaign_id}")
                        return []
                    else:
                        logger.error(f"API error {resp.status} for campaign {campaign_id}")
                        return []
        except Exception as e:
            logger.error(f"Failed to fetch submissions: {e}")
            return []

    async def fetch_single_campaign(self, campaign_id_or_url: str) -> dict:
        """Fetch a single campaign by ID or URL."""
        # Extract campaign ID from URL if needed
        campaign_id = campaign_id_or_url
        if "rally.fun" in campaign_id_or_url:
            # Extract ID from URL patterns like /campaigns/abc123
            import re
            match = re.search(r'/campaigns?/([^/?\s]+)', campaign_id_or_url)
            if match:
                campaign_id = match.group(1)

        logger.info(f"Fetching campaign {campaign_id}...")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{CAMPAIGNS_ENDPOINT}/{campaign_id}",
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        campaign = data if isinstance(data, dict) else data.get("campaign", data.get("data", {}))
                        logger.info(f"Fetched campaign: {campaign.get('title', 'Unknown')}")
                        return campaign
                    else:
                        logger.error(f"Failed to fetch campaign {campaign_id}: {resp.status}")
                        return {}
        except Exception as e:
            logger.error(f"Failed to fetch campaign: {e}")
            return {}

    def save_campaign_data(self, campaign_id: str, data: dict):
        """Save campaign data to local storage."""
        filepath = self.data_dir / f"{campaign_id}_data.json"
        # Merge with existing data
        existing = {}
        if filepath.exists():
            with open(filepath) as f:
                existing = json.load(f)

        if isinstance(existing, list):
            existing = {"submissions": existing, "updates": []}

        existing["last_updated"] = datetime.now(timezone.utc).isoformat()
        if "updates" not in existing:
            existing["updates"] = []
        existing["updates"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data
        })

        with open(filepath, "w") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)

    def save_submissions(self, campaign_id: str, submissions: list):
        """Save submissions to local storage."""
        filepath = self.data_dir / f"{campaign_id}_submissions.json"
        with open(filepath, "w") as f:
            json.dump(submissions, f, indent=2, ensure_ascii=False)

    async def learn_from_campaign(self, campaign_id: str, campaign_info: dict = None) -> dict:
        """
        Full learning cycle for a single campaign:
        1. Fetch campaign info (if not provided)
        2. Fetch submissions
        3. Extract patterns from scored submissions
        4. Update knowledge DB
        """
        result = {"campaign_id": campaign_id, "patterns_learned": 0, "status": "ok"}

        # Step 1: Get campaign info
        if not campaign_info:
            campaign_info = await self.fetch_single_campaign(campaign_id)
            if not campaign_info:
                result["status"] = "failed_campaign_fetch"
                return result

        # Save campaign data
        self.save_campaign_data(campaign_id, campaign_info)

        # Step 2: Fetch submissions
        submissions = await self.fetch_campaign_submissions(campaign_id)

        # Filter: only learn from submissions that have scores
        scored_subs = [
            s for s in submissions
            if s.get("scores") or s.get("score") or s.get("gradingResult")
        ]

        if not scored_subs:
            logger.info(f"No scored submissions found for campaign {campaign_id}")
            result["status"] = "no_scored_submissions"
            result["total_submissions"] = len(submissions)
            return result

        # Normalize submission format
        normalized = []
        for sub in scored_subs:
            normalized_sub = {
                "content": sub.get("content", sub.get("text", sub.get("postContent", ""))),
                "scores": sub.get("scores", {}),
                "analysis": sub.get("analysis", sub.get("feedback", sub.get("gradingResult", {})))
            }

            # If scores is nested under gradingResult
            if not normalized_sub["scores"] and isinstance(normalized_sub["analysis"], dict):
                grading = normalized_sub["analysis"]
                normalized_sub["scores"] = grading.get("scores", {})
                normalized_sub["analysis"] = grading.get("analysis", grading.get("details", grading))

            # If scores is a single number, distribute or store as total
            if isinstance(normalized_sub["scores"], (int, float)):
                total = normalized_sub["scores"]
                normalized_sub["scores"] = {"total": total}

            if normalized_sub["content"]:
                normalized.append(normalized_sub)

        self.save_submissions(campaign_id, normalized)

        # Step 3: Learn from submissions
        if normalized:
            patterns_learned = self.engine.learn_from_submissions(normalized, campaign_id, campaign_info)
            result["patterns_learned"] = patterns_learned
            result["submissions_analyzed"] = len(normalized)

        # Step 4: Update campaign count
        self.engine.kdb["stats"]["total_campaigns_analyzed"] = len(self.engine.kdb.get("campaign_memories", {}))
        self.engine.save_knowledge_db()

        logger.info(f"Learning complete for {campaign_id}: {result['patterns_learned']} patterns learned")
        return result

    async def learn_all_active(self) -> list:
        """Learn from ALL active campaigns."""
        campaigns = await self.fetch_active_campaigns()
        results = []

        for campaign in campaigns:
            cid = campaign.get("id", campaign.get("campaignId", ""))
            if not cid:
                continue
            try:
                result = await self.learn_from_campaign(cid, campaign)
                results.append(result)
            except Exception as e:
                logger.error(f"Error learning from campaign {cid}: {e}")
                results.append({"campaign_id": cid, "status": "error", "error": str(e)})

        return results


async def run_learning_cycle(campaign_id: str = None, engine=None):
    """
    Execute one learning cycle.
    If campaign_id provided, learn from that specific campaign.
    Otherwise, learn from all active campaigns.
    """
    learner = RallyLearner(engine=engine, data_dir=str(Path(__file__).parent / "campaign_data"))

    if campaign_id:
        result = await learner.learn_from_campaign(campaign_id)
    else:
        results = await learner.learn_all_active()
        result = {
            "total_campaigns": len(results),
            "successful": len([r for r in results if r.get("status") == "ok"]),
            "details": results
        }

    return result


if __name__ == "__main__":
    # Standalone: learn from a specific campaign or all active
    target = sys.argv[1] if len(sys.argv) > 1 else None
    result = asyncio.run(run_learning_cycle(campaign_id=target))
    print(json.dumps(result, indent=2, ensure_ascii=False))
