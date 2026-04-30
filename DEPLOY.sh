#!/bin/bash
# =============================================================================
# EAM System - cPanel Deployment Script
# =============================================================================
# This script deploys the EAM system on cPanel shared hosting.
# It does NOT require Prisma CLI (which OOMs on shared hosting).
#
# PREREQUISITES:
#   1. Node.js 20+ activated (nodevenv)
#   2. MySQL database created with credentials in .env
#   3. Database tables created via phpMyAdmin using schema-mysql.sql
#   4. Database seeded via phpMyAdmin using seed-data.sql
#
# USAGE:
#   chmod +x DEPLOY.sh
#   ./DEPLOY.sh
# =============================================================================

set -e

echo "========================================="
echo "  EAM System - cPanel Deployment"
echo "========================================="

# Step 1: Check prerequisites
echo ""
echo "[1/5] Checking prerequisites..."

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

# Step 2: Install dependencies
echo ""
echo "[2/5] Installing dependencies..."
npm install --production=false 2>&1 | tail -3
echo "  Dependencies installed"

# Step 3: Restore prebuilt Prisma client
echo ""
echo "[3/5] Restoring prebuilt Prisma client..."
if [ -d "prisma/prebuilt/.prisma" ]; then
    rm -rf node_modules/.prisma
    cp -r prisma/prebuilt/.prisma node_modules/.prisma
    echo "  Prebuilt Prisma client restored"
else
    echo "  WARNING: prisma/prebuilt/.prisma not found!"
    echo "  Run 'npm run postbuild:prebuilt' on a machine with enough memory first."
    exit 1
fi

# Step 4: Build Next.js
echo ""
echo "[4/5] Building Next.js application..."
export NODE_OPTIONS="--max-old-space-size=512"
npx next build 2>&1 | tail -10

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi

echo "  Build successful"

# Step 5: Copy standalone files
echo ""
echo "[5/5] Setting up standalone output..."

# Copy Prisma client to standalone
mkdir -p .next/standalone/node_modules/.prisma/client
cp -r node_modules/.prisma/client/* .next/standalone/node_modules/.prisma/client/

# Copy MariaDB adapter
mkdir -p .next/standalone/node_modules/@prisma/adapter-mariadb
cp -r node_modules/@prisma/adapter-mariadb/* .next/standalone/node_modules/@prisma/adapter-mariadb/

# Copy mariadb driver
mkdir -p .next/standalone/node_modules/mariadb
cp -r node_modules/mariadb/* .next/standalone/node_modules/mariadb/

# Copy static files
mkdir -p .next/standalone/.next/static
cp -r .next/static/* .next/standalone/.next/static/

# Copy public files
cp -r public .next/standalone/

# Apply server patch if exists
if [ -f "patch-server.js" ]; then
    node patch-server.js
fi

echo "  Standalone output ready"

echo ""
echo "========================================="
echo "  Deployment complete!"
echo "========================================="
echo ""
echo "To start the application:"
echo "  NODE_ENV=production node .next/standalone/server.js"
echo ""
echo "Or add to your cPanel Node.js app startup:"
echo "  App Startup File: .next/standalone/server.js"
echo "  App Run Command: NODE_ENV=production node"
echo ""
