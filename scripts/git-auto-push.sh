#!/bin/bash
# Auto-push script: commits any changes and pushes to GitHub
# Run by cron every 30 minutes

cd /home/z/my-project

# Check if there are any changes
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    git add -A
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    git commit -m "auto-save: periodic backup at ${TIMESTAMP}" 2>/dev/null
    git push origin main 2>/dev/null
    echo "[$TIMESTAMP] Auto-push completed"
else
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] No changes to push"
fi
