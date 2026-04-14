#!/bin/bash
# Keep-alive wrapper for Next.js dev server
# Starts the server and sends periodic keep-alive requests to prevent sandbox timeout
(
  while true; do
    echo "[$(date)] Starting Next.js dev server..."
    node ./node_modules/.bin/next dev -p 3000 --turbopack 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready
    for i in $(seq 1 30); do
      if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 2 2>/dev/null | rg -q "200"; then
        echo "[$(date)] Server ready (PID $SERVER_PID)"
        break
      fi
      sleep 1
    done
    
    # Keep-alive: send a request every 15 seconds to prevent sandbox timeout
    while kill -0 $SERVER_PID 2>/dev/null; do
      sleep 15
      curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 5 2>/dev/null > /dev/null
    done
    
    echo "[$(date)] Server (PID $SERVER_PID) exited, restarting in 2s..."
    wait $SERVER_PID 2>/dev/null
    sleep 2
    rm -rf .next
  done
) &
disown
echo "Keep-alive daemon started"
