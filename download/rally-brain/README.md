# Rally Brain v2.0 — Level 2 Content Generation System

> **Philosophy**: "Rally minta 1, kita beri 2" — exceed Rally's quality expectations, not quantity.

## Architecture

```
/cron (link) set 30m
         │
         ▼
    ┌─────────────────────────────────┐
    │     CONNECTED PIPELINE          │
    │                                 │
    │  1. LEARN  ← Rally API         │
    │     ├─ Fetch submissions        │
    │     ├─ Extract patterns         │
    │     │   ├─ Surface (format)     │
    │     │   ├─ Structural (CTA etc) │
    │     │   └─ Semantic (WHY)       │
    │     └─ Update knowledge_db      │
    │                                 │
    │  2. GENERATE → Content          │
    │     ├─ Loop (max 5x):          │
    │     │   ├─ 3 variations         │
    │     │   ├─ Score each           │
    │     │   ├─ Best >= 16? → keep   │
    │     │   └─ If not → improve     │
    │     └─ Best of ALL variations   │
    │                                 │
    │  3. OUTPUT                      │
    │     ├─ best_content.txt         │
    │     ├─ qa.json (3 comments)     │
    │     └─ prediction.json          │
    │                                 │
    │  4. LEARN from new cycle        │
    │     └─ → back to step 1         │
    └─────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `engine.py` | Core: PatternExtractor, ScorePredictor, ContentGenerator, RallyBrainEngine |
| `cron_learner.py` | Fetch Rally API data, extract patterns, update knowledge |
| `cron_generator.py` | Generate loop, evaluate quality, output best content + Q&A |
| `cron.py` | Command interface: parse `/cron (link) set 30m`, manage jobs |
| `knowledge_db.json` | Persistent knowledge: patterns, scoring model, campaign memories |
| `campaign_data/` | Per-campaign storage: submissions, outputs, predictions |

## Key Concepts

### 3-Level Pattern Extraction
1. **Surface** — Format rules (spacing, compliance, technical)
2. **Structural** — Engagement patterns (CTA, hooks, mentions)
3. **Semantic** — WHY things fail (exaggeration risk, vagueness, alignment gaps)

### Score Prediction
- 6 categories: Originality (2), Alignment (2), Accuracy (2), Compliance (2), Engagement (5), Technical (5)
- Max: 18/18
- Threshold: 16/18 (Level 2 quality)
- Self-calibrating from actual Rally scores

### Generate Loop
```
Loop 1: Generate 3 → Evaluate → Best score: 14.5 → Below 16
Loop 2: Generate 3 (improved prompt) → Evaluate → Best: 15.8 → Below 16
Loop 3: Generate 3 → Evaluate → Best: 16.5 → ✅ STOP
Output: Best of all 9 variations (could be from any loop)
```

### v3 Lessons (Built-in)
From actual Rally scoring of our first submission (14/18 vs predicted 17.5):
- ❌ "Zero cost" = exaggeration → Accuracy -1
- ❌ "Figured it out" = vague → Accuracy -0.5
- ❌ Mysterious opening → Compliance -1
- ❌ Extra whitespace → Technical -1
- ❌ No CTA → Engagement -0.5

## Usage

### As Module (Next.js API Route)
```python
from rally_brain.cron import handle_cron_command, execute_cycle

# Parse command
result = await handle_cron_command("/cron https://rally.fun/campaigns/abc123 set 30m")

# Execute one cycle
result = await execute_cycle("https://rally.fun/campaigns/abc123")
```

### Standalone
```bash
# Run one full cycle (learn + generate) for a campaign
python cron_generator.py https://rally.fun/campaigns/abc123

# Run learning only
python cron_learner.py https://rally.fun/campaigns/abc123

# Test cron command parsing
python cron.py "/cron https://rally.fun/campaigns/abc123 set 30m"
python cron.py "/cron list"
```

## Cron Integration

The cron scheduler supports:
- `/cron <link> set <interval>` — Start job (15m, 30m, 1h, 2h)
- `/cron <link> stop` — Stop specific job
- `/cron list` — Show all active jobs and stats
- `/cron status` — Engine knowledge stats

Each cycle: LEARN (from Rally API) → GENERATE (with learned patterns) → OUTPUT (best content + Q&A)

## Data Flow

```
Rally API → cron_learner.py → engine.py (PatternExtractor)
                                      ↓
                              knowledge_db.json (updated)
                                      ↓
cron_generator.py → engine.py (ContentGenerator + ScorePredictor)
                                      ↓
                              campaign_data/{id}_output/
                              ├─ best_content.txt
                              ├─ qa.json
                              └─ prediction.json
```
