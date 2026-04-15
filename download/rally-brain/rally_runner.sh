#!/bin/bash
# Rally Brain Runner v2.0
# Cron calls this every 15 min. Each run = 1 campaign (rotating).
# Quality gate: regenerate if score < 18.

cd /home/z/my-project/download/rally-brain
mkdir -p campaign_data

CAMPAIGNS=("campaign_3" "marbmarket-m0" "marbmarket-m1")
MIN_SCORE=18
MAX_REGEN=2
LOG="/tmp/rally_run.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"; }

# Pick next campaign
ROT="campaign_data/rotation_state.json"
LAST=""
[ -f "$ROT" ] && LAST=$(python3 -c "import json; print(json.load(open('$ROT')).get('last_campaign',''))" 2>/dev/null)
NEXT=""
for i in "${!CAMPAIGNS[@]}"; do
  [ "${CAMPAIGNS[$i]}" = "$LAST" ] && { NEXT="${CAMPAIGNS[$(( (i+1) % ${#CAMPAIGNS[@]} ))]}"; break; }
done
[ -z "$NEXT" ] && NEXT="${CAMPAIGNS[0]}"

log "=== RUN: $NEXT ==="

# Clear lock
rm -f campaign_data/.rally_guard.lock

# Generate
node generate.js "$NEXT" >> "$LOG" 2>&1
EXIT=$?

# Read score
PRED="campaign_data/${NEXT}_output/prediction.json"
SCORE="ERR"
[ -f "$PRED" ] && SCORE=$(python3 -c "import json; print(json.load(open('$PRED')).get('score','ERR'))" 2>/dev/null)
GRADE="?"
[ -f "$PRED" ] && GRADE=$(python3 -c "import json; print(json.load(open('$PRED')).get('grade','?'))" 2>/dev/null)

log "RAW: $NEXT exit=$EXIT score=$SCORE grade=$GRADE"

# Quality gate: regenerate if score < MIN
REGEN_NEEDED=$(python3 -c "print('1' if float('$SCORE') < $MIN_SCORE else '0')" 2>/dev/null)
if [ "$SCORE" != "ERR" ] && [ "$REGEN_NEEDED" = "1" ]; then
  for R in $(seq 1 $MAX_REGEN); do
    log "REGEN $R/$MAX_REGEN (score=$SCORE)"
    sleep 10
    rm -f campaign_data/.rally_guard.lock
    node generate.js "$NEXT" >> "$LOG" 2>&1
    [ -f "$PRED" ] && SCORE=$(python3 -c "import json; print(json.load(open('$PRED')).get('score','ERR'))" 2>/dev/null)
    [ -f "$PRED" ] && GRADE=$(python3 -c "import json; print(json.load(open('$PRED')).get('grade','?'))" 2>/dev/null)
    log "REGEN $R: score=$SCORE"
    IS_OK=$(python3 -c "print('1' if float('$SCORE') >= $MIN_SCORE else '0')" 2>/dev/null)
    [ "$IS_OK" = "1" ] && break
  done
fi

# Inject fix if low
FIX_NEEDED=$(python3 -c "print('1' if float('$SCORE') < 15 else '0')" 2>/dev/null)
if [ "$SCORE" != "ERR" ] && [ "$FIX_NEEDED" = "1" ]; then
  KDB="campaign_data/${NEXT}_knowledge_db.json"
  python3 << PYEOF 2>/dev/null
import json
try: d=json.load(open('$KDB'))
except: d={'patterns':{'semantic':{}}}
d.setdefault('patterns',{}).setdefault('semantic',{})
d['patterns']['semantic'].setdefault('self_heal_directives',{'directives':[],'level':'critical'})
dirs=d['patterns']['semantic']['self_heal_directives']['directives']
dirs.insert(0,f'LOW SCORE: $SCORE/23. ALL required tags/links MUST be included. No AI words. No dashes. Human voice.')
d['patterns']['semantic']['self_heal_directives']['directives']=dirs[:10]
json.dump(d,open('$KDB','w'),indent=2)
PYEOF
  log "FIX injected for $NEXT"
fi

# Update rotation
python3 << PYEOF 2>/dev/null
import json
f='campaign_data/rotation_state.json'
try: d=json.load(open(f))
except: d={}
d['last_campaign']='${NEXT}'
d['last_run']='$(date -Iseconds)'
d['cycle_count']=d.get('cycle_count',0)+1
json.dump(d,open(f,'w'),indent=2)
PYEOF

log "DONE: $NEXT $SCORE/23 ($GRADE)"
