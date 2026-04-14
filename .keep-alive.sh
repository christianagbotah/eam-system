#!/bin/bash
cd /home/z/my-project
while true; do
  npx next dev -p 3000 2>&1 | tee /home/z/my-project/dev.log
  echo "[$(date)] Server exited, restarting in 3s..."
  sleep 3
done
