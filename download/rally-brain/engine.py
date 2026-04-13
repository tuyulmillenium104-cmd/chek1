"""
Rally Brain - Learning Engine v1.0
Fully autonomous learning system for Rally.fun content creation.
No human involvement required after initial setup.

Usage:
  - Every post created -> log_post()
  - Every score received -> update_actual_score()
  - Every campaign analyzed -> log_competitive_gap()
  - Before creating content -> generate_context_for_creation()
"""

import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "learning_db.json")


def load_db():
    if not os.path.exists(DB_PATH):
        _init_db()
    with open(DB_PATH, "r") as f:
        return json.load(f)


def save_db(db):
    db["last_updated"] = datetime.now().isoformat()
    with open(DB_PATH, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)


def _init_db():
    db = {
        "version": "1.0",
        "created": datetime.now().isoformat(),
        "last_updated": None,
        "post_history": [],
        "pattern_log": [],
        "mistake_log": [],
        "competitive_gaps": [],
        "tone_calibration": {},
        "score_predictions": {},
        "what_works": [],
        "what_fails": [],
        "campaign_memory": [],
        "stats": {
            "total_posts": 0,
            "avg_score": None,
            "best_score": None,
            "worst_score": None,
            "improvement_trend": None
        }
    }
    save_db(db)
    return db


def log_post(content, campaign_name, campaign_id, mission, style, predicted_score=None):
    db = load_db()
    entry = {
        "timestamp": datetime.now().isoformat(),
        "campaign_name": campaign_name,
        "campaign_id": campaign_id,
        "mission": mission,
        "style": style,
        "content": content,
        "predicted_score": predicted_score,
        "actual_score": None,
        "actual_grade": None,
        "analyzed": False
    }
    db["post_history"].append(entry)
    db["stats"]["total_posts"] += 1
    save_db(db)
    return entry


def update_actual_score(post_index, actual_score, actual_grade=None):
    db = load_db()
    if post_index < 0 or post_index >= len(db["post_history"]):
        return None
    entry = db["post_history"][post_index]
    entry["actual_score"] = actual_score
    entry["actual_grade"] = actual_grade
    if entry.get("predicted_score"):
        diff = abs(entry["predicted_score"] - actual_score)
        db["score_predictions"][entry["timestamp"]] = {
            "predicted": entry["predicted_score"],
            "actual": actual_score,
            "diff": round(diff, 2)
        }
    _analyze_entry(entry, db)
    _recalc_stats(db)
    save_db(db)
    return entry


def _analyze_entry(entry, db):
    if entry["actual_score"] is None:
        return
    score = entry["actual_score"]
    content = entry.get("content", "")
    if score >= 1.3:
        db["what_works"].append({
            "timestamp": entry["timestamp"],
            "campaign": entry.get("campaign_name"),
            "score": score,
            "lessons": _extract_lessons(content)
        })
    if score < 1.0:
        db["what_fails"].append({
            "timestamp": entry["timestamp"],
            "campaign": entry.get("campaign_name"),
            "score": score,
            "lessons": _extract_lessons(content)
        })
    entry["analyzed"] = True


def _extract_lessons(content):
    lessons = []
    sentences = [s.strip() for s in content.replace("\n", ". ").split(".") if s.strip()]
    if not sentences:
        return lessons
    first = sentences[0]
    wc = len(first.split())
    lessons.append(f"Opening: {wc} words")
    lengths = [len(s.split()) for s in sentences]
    if lengths:
        avg = sum(lengths) / len(lengths)
        lessons.append(f"Avg sentence: {avg:.1f} words")
        if len(lengths) > 2:
            mean = avg
            var = sum((l - mean) ** 2 for l in lengths) / len(lengths)
            cv = (var ** 0.5) / mean if mean > 0 else 0
            lessons.append(f"Sentence CV: {cv:.2f} ({'varied' if cv > 0.3 else 'monotone'})")
    contractions = ["don't", "can't", "won't", "isn't", "that's", "i'm", "it's", "didn't", "doesn't"]
    count = sum(1 for c in contractions if c in content.lower())
    lessons.append(f"Contractions: {count}")
    meta = ["this tweet", "this post", "this thread"]
    if any(w in content.lower() for w in meta):
        lessons.append("Meta-self-referential: YES")
    if content.endswith("?"):
        lessons.append("Ending: question")
    elif sentences and len(sentences[-1].split()) <= 5:
        lessons.append("Ending: short punchy")
    return lessons


def _recalc_stats(db):
    scored = [p for p in db["post_history"] if p.get("actual_score") is not None]
    if scored:
        scores = [p["actual_score"] for p in scored]
        db["stats"]["avg_score"] = round(sum(scores) / len(scores), 3)
        db["stats"]["best_score"] = max(scores)
        db["stats"]["worst_score"] = min(scores)
        if len(scores) >= 3:
            db["stats"]["improvement_trend"] = "up" if scores[-1] > scores[0] else "down"


def log_competitive_gap(campaign_name, gap_description, usage_percent):
    db = load_db()
    db["competitive_gaps"].append({
        "timestamp": datetime.now().isoformat(),
        "campaign": campaign_name,
        "gap": gap_description,
        "competitor_usage_pct": usage_percent
    })
    save_db(db)


def log_tone_calibration(style_name, tone_that_worked, score):
    db = load_db()
    if style_name not in db["tone_calibration"]:
        db["tone_calibration"][style_name] = []
    db["tone_calibration"][style_name].append({
        "tone": tone_that_worked,
        "score": score,
        "timestamp": datetime.now().isoformat()
    })
    save_db(db)


def log_campaign_memory(campaign_id, campaign_name, key_facts, winning_angle, score=None):
    db = load_db()
    db["campaign_memory"].append({
        "timestamp": datetime.now().isoformat(),
        "campaign_id": campaign_id,
        "campaign_name": campaign_name,
        "key_facts": key_facts,
        "winning_angle": winning_angle,
        "score": score
    })
    save_db(db)


def generate_context_for_creation(campaign_name=None):
    db = load_db()
    ctx = []
    if db["what_works"]:
        top = db["what_works"][-1]
        ctx.append(f"LAST WIN: {top['score']} | {top['lessons']}")
    if db["what_fails"]:
        fail = db["what_fails"][-1]
        ctx.append(f"LAST FAIL: {fail['score']} | {fail['lessons']}")
    if db["competitive_gaps"]:
        ctx.append(f"GAPS: {[g['gap'] for g in db['competitive_gaps'][-3:]]}")
    if db["tone_calibration"]:
        tones = []
        for style, entries in db["tone_calibration"].items():
            if entries:
                best = max(entries, key=lambda x: x["score"])
                tones.append(f"{style}={best['tone']}({best['score']})")
        if tones:
            ctx.append(f"TONES: {'; '.join(tones)}")
    if campaign_name:
        same = [p for p in db["post_history"] if p.get("campaign_name") == campaign_name and p.get("actual_score")]
        if same:
            best = max(same, key=lambda x: x["actual_score"])
            ctx.append(f"CAMPAIGN BEST: {best['actual_score']}")
    if db["stats"]["avg_score"]:
        ctx.append(f"AVG: {db['stats']['avg_score']}")
    return "\n".join(ctx)


def get_status():
    db = load_db()
    return {
        "total_posts": db["stats"]["total_posts"],
        "scored": len([p for p in db["post_history"] if p.get("actual_score")]),
        "avg": db["stats"]["avg_score"],
        "best": db["stats"]["best_score"],
        "gaps_found": len(db["competitive_gaps"]),
        "campaigns": len(set(p.get("campaign_name", "") for p in db["post_history"])),
        "last_updated": db["last_updated"]
    }
