#!/bin/bash
# =============================================================================
# fix-prisma-generate.sh
# Diagnostic and fix script for "prisma generate" issues on VPS
# Run: bash scripts/fix-prisma-generate.sh
# =============================================================================
set -e

PROJECT_DIR="/home/ifleetpro/git/eam-system"
APP_NAME="iassetspro"

echo "========================================"
echo "  Prisma Generate Diagnostic & Fix"
echo "========================================"
echo ""

cd "$PROJECT_DIR" || { echo "ERROR: Cannot cd to $PROJECT_DIR"; exit 1; }

# Step 1: Check environment
echo "[1/5] Checking environment..."
echo "  Project dir: $(pwd)"
echo "  Node.js: $(node --version 2>/dev/null || echo 'not found')"
echo "  Bun: $(bun --version 2>/dev/null || echo 'not found')"
echo ""

# Step 2: Check for .env file and DB env vars
echo "[2/5] Checking database configuration..."
if [ -f .env ]; then
  echo "  .env file: FOUND"
  grep -E '^(DB_HOST|DB_USER|DB_NAME|DB_PORT|DATABASE_URL)' .env 2>/dev/null | sed 's/\(=\).*/\1***/' || true
else
  echo "  .env file: NOT FOUND"
fi

# Check shell env vars
if [ -n "$DB_HOST" ]; then
  echo "  DB_HOST (shell): $DB_HOST"
else
  echo "  DB_HOST (shell): NOT SET"
fi
if [ -n "$DATABASE_URL" ]; then
  echo "  DATABASE_URL (shell): ${DATABASE_URL:0:30}..."
else
  echo "  DATABASE_URL (shell): NOT SET"
fi

# Check PM2 env
if command -v pm2 &>/dev/null; then
  echo ""
  echo "  PM2 env vars (DB_*):"
  pm2 env "$APP_NAME" 2>/dev/null | grep -E '^(DB_HOST|DB_USER|DB_NAME|DB_PORT|DATABASE_URL)' | sed 's/\(=\).*/\1***/' || echo "    (could not read PM2 env)"
fi
echo ""

# Step 3: Create .env from PM2 env if missing
echo "[3/5] Ensuring .env exists for prisma generate..."
if [ ! -f .env ]; then
  echo "  No .env file found. Attempting to create from PM2 environment..."
  if command -v pm2 &>/dev/null; then
    PM2_ENV=$(pm2 env "$APP_NAME" 2>/dev/null || echo "")
    DB_HOST_VAL=$(echo "$PM2_ENV" | grep '^DB_HOST=' | head -1 | cut -d= -f2-)
    DB_PORT_VAL=$(echo "$PM2_ENV" | grep '^DB_PORT=' | head -1 | cut -d= -f2-)
    DB_USER_VAL=$(echo "$PM2_ENV" | grep '^DB_USER=' | head -1 | cut -d= -f2-)
    DB_PASS_VAL=$(echo "$PM2_ENV" | grep '^DB_PASSWORD=' | head -1 | cut -d= -f2-)
    DB_NAME_VAL=$(echo "$PM2_ENV" | grep '^DB_NAME=' | head -1 | cut -d= -f2-)
    DB_URL_VAL=$(echo "$PM2_ENV" | grep '^DATABASE_URL=' | head -1 | cut -d= -f2-)

    if [ -n "$DB_URL_VAL" ]; then
      echo "DATABASE_URL=$DB_URL_VAL" > .env
      echo "  Created .env with DATABASE_URL from PM2"
    elif [ -n "$DB_HOST_VAL" ] && [ -n "$DB_USER_VAL" ] && [ -n "$DB_PASS_VAL" ] && [ -n "$DB_NAME_VAL" ]; then
      DB_PORT_VAL="${DB_PORT_VAL:-3306}"
      echo "DATABASE_URL=mysql://${DB_USER_VAL}:${DB_PASS_VAL}@${DB_HOST_VAL}:${DB_PORT_VAL}/${DB_NAME_VAL}" > .env
      echo "  Created .env with DATABASE_URL built from DB_* vars"
    else
      echo "  WARNING: Could not extract DB config from PM2. .env not created."
      echo "  You may need to set DATABASE_URL manually:"
      echo "    export DATABASE_URL='mysql://user:pass@host:3306/dbname'"
    fi
  else
    echo "  PM2 not found. Please set DATABASE_URL manually:"
    echo "    export DATABASE_URL='mysql://user:pass@host:3306/dbname'"
  fi
else
  echo "  .env file already exists"
fi
echo ""

# Step 4: Clean and regenerate Prisma client
echo "[4/5] Regenerating Prisma client..."
echo "  Removing node_modules/.prisma..."
rm -rf node_modules/.prisma

echo "  Running npx prisma generate..."
if npx prisma generate 2>&1; then
  echo "  ✓ prisma generate succeeded"
else
  echo "  ✗ prisma generate FAILED"
  echo ""
  echo "  Try running manually with DATABASE_URL set:"
  echo "    DATABASE_URL='mysql://user:pass@host:3306/dbname' npx prisma generate"
  exit 1
fi
echo ""

# Step 5: Restart PM2 app
echo "[5/5] Restarting PM2 app..."
if command -v pm2 &>/dev/null; then
  pm2 restart "$APP_NAME" --update-env
  echo "  Waiting 5 seconds for app to start..."
  sleep 5
  echo ""
  echo "  Last 15 lines of PM2 logs:"
  echo "  --- error log ---"
  pm2 logs "$APP_NAME" --lines 15 --nostream --err 2>/dev/null | tail -15 || echo "  (no error logs)"
  echo "  --- out log ---"
  pm2 logs "$APP_NAME" --lines 15 --nostream --out 2>/dev/null | tail -15 || echo "  (no output logs)"
else
  echo "  PM2 not found. Please restart your app manually."
fi

echo ""
echo "========================================"
echo "  Fix Complete!"
echo "========================================"
echo ""
echo "If the errors persist, check:"
echo "  1. pm2 logs $APP_NAME --lines 50 --nostream"
echo "  2. curl http://localhost:3000/api/debug/db-health"
echo ""
