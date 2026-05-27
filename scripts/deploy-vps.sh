#!/bin/bash
# =============================================================================
# EAM System - VPS Deployment Script with OOM Protection
# =============================================================================
# Handles low-memory VPS environments by:
#   1. Checking available memory and adding swap if needed
#   2. Limiting Node.js heap size to prevent OOM kills
#   3. Cleaning up .next build cache to reduce memory pressure
#   4. Monitoring memory during build
#
# USAGE:
#   cd ~/git/eam-system && bash deploy-vps.sh          # Full deploy
#   cd ~/git/eam-system && bash deploy-vps.sh --fast    # Skip deps install
#   cd ~/git/eam-system && bash deploy-vps.sh --swap    # Only setup swap
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_DEPS=false
SWAP_ONLY=false
MAX_OLD_SPACE=${NODE_MAX_OLD_SPACE:-1024}

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --fast)  SKIP_DEPS=true ;;
    --swap)  SWAP_ONLY=true ;;
    --mem=*) MAX_OLD_SPACE="${arg#*=}" ;;
    --help|-h)
      echo "Usage: $0 [--fast] [--swap] [--mem=MB]"
      echo "  --fast    Skip npm install (faster if deps unchanged)"
      echo "  --swap    Only setup swap space, then exit"
      echo "  --mem=MB  Set Node.js max old space (default: 1024)"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

# =============================================================================
# FUNCTION: Check & Setup Swap Space
# =============================================================================
ensure_swap() {
  echo -e "${CYAN}[swap]${NC} Checking available memory..."

  local total_mem_mb=$(free -m | awk '/^Mem:/ {print $2}')
  local total_swap_mb=$(free -m | awk '/^Swap:/ {print $2}')
  local available_mb=$(free -m | awk '/^Mem:/ {print $7}')

  echo "  Memory: ${total_mem_mb}MB total, ${available_mb}MB available"
  echo "  Swap:   ${total_swap_mb}MB"

  if [ "$total_swap_mb" -ge 2048 ]; then
    echo -e "  ${GREEN}✓${NC} Swap already sufficient (${total_swap_mb}MB)"
    return 0
  fi

  # Check if we have enough RAM without swap
  if [ "$total_mem_mb" -ge 4096 ] && [ "$available_mb" -ge 2000 ]; then
    echo -e "  ${GREEN}✓${NC} Sufficient RAM available (${available_mb}MB free)"
    return 0
  fi

  echo -e "  ${YELLOW}!${NC} Low memory detected — setting up swap space..."

  # Create 2GB swap file
  local swap_size=2048

  if [ -f /swapfile ]; then
    echo "  /swapfile already exists, ensuring it's active..."
    swapon /swapfile 2>/dev/null || true
    local current_swap=$(free -m | awk '/^Swap:/ {print $2}')
    if [ "$current_swap" -ge 1024 ]; then
      echo -e "  ${GREEN}✓${NC} Swap active (${current_swap}MB)"
      return 0
    fi
  fi

  echo "  Allocating ${swap_size}MB swap file..."
  sudo fallocate -l ${swap_size}M /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile

  # Add to fstab if not already there
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "  Added swap to /etc/fstab (persistent across reboots)"
  fi

  # Reduce swappiness (prefer RAM, use swap as safety net)
  echo 10 | sudo tee /proc/sys/vm/swappiness > /dev/null

  local final_swap=$(free -m | awk '/^Swap:/ {print $2}')
  echo -e "  ${GREEN}✓${NC} Swap configured: ${final_swap}MB available"
}

# =============================================================================
# FUNCTION: Monitor memory usage in background
# =============================================================================
monitor_memory() {
  local pid=$1
  (
    while kill -0 "$pid" 2>/dev/null; do
      sleep 5
    done
  ) &
  echo $! > /tmp/eam-mem-monitor.pid
}

# =============================================================================
# MAIN DEPLOYMENT
# =============================================================================

echo ""
echo "========================================="
echo "  EAM VPS Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "  Node heap limit: ${MAX_OLD_SPACE}MB"
echo "========================================="

# Step 1: Setup swap
echo ""
echo -e "${CYAN}[1/6]${NC} Memory & Swap Setup"
ensure_swap

if [ "$SWAP_ONLY" = true ]; then
  echo ""
  echo -e "${GREEN}✓${NC} Swap setup complete."
  echo ""
  free -h
  exit 0
fi

# Step 2: Pull latest code
echo ""
echo -e "${CYAN}[2/6]${NC} Pulling latest code..."
cd "$SCRIPT_DIR"
git fetch origin
git reset --hard origin/main
echo -e "  ${GREEN}✓${NC} Now at: $(git log --oneline -1)"

# Step 3: Install dependencies
if [ "$SKIP_DEPS" = false ]; then
  echo ""
  echo -e "${CYAN}[3/6]${NC} Installing dependencies..."
  bun install --frozen-lockfile 2>/dev/null || bun install
  echo -e "  ${GREEN}✓${NC} Dependencies installed"
else
  echo ""
  echo -e "${CYAN}[3/6]${NC} Skipping dependency install (--fast mode)"
fi

# Step 4: Clean and build
echo ""
echo -e "${CYAN}[4/6]${NC} Building Next.js (memory-limited)..."

# Clean old build artifacts to free disk space
if [ -d .next ]; then
  echo "  Cleaning old build artifacts..."
  rm -rf .next
fi

# Copy prebuilt Prisma client if available
if [ -d prisma/prebuilt/.prisma ]; then
  echo "  Copying prebuilt Prisma client..."
  rm -rf node_modules/.prisma
  cp -r prisma/prebuilt/.prisma node_modules/.prisma
fi

# Build with memory limit
echo "  Starting build (max heap: ${MAX_OLD_SPACE}MB)..."
echo "  This may take 2-4 minutes on low-memory VPS..."

export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=${MAX_OLD_SPACE}"

# Run build with memory monitoring
set +e
NODE_OPTIONS="--max-old-space-size=${MAX_OLD_SPACE}" bun run build 2>&1 | tee /tmp/eam-build.log
BUILD_EXIT=${PIPESTATUS[0]}
set -e

if [ "$BUILD_EXIT" -ne 0 ]; then
  echo ""
  echo -e "${RED}✗${NC} Build failed with exit code $BUILD_EXIT"

  # Check if it was OOM kill
  if [ "$BUILD_EXIT" -eq 137 ]; then
    echo -e "${RED}BUILD WAS KILLED BY OOM (exit 137)${NC}"
    echo ""
    echo "Your VPS doesn't have enough memory. Solutions:"
    echo "  1. Run: bash $0 --swap    (add 2GB swap)"
    echo "  2. Run: bash $0 --mem=512  (use even less memory)"
    echo "  3. Close other processes to free RAM"
    echo "  4. Upgrade your VPS to 2GB+ RAM"
    echo ""
    free -h
  else
    echo "Last 10 lines of build log:"
    tail -10 /tmp/eam-build.log
  fi
  exit 1
fi

echo -e "  ${GREEN}✓${NC} Build successful!"

# Step 5: Generate Prisma client & copy assets to standalone
echo ""
echo -e "${CYAN}[5/6]${NC} Generating Prisma client & copying assets..."

STANDALONE=".next/standalone"

# Regenerate Prisma client (ensures it exists after build)
echo "  Generating Prisma client..."
bunx prisma generate 2>&1 | tail -3 || echo -e "  ${YELLOW}!${NC} prisma generate had warnings (may be non-fatal)"

# Copy Prisma client to standalone using SYMLINKS (avoids copy failures and infinite nesting)
# Prisma v7+ generates to node_modules/@prisma/client, with redirect at node_modules/.prisma/client
PRISMA_GEN="node_modules/@prisma/client"
PRISMA_META="node_modules/.prisma"
STANDALONE_NM="${STANDALONE}/node_modules"

# Remove old copies/symlinks
rm -rf "${STANDALONE_NM}/.prisma" "${STANDALONE_NM}/@prisma" "${STANDALONE_NM}/mariadb"

# Create symlinks (relative paths: standalone/node_modules -> project/node_modules = ../../../)
ln -s ../../../node_modules/.prisma "${STANDALONE_NM}/.prisma"
ln -s ../../../node_modules/@prisma "${STANDALONE_NM}/@prisma"
ln -s ../../../node_modules/mariadb "${STANDALONE_NM}/mariadb"
echo -e "  ${GREEN}✓${NC} Prisma & mariadb symlinked (3 links)"

# Copy static files
cp -r .next/static "${STANDALONE}/.next/"

# Copy public assets
cp -r public "${STANDALONE}/"

echo -e "  ${GREEN}✓${NC} Assets copied"

# Step 6: Patch server.js
echo ""
echo -e "${CYAN}[6/6]${NC} Patching server.js..."

if [ -f patch-server.js ]; then
  node patch-server.js
  echo -e "  ${GREEN}✓${NC} Server patched"
else
  echo -e "  ${YELLOW}!${NC} patch-server.js not found, skipping"
fi

# Restart with PM2
echo ""
echo -e "${CYAN}[restart]${NC} Restarting application..."

if command -v pm2 &> /dev/null && pm2 describe eam-system &> /dev/null; then
  pm2 restart eam-system --update-env
  echo -e "  ${GREEN}✓${NC} PM2 restarted eam-system"
else
  echo -e "  ${YELLOW}!${NC} PM2 not managing eam-system. Start manually:"
  echo "    cd .next/standalone && NODE_ENV=production node server.js"
fi

# Summary
echo ""
echo "========================================="
echo -e "  ${GREEN}✓ Deployment Complete!${NC}"
echo "========================================="
echo ""
free -h
echo ""
pm2 list 2>/dev/null || true
echo ""
echo "To check logs: pm2 logs eam-system --lines 50"
