#!/bin/bash
# ============================================================================
# fix-schema-drift.sh — Fix Prisma schema drift on production MySQL/MariaDB
# Run on your production VPS: bash scripts/fix-schema-drift.sh
# ============================================================================

set -e

echo "=== Prisma Schema Drift Fix ==="
echo ""
echo "This script will:"
echo "  1. Drop all foreign key constraints on the 'assets' table"
echo "  2. Drop all non-unique indexes on the 'assets' table"  
echo "  3. Re-run prisma db push to recreate everything cleanly"
echo ""
read -p "Do you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Load DB credentials from .env if exists
DB_NAME="ifleetpro_eam_system"
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="root"
DB_PASS=""

if [ -f .env ]; then
  DB_URL=$(grep DATABASE_URL .env | head -1 | cut -d'=' -f2-)
  if [ -n "$DB_URL" ]; then
    if [[ "$DB_URL" =~ mysql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
      DB_USER="${BASH_REMATCH[1]}"
      DB_PASS="${BASH_REMATCH[2]}"
      DB_HOST="${BASH_REMATCH[3]}"
      DB_PORT="${BASH_REMATCH[4]}"
      DB_NAME="${BASH_REMATCH[5]}"
    fi
  fi
fi

MYSQL_CMD="mariadb -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME"

echo "Connecting to: $DB_USER@$DB_HOST:$DB_PORT / $DB_NAME"
echo ""

# Step 1: Show current state
echo "=== Current State ==="
$MYSQL_CMD -e "SHOW INDEX FROM assets;" 2>/dev/null || true

echo ""
echo "=== Dropping FK constraints on 'assets' ==="
$MYSQL_CMD -e "
ALTER TABLE assets DROP FOREIGN KEY IF EXISTS assets_assignedToId_fkey;
ALTER TABLE assets DROP FOREIGN KEY IF EXISTS assets_categoryId_fkey;
ALTER TABLE assets DROP FOREIGN KEY IF EXISTS assets_createdById_fkey;
ALTER TABLE assets DROP FOREIGN KEY IF EXISTS assets_departmentId_fkey;
ALTER TABLE assets DROP FOREIGN KEY IF EXISTS assets_parentId_fkey;
ALTER TABLE assets DROP FOREIGN KEY IF EXISTS assets_plantId_fkey;
" 2>&1 && echo "✓ Foreign keys dropped"

echo ""
echo "=== Dropping standalone non-unique indexes ==="
$MYSQL_CMD -e "
ALTER TABLE assets DROP INDEX IF EXISTS assets_status_idx;
ALTER TABLE assets DROP INDEX IF EXISTS assets_criticality_idx;
ALTER TABLE assets DROP INDEX IF EXISTS assets_categoryId_idx;
ALTER TABLE assets DROP INDEX IF EXISTS assets_plantId_idx;
" 2>&1 && echo "✓ Indexes dropped"

echo ""
echo "=== Verifying clean state ==="
$MYSQL_CMD -e "SHOW INDEX FROM assets;"

echo ""
echo "=== Running prisma db push ==="
npx prisma db push

echo ""
echo "=== Done! ==="
