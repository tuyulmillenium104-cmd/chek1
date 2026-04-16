#!/bin/bash
# Kill existing
fuser -k 3000/tcp 2>/dev/null
sleep 1
# Start fresh  
cd /home/z/my-project
exec npx next dev -p 3000
