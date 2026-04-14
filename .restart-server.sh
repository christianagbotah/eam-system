#!/bin/bash
# Kill any existing server
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 1

# Check if port 3000 is in use
if ss -tlnp 2>/dev/null | grep -q ':3000'; then
  echo "Port 3000 already in use, skipping"
  exit 0
fi

# Start the server
cd /home/z/my-project
nohup npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
echo "Server started at $(date)"
