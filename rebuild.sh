#!/bin/bash
# ============================================================
# VPS REBUILD SCRIPT — run this on your VPS after git pull
# Usage: bash rebuild.sh
# ============================================================
set -e

echo "===== iAssetsPro VPS Rebuild ====="

# 1. Generate fresh Prisma client
echo "[1/5] Generating Prisma client..."
npx prisma generate

# 2. Update prebuilt copy (used by production build)
echo "[2/5] Updating prebuilt Prisma client..."
cp -r node_modules/.prisma prisma/prebuilt/.prisma

# 3. Push schema to database (creates missing tables)
echo "[3/5] Syncing database schema..."
npx prisma db push

# 4. Build production app
echo "[4/5] Building production app..."
npm run build

# 5. Restart
echo "[5/5] Restarting application..."
pm2 restart all 2>/dev/null || true
# If not using pm2, try: systemctl restart iassetspro

echo ""
echo "===== Rebuild complete! ====="
echo "Test: curl -s https://your-domain.com/api/debug/db-health"
