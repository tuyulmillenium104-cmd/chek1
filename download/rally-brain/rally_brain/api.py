"""
Rally.fun API Client
Fetch campaigns, submissions, and analysis data.
"""

import requests
import json
import time
from typing import Optional

BASE_URL = "https://app.rally.fun/api"
HEADERS = {
    "User-Agent": "RallyBrain/2.0",
    "Accept": "application/json"
}


class RallyAPI:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def fetch_active_campaigns(self) -> dict:
        """Fetch all active campaigns."""
        try:
            resp = self.session.get(f"{BASE_URL}/campaigns", params={"status": "active"}, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict) and data.get("code") == 200:
                return data.get("data", data)
            return data
        except Exception as e:
            print(f"[API] Error fetching campaigns: {e}")
            return {}

    def fetch_campaign_detail(self, campaign_address: str) -> dict:
        """Fetch detailed campaign data."""
        try:
            resp = self.session.get(f"{BASE_URL}/campaigns/{campaign_address}", timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict) and data.get("code") == 200:
                return data.get("data", data)
            return data
        except Exception as e:
            print(f"[API] Error fetching campaign {campaign_address}: {e}")
            return {}

    def fetch_submissions(self, campaign_address: str, limit: int = 200) -> list:
        """Fetch submissions with scores and analysis for a campaign."""
        try:
            resp = self.session.get(
                f"{BASE_URL}/campaigns/{campaign_address}/submissions",
                params={"limit": limit},
                timeout=60
            )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict) and data.get("code") == 200:
                return data.get("data", data.get("submissions", []))
            if isinstance(data, list):
                return data
            return []
        except Exception as e:
            print(f"[API] Error fetching submissions: {e}")
            return []

    def extract_campaigns_list(self, data: dict) -> list:
        """Extract campaigns list from API response."""
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for key in ["campaigns", "data", "items"]:
                if key in data and isinstance(data[key], list):
                    return data[key]
        return []

    def extract_campaign_id(self, campaign: dict) -> str:
        """Extract campaign ID from campaign data."""
        for key in ["campaignAddress", "address", "id", "campaignId"]:
            if campaign.get(key):
                return str(campaign[key])
        return ""

    def extract_missions(self, campaign: dict) -> list:
        """Extract missions from campaign data."""
        for key in ["missions", "mission"]:
            val = campaign.get(key)
            if isinstance(val, list):
                return val
            if isinstance(val, dict):
                return [val]
        return []

    def get_campaign_summary(self, campaign: dict) -> dict:
        """Get a flat summary of campaign data."""
        missions = self.extract_missions(campaign)
        first_mission = missions[0] if missions else {}

        return {
            "id": self.extract_campaign_id(campaign),
            "name": campaign.get("title", campaign.get("name", "Unknown")),
            "creator": campaign.get("x_username", campaign.get("creator", "")),
            "reward": campaign.get("reward", campaign.get("totalReward", "Unknown")),
            "style": campaign.get("style", "Unknown"),
            "description": campaign.get("description", ""),
            "mission_title": first_mission.get("title", ""),
            "mission_description": first_mission.get("description", ""),
            "mission_rules": first_mission.get("rules", ""),
            "status": campaign.get("status", "unknown")
        }
