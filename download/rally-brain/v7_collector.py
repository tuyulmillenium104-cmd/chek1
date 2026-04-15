"""
Rally Brain v7.0 — Data Collector
Fetches real-time data from Rally.fun API.
Runs continuously to build a living dataset of submissions, scores, and analysis.

This is the "always-on" data pipeline the user requested.
It runs independently of generation and feeds the knowledge base.
"""

import json
import time
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List, Dict

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False

from v7_config import (
    RALLY_API_BASE, RALLY_API_TIMEOUT, MAX_SUBMISSIONS_PER_FETCH,
    DATA_DIR, EXTERNAL_DATA, RALLY_CATEGORY_MAP, CATEGORIES, ENDPOINTS,
    DATA_COLLECT_INTERVAL_MIN
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [V7 %(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("collector")


class SubmissionNormalizer:
    """
    Normalizes Rally.fun API submission data into a consistent format.
    
    Rally API returns submissions with varying structures depending on endpoint.
    This class ensures all submissions have the same schema regardless of source.
    """

    @staticmethod
    def normalize(submission: dict) -> Optional[dict]:
        """Normalize a single submission into our standard format."""
        if not submission:
            return None

        # Extract content - may be in different fields
        content = (
            submission.get("content") or
            submission.get("text") or
            submission.get("postContent") or
            submission.get("tweetContent") or
            ""
        )

        # Extract scores from analysis array
        analysis_raw = submission.get("analysis", [])
        if isinstance(analysis_raw, str):
            try:
                analysis_raw = json.loads(analysis_raw)
            except json.JSONDecodeError:
                analysis_raw = []

        # Parse per-category scores from analysis
        category_scores = {}
        category_analysis = {}
        for item in analysis_raw:
            if not isinstance(item, dict):
                continue

            cat_name = item.get("category", "")
            mapped = RALLY_CATEGORY_MAP.get(cat_name)

            if mapped is None:
                # Engagement metric (retweets, likes, etc.) — store as metadata
                continue

            atto_score = SubmissionNormalizer._parse_atto(item.get("atto_score", "0"))
            atto_max = SubmissionNormalizer._parse_atto(item.get("atto_max_score", "0"))

            if atto_max > 0:
                category_scores[mapped] = round(atto_score / atto_max * CATEGORIES[mapped]["max"], 2)
            else:
                category_scores[mapped] = 0

            category_analysis[mapped] = item.get("analysis", "")

        # Calculate total content quality score (sum of 7 categories only)
        total_score = sum(category_scores.get(cat, 0) for cat in CATEGORIES.keys())

        # Extract metadata
        tweet_id = submission.get("tweetId", "")
        x_username = submission.get("xUsername", submission.get("userXHandle", ""))
        campaign_address = submission.get("campaignAddress", "")
        mission_id = submission.get("missionId", "")
        raw_score_atto = submission.get("attoRawScore", "0")
        temporal_points = submission.get("temporalPoints", 0)
        atemporal_points = submission.get("atemporalPoints", 0)

        # Generate content hash for deduplication
        content_hash = hashlib.md5(
            f"{content}_{tweet_id}_{campaign_address}".encode()
        ).hexdigest()[:16] if content or tweet_id else ""

        # Extract engagement metrics from analysis
        engagement_metrics = {}
        for item in analysis_raw:
            if not isinstance(item, dict):
                continue
            cat = item.get("category", "")
            if cat in ("Retweets", "Likes", "Replies", "Impressions", "Followers of Repliers"):
                val = SubmissionNormalizer._parse_atto(item.get("atto_score", "0"))
                engagement_metrics[cat] = val

        return {
            "id": submission.get("id", content_hash),
            "content_hash": content_hash,
            "campaign_address": campaign_address,
            "mission_id": mission_id,
            "tweet_id": tweet_id,
            "x_username": x_username,
            "content": content,
            "category_scores": category_scores,
            "category_analysis": category_analysis,
            "total_score": round(total_score, 2),
            "max_score": sum(c["max"] for c in CATEGORIES.values()),
            "engagement_metrics": engagement_metrics,
            "raw_score_atto": raw_score_atto,
            "temporal_points": temporal_points,
            "atemporal_points": atemporal_points,
            "timestamp": submission.get("timestamp", ""),
            "sync_status": submission.get("syncStatus", ""),
            "source": "api",
        }

    @staticmethod
    def _parse_atto(value) -> int:
        """Parse atto value (may be string or int)."""
        try:
            if isinstance(value, str):
                return int(value)
            return int(value)
        except (ValueError, TypeError):
            return 0


class RallyDataCollector:
    """
    Fetches data from Rally.fun API.
    
    Two data sources:
    1. Live API: fetch_active_campaigns(), fetch_submissions()
    2. Local cache: load_cached_submissions() from rally_logs_extracted/
    
    The collector deduplicates by content_hash and tracks what's been seen.
    """

    def __init__(self, cache_dir: str = None):
        self.cache_dir = Path(cache_dir) if cache_dir else DATA_DIR / "v7_collected"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.seen_hashes = set()
        self._session = None
        self._load_seen_hashes()

    def _load_seen_hashes(self):
        """Load previously seen content hashes for deduplication."""
        seen_file = self.cache_dir / "seen_hashes.json"
        if seen_file.exists():
            try:
                self.seen_hashes = set(json.loads(seen_file.read_text()))
                logger.info(f"Loaded {len(self.seen_hashes)} seen hashes")
            except (json.JSONDecodeError, IOError):
                self.seen_hashes = set()

    def _save_seen_hashes(self):
        """Save seen hashes to disk."""
        seen_file = self.cache_dir / "seen_hashes.json"
        seen_file.write_text(json.dumps(list(self.seen_hashes)))

    def _get_session(self):
        """Get or create HTTP session."""
        if self._session is None and HAS_REQUESTS:
            self._session = requests.Session()
            self._session.headers.update({
                "User-Agent": "RallyBrain/7.0",
                "Accept": "application/json",
            })
        return self._session

    # ── Live API Methods ──

    def fetch_active_campaigns(self) -> List[dict]:
        """Fetch all active campaigns from Rally.fun API."""
        logger.info("Fetching active campaigns from Rally.fun API...")
        session = self._get_session()
        if not session:
            logger.warning("requests library not available, skipping API fetch")
            return []

        try:
            resp = session.get(
                ENDPOINTS["campaigns"],
                params={"status": "active"},
                timeout=RALLY_API_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()

            # Normalize response
            campaigns = []
            if isinstance(data, list):
                campaigns = data
            elif isinstance(data, dict):
                campaigns = data.get("campaigns", data.get("data", data.get("items", [])))

            logger.info(f"Found {len(campaigns)} active campaigns")
            return campaigns

        except requests.exceptions.RequestException as e:
            logger.error(f"API error fetching campaigns: {e}")
            return []

    def fetch_campaign_submissions(self, campaign_id: str) -> List[dict]:
        """Fetch submissions for a specific campaign."""
        logger.info(f"Fetching submissions for campaign {campaign_id[:16]}...")
        session = self._get_session()
        if not session:
            return []

        try:
            resp = session.get(
                ENDPOINTS["submissions"].format(campaign_id=campaign_id),
                params={"limit": MAX_SUBMISSIONS_PER_FETCH},
                timeout=RALLY_API_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()

            submissions = []
            if isinstance(data, list):
                submissions = data
            elif isinstance(data, dict):
                submissions = data.get("submissions", data.get("data", []))

            logger.info(f"Found {len(submissions)} raw submissions")
            return submissions

        except requests.exceptions.RequestException as e:
            logger.error(f"API error fetching submissions for {campaign_id}: {e}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error fetching submissions for {campaign_id}: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching submissions for {campaign_id}: {type(e).__name__}: {e}")
            return []

    def fetch_campaign_detail(self, campaign_id: str) -> dict:
        """Fetch detailed campaign info."""
        session = self._get_session()
        if not session:
            return {}

        try:
            resp = session.get(
                ENDPOINTS["campaign_detail"].format(campaign_id=campaign_id),
                timeout=RALLY_API_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict):
                return data.get("data", data.get("campaign", data))
            return {}
        except requests.exceptions.RequestException as e:
            logger.error(f"API error fetching campaign detail {campaign_id}: {e}")
            return {}

    # ── Local Cache Methods ──

    def load_cached_submissions(self) -> List[dict]:
        """Load submissions from local rally_logs_extracted cache."""
        submissions = []

        # Try both cache files
        cache_files = [
            EXTERNAL_DATA / "rally_submissions_cache.json",
            EXTERNAL_DATA / "rally_submissions_cache_new.json",
        ]

        for cache_file in cache_files:
            if not cache_file.exists():
                continue

            try:
                raw = json.loads(cache_file.read_text(encoding="utf-8"))
                if isinstance(raw, list):
                    logger.info(f"Loaded {len(raw)} submissions from {cache_file.name}")
                    submissions.extend(raw)
                elif isinstance(raw, dict) and "submissions" in raw:
                    logger.info(f"Loaded {len(raw['submissions'])} submissions from {cache_file.name}")
                    submissions.extend(raw["submissions"])
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Error loading {cache_file.name}: {e}")

        return submissions

    # ── Core Collection Pipeline ──

    def collect_all(self) -> dict:
        """
        Full collection cycle: API + local cache → normalize → deduplicate → save.
        Returns collection summary.
        """
        result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "new_submissions": 0,
            "total_submissions": 0,
            "campaigns_fetched": 0,
            "campaigns_with_data": [],
            "errors": [],
        }

        all_raw_submissions = []

        # 1. Fetch from live API
        campaigns = self.fetch_active_campaigns()
        result["campaigns_fetched"] = len(campaigns)

        for campaign in campaigns:
            cid = self._extract_campaign_id(campaign)
            if not cid:
                continue

            raw_subs = self.fetch_campaign_submissions(cid)
            all_raw_submissions.extend(raw_subs)

            # Save raw campaign data
            campaign_file = self.cache_dir / f"campaign_{cid[:16]}_raw.json"
            campaign_file.write_text(json.dumps(campaign, indent=2, ensure_ascii=False))

            if raw_subs:
                result["campaigns_with_data"].append({
                    "id": cid[:16],
                    "submissions": len(raw_subs),
                })

        # 2. Load from local cache (supplement with historical data)
        cached_subs = self.load_cached_submissions()
        all_raw_submissions.extend(cached_subs)

        # 3. Normalize and deduplicate
        normalized = []
        for raw in all_raw_submissions:
            norm = SubmissionNormalizer.normalize(raw)
            if not norm:
                continue

            # Deduplicate by content_hash
            if norm["content_hash"] and norm["content_hash"] in self.seen_hashes:
                continue

            if norm["content_hash"]:
                self.seen_hashes.add(norm["content_hash"])

            normalized.append(norm)

        # 4. Save collected data
        if normalized:
            # Append to running collection
            collection_file = self.cache_dir / "all_submissions.jsonl"
            with open(collection_file, "a") as f:
                for sub in normalized:
                    f.write(json.dumps(sub, ensure_ascii=False) + "\n")

            result["new_submissions"] = len(normalized)

            # Also save latest snapshot
            snapshot_file = self.cache_dir / "latest_snapshot.json"
            snapshot_file.write_text(json.dumps(normalized, indent=2, ensure_ascii=False))

        # 5. Save seen hashes
        self._save_seen_hashes()

        # 6. Count total unique submissions
        total_file = self.cache_dir / "all_submissions.jsonl"
        if total_file.exists():
            result["total_submissions"] = sum(1 for _ in open(total_file))

        logger.info(
            f"Collection complete: {result['new_submissions']} new, "
            f"{result['total_submissions']} total unique submissions"
        )

        return result

    def get_latest_submissions(self, limit: int = 500) -> List[dict]:
        """Get the most recent normalized submissions from collection."""
        collection_file = self.cache_dir / "latest_snapshot.json"
        if collection_file.exists():
            try:
                data = json.loads(collection_file.read_text())
                return data[-limit:]
            except (json.JSONDecodeError, IOError):
                pass

        # Fallback: read from JSONL
        jsonl_file = self.cache_dir / "all_submissions.jsonl"
        if jsonl_file.exists():
            lines = jsonl_file.read_text().strip().split("\n")
            submissions = []
            for line in lines[-limit:]:
                try:
                    submissions.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
            return submissions

        return []

    def get_score_distribution(self) -> dict:
        """Get score distribution across all collected submissions."""
        subs = self.get_latest_submissions(1000)
        if not subs:
            return {}

        scores = [s["total_score"] for s in subs if s.get("total_score")]
        if not scores:
            return {}

        return {
            "count": len(scores),
            "min": round(min(scores), 2),
            "max": round(max(scores), 2),
            "avg": round(sum(scores) / len(scores), 2),
            "median": round(sorted(scores)[len(scores) // 2], 2),
            "grade_distribution": self._grade_distribution(scores),
            "category_averages": self._category_averages(subs),
        }

    def get_campaign_scores(self, campaign_address: str) -> dict:
        """Get score analysis for a specific campaign."""
        subs = [
            s for s in self.get_latest_submissions(1000)
            if s.get("campaign_address") == campaign_address
        ]
        if not subs:
            return {}

        scores = [s["total_score"] for s in subs]
        return {
            "campaign": campaign_address[:16],
            "submissions": len(subs),
            "avg_score": round(sum(scores) / len(scores), 2) if scores else 0,
            "max_score": max(scores) if scores else 0,
            "top_scorers": sorted(subs, key=lambda x: x["total_score"], reverse=True)[:5],
            "category_averages": self._category_averages(subs),
        }

    def _grade_distribution(self, scores: list) -> dict:
        """Calculate grade distribution (per-grade, not cumulative)."""
        from v7_config import GRADE_THRESHOLDS
        dist = {}
        prev_threshold = float("inf")
        prev_count = 0
        for threshold, grade in GRADE_THRESHOLDS:
            count = sum(1 for s in scores if prev_threshold > s >= threshold)
            dist[grade] = count
            prev_threshold = threshold
        return dist

    def _category_averages(self, subs: list) -> dict:
        """Calculate average per-category scores."""
        avgs = {}
        for cat in CATEGORIES.keys():
            vals = [
                s["category_scores"].get(cat, 0)
                for s in subs
                if cat in s.get("category_scores", {})
            ]
            if vals:
                avgs[cat] = round(sum(vals) / len(vals), 2)
        return avgs

    @staticmethod
    def _extract_campaign_id(campaign: dict) -> str:
        """Extract campaign ID from campaign data."""
        for key in ["campaignAddress", "address", "id", "campaignId"]:
            if campaign.get(key):
                return str(campaign[key])
        return ""


# ── CLI Interface ──

def main():
    """Run data collection as a standalone command."""
    import argparse
    parser = argparse.ArgumentParser(description="Rally Brain v7.0 Data Collector")
    parser.add_argument("--collect", action="store_true", help="Run one collection cycle")
    parser.add_argument("--stats", action="store_true", help="Show collection statistics")
    parser.add_argument("--campaign", type=str, help="Show stats for specific campaign")
    parser.add_argument("--continuous", action="store_true", help="Run continuous collection loop")
    parser.add_argument("--interval", type=int, default=DATA_COLLECT_INTERVAL_MIN,
                       help=f"Collection interval in minutes (default: {DATA_COLLECT_INTERVAL_MIN})")

    args = parser.parse_args()
    collector = RallyDataCollector()

    if args.collect:
        result = collector.collect_all()
        print(json.dumps(result, indent=2))

    elif args.stats:
        stats = collector.get_score_distribution()
        print(json.dumps(stats, indent=2))

    elif args.campaign:
        stats = collector.get_campaign_scores(args.campaign)
        print(json.dumps(stats, indent=2, default=str))

    elif args.continuous:
        logger.info(f"Starting continuous collection (every {args.interval} min)")
        while True:
            try:
                collector.collect_all()
                logger.info(f"Sleeping {args.interval} minutes...")
                time.sleep(args.interval * 60)
            except KeyboardInterrupt:
                logger.info("Stopping continuous collection")
                break
            except Exception as e:
                logger.error(f"Collection error: {e}")
                logger.info(f"Retrying in {args.interval} minutes...")
                time.sleep(args.interval * 60)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
