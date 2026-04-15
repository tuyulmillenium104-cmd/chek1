#!/bin/bash
# Rally Brain v7.0 - Sequential Auto-Runner
# Menjalankan semua campaign SEQUENTIALIAL (bukan paralel) untuk menghindari 429
# Self-healing built-in: infra, config, content, scoring, growth

cd /home/z/my-project/download/rally-brain
LOG="/tmp/rally_run_$(date +%Y%m%d_%H%M%S).log"

CAMPAIGNS=("campaign_3" "marbmarket-m0" "marbmarket-m1")

# Reset token state jika sudah 24 jam
TS_FILE="campaign_data/.token_state.json"
if [ -f "$TS_FILE" ]; then
    AGE=$(( $(date +%s) - $(stat -c %Y "$TS_FILE") ))
    if [ $AGE -gt 86400 ]; then
        rm -f "$TS_FILE"
        echo "[$(date)] Token state reset (age: ${AGE}s)" >> "$LOG"
    fi
fi

# Clear stale lock
rm -f campaign_data/.rally_guard.lock

for CAMPAIGN in "${CAMPAIGNS[@]}"; do
    echo "[$(date)] === $CAMPAIGN START ===" >> "$LOG"
    node generate.js "$CAMPAIGN" >> "$LOG" 2>&1
    EXIT=$?
    echo "[$(date)] === $CAMPAIGN DONE (exit=$EXIT) ===" >> "$LOG"
    
    # Cek skor
    SCORE=$(python3 -c "import json; print(json.load(open('campaign_data/${CAMPAIGN}_output/prediction.json')).get('score','ERR'))" 2>/dev/null)
    echo "[$(date)] $CAMPAIGN Score: $SCORE/23" >> "$LOG"
    
    # Update rotation
    python3 -c "
import json
f='campaign_data/rotation_state.json'
try:
    d=json.load(open(f))
except:
    d={}
d['last_campaign']='${CAMPAIGN}'
d['last_run']='$(date -Iseconds)'
d['cycle_count']=d.get('cycle_count',0)+1
json.dump(d,open(f,'w'),indent=2)
" 2>/dev/null
    
    # Jeda 10 detik antar campaign
    sleep 10
done

echo "[$(date)] === ALL CAMPAIGNS COMPLETE ===" >> "$LOG"

# Cleanup old logs
ls -t /tmp/rally_run_*.log 2>/dev/null | tail -n +6 | xargs -r rm

exit 0
