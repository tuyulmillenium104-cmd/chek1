"""
Rally Brain Cron Generator v2.0
Generates Level 2 content using learned knowledge.
This is the GENERATE part of the connected learn→generate pipeline.

Philosophy: "Rally minta 1, kita beri 2" — exceed quality expectations.
Generate loop: 3 variations → evaluate → best >= 16? → keep → if not, generate 3 more (max 5 loops)
"""

import json
import os
import sys
import logging
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from copy import deepcopy

sys.path.insert(0, str(Path(__file__).parent))

import aiohttp

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [GENERATOR] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

RALLY_API_BASE = "https://app.rally.fun/api"
CAMPAIGNS_ENDPOINT = f"{RALLY_API_BASE}/campaigns"

# Quality threshold — Level 2 means we aim ABOVE this
QUALITY_THRESHOLD = 16.0
MAX_GENERATE_LOOPS = 5
VARIATIONS_PER_LOOP = 3


class RallyGenerator:
    """Generates content using the engine's knowledge and evaluates quality."""

    def __init__(self, engine=None, output_dir: str = "campaign_data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        if engine is None:
            from engine import RallyBrainEngine
            knowledge_path = Path(__file__).parent / "knowledge_db.json"
            self.engine = RallyBrainEngine(str(knowledge_path))
        else:
            self.engine = engine

        # AI SDK import — use z-ai-web-dev-sdk for content generation
        self.ai_available = False
        try:
            import importlib
            self.ai_available = True
        except ImportError:
            logger.warning("z-ai-web-dev-sdk not available for direct import — will use mock generation for testing")

    async def fetch_campaign_info(self, campaign_id_or_url: str) -> dict:
        """Fetch campaign info from Rally API."""
        campaign_id = campaign_id_or_url
        if "rally.fun" in campaign_id_or_url:
            import re
            match = re.search(r'/campaigns?/([^/?\s]+)', campaign_id_or_url)
            if match:
                campaign_id = match.group(1)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{CAMPAIGNS_ENDPOINT}/{campaign_id}",
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data if isinstance(data, dict) else data.get("campaign", data.get("data", {}))
                    else:
                        logger.error(f"Failed to fetch campaign: {resp.status}")
                        return {}
        except Exception as e:
            logger.error(f"Failed to fetch campaign: {e}")
            return {}

    async def generate_single_variation(self, prompt: str, variation_index: int) -> str:
        """
        Generate a single content variation using AI.
        Uses z-ai-web-dev-sdk if available, otherwise returns placeholder.
        """
        variation_prompt = f"""{prompt}

IMPORTANT: This is variation #{variation_index + 1}. Make it distinctly different from other variations.
Try a different angle, tone, or structure. But maintain the same quality standard.

Remember: Output ONLY the tweet content. No meta-commentary, no explanations."""

        if self.ai_available:
            try:
                # Dynamic import to work both standalone and within Next.js
                import importlib
                ZAI = importlib.import_module('z-ai-web-dev-sdk')
                zai = await ZAI.create()
                completion = await zai.chat.completions.create({
                    "messages": [
                        {"role": "system", "content": "You are an expert Rally.fun content creator. Output ONLY the tweet content, nothing else."},
                        {"role": "user", "content": variation_prompt}
                    ],
                    "temperature": 0.8 + (variation_index * 0.05),  # Slightly vary creativity
                    "max_tokens": 500
                })
                content = completion.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if content:
                    # Clean up: remove any markdown formatting, quotes
                    content = content.strip('"').strip("'").strip('`').strip()
                    # Remove any leading "Here's" or similar meta-text
                    for marker in ["Here's", "Here is", "Sure,", "Here's a", "Here is a"]:
                        if content.startswith(marker):
                            content = content[len(marker):].strip()
                    return content
            except Exception as e:
                logger.warning(f"AI generation failed for variation {variation_index}: {e}")

        # Fallback: return prompt-based template for testing
        return f"[Variation {variation_index + 1} — AI generation not available in standalone mode]"

    async def generate_loop(self, campaign_info: dict, campaign_id: str) -> dict:
        """
        Generate loop: create variations, evaluate, iterate until quality threshold met.
        
        Loop structure:
        - Each loop: generate 3 variations
        - Evaluate each with score predictor
        - If best >= 16: keep it, stop
        - If not: analyze what's wrong, generate 3 more
        - Max 5 loops
        - Return best of ALL variations across all loops
        """
        all_variations = []
        prompt = self.engine.get_generation_prompt(campaign_info)
        best_ever = {"content": "", "score": 0, "grade": "D", "predictions": {}}

        for loop_num in range(1, MAX_GENERATE_LOOPS + 1):
            logger.info(f"=== Generate Loop {loop_num}/{MAX_GENERATE_LOOPS} ===")

            # Generate 3 variations in parallel
            tasks = [
                self.generate_single_variation(prompt, (loop_num - 1) * VARIATIONS_PER_LOOP + i)
                for i in range(VARIATIONS_PER_LOOP)
            ]
            variations = await asyncio.gather(*tasks, return_exceptions=True)

            for i, var in enumerate(variations):
                if isinstance(var, Exception) or not var:
                    logger.warning(f"Variation {i} failed or empty")
                    continue

                # Predict score
                predictions = self.engine.predict_content(var, campaign_info)
                total_score = predictions.get("total", 0)
                grade = predictions.get("grade", "D")

                all_variations.append({
                    "content": var,
                    "score": total_score,
                    "grade": grade,
                    "predictions": predictions,
                    "loop": loop_num,
                    "variation": i + 1
                })

                logger.info(f"  Var {i+1}: {total_score}/18 ({grade})")

                if total_score > best_ever["score"]:
                    best_ever = {
                        "content": var,
                        "score": total_score,
                        "grade": grade,
                        "predictions": predictions,
                        "loop": loop_num,
                        "variation": i + 1
                    }

            # Check if we've met the threshold
            if best_ever["score"] >= QUALITY_THRESHOLD:
                logger.info(f"Quality threshold met! Best: {best_ever['score']}/18 ({best_ever['grade']})")
                break
            else:
                logger.info(f"Best so far: {best_ever['score']}/18 — below threshold {QUALITY_THRESHOLD}")

            # Improve prompt for next loop based on what's missing
            prompt = self._improve_prompt(prompt, all_variations, best_ever)

        # Final: pick the best of ALL loops
        logger.info(f"=== FINAL: Best content score {best_ever['score']}/18 ({best_ever['grade']}) ===")
        return {
            "best_content": best_ever["content"],
            "best_score": best_ever["score"],
            "best_grade": best_ever["grade"],
            "best_predictions": best_ever["predictions"],
            "total_variations": len(all_variations),
            "all_variations": all_variations,
            "loops_used": loop_num
        }

    def _improve_prompt(self, base_prompt: str, all_variations: list, best_ever: dict) -> str:
        """Analyze what's weak and add targeted improvements to prompt."""
        improvements = []

        # Analyze weakest categories across all variations
        category_avg = {}
        for var in all_variations:
            for cat, score in var.get("predictions", {}).items():
                if cat in ["total", "grade"]:
                    continue
                category_avg.setdefault(cat, []).append(score)

        for cat, scores in category_avg.items():
            avg = sum(scores) / len(scores)
            max_possible = self.engine.predictor.max_scores.get(cat, 5)
            percentage = avg / max_possible if max_possible > 0 else 0

            if percentage < 0.7:
                improvements.append(f"- {cat.upper()}: Average {avg:.1f}/{max_possible} — needs improvement")

        if improvements:
            improvement_text = "\n".join(improvements)
            additional = f"""

=== PREVIOUS ATTEMPTS ANALYSIS ===
Weak areas to improve:
{improvement_text}

For your next attempt, specifically focus on fixing these weak areas while maintaining strengths.
Remember: "Rally minta 1, kita beri 2" — exceed in every category."""
            return base_prompt + additional

        return base_prompt

    async def generate_qa(self, content: str, campaign_info: dict) -> list:
        """Generate Q&A engagement comments."""
        qa_prompt = self.engine.get_qa_prompt(content, campaign_info)

        if self.ai_available:
            try:
                import importlib
                ZAI = importlib.import_module('z-ai-web-dev-sdk')
                zai = await ZAI.create()
                completion = await zai.chat.completions.create({
                    "messages": [
                        {"role": "system", "content": "Generate 3 short natural engagement comments. One per line, no numbering."},
                        {"role": "user", "content": qa_prompt}
                    ],
                    "temperature": 0.9,
                    "max_tokens": 300
                })
                text = completion.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                comments = [line.strip().lstrip("0123456789.-) ") for line in text.split("\n") if line.strip()]
                return comments[:3]  # Max 3
            except Exception as e:
                logger.warning(f"Q&A generation failed: {e}")

        # Fallback Q&A
        return [
            "Great take. Distribution really is everything.",
            "How do you see this playing out for smaller creators?",
            "This is why most content strategies fail — they optimize for creation, not reach."
        ]

    async def run_generate_cycle(self, campaign_id_or_url: str) -> dict:
        """
        Full generate cycle:
        1. Fetch campaign info
        2. Run generate loop (up to 5 loops of 3 variations)
        3. Generate Q&A for best content
        4. Save output
        """
        logger.info(f"Starting generate cycle for {campaign_id_or_url}")

        # Step 1: Fetch campaign
        campaign_info = await self.fetch_campaign_info(campaign_id_or_url)
        if not campaign_info:
            return {"status": "error", "message": "Failed to fetch campaign info"}

        campaign_id = campaign_info.get("id", campaign_info.get("campaignId", campaign_id_or_url))

        # Step 2: Generate loop
        result = await self.generate_loop(campaign_info, campaign_id)

        # Step 3: Generate Q&A
        if result["best_content"]:
            qa_comments = await self.generate_qa(result["best_content"], campaign_info)
            result["qa_comments"] = qa_comments
        else:
            result["qa_comments"] = []

        # Step 4: Save output
        output_dir = self.output_dir / f"{campaign_id}_output"
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save best content
        with open(output_dir / "best_content.txt", "w") as f:
            f.write(result["best_content"])

        # Save prediction details
        with open(output_dir / "prediction.json", "w") as f:
            json.dump({
                "score": result["best_score"],
                "grade": result["best_grade"],
                "predictions": result["best_predictions"],
                "total_variations": result["total_variations"],
                "loops_used": result["loops_used"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "campaign": campaign_info.get("title", "")
            }, f, indent=2, ensure_ascii=False)

        # Save Q&A
        with open(output_dir / "qa.json", "w") as f:
            json.dump({
                "comments": result["qa_comments"],
                "content": result["best_content"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, f, indent=2, ensure_ascii=False)

        logger.info(f"Generate cycle complete. Best: {result['best_score']}/18 ({result['best_grade']})")
        result["status"] = "ok"
        return result


async def run_full_cycle(campaign_id_or_url: str, engine=None):
    """
    Full connected cycle: LEARN → GENERATE → OUTPUT
    This is what the cron calls every 30 minutes.
    """
    from cron_learner import RallyLearner

    logger.info(f"=== FULL CYCLE START: {campaign_id_or_url} ===")

    base_dir = Path(__file__).parent

    # Phase 1: LEARN
    logger.info("--- Phase 1: LEARNING ---")
    learner = RallyLearner(engine=engine, data_dir=str(base_dir / "campaign_data"))
    learn_result = await learner.learn_from_campaign(campaign_id_or_url)
    logger.info(f"Learning: {learn_result.get('patterns_learned', 0)} patterns, {learn_result.get('submissions_analyzed', 0)} submissions")

    # Phase 2: GENERATE
    logger.info("--- Phase 2: GENERATING ---")
    generator = RallyGenerator(engine=engine, output_dir=str(base_dir / "campaign_data"))
    gen_result = await generator.run_generate_cycle(campaign_id_or_url)

    # Update stats
    if engine:
        stats = engine.get_stats()
        logger.info(f"--- CYCLE COMPLETE ---")
        logger.info(f"Patterns: {stats.get('total_patterns', 0)} | Campaigns: {stats.get('total_campaigns_analyzed', 0)}")
        logger.info(f"Best score: {gen_result.get('best_score', 0)}/18 ({gen_result.get('best_grade', '?')})")
        logger.info(f"Output saved to campaign_data/{campaign_id_or_url}_output/")

    return {
        "learn": learn_result,
        "generate": gen_result,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


if __name__ == "__main__":
    # Standalone: generate for a specific campaign
    target = sys.argv[1] if len(sys.argv) > 1 else None
    if target:
        result = asyncio.run(run_full_cycle(target))
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("Usage: python cron_generator.py <campaign_id_or_url>")
        print("       python cron_generator.py <campaign_url>")
