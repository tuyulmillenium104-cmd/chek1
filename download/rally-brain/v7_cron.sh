#!/bin/bash
# Rally Brain v7.0 — Cron Entry Point
# Runs the complete data pipeline + generation cycle.
#
# Usage:
#   ./v7_cron.sh data       # Run data collection + analysis only
#   ./v7_cron.sh generate   # Run content generation (using v7 knowledge)
#   ./v7_cron.sh full       # Run both: data + generate
#   ./v7_cron.sh init       # Initialize v7 from existing data
#   ./v7_cron.sh status     # Show system status
#
# Cron setup (every 15 min):
#   */15 * * * * cd /home/z/my-project/download/rally-brain && ./v7_cron.sh full >> /tmp/v7_cron.log 2>&1

set -euo pipefail

cd /home/z/my-project/download/rally-brain
mkdir -p campaign_data/v7_collected
mkdir -p campaign_data/v7_reports

LOG="/tmp/v7_cron.log"
LOCK_FILE="campaign_data/.v7_cron.lock"
PID_FILE="campaign_data/.v7_cron.pid"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [V7] $1" >> "$LOG"
}

# Prevent concurrent runs
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
            log "Already running (PID $OLD_PID), skipping"
            exit 0
        fi
        # Stale lock, remove
        rm -f "$LOCK_FILE"
    fi
    echo $$ > "$LOCK_FILE"
    echo $$ > "$PID_FILE"
    trap 'rm -f "$LOCK_FILE" "$PID_FILE"' EXIT
}

run_data_cycle() {
    log "=== DATA CYCLE START ==="
    python3 v7_engine.py data-cycle >> "$LOG" 2>&1
    EXIT=$?
    if [ $EXIT -eq 0 ]; then
        log "=== DATA CYCLE COMPLETE ==="
    else
        log "=== DATA CYCLE FAILED (exit=$EXIT) ==="
    fi
    return $EXIT
}

run_generate() {
    log "=== GENERATION START ==="

    # Pick next campaign from rotation
    ROT="campaign_data/rotation_state.json"
    LAST=""
    if [ -f "$ROT" ]; then
        LAST=$(python3 -c "import json; print(json.load(open('$ROT')).get('last_campaign',''))" 2>/dev/null || echo "")
    fi

    CAMPAIGNS=("campaign_3" "marbmarket-m0" "marbmarket-m1")
    NEXT=""
    for i in "${!CAMPAIGNS[@]}"; do
        if [ "${CAMPAIGNS[$i]}" = "$LAST" ]; then
            NEXT="${CAMPAIGNS[$(( (i+1) % ${#CAMPAIGNS[@]} ))]}"
            break
        fi
    done
    [ -z "$NEXT" ] && NEXT="${CAMPAIGNS[0]}"

    log "Campaign: $NEXT (rotation from $LAST)"

    # Write v7 context for generate.js to consume
    python3 v7_engine.py write-context --campaign "$NEXT" >> "$LOG" 2>&1

    # Run generate.js
    node generate.js "$NEXT" >> "$LOG" 2>&1
    EXIT=$?

    # Read score
    PRED="campaign_data/${NEXT}_output/prediction.json"
    SCORE="ERR"
    GRADE="?"
    if [ -f "$PRED" ]; then
        SCORE=$(python3 -c "import json; print(json.load(open('$PRED')).get('score','ERR'))" 2>/dev/null || echo "ERR")
        GRADE=$(python3 -c "import json; print(json.load(open('$PRED')).get('grade','?'))" 2>/dev/null || echo "?")
    fi

    log "Generate result: $NEXT score=$SCORE/$MAX_TOTAL grade=$GRADE exit=$EXIT"

    # Quality gate: regenerate if score < 18
    if [ "$SCORE" != "ERR" ]; then
        IS_LOW=$(python3 -c "print(1 if float('$SCORE') < 18 else 0)" 2>/dev/null || echo "0")
        REGEN=0
        MAX_REGEN=2
        while [ "$IS_LOW" = "1" ] && [ $REGEN -lt $MAX_REGEN ]; do
            REGEN=$((REGEN + 1))
            log "Quality gate: regen $REGEN/$MAX_REGEN (score=$SCORE)"
            sleep 10
            python3 v7_engine.py write-context --campaign "$NEXT" >> "$LOG" 2>&1
            node generate.js "$NEXT" >> "$LOG" 2>&1
            if [ -f "$PRED" ]; then
                SCORE=$(python3 -c "import json; print(json.load(open('$PRED')).get('score','ERR'))" 2>/dev/null || echo "ERR")
                GRADE=$(python3 -c "import json; print(json.load(open('$PRED')).get('grade','?'))" 2>/dev/null || echo "?")
            fi
            IS_LOW=$(python3 -c "print(1 if float('$SCORE') < 18 else 0)" 2>/dev/null || echo "0")
            log "Regen $REGEN: score=$SCORE grade=$GRADE"
        done

        # Inject fix directive if score < 15
        IS_CRITICAL=$(python3 -c "print(1 if float('$SCORE') < 15 else 0)" 2>/dev/null || echo "0")
        if [ "$IS_CRITICAL" = "1" ]; then
            log "CRITICAL: Score $SCORE < 15. Injecting fix directive."
            python3 -c "
import json
from pathlib import Path
kb_path = Path('campaign_data/v7_knowledge.json')
try:
    kb = json.loads(kb_path.read_text())
except:
    kb = {}
kb.setdefault('directives', {}).setdefault('campaign_specific', {}).setdefault('$NEXT', [])
kb['directives']['campaign_specific']['$NEXT'].insert(0, f'LOW SCORE: $SCORE/23. ALL required tags/links MUST be included. No AI words. Human voice.')
kb_path.write_text(json.dumps(kb, indent=2, ensure_ascii=False))
" 2>/dev/null
        fi

        # Record cycle in v7 knowledge
        python3 -c "
import json
from pathlib import Path
from datetime import datetime, timezone
ts = datetime.now(timezone.utc).isoformat()
# Update rotation state
rot_path = Path('campaign_data/rotation_state.json')
try:
    rot = json.loads(rot_path.read_text())
except:
    rot = {}
rot['last_campaign'] = '$NEXT'
rot['last_run'] = ts
rot['cycle_count'] = rot.get('cycle_count', 0) + 1
rot['campaigns'] = $CAMPAIGNS_JSON
rot_path.write_text(json.dumps(rot, indent=2))
print(f'Rotation updated: $NEXT, cycle {rot[\"cycle_count\"]}')
" 2>/dev/null
    fi

    log "=== GENERATION COMPLETE: $NEXT $SCORE/$MAX_TOTAL ($GRADE) ==="
}

run_init() {
    log "=== INITIALIZING V7 FROM EXISTING DATA ==="
    python3 v7_engine.py init >> "$LOG" 2>&1
    log "=== INITIALIZATION COMPLETE ==="
}

run_status() {
    python3 v7_engine.py status
}

# ── Main ──
case "${1:-full}" in
    data)
        check_lock
        run_data_cycle
        ;;
    generate)
        check_lock
        run_generate
        ;;
    full)
        check_lock
        run_data_cycle
        # Only generate if data cycle succeeded
        if [ $? -eq 0 ]; then
            sleep 5
            run_generate
        fi
        ;;
    init)
        run_init
        ;;
    status)
        run_status
        ;;
    *)
        echo "Usage: $0 {data|generate|full|init|status}"
        exit 1
        ;;
esac
