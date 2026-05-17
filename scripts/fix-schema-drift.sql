-- ============================================================================
-- Fix Prisma Schema Drift: assets_plantId_fkey index mismatch
-- ============================================================================
-- Run this on your production MySQL/MariaDB database BEFORE running prisma db push
-- This fixes the "Can't DROP INDEX `assets_plantId_fkey`" error
-- ============================================================================

-- Step 1: Check current foreign keys on assets table
SELECT 
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'assets'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Step 2: Check current indexes on assets table
SHOW INDEX FROM assets;

-- Step 3: Drop ALL foreign key constraints on the assets table
-- This allows Prisma to recreate them cleanly on the next db push
-- NOTE: Replace the constraint names below with the ACTUAL names from Step 1

-- Common MySQL auto-generated FK names (uncomment and run after checking Step 1):
-- ALTER TABLE assets DROP FOREIGN KEY assets_ibfk_1;
-- ALTER TABLE assets DROP FOREIGN KEY assets_ibfk_2;
-- ... etc for each constraint on assets

-- OR drop them all dynamically:
SET @db = DATABASE();
SET @sql = NULL;
SELECT GROUP_CONCAT(
  CONCAT('ALTER TABLE `assets` DROP FOREIGN KEY `', CONSTRAINT_NAME, '`')
  SEPARATOR '; '
) INTO @sql
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'assets'
  AND CONSTRAINT_TYPE = 'FOREIGN KEY';

-- If there are FKs to drop, execute
SET @sql = IFNULL(@sql, 'SELECT "No foreign keys found on assets table" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Also drop any indexes that might conflict
-- (Prisma will recreate the correct ones on db push)
-- Only drop indexes that are NOT the PRIMARY KEY or UNIQUE constraints

SET @sql2 = NULL;
SELECT GROUP_CONCAT(
  CONCAT('ALTER TABLE `assets` DROP INDEX `', INDEX_NAME, '`')
  SEPARATOR '; '
) INTO @sql2
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'assets'
  AND INDEX_NAME != 'PRIMARY'
  AND NON_UNIQUE = 1; -- only non-unique indexes

SET @sql2 = IFNULL(@sql2, 'SELECT "No non-unique indexes to drop" AS info');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Step 5: Verify the table is clean
SHOW INDEX FROM assets;
SELECT CONSTRAINT_NAME, COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'assets'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ============================================================================
-- AFTER running this script, run: npx prisma db push
-- ============================================================================
