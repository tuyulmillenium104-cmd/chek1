"""
Rally Brain Cron Runner v2.0
Unified cron entry point — handles /cron (link) set 30m command format.

This module provides the API route handler for the cron command interface.
It's designed to be imported by a Next.js API route.
"""

import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [CRON] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Import engine components
import sys
sys.path.insert(0, str(Path(__file__).parent))

from engine import RallyBrainEngine


class CronScheduler:
    """
    Manages scheduled cron jobs for Rally campaigns.
    
    Command format: /cron (link) set 30m
    - Parses the campaign link and interval
    - Runs learn+generate cycle at each interval
    - Tracks active jobs and results
    """

    def __init__(self):
        self.engine = RallyBrainEngine(
            str(Path(__file__).parent / "knowledge_db.json")
        )
        self.active_jobs = {}  # campaign_id -> {interval, last_run, results}
        self._running = False

    def parse_command(self, command: str) -> Optional[dict]:
        """
        Parse /cron command.
        Supported formats:
        - /cron <link> set <interval>
        - /cron <link> stop
        - /cron list
        - /cron status
        """
        command = command.strip()

        # Remove leading /cron
        if command.startswith("/cron"):
            command = command[5:].strip()

        if not command:
            return {"action": "help"}

        # List active jobs
        if command.lower() in ["list", "status"]:
            return {"action": "list", "jobs": self.active_jobs}

        # Stop a job
        if "stop" in command.lower():
            link = command.lower().replace("stop", "").strip()
            if link:
                return {"action": "stop", "campaign": link}
            return {"action": "stop_all"}

        # Parse: <link> set <interval>
        parts = command.split()
        if len(parts) >= 3 and "set" in [p.lower() for p in parts]:
            set_idx = [p.lower() for p in parts].index("set")
            link = " ".join(parts[:set_idx]).strip()
            interval_str = parts[set_idx + 1].strip()

            # Parse interval
            interval_minutes = self._parse_interval(interval_str)
            if interval_minutes is None:
                return {"action": "error", "message": f"Invalid interval: {interval_str}"}

            return {
                "action": "start",
                "campaign_link": link,
                "interval_minutes": interval_minutes,
                "interval_str": interval_str
            }

        return {"action": "help"}

    def _parse_interval(self, interval_str: str) -> Optional[int]:
        """Parse interval string like '30m', '1h', '2h' into minutes."""
        interval_str = interval_str.lower().strip()
        if interval_str.endswith("m"):
            try:
                return int(interval_str[:-1])
            except ValueError:
                return None
        elif interval_str.endswith("h"):
            try:
                return int(interval_str[:-1]) * 60
            except ValueError:
                return None
        else:
            try:
                return int(interval_str)  # Assume minutes
            except ValueError:
                return None

    def start_job(self, campaign_link: str, interval_minutes: int) -> dict:
        """Register a new cron job."""
        import re
        campaign_id = campaign_link
        if "rally.fun" in campaign_link:
            match = re.search(r'/campaigns?/([^/?\s]+)', campaign_link)
            if match:
                campaign_id = match.group(1)

        self.active_jobs[campaign_id] = {
            "link": campaign_link,
            "interval_minutes": interval_minutes,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "last_run": None,
            "run_count": 0,
            "results": []
        }

        logger.info(f"Cron started: {campaign_id} every {interval_minutes}m")
        return {
            "status": "started",
            "campaign_id": campaign_id,
            "interval_minutes": interval_minutes,
            "next_run": (datetime.now(timezone.utc) + timedelta(minutes=interval_minutes)).isoformat()
        }

    def stop_job(self, campaign_id: str) -> dict:
        """Stop a cron job."""
        if campaign_id in self.active_jobs:
            job = self.active_jobs.pop(campaign_id)
            logger.info(f"Cron stopped: {campaign_id} after {job['run_count']} runs")
            return {"status": "stopped", "campaign_id": campaign_id, "total_runs": job["run_count"]}
        return {"status": "not_found", "campaign_id": campaign_id}

    def stop_all(self) -> dict:
        """Stop all active jobs."""
        count = len(self.active_jobs)
        self.active_jobs.clear()
        return {"status": "stopped_all", "total_jobs": count}

    def get_status(self) -> dict:
        """Get status of all cron jobs."""
        return {
            "active_jobs": len(self.active_jobs),
            "jobs": {
                cid: {
                    "interval": f"{job['interval_minutes']}m",
                    "run_count": job["run_count"],
                    "last_run": job["last_run"],
                    "last_score": job["results"][-1].get("best_score") if job["results"] else None
                }
                for cid, job in self.active_jobs.items()
            },
            "engine_stats": self.engine.get_stats()
        }


async def execute_cycle(campaign_link: str) -> dict:
    """Execute one full learn+generate cycle for a campaign."""
    from cron_generator import run_full_cycle

    try:
        result = await run_full_cycle(campaign_link, engine=None)
        return result
    except Exception as e:
        logger.error(f"Cycle execution failed: {e}")
        return {"status": "error", "message": str(e)}


async def handle_cron_command(command: str) -> dict:
    """
    Main entry point for cron commands.
    Usage: handle_cron_command("/cron https://rally.fun/campaigns/abc123 set 30m")
    """
    scheduler = CronScheduler()
    parsed = scheduler.parse_command(command)

    if parsed.get("action") == "start":
        result = scheduler.start_job(parsed["campaign_link"], parsed["interval_minutes"])
        return {
            "message": f"✅ Cron started for campaign {parsed['campaign_link']}",
            "message_detail": f"Running every {parsed['interval_minutes']} minutes (learn + generate cycle)",
            **result
        }
    elif parsed.get("action") == "stop":
        result = scheduler.stop_job(parsed["campaign"])
        return result
    elif parsed.get("action") == "stop_all":
        return scheduler.stop_all()
    elif parsed.get("action") == "list":
        return scheduler.get_status()
    elif parsed.get("action") == "help":
        return {
            "usage": "/cron <campaign_link> set <interval>",
            "examples": [
                "/cron https://rally.fun/campaigns/abc123 set 30m",
                "/cron https://rally.fun/campaigns/abc123 set 1h",
                "/cron <campaign_id> stop",
                "/cron list"
            ],
            "intervals": "Supported: 15m, 30m, 1h, 2h, etc."
        }
    else:
        return {"error": "Unknown command", "usage": "/cron <link> set <interval>"}


if __name__ == "__main__":
    # CLI interface for testing
    if len(sys.argv) < 2:
        print("Rally Brain Cron v2.0")
        print("Usage: python cron.py '/cron <link> set 30m'")
        print("       python cron.py '/cron list'")
        sys.exit(0)

    cmd = " ".join(sys.argv[1:])
    result = asyncio.run(handle_cron_command(cmd))
    print(json.dumps(result, indent=2, ensure_ascii=False))
