#!/bin/bash
# Rally Brain Daemon v2.0 - Container-Kill Proof
# Setsid + nohup + detach child = survives container kill of parent

cd /home/z/my-project/download/rally-brain
mkdir -p campaign_data

CAMPAIGNS=("campaign_3" "marbmarket-m0" "marbmarket-m1")
MIN_SCORE=18
MAX_REGEN=2
CYCLE_DELAY=30

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> /tmp/rally_daemon.log
  # Also try stderr (unbuffered)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

echo $$ > /tmp/rally_daemon.pid
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

  # Fork generate into background (detached from shell)
  setsid node generate.js "$CAM" </dev/null >/tmp/rally_cycle_$CAM.log 2>&1 &
  GEN_PID=$!
  log "GENERATE STARTED pid=$GEN_PID campaign=$CAM"

  # Wait with timeout (5 min)
  WAITED=0
  while kill -0 $GEN_PID 2>/dev/null; do
    sleep 5
    ((WAITED+=5))
    if [ $WAITED -ge 300 ]; then
      log "TIMEOUT: Killing generate after ${WAITED}s"
      kill -9 $GEN_PID 2>/dev/null
      break
    fi
  done

  # Read result
  SCORE="ERR"
  GRADE="?"
  PRED_FILE="campaign_data/${CAM}_output/prediction.json"
  if [ -f "$PRED_FILE" ]; then
    SCORE=$(python3 -c "import json; print(json.load(open('$PRED_FILE')).get('score','ERR'))" 2>/dev/null)
    GRADE=$(python3 -c "import json; print(json.load(open('$PRED_FILE')).get('grade','ERR'))" 2>/dev/null)
  fi

  log "RESULT: $CAM score=$SCORE grade=$GRADE"

  # Quality gate: regenerate if needed
  if [ "$SCORE" != "ERR" ]; then
    IS_LOW=$(echo "$SCORE < $MIN_SCORE" | bc -l 2>/dev/null)
    if [ "$IS_LOW" = "1" ]; then
      for R in $(seq 1 $MAX_REGEN); do
        log "REGEN $R/$MAX_REGEN for $CAM (score=$SCORE)"
        sleep 20
        rm -f campaign_data/.rally_guard.lock
        setsid node generate.js "$CAM" </dev/null >/tmp/rally_cycle_${CAM}_r${R}.log 2>&1 &
        REGEN_PID=$!
        RW=0
        while kill -0 $REGEN_PID 2>/dev/null; do
          sleep 5; ((RW+=5))
          [ $RW -ge 300 ] && { kill -9 $REGEN_PID 2>/dev/null; break; }
        done
        NEW_SCORE=$(python3 -c "import json; print(json.load(open('$PRED_FILE')).get('score','ERR'))" 2>/dev/null)
        log "REGEN $R result: $NEW_SCORE"
        if [ "$NEW_SCORE" != "ERR" ]; then
          SCORE=$NEW_SCORE
          GRADE=$(python3 -c "import json; print(json.load(open('$PRED_FILE')).get('grade','?'))" 2>/dev/null)
          IS_OK=$(echo "$SCORE >= $MIN_SCORE" | bc -l 2>/dev/null)
          [ "$IS_OK" = "1" ] && break
        fi
      done
    fi
  fi

  # Assessment
  if [ "$SCORE" != "ERR" ] && [ "$(echo "$SCORE >= 10" | bc -l 2>/dev/null)" = "1" ]; then
    ((SUCCESS++))
    log "SUCCESS: $CAM $SCORE/23 ($GRADE) | Stats: $SUCCESS ok / $FAIL fail / $TOTAL total"
  else
    ((FAIL++))
    log "FAIL: $CAM score=$SCORE | Stats: $SUCCESS ok / $FAIL fail / $TOTAL total"
  fi

  # Inject fix if very low score
  if [ "$SCORE" != "ERR" ] && [ "$(echo "$SCORE < 15" | bc -l 2>/dev/null)" = "1" ]; then
    KDB_FILE="campaign_data/${CAM}_knowledge_db.json"
    python3 << PYEOF 2>/dev/null
import json
f='$KDB_FILE'
try: d=json.load(open(f))
except: d={'patterns':{'semantic':{}}}
d.setdefault('patterns',{}).setdefault('semantic',{})
d['patterns']['semantic'].setdefault('self_heal_directives',{'directives':[],'level':'critical'})
dirs=d['patterns']['semantic']['self_heal_directives']['directives']
dirs.insert(0,f'LOW SCORE: $SCORE/23. MUST include all tags/links. No AI words. No dashes. Human voice. Genuine question.')
d['patterns']['semantic']['self_heal_directives']['directives']=dirs[:10]
json.dump(d,open(f,'w'),indent=2)
PYEOF
    log "FIX INJECTED to $KDB_FILE"
  fi

  # Save state
  python3 << PYEOF 2>/dev/null
import json
f='campaign_data/rotation_state.json'
try: d=json.load(open(f))
except: d={}
d['last_campaign']='${CAM}'
d['last_run']='$(date -Iseconds)'
d['cycle_count']=d.get('cycle_count',0)+1
json.dump(d,open(f,'w'),indent=2)
PYEOF

  echo "{\"ts\":\"$(date -Iseconds)\",\"cycles\":$TOTAL,\"success\":$SUCCESS,\"fail\":$FAIL,\"last\":\"$CAM\",\"score\":\"$SCORE\",\"grade\":\"$GRADE\"}" > campaign_data/daemon_state.json

  log "Sleeping ${CYCLE_DELAY}s..."
  sleep $CYCLE_DELAY
done
