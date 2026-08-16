-- Rollback: DROP TABLE IF EXISTS idempotency_records; DROP TABLE IF EXISTS tool_calibration_requirements;
-- Non-destructive: Existing Tool records are unaffected. New tables are additive only.

-- ============================================================================
-- Phase 3.5: Tool Calibration Requirements + Idempotency Records
-- ============================================================================
-- These are additive-only changes. No existing tables are modified.
-- Existing Tool records will have no calibration requirement (calibrationRequired defaults to false).
-- The tool_calibration_requirements table uses a 1:1 relation to the tools table
-- via a unique FK (toolId). Tools without a calibration row simply have no requirement.
-- ============================================================================

-- ─── Table: tool_calibration_requirements ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `tool_calibration_requirements` (
    `id` VARCHAR(191) NOT NULL,
    `toolId` VARCHAR(191) NOT NULL,
    `calibrationRequired` BOOLEAN NOT NULL DEFAULT FALSE,
    `lastCalibrationDate` DATETIME(3) NULL,
    `nextCalibrationDue` DATETIME(3) NULL,
    `calibrationStatus` VARCHAR(191) NOT NULL DEFAULT 'not_required',
    `calibrationCertId` VARCHAR(191) NULL,
    `calibratedById` VARCHAR(191) NULL,
    `calibrationIntervalDays` INT NULL,
    `emergencyOverride` BOOLEAN NOT NULL DEFAULT FALSE,
    `emergencyOverrideReason` LONGTEXT NULL,
    `emergencyOverrideById` VARCHAR(191) NULL,
    `emergencyOverrideAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `tool_calibration_requirements_toolId_key` (`toolId`),
    INDEX `tool_calibration_requirements_calibrationCertId_idx` (`calibrationCertId`),
    INDEX `tool_calibration_requirements_calibratedById_idx` (`calibratedById`),
    INDEX `tool_calibration_requirements_emergencyOverrideById_idx` (`emergencyOverrideById`),

    CONSTRAINT `tool_calibration_requirements_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `tools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `tool_calibration_requirements_calibrationCertId_fkey` FOREIGN KEY (`calibrationCertId`) REFERENCES `calibration_records` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `tool_calibration_requirements_calibratedById_fkey` FOREIGN KEY (`calibratedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `tool_calibration_requirements_emergencyOverrideById_fkey` FOREIGN KEY (`emergencyOverrideById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Table: idempotency_records ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `idempotency_records` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `executedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responseHash` VARCHAR(191) NOT NULL,
    `responseData` LONGTEXT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `idempotency_records_key_key` (`key`),
    INDEX `idempotency_records_entityType_entityId_idx` (`entityType`, `entityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
