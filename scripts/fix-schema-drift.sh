#!/bin/bash
# ============================================================================
# fix-schema-drift.sh — Fix Prisma schema drift on production MySQL
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
  # Try to parse DATABASE_URL from .env
  DB_URL=$(grep DATABASE_URL .env | head -1 | cut -d'=' -f2-)
  if [ -n "$DB_URL" ]; then
    # Parse mysql://user:pass@host:port/dbname
    if [[ "$DB_URL" =~ mysql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
      DB_USER="${BASH_REMATCH[1]}"
      DB_PASS="${BASH_REMATCH[2]}"
      DB_HOST="${BASH_REMATCH[3]}"
      DB_PORT="${BASH_REMATCH[4]}"
      DB_NAME="${BASH_REMATCH[5]}"
    fi
  fi
fi

echo "Connecting to: $DB_USER@$DB_HOST:$DB_PORT / $DB_NAME"
echo ""

# Step 1: Show current FK constraints
echo "=== Current Foreign Keys on 'assets' ==="
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'assets' AND REFERENCED_TABLE_NAME IS NOT NULL;
" 2>/dev/null || echo "(none found)"

echo ""
echo "=== Current Indexes on 'assets' ==="
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW INDEX FROM assets;" 2>/dev/null || echo "(could not read indexes)"

echo ""
echo "=== Dropping FK constraints on 'assets' ==="
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SET @db = '$DB_NAME';
SET @sql = NULL;
SELECT GROUP_CONCAT(CONCAT('ALTER TABLE \`assets\` DROP FOREIGN KEY \`', CONSTRAINT_NAME, '\`') SEPARATOR '; ') INTO @sql
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'assets' AND CONSTRAINT_TYPE = 'FOREIGN KEY';
SET @sql = IFNULL(@sql, 'SELECT \"No FKs to drop\" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
" 2>/dev/null && echo "✓ Foreign keys dropped" || echo "✗ Failed to drop FKs"

echo ""
echo "=== Dropping non-unique indexes on 'assets' ==="
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SET @db = '$DB_NAME';
SET @sql2 = NULL;
SELECT GROUP_CONCAT(CONCAT('ALTER TABLE \`assets\` DROP INDEX \`', INDEX_NAME, '\`') SEPARATOR '; ') INTO @sql2
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'assets' AND INDEX_NAME != 'PRIMARY' AND NON_UNIQUE = 1;
SET @sql2 = IFNULL(@sql2, 'SELECT \"No indexes to drop\" AS info');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
" 2>/dev/null && echo "✓ Indexes dropped" || echo "✗ Failed to drop indexes"

echo ""
echo "=== Verifying clean state ==="
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW INDEX FROM assets;" 2>/dev/null

echo ""
echo "=== Running prisma db push ==="
npx prisma db push

echo ""
echo "=== Done! Schema pushed successfully ==="
