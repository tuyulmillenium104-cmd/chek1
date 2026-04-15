#!/bin/bash
# Rally Brain Daemon v1.0 - Infinite Loop
# JANGAN berhenti. Jalan terus sampai di-kill.
# Quality gate: regenerate jika skor < 18

cd /home/z/my-project/download/rally-brain
mkdir -p campaign_data

CAMPAIGNS=("campaign_3" "marbmarket-m0" "marbmarket-m1")
MIN_SCORE=18
MAX_REGEN=3
CYCLE_DELAY=60

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /tmp/rally_daemon.log
}

echo "RALLY DAEMON v1.0 PID: $$" > /tmp/rally_daemon.pid
log "DAEMON STARTED PID: $$"

IDX=0
TOTAL=0
SUCCESS=0
FAIL=0

while true; do
  CAM="${CAMPAIGNS[$IDX]}"
  ((IDX++))
  ((IDX=IDX % ${#CAMPAIGNS[@]}))
  ((TOTAL++))

  log "=== CYCLE $TOTAL: $CAM ==="

  # Clean lock
  rm -f campaign_data/.rally_guard.lock

  # Run generate
  node generate.js "$CAM" > /tmp/rally_daemon_cycle.log 2>&1
  EXIT=$?
  
  # Read score
  SCORE="ERR"
  GRADE="?"
  PRED_FILE="campaign_data/${CAM}_output/prediction.json"
  if [ -f "$PRED_FILE" ]; then
    SCORE=$(python3 -c "import json; print(json.load(open('$PRED_FILE')).get('score','ERR'))" 2>/dev/null)
    GRADE=$(python3 -c "import json; print(json.load(open('$PRED_FILE')).get('grade','ERR'))" 2>/dev/null)
  fi

  log "RAW: $CAM exit=$EXIT score=$SCORE grade=$GRADE"

  # Quality gate
  NEED_REGEN=false
  if [ "$SCORE" != "ERR" ] && [ "$(echo "$SCORE < $MIN_SCORE" | bc -l 2>/dev/null)" = "1" ]; then
    NEED_REGEN=true
  fi

  # Also regenerate if process crashed
  if [ $EXIT -ne 0 ]; then
    NEED_REGEN=true
    # Check for syntax errors - don't retry
    if rg -q "SyntaxError" /tmp/rally_daemon_cycle.log 2>/dev/null; then
      log "SYNTAX ERROR in generate.js. NOT retrying. Manual fix needed."
      ((FAIL++))
      sleep $CYCLE_DELAY
      continue
    fi
  fi

  # Regenerate loop
  if [ "$NEED_REGEN" = true ]; then
    for R in $(seq 1 $MAX_REGEN); do
      log "REGEN $R/$MAX_REGEN for $CAM (score was $SCORE)"
      sleep 15
      rm -f campaign_data/.rally_guard.lock
      node generate.js "$CAM" > /tmp/rally_daemon_cycle.log 2>&1
      if [ -f "$PRED_FILE" ]; then
        NEW_SCORE=$(python3 -c "import json; print(json.load(open('$PRED_FILE')).get('score','ERR'))" 2>/dev/null)
        NEW_GRADE=$(python3 -c "import json; print(json.load(open('$PRED_FILE')).get('grade','ERR'))" 2>/dev/null)
        log "REGEN $R result: score=$NEW_SCORE grade=$NEW_GRADE"
        
        # Accept if score improved enough
        if [ "$NEW_SCORE" != "ERR" ] && [ "$(echo "$NEW_SCORE >= $MIN_SCORE" | bc -l 2>/dev/null)" = "1" ]; then
          SCORE=$NEW_SCORE
          GRADE=$NEW_GRADE
          break
        fi
        SCORE=$NEW_SCORE
        GRADE=$NEW_GRADE
      fi
    done
  fi

  # Final assessment
  if [ "$SCORE" != "ERR" ] && [ "$(echo "$SCORE >= 10" | bc -l 2>/dev/null)" = "1" ]; then
    ((SUCCESS++))
    log "SUCCESS: $CAM $SCORE/23 ($GRADE) | Total success: $SUCCESS/$TOTAL"
  else
    ((FAIL++))
    log "FAIL: $CAM score=$SCORE | Total fail: $FAIL/$TOTAL"
  fi

  # Inject fix directive if score is low
  if [ "$SCORE" != "ERR" ] && [ "$(echo "$SCORE < 15" | bc -l 2>/dev/null)" = "1" ]; then
    KDB_FILE="campaign_data/${CAM}_knowledge_db.json"
    python3 -c "
import json
f='$KDB_FILE'
try:
    d=json.load(open(f))
except:
    d={'patterns':{'semantic':{}}}
if 'patterns' not in d: d['patterns']={}
if 'semantic' not in d['patterns']: d['patterns']['semantic']={}
if 'self_heal_directives' not in d['patterns']['semantic']:
    d['patterns']['semantic']['self_heal_directives']={'directives':[],'level':'critical'}
dirs=d['patterns']['semantic']['self_heal_directives']['directives']
dirs.insert(0, f'LOW SCORE WARNING: Last score was $SCORE/23. ABSOLUTELY MUST include all required tags/links. No AI words. No dashes. Genuine question at end. Write with human voice.')
d['patterns']['semantic']['self_heal_directives']['directives']=dirs[:10]
json.dump(d,open(f,'w'),indent=2)
" 2>/dev/null
    log "INJECTED fix directive to $KDB_FILE"
  fi

  # Update rotation state
  python3 -c "
import json
f='campaign_data/rotation_state.json'
try:
    d=json.load(open(f))
except:
    d={}
d['last_campaign']='${CAM}'
d['last_run']='$(date -Iseconds)'
d['cycle_count']=d.get('cycle_count',0)+1
json.dump(d,open(f,'w'),indent=2)
" 2>/dev/null

  # Save daemon stats
  echo "{\"total_cycles\":$TOTAL,\"success\":$SUCCESS,\"fail\":$FAIL,\"last_campaign\":\"$CAM\",\"last_score\":\"$SCORE\",\"last_grade\":\"$GRADE\"}" > campaign_data/daemon_state.json

  log "Sleeping ${CYCLE_DELAY}s..."
  sleep $CYCLE_DELAY
done
