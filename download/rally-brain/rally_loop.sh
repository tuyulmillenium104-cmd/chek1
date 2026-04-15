#!/bin/bash
# Rally Brain 1-Hour Continuous Loop
# Runs all 3 campaigns in rotation until 1 hour
# Logs results to /tmp/rally_loop.log

LOG="/tmp/rally_loop.log"
START=$(date +%s)
END=$((START + 3600))  # 1 hour
PROJECT="/home/z/my-project/download/rally-brain"
CAMPAIGNS=("marbmarket-m0" "marbmarket-m1" "campaign_3")

echo "========================================" | tee $LOG
echo "RALLY BRAIN 1-HOUR LOOP" | tee -a $LOG
echo "Start: $(date)" | tee -a $LOG
echo "End:   $(date -d @$END)" | tee -a $LOG
echo "Campaigns: ${CAMPAIGNS[*]}" | tee -a $LOG
echo "========================================" | tee -a $LOG
echo "" | tee -a $LOG

CYCLE=0
FAILS=0

while [ $(date +%s) -lt $END ]; do
  for CID in "${CAMPAIGNS[@]}"; do
    NOW=$(date +%s)
    if [ $NOW -ge $END ]; then break; fi

    CYCLE=$((CYCLE + 1))
    echo "--- CYCLE $CYCLE: $CID @ $(date '+%H:%M:%S') ---" | tee -a $LOG

    cd $PROJECT
    node self_heal.js --campaign $CID </dev/null >>/tmp/rally_loop.log 2>&1
    EXIT=$?

    # Read score
    SCORE="N/A"
    GRADE="N/A"
    PRED="$PROJECT/campaign_data/${CID}_output/prediction.json"
    if [ -f "$PRED" ]; then
      SCORE=$(node -e "try{const p=JSON.parse(require('fs').readFileSync('$PRED','utf-8'));console.log(p.score||'N/A')}catch{}")
      GRADE=$(node -e "try{const p=JSON.parse(require('fs').readFileSync('$PRED','utf-8'));console.log(p.grade||'N/A')}catch{}")
    fi

    if [ "$EXIT" -eq 0 ]; then
      echo "  RESULT: OK | Score: $SCORE/23 | Grade: $GRADE" | tee -a $LOG
    else
      FAILS=$((FAILS + 1))
      echo "  RESULT: FAIL (exit=$EXIT) | Score: $SCORE | Grade: $GRADE" | tee -a $LOG
    fi

    echo "" | tee -a $LOG

    # Small delay between campaigns
    sleep 5
  done

  # Print summary every full rotation
  echo "=== ROTATION SUMMARY (cycle $CYCLE) @ $(date '+%H:%M:%S') ===" | tee -a $LOG
  for CID in "${CAMPAIGNS[@]}"; do
    PRED="$PROJECT/campaign_data/${CID}_output/prediction.json"
    if [ -f "$PRED" ]; then
      SCORE=$(node -e "try{const p=JSON.parse(require('fs').readFileSync('$PRED','utf-8'));console.log(p.score||0)}catch{}" 2>/dev/null)
      GRADE=$(node -e "try{const p=JSON.parse(require('fs').readFileSync('$PRED','utf-8'));console.log(p.grade||'?')}catch{}" 2>/dev/null)
      echo "  $CID: $SCORE/23 ($GRADE)" | tee -a $LOG
    fi
  done
  echo "" | tee -a $LOG

  # If all campaigns score 21+, we're done
  ALL_MAX=true
  for CID in "${CAMPAIGNS[@]}"; do
    PRED="$PROJECT/campaign_data/${CID}_output/prediction.json"
    if [ -f "$PRED" ]; then
      SCORE=$(node -e "try{const p=JSON.parse(require('fs').readFileSync('$PRED','utf-8'));console.log(p.score||0)}catch{}" 2>/dev/null)
      if [ "$SCORE" != "N/A" ] && [ "$(echo "$SCORE >= 21" | bc -l 2>/dev/null || echo 0)" = "0" ]; then
        ALL_MAX=false
      fi
    else
      ALL_MAX=false
    fi
  done

  if [ "$ALL_MAX" = true ]; then
    echo "ALL CAMPAIGNS SCORED 21+! DONE!" | tee -a $LOG
    break
  fi
done

echo "" | tee -a $LOG
echo "========================================" | tee -a $LOG
echo "LOOP COMPLETE" | tee -a $LOG
echo "Total cycles: $CYCLE | Total fails: $FAILS" | tee -a $LOG
echo "Duration: $(( ($(date +%s) - START) / 60 )) minutes" | tee -a $LOG
echo "" | tee -a $LOG
echo "FINAL SCORES:" | tee -a $LOG
for CID in "${CAMPAIGNS[@]}"; do
  PRED="$PROJECT/campaign_data/${CID}_output/prediction.json"
  if [ -f "$PRED" ]; then
    SCORE=$(node -e "try{const p=JSON.parse(require('fs').readFileSync('$PRED','utf-8'));console.log(p.score||'N/A')}catch{}" 2>/dev/null)
    GRADE=$(node -e "try{const p=JSON.parse(require('fs').readFileSync('$PRED','utf-8'));console.log(p.grade||'?')}catch{}" 2>/dev/null)
    echo "  $CID: $SCORE/23 ($GRADE)" | tee -a $LOG
  fi
done
echo "========================================" | tee -a $LOG
