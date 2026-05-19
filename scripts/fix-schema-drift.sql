-- ============================================================================
-- Fix Prisma Schema Drift: assets_plantId_fkey index mismatch
-- ============================================================================
-- Run on your production VPS:
--   mariadb -u root -p ifleetpro_eam_system < scripts/fix-schema-drift.sql
--   npx prisma db push
-- ============================================================================

-- Step 1: Drop ALL foreign key constraints on 'assets'
-- (this also removes their auto-created indexes of the same name)
ALTER TABLE assets DROP FOREIGN KEY assets_assignedToId_fkey;
ALTER TABLE assets DROP FOREIGN KEY assets_categoryId_fkey;
ALTER TABLE assets DROP FOREIGN KEY assets_createdById_fkey;
ALTER TABLE assets DROP FOREIGN KEY assets_departmentId_fkey;
ALTER TABLE assets DROP FOREIGN KEY assets_parentId_fkey;
ALTER TABLE assets DROP FOREIGN KEY assets_plantId_fkey;

-- Step 2: Drop remaining standalone non-unique indexes
-- (the _idx ones that are NOT tied to FKs)
ALTER TABLE assets DROP INDEX assets_status_idx;
ALTER TABLE assets DROP INDEX assets_criticality_idx;
ALTER TABLE assets DROP INDEX assets_categoryId_idx;
ALTER TABLE assets DROP INDEX assets_plantId_idx;

-- Step 3: Verify clean state
SHOW INDEX FROM assets;

-- ============================================================================
-- Now run: npx prisma db push
-- ============================================================================
