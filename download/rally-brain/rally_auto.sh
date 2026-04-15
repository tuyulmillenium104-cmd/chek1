#!/bin/bash
# Rally Brain Auto-Runner v4.0
# Runs self_heal.js for each campaign with rotation
# All healing is autonomous: infra, config, content, scoring, growth

cd /home/z/my-project/download/rally-brain

LOG="/tmp/rally_auto_$(date +%Y%m%d_%H%M%S).log"

# Read rotation state to determine next campaign
ROTATION_FILE="campaign_data/rotation_state.json"
CAMPAIGNS=("campaign_3" "marbmarket-m0" "marbmarket-m1")

# Get last campaign from rotation state
LAST=""
if [ -f "$ROTATION_FILE" ]; then
    LAST=$(python3 -c "import json; print(json.load(open('$ROTATION_FILE')).get('last_campaign',''))" 2>/dev/null)
fi

# Find next campaign in rotation
NEXT=""
for i in "${!CAMPAIGNS[@]}"; do
    if [ "${CAMPAIGNS[$i]}" = "$LAST" ]; then
        NEXT="${CAMPAIGNS[$(( (i+1) % ${#CAMPAIGNS[@]} ))]}"
        break
    fi
done
[ -z "$NEXT" ] && NEXT="${CAMPAIGNS[0]}"

echo "Rally Auto v4.0 | Campaign: $NEXT | $(date)" > "$LOG"
echo "Previous: $LAST | Rotation: ${CAMPAIGNS[*]}" >> "$LOG"

# Run self_heal.js for the next campaign
node self_heal.js --campaign "$NEXT" >> "$LOG" 2>&1
EXIT_CODE=$?

# Cleanup old logs (keep last 5)
ls -t /tmp/rally_auto_*.log 2>/dev/null | tail -n +6 | xargs -r rm

exit $EXIT_CODE
