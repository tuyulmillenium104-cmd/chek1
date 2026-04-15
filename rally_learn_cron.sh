#!/bin/bash
# Rally Brain v7.0 — Learning Cron
# Runs continuously: collect data → analyze patterns → update knowledge DB
# Designed to run 24/7 alongside generation cron
#
# Schedule: Every 30 minutes (separate from 15min generation cron)
# Output: campaign_data/v7_learning.log
# Updated: campaign_data/v7_knowledge.json

cd /home/z/my-project/download/rally-brain
mkdir -p campaign_data/v7_collected

LOG="campaign_data/v7_learning.log"
LOCK="campaign_data/.learning.lock"
MAX_AGE_DAYS=3

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"; echo "[$(date '+%H:%M:%S')] $1"; }

# Prevent concurrent runs
if [ -f "$LOCK" ]; then
    AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK" 2>/dev/null || echo 0) ))
    if [ "$AGE" -lt 1500 ]; then
        log "SKIP: Another learning run active (lock age: ${AGE}s)"
        exit 0
    fi
    log "WARN: Stale lock (${AGE}s old), removing"
    rm -f "$LOCK"
fi

echo $$ > "$LOCK"
trap "rm -f $LOCK" EXIT

log "=== LEARNING CYCLE START ==="

# ── Phase 1: Collect Data ──
log "Phase 1: Collecting data from Rally.fun API + local cache..."
python3 -c "
import sys, json
sys.path.insert(0, '.')
from v7_collector import RallyDataCollector
c = RallyDataCollector()
result = c.collect_all()
print(json.dumps(result))
" >> "$LOG" 2>&1

# ── Phase 2: Analyze Patterns ──
log "Phase 2: Analyzing patterns from collected data..."
python3 << 'PYEOF' >> "$LOG" 2>&1
import sys, json
from datetime import datetime, timezone
sys.path.insert(0, '.')
from v7_collector import RallyDataCollector
from v7_analyzer import PatternExtractor
from v7_config import CATEGORIES, MAX_TOTAL_SCORE

c = RallyDataCollector()
subs = c.get_latest_submissions(1000)
if not subs:
    print(json.dumps({'status': 'no_data', 'total': 0}))
    sys.exit(0)

# Scored submissions only
scored = [s for s in subs if s.get('total_score', 0) > 0]
scores = [s['total_score'] for s in scored]

# Extract patterns using PatternExtractor
extractor = PatternExtractor()
patterns_by_cat = extractor.extract_patterns_from_submissions(scored)

# Competitive analysis
competitive = extractor.analyze_competitive_landscape(scored)

# Build knowledge structure
all_patterns = []
for cat, pats in patterns_by_cat.items():
    for p in pats:
        all_patterns.append({
            'category': p.get('category'),
            'type': p.get('type'),
            'rule': p.get('rule'),
            'confidence': p.get('confidence', 0),
            'frequency': p.get('frequency', 1),
        })

# Category averages
cat_avgs = {}
for cat in CATEGORIES.keys():
    vals = [s['category_scores'].get(cat, 0) for s in scored if cat in s.get('category_scores', {})]
    if vals:
        cat_avgs[cat] = round(sum(vals) / len(vals), 2)

# Identify weak/strong
weak = [cat for cat, avg in cat_avgs.items() if avg / CATEGORIES[cat]['max'] < 0.65]
strong = [cat for cat, avg in cat_avgs.items() if avg / CATEGORIES[cat]['max'] >= 0.85]

# Load and update knowledge
kb_path = 'campaign_data/v7_knowledge.json'
try:
    kb = json.load(open(kb_path))
except:
    kb = {}

kb['version'] = '7.0'
kb['last_analysis'] = datetime.now(timezone.utc).isoformat()
kb['total_submissions'] = len(scored)
kb['score_stats'] = competitive.get('score_stats', {})
kb['category_averages'] = cat_avgs
kb['weak_categories'] = weak
kb['strong_categories'] = strong
kb['top_patterns'] = all_patterns[:30]
kb['what_works'] = competitive.get('what_works', [])
kb['what_fails'] = competitive.get('what_fails', [])
kb['recommendations'] = competitive.get('recommendations', [])
kb['category_gaps'] = competitive.get('category_gaps', {})

json.dump(kb, open(kb_path, 'w'), indent=2, ensure_ascii=False)

print(json.dumps({
    'status': 'ok',
    'total_submissions': len(scored),
    'avg_score': round(sum(scores)/len(scores), 1) if scores else 0,
    'patterns_found': len(all_patterns),
    'weak_categories': weak,
    'strong_categories': strong,
    'recommendations': kb.get('recommendations', [])[:3],
}, indent=2))
PYEOF

# ── Phase 3: Extract Winner Patterns ──
log "Phase 3: Extracting patterns from top scoring submissions..."
python3 -c "
import sys, json
sys.path.insert(0, '.')
from v7_collector import RallyDataCollector
from v7_config import MAX_TOTAL_SCORE

c = RallyDataCollector()
subs = c.get_latest_submissions(500)

# Filter top 10% scorers
if not subs:
    print(json.dumps({'status': 'no_data'}))
    sys.exit(0)

scored = [s for s in subs if s.get('total_score', 0) > 0]
if not scored:
    print(json.dumps({'status': 'no_scored'}))
    sys.exit(0)

scored.sort(key=lambda x: x['total_score'], reverse=True)
top_n = max(5, len(scored) // 10)
winners = scored[:top_n]

# Extract winning content for knowledge base
winning_patterns = []
for w in winners:
    content = w.get('content', '')
    if content and len(content) > 50:
        winning_patterns.append({
            'score': w['total_score'],
            'content_preview': content[:200],
            'full_content': content,
            'category_scores': w.get('category_scores', {}),
            'x_username': w.get('x_username', ''),
            'length': len(content),
            'has_question': '?' in content,
            'has_numbers': any(c.isdigit() for c in content),
            'has_emoji': any(ord(c) > 127 for c in content),
            'sentence_count': content.count('.') + content.count('!') + content.count('?'),
            'paragraph_count': content.count('\\n') + 1,
        })

# Save winners
winners_path = 'campaign_data/v7_winners.json'
json.dump({
    'last_updated': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
    'total_winners': len(winning_patterns),
    'winners': winning_patterns,
    'score_range': {
        'min': winning_patterns[-1]['score'] if winning_patterns else 0,
        'max': winning_patterns[0]['score'] if winning_patterns else 0,
    }
}, open(winners_path, 'w'), indent=2, ensure_ascii=False)

print(json.dumps({
    'status': 'ok',
    'total_scored': len(scored),
    'top_count': len(winning_patterns),
    'score_range': f'{winning_patterns[-1][\"score\"]:.1f} - {winning_patterns[0][\"score\"]:.1f}' if winning_patterns else 'N/A',
    'avg_winner_length': sum(w['length'] for w in winning_patterns) // len(winning_patterns) if winning_patterns else 0,
}))
" >> "$LOG" 2>&1

# ── Phase 4: Feed Knowledge to generate.js ──
log "Phase 4: Syncing knowledge to generation knowledge DBs..."
python3 << 'PYEOF' >> "$LOG" 2>&1
import json
from pathlib import Path

# Load v7 knowledge
v7_kb_path = 'campaign_data/v7_knowledge.json'
try:
    v7 = json.load(open(v7_kb_path))
except:
    v7 = {}

# Convert v7 knowledge into format that generate.js can consume
# generate.js reads: knowledge_db.json and campaign-specific KDBs

# Extract actionable rules from patterns
rules = []
for pattern in v7.get('top_patterns', []):
    rules.append(f"[WINNING] {pattern.get('insight', str(pattern))}")

for failure in v7.get('common_failures', []):
    rules.append(f"[AVOID] {failure.get('insight', str(failure))}")

for phrase in v7.get('overused_phrases', [])[:10]:
    if isinstance(phrase, str):
        rules.append(f"[OVERUSED] {phrase}")
    elif isinstance(phrase, dict):
        rules.append(f"[OVERUSED] {phrase.get('phrase', str(phrase))}")

# Write to each campaign's knowledge DB
campaigns_dir = Path('campaigns')
if campaigns_dir.exists():
    for campaign_file in campaigns_dir.glob('*.json'):
        try:
            campaign = json.load(open(campaign_file))
            campaign_id = campaign_file.stem
            kdb_path = Path(f'campaign_data/{campaign_id}_knowledge_db.json')

            # Load existing KDB
            try:
                kdb = json.load(open(kdb_path))
            except:
                kdb = {'patterns': {'semantic': {}}, 'stats': {}}

            # Update with v7 intelligence
            kdb.setdefault('patterns', {}).setdefault('semantic', {})
            kdb['patterns']['semantic']['v7_intelligence'] = {
                'avg_score': v7.get('score_distribution', {}).get('avg', 0),
                'weak_categories': v7.get('weak_categories', []),
                'strong_categories': v7.get('strong_categories', []),
                'total_data_points': v7.get('total_submissions', 0),
            }

            # Add learned rules
            learned = kdb['patterns']['semantic'].get('learned_rules', [])
            existing_rules = set(learned)
            for rule in rules[:20]:
                if rule not in existing_rules:
                    learned.insert(0, rule)
                    existing_rules.add(rule)
            kdb['patterns']['semantic']['learned_rules'] = learned[:30]

            # Update stats
            kdb['stats']['v7_last_sync'] = v7.get('last_analysis', '')
            kdb['stats']['v7_total_submissions'] = v7.get('total_submissions', 0)

            json.dump(kdb, open(kdb_path, 'w'), indent=2)
            print(f"  Synced {len(rules)} rules to {campaign_id}")
        except Exception as e:
            print(f"  Error syncing {campaign_file.name}: {e}")

print("Knowledge sync complete")
PYEOF

# ── Summary ──
log "=== LEARNING CYCLE COMPLETE ==="

# Show brief summary
python3 -c "
import json
try:
    kb = json.load(open('campaign_data/v7_knowledge.json'))
    print(f'  Total submissions: {kb.get(\"total_submissions\", 0)}')
    print(f'  Avg score: {kb.get(\"score_distribution\", {}).get(\"avg\", 0):.1f}/23')
    print(f'  Top patterns: {len(kb.get(\"top_patterns\", []))}')
    print(f'  Weak categories: {kb.get(\"weak_categories\", [])}')
    print(f'  Strong categories: {kb.get(\"strong_categories\", [])}')
    print(f'  Overused phrases: {len(kb.get(\"overused_phrases\", []))}')
except Exception as e:
    print(f'  Error reading summary: {e}')
" >> "$LOG" 2>&1

# Show last 3 summary lines
python3 -c "
import json
try:
    kb = json.load(open('campaign_data/v7_knowledge.json'))
    print(f'Submissions: {kb.get(\"total_submissions\", 0)} | Avg: {kb.get(\"score_distribution\", {}).get(\"avg\", 0):.1f}/23 | Patterns: {len(kb.get(\"top_patterns\", []))}')
except:
    print('No summary available')
"
