#!/bin/bash
# =============================================================================
# rebuild-vps.sh — Complete VPS rebuild: fix .env, regenerate Prisma, build, restart
# Run: cd /home/ifleetpro/git/eam-system && bash scripts/rebuild-vps.sh
# =============================================================================
set -e

PROJECT_DIR="/home/ifleetpro/git/eam-system"
APP_NAME="iassetspro"
STANDALONE_ENV="$PROJECT_DIR/.next/standalone/.env"

echo "========================================"
echo "  VPS Rebuild Script"
echo "========================================"
echo ""

cd "$PROJECT_DIR" || { echo "ERROR: Cannot cd to $PROJECT_DIR"; exit 1; }

# Step 1: Verify git is up to date
echo "[1/5] Checking git state..."
git pull 2>&1 | tail -3
echo ""

# Step 2: Ensure .env has correct DATABASE_URL in BOTH locations
echo "[2/5] Setting DATABASE_URL..."
DB_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system"

# Write to project root .env
echo "DATABASE_URL=$DB_URL" > .env
echo "  ✓ Root .env updated"

# Write to standalone .env (running app reads this)
if [ -d .next/standalone ]; then
  echo "DATABASE_URL=$DB_URL" > "$STANDALONE_ENV"
  echo "  ✓ Standalone .env updated"
else
  echo "  ⚠ .next/standalone/ not found (will be created by next build)"
fi
echo ""

# Step 3: Regenerate Prisma client
echo "[3/5] Regenerating Prisma client..."
rm -rf node_modules/.prisma
npx prisma generate 2>&1
echo "  ✓ Prisma client generated"
echo ""

# Step 4: Build Next.js standalone
echo "[4/5] Building Next.js (standalone)..."
echo "  This may take a few minutes..."
export DATABASE_URL="$DB_URL"
npx next build 2>&1
echo "  ✓ Next.js build complete"
echo ""

# Step 5: Copy .env into new standalone build and restart
echo "[5/5] Restarting PM2..."
if [ -d .next/standalone ]; then
  echo "DATABASE_URL=$DB_URL" > "$STANDALONE_ENV"
fi
pm2 restart "$APP_NAME" --update-env
echo "  Waiting 8 seconds..."
sleep 8
echo ""

# Show logs
echo "========================================"
echo "  Startup Logs"
echo "========================================"
echo "--- Out Log (last 25 lines) ---"
pm2 logs "$APP_NAME" --lines 25 --nostream --out 2>/dev/null || echo "(no output)"
echo ""
echo "--- Error Log (last 10 lines) ---"
pm2 logs "$APP_NAME" --lines 10 --nostream --err 2>/dev/null || echo "(no errors)"
echo ""
echo "========================================"
echo "  Done!"
echo "========================================"
