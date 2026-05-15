#!/bin/bash
# =============================================================================
# EAM System - Manual Deploy Script (run on the VM)
# =============================================================================
# Pulls latest code, builds, and restarts. Useful if auto-deploy fails or
# you want to deploy from a non-main branch.
#
# USAGE:
#   ./vm-deploy.sh              # Deploy latest main
#   ./vm-deploy.sh feature-xyz  # Deploy a specific branch
#   ./vm-deploy.sh --no-build   # Just pull and restart (fast)
# =============================================================================

set -e

BRANCH="${1:-main}"
SKIP_BUILD=false

if [ "$BRANCH" = "--no-build" ]; then
    SKIP_BUILD=true
    BRANCH="main"
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "========================================="
echo "  EAM Manual Deploy"
echo "  Branch: $BRANCH"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "========================================="

cd ~/eam-system

# Pull
echo ""
echo "[1/4] Pulling $BRANCH..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
echo "  Now at: $(git log --oneline -1)"

if [ "$SKIP_BUILD" = false ]; then
    # Install deps
    echo ""
    echo "[2/4] Installing dependencies..."
    npm install --legacy-peer-deps 2>&1 | tail -3

    # Prisma
    echo ""
    echo "[3/4] Generating Prisma client..."
    npx prisma generate

    # Build
    echo ""
    echo "[3/4] Building Next.js..."
    export NEXT_TELEMETRY_DISABLED=1
    npx next build

    # Copy assets
    echo ""
    echo "[4/4] Copying assets..."
    cp -r node_modules/.prisma/client .next/standalone/node_modules/.prisma/client
    cp -r node_modules/@prisma/adapter-mariadb .next/standalone/node_modules/@prisma/adapter-mariadb 2>/dev/null || true
    cp -r node_modules/mariadb .next/standalone/node_modules/mariadb 2>/dev/null || true
    cp -r .next/static .next/standalone/.next/
    cp -r public .next/standalone/
fi

# Restart
echo ""
if [ "$SKIP_BUILD" = true ]; then
    echo "[2/4] Restarting..."
else
    echo "[5/5] Restarting..."
fi

if command -v pm2 &> /dev/null && pm2 describe eam-system &> /dev/null; then
    pm2 restart eam-system
    echo "  PM2 restarted"
else
    echo -e "${YELLOW}PM2 not running. Start with: pm2 start npm --name eam-system -- start${NC}"
fi

echo ""
echo "========================================="
echo "  Done!"
echo "========================================="
pm2 list 2>/dev/null || true
