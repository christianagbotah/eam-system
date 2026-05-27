#!/bin/bash
cd /home/z/my-project
unset DATABASE_URL
export DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@vps.lightworldtech.com:3306/ifleetpro_eam_system"
export DB_HOST=vps.lightworldtech.com
export DB_PORT=3306
export DB_USER=ifleetpro_user
export DB_PASSWORD=myjesus4mE2018
export DB_NAME=ifleetpro_eam_system

while true; do
  echo "[$(date)] Starting dev server..."
  rm -rf .next/cache
  bun run dev 2>&1 &
  PID=$!
  
  # Wait for it to die
  wait $PID 2>/dev/null
  EXIT_CODE=$?
  echo "[$(date)] Server died (exit $EXIT_CODE). Restarting in 3s..."
  sleep 3
done
