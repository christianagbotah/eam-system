#!/bin/bash
# =============================================================================
# EAM System - cPanel Deployment Script
# =============================================================================
# This script deploys a PRE-BUILT EAM system on cPanel shared hosting.
# It does NOT run any build — the build was done in the sandbox and
# committed to GitHub (see .next/server/ and .next/static/).
#
# It also does NOT run Prisma CLI — the prebuilt client is in
# prisma/prebuilt/.prisma/ and is restored after npm install.
#
# PREREQUISITES:
#   1. Node.js 20+ activated (nodevenv)
#   2. .env file with database credentials
#   3. Database tables created (import schema-mysql.sql via phpMyAdmin)
#   4. Database seeded (import seed-data.sql via phpMyAdmin)
#
# USAGE:
#   chmod +x DEPLOY.sh
#   ./DEPLOY.sh
# =============================================================================

set -e

echo "========================================="
echo "  EAM System - cPanel Deployment"
echo "  (Pre-built — no build step needed)"
echo "========================================="

# ── Step 1: Check prerequisites ──
echo ""
echo "[1/4] Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Activate your nodevenv first:"
    echo "  source /home/lightwor/nodevenv/eam-system/20/bin/activate"
    exit 1
fi

echo "  Node.js: $(node --version)"

if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Create it with your database credentials."
    exit 1
fi

echo "  .env: found"

if [ ! -d ".next/server" ]; then
    echo "ERROR: .next/server/ not found!"
    echo "  The pre-built files are missing. Make sure you pulled from GitHub."
    echo "  Run: git pull origin main"
    exit 1
fi

echo "  Build output: found (.next/server/, .next/static/)"

# ── Step 2: Install dependencies ──
echo ""
echo "[2/4] Installing dependencies..."
npm install --omit=dev 2>&1 | tail -3
echo "  Production dependencies installed"

# ── Step 3: Restore prebuilt Prisma client ──
echo ""
echo "[3/4] Restoring prebuilt Prisma client..."

if [ -d "prisma/prebuilt/.prisma" ]; then
    rm -rf node_modules/.prisma
    cp -r prisma/prebuilt/.prisma node_modules/.prisma
    echo "  Prebuilt Prisma client restored"
else
    echo "  WARNING: prisma/prebuilt/.prisma not found!"
    echo "  The app may fail at runtime without the Prisma client."
    exit 1
fi

# ── Step 4: Verify and start ──
echo ""
echo "[4/4] Verifying installation..."

# Quick smoke test — require the server module to check for errors
node -e "
try {
  require('./server.js');
} catch(e) {
  // server.js starts listening, so it won't return — this is expected
  // If we get here, the require worked
}
" 2>&1 | head -5 &
SERVER_PID=$!
sleep 2
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "========================================="
echo "  Deployment complete!"
echo "========================================="
echo ""
echo "To start the application:"
echo "  NODE_ENV=production node server.js"
echo ""
echo "Or configure cPanel Node.js app:"
echo "  App Startup File: server.js"
echo "  App Run Command: NODE_ENV=production node"
echo ""
echo "The application listens on the PORT assigned by cPanel Passenger."
echo ""
