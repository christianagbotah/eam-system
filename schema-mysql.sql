-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `level` INTEGER NOT NULL DEFAULT 0,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `role_permissions_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `isVendorAdmin` BOOLEAN NOT NULL DEFAULT false,
    `resetToken` VARCHAR(191) NULL,
    `resetTokenExpires` DATETIME(3) NULL,
    `notificationPreferences` JSON NULL,
    `preferences` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `primaryTrade` VARCHAR(191) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_staffId_key`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_roles_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `isGranted` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `grantedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_permissions_userId_permissionId_key`(`userId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_modules` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0.0',
    `isCore` BOOLEAN NOT NULL DEFAULT false,
    `isSystemLicensed` BOOLEAN NOT NULL DEFAULT false,
    `licenseKey` VARCHAR(191) NULL,
    `validFrom` DATETIME(3) NULL,
    `validUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_modules_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_modules` (
    `id` VARCHAR(191) NOT NULL,
    `systemModuleId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `licensedAt` DATETIME(3) NULL,
    `licensedBy` VARCHAR(191) NULL,
    `activatedAt` DATETIME(3) NULL,
    `activatedBy` VARCHAR(191) NULL,
    `activationLocked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_modules_systemModuleId_companyId_key`(`systemModuleId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plants` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plants_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `plantId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `supervisorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_plants` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `plantId` VARCHAR(191) NOT NULL,
    `accessLevel` VARCHAR(191) NOT NULL DEFAULT 'read',
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_plants_userId_plantId_key`(`userId`, `plantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_requests` (
    `id` VARCHAR(191) NOT NULL,
    `requestNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `category` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `workflowStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `machineDownStatus` BOOLEAN NULL DEFAULT false,
    `assetId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `requestedBy` VARCHAR(191) NOT NULL,
    `supervisorId` VARCHAR(191) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `assignedPlannerId` VARCHAR(191) NULL,
    `workOrderId` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `plannedStart` DATETIME(3) NULL,
    `plannedEnd` DATETIME(3) NULL,
    `estimatedHours` DOUBLE NULL,
    `slaHours` DOUBLE NULL,
    `escalationLevel` INTEGER NOT NULL DEFAULT 0,
    `lastEscalatedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `maintenance_requests_requestNumber_key`(`requestNumber`),
    UNIQUE INDEX `maintenance_requests_workOrderId_key`(`workOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_orders` (
    `id` VARCHAR(191) NOT NULL,
    `woNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'corrective',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `maintenanceRequestId` VARCHAR(191) NULL,
    `pmScheduleId` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `assetName` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `assignedTo` VARCHAR(191) NULL,
    `teamLeaderId` VARCHAR(191) NULL,
    `assignedSupervisorId` VARCHAR(191) NULL,
    `assignedBy` VARCHAR(191) NULL,
    `assignmentType` VARCHAR(191) NULL,
    `plannerId` VARCHAR(191) NULL,
    `estimatedHours` DOUBLE NULL,
    `actualHours` DOUBLE NULL,
    `plannedStart` DATETIME(3) NULL,
    `plannedEnd` DATETIME(3) NULL,
    `actualStart` DATETIME(3) NULL,
    `actualEnd` DATETIME(3) NULL,
    `totalCost` DOUBLE NOT NULL DEFAULT 0,
    `laborCost` DOUBLE NOT NULL DEFAULT 0,
    `partsCost` DOUBLE NOT NULL DEFAULT 0,
    `contractorCost` DOUBLE NOT NULL DEFAULT 0,
    `failureDescription` VARCHAR(191) NULL,
    `causeDescription` VARCHAR(191) NULL,
    `actionDescription` VARCHAR(191) NULL,
    `tradeActivity` VARCHAR(191) NULL,
    `safetyNotes` VARCHAR(191) NULL,
    `ppeRequired` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `personalTools` TEXT NOT NULL DEFAULT '[]',
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockedBy` VARCHAR(191) NULL,
    `lockedAt` DATETIME(3) NULL,
    `lockReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `escalationLevel` INTEGER NOT NULL DEFAULT 0,
    `lastEscalatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `work_orders_woNumber_key`(`woNumber`),
    UNIQUE INDEX `work_orders_maintenanceRequestId_key`(`maintenanceRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wo_team_members` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'assistant',
    `accessLevel` VARCHAR(191) NOT NULL DEFAULT 'full',
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wo_time_logs` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `duration` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wo_materials` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `itemName` VARCHAR(191) NULL,
    `quantity` DOUBLE NULL,
    `unitCost` DOUBLE NULL,
    `totalCost` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'requested',
    `requestedBy` VARCHAR(191) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `issuedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wo_comments` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `status_transitions` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `fromStatus` VARCHAR(191) NULL,
    `toStatus` VARCHAR(191) NOT NULL,
    `allowedRoleSlugs` TEXT NOT NULL,
    `requiresApproval` BOOLEAN NOT NULL DEFAULT false,
    `requiresReason` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `oldValues` TEXT NULL,
    `newValues` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `escalation_logs` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `notifiedUsers` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_profile` (
    `id` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `tradingName` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `employeeCount` VARCHAR(191) NULL,
    `fiscalYearStart` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'GHS',
    `dateFormat` VARCHAR(191) NOT NULL DEFAULT 'DD/MM/YYYY',
    `isSetupComplete` BOOLEAN NOT NULL DEFAULT false,
    `setupCompletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `actionUrl` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asset_categories_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `assetTag` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `serialNumber` VARCHAR(191) NULL,
    `manufacturer` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `yearManufactured` INTEGER NULL,
    `condition` VARCHAR(191) NOT NULL DEFAULT 'new',
    `status` VARCHAR(191) NOT NULL DEFAULT 'operational',
    `criticality` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `location` VARCHAR(191) NULL,
    `building` VARCHAR(191) NULL,
    `floor` VARCHAR(191) NULL,
    `area` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `purchaseDate` DATETIME(3) NULL,
    `purchaseCost` DOUBLE NULL,
    `warrantyExpiry` DATETIME(3) NULL,
    `installedDate` DATETIME(3) NULL,
    `expectedLifeYears` INTEGER NULL,
    `currentValue` DOUBLE NULL,
    `depreciationRate` DOUBLE NULL,
    `imageUrl` VARCHAR(191) NULL,
    `drawingsUrl` VARCHAR(191) NULL,
    `manualUrl` VARCHAR(191) NULL,
    `specification` TEXT NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `assignedToId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assets_assetTag_key`(`assetTag`),
    UNIQUE INDEX `assets_serialNumber_key`(`serialNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_items` (
    `id` VARCHAR(191) NOT NULL,
    `itemCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'other',
    `unitOfMeasure` VARCHAR(191) NOT NULL DEFAULT 'each',
    `currentStock` DOUBLE NOT NULL DEFAULT 0,
    `minStockLevel` DOUBLE NOT NULL DEFAULT 0,
    `maxStockLevel` DOUBLE NULL,
    `reorderQuantity` DOUBLE NULL,
    `unitCost` DOUBLE NULL,
    `supplier` VARCHAR(191) NULL,
    `supplierPartNumber` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `binLocation` VARCHAR(191) NULL,
    `shelfLocation` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `specification` TEXT NOT NULL,
    `imageUrls` TEXT NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_items_itemCode_key`(`itemCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `previousStock` DOUBLE NOT NULL,
    `newStock` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `performedById` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `frequencyType` VARCHAR(191) NOT NULL,
    `frequencyValue` INTEGER NOT NULL,
    `lastCompletedDate` DATETIME(3) NULL,
    `nextDueDate` DATETIME(3) NULL,
    `estimatedDuration` DOUBLE NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `assignedToId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `autoGenerateWO` BOOLEAN NOT NULL DEFAULT true,
    `leadDays` INTEGER NOT NULL DEFAULT 3,
    `woTypeId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `templateId` VARCHAR(191) NULL,

    INDEX `pm_schedules_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_templates` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'preventive',
    `category` VARCHAR(191) NULL,
    `estimatedDuration` DOUBLE NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `requiredSkills` TEXT NULL,
    `requiredTools` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_template_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `taskNumber` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `taskType` VARCHAR(191) NOT NULL DEFAULT 'check',
    `requiredParts` TEXT NULL,
    `estimatedMinutes` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_triggers` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `triggerType` VARCHAR(191) NOT NULL,
    `triggerValue` DOUBLE NOT NULL,
    `triggerConfig` TEXT NULL,
    `lastTriggeredAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pm_triggers_scheduleId_key`(`scheduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wo_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `fromStatus` VARCHAR(191) NULL,
    `toStatus` VARCHAR(191) NOT NULL,
    `performedById` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mr_comments` (
    `id` VARCHAR(191) NOT NULL,
    `maintenanceRequestId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trades` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#6b7280',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trades_name_key`(`name`),
    UNIQUE INDEX `trades_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_skills` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tradeId` VARCHAR(191) NOT NULL,
    `proficiencyLevel` VARCHAR(191) NOT NULL DEFAULT 'intermediate',
    `yearsExperience` INTEGER NULL,
    `certified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_skills_userId_tradeId_key`(`userId`, `tradeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iot_devices` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `deviceCode` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `protocol` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'online',
    `location` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `groupId` VARCHAR(191) NULL,
    `parameter` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `thresholdMin` DOUBLE NULL,
    `thresholdMax` DOUBLE NULL,
    `lastReading` DOUBLE NULL,
    `lastSeen` DATETIME(3) NULL,
    `batteryLevel` INTEGER NULL,
    `signalStrength` INTEGER NULL,
    `firmwareVersion` VARCHAR(191) NULL,
    `pollingInterval` INTEGER NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `iot_devices_deviceCode_key`(`deviceCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iot_readings` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isAnomaly` BOOLEAN NOT NULL DEFAULT false,

    INDEX `iot_readings_deviceId_timestamp_idx`(`deviceId`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iot_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NULL,
    `severity` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `value` DOUBLE NULL,
    `threshold` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `acknowledgedBy` VARCHAR(191) NULL,
    `acknowledgedAt` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `iot_alerts_deviceId_createdAt_idx`(`deviceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iot_alert_rules` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `parameter` VARCHAR(191) NOT NULL,
    `operator` VARCHAR(191) NOT NULL,
    `threshold` DOUBLE NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'warning',
    `cooldownMinutes` INTEGER NOT NULL DEFAULT 5,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tools` (
    `id` VARCHAR(191) NOT NULL,
    `toolCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `serialNumber` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'available',
    `condition` VARCHAR(191) NOT NULL DEFAULT 'good',
    `location` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `purchaseDate` DATETIME(3) NULL,
    `purchaseCost` DOUBLE NULL,
    `currentValue` DOUBLE NULL,
    `manufacturer` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `checkedOutAt` DATETIME(3) NULL,
    `expectedReturn` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tools_toolCode_key`(`toolCode`),
    UNIQUE INDEX `tools_serialNumber_key`(`serialNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tool_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `toolId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `fromUserId` VARCHAR(191) NULL,
    `toUserId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `performedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_locations` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'warehouse',
    `address` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_locations_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `adjustmentNumber` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_adjustments_adjustmentNumber_key`(`adjustmentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_requests` (
    `id` VARCHAR(191) NOT NULL,
    `requestNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `requestedById` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_requests_requestNumber_key`(`requestNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_request_items` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `quantityRequested` DOUBLE NOT NULL,
    `quantityFulfilled` DOUBLE NOT NULL DEFAULT 0,
    `unitCost` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_transfers` (
    `id` VARCHAR(191) NOT NULL,
    `transferNumber` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `fromLocationId` VARCHAR(191) NULL,
    `toLocationId` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `requestedById` VARCHAR(191) NOT NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_transfers_transferNumber_key`(`transferNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `rating` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` VARCHAR(191) NOT NULL,
    `poNumber` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `expectedDelivery` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NOT NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_orders_poNumber_key`(`poNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `id` VARCHAR(191) NOT NULL,
    `poId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unitCost` DOUBLE NOT NULL,
    `totalCost` DOUBLE NOT NULL,
    `quantityReceived` DOUBLE NOT NULL DEFAULT 0,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receiving_records` (
    `id` VARCHAR(191) NOT NULL,
    `poId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `quantityReceived` DOUBLE NOT NULL,
    `condition` VARCHAR(191) NOT NULL DEFAULT 'good',
    `receivedById` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_incidents` (
    `id` VARCHAR(191) NOT NULL,
    `incidentNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `incidentDate` DATETIME(3) NOT NULL,
    `location` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `reportedById` VARCHAR(191) NOT NULL,
    `investigatedById` VARCHAR(191) NULL,
    `rootCause` VARCHAR(191) NULL,
    `correctiveAction` VARCHAR(191) NULL,
    `daysLost` INTEGER NOT NULL DEFAULT 0,
    `cost` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `escalationLevel` INTEGER NOT NULL DEFAULT 0,
    `lastEscalatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `safety_incidents_incidentNumber_key`(`incidentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_inspections` (
    `id` VARCHAR(191) NOT NULL,
    `inspectionNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'scheduled',
    `scheduledDate` DATETIME(3) NOT NULL,
    `completedDate` DATETIME(3) NULL,
    `location` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `inspectorId` VARCHAR(191) NULL,
    `findings` TEXT NOT NULL,
    `score` INTEGER NULL,
    `maxScore` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `safety_inspections_inspectionNumber_key`(`inspectionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_training` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'planned',
    `trainer` VARCHAR(191) NULL,
    `scheduledDate` DATETIME(3) NULL,
    `completedDate` DATETIME(3) NULL,
    `location` VARCHAR(191) NULL,
    `attendees` TEXT NOT NULL,
    `durationHours` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_equipment` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'available',
    `location` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `expiryDate` DATETIME(3) NULL,
    `lastInspected` DATETIME(3) NULL,
    `nextInspection` DATETIME(3) NULL,
    `condition` VARCHAR(191) NOT NULL DEFAULT 'good',
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `safety_equipment_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_permits` (
    `id` VARCHAR(191) NOT NULL,
    `permitNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `description` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `hazardAssessment` VARCHAR(191) NULL,
    `precautions` TEXT NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `safety_permits_permitNumber_key`(`permitNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_inspections` (
    `id` VARCHAR(191) NOT NULL,
    `inspectionNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `orderId` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `itemId` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `inspectedById` VARCHAR(191) NOT NULL,
    `scheduledDate` DATETIME(3) NULL,
    `completedDate` DATETIME(3) NULL,
    `result` VARCHAR(191) NULL,
    `defects` TEXT NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quality_inspections_inspectionNumber_key`(`inspectionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `non_conformance_reports` (
    `id` VARCHAR(191) NOT NULL,
    `ncrNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'minor',
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `type` VARCHAR(191) NOT NULL,
    `sourceInspectionId` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `itemId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `raisedById` VARCHAR(191) NOT NULL,
    `rootCause` VARCHAR(191) NULL,
    `correctiveAction` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `completedDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `non_conformance_reports_ncrNumber_key`(`ncrNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_audits` (
    `id` VARCHAR(191) NOT NULL,
    `auditNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'planned',
    `scheduledDate` DATETIME(3) NOT NULL,
    `completedDate` DATETIME(3) NULL,
    `auditedById` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `findings` TEXT NOT NULL,
    `score` INTEGER NULL,
    `maxScore` INTEGER NULL,
    `recommendation` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quality_audits_auditNumber_key`(`auditNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_control_plans` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `itemId` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `characteristics` TEXT NOT NULL,
    `sampleSize` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `corrective_actions` (
    `id` VARCHAR(191) NOT NULL,
    `capaNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `rootCause` VARCHAR(191) NULL,
    `correctiveAction` TEXT NOT NULL,
    `preventiveAction` TEXT NULL,
    `responsibleId` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `verifiedById` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `effectiveness` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `corrective_actions_capaNumber_key`(`capaNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpcProcess` (
    `id` VARCHAR(191) NOT NULL,
    `processName` VARCHAR(191) NOT NULL,
    `parameter` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT '',
    `specMin` DOUBLE NULL,
    `specMax` DOUBLE NULL,
    `target` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `samples` TEXT NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SpcProcess_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_centers` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `location` VARCHAR(191) NULL,
    `capacity` INTEGER NULL,
    `capacityUnit` VARCHAR(191) NOT NULL DEFAULT 'units/hour',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `work_centers_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'planned',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL,
    `completedQty` DOUBLE NOT NULL DEFAULT 0,
    `unitCost` DOUBLE NULL,
    `workCenterId` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `scheduledStart` DATETIME(3) NULL,
    `scheduledEnd` DATETIME(3) NULL,
    `actualStart` DATETIME(3) NULL,
    `actualEnd` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `production_orders_orderNumber_key`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_batches` (
    `id` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL,
    `completedQty` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'planned',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `yield_` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `production_batches_batchNumber_key`(`batchNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meter_readings` (
    `id` VARCHAR(191) NOT NULL,
    `readingNumber` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `meterName` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `readingDate` DATETIME(3) NOT NULL,
    `previousValue` DOUBLE NULL,
    `consumption` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `readById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `meter_readings_readingNumber_key`(`readingNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `training_courses` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `durationHours` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `instructor` VARCHAR(191) NULL,
    `maxParticipants` INTEGER NULL,
    `certification` BOOLEAN NOT NULL DEFAULT false,
    `validForMonths` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shift_handovers` (
    `id` VARCHAR(191) NOT NULL,
    `shiftDate` DATETIME(3) NOT NULL,
    `shiftType` VARCHAR(191) NOT NULL,
    `fromShift` VARCHAR(191) NULL,
    `toShift` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `handedOverById` VARCHAR(191) NOT NULL,
    `receivedById` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `tasksSummary` TEXT NOT NULL,
    `pendingIssues` TEXT NOT NULL,
    `safetyNotes` VARCHAR(191) NULL,
    `equipmentStatus` TEXT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `checklists` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `checklist_items` (
    `id` VARCHAR(191) NOT NULL,
    `checklistId` VARCHAR(191) NOT NULL,
    `item` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isRequired` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `checklist_responses` (
    `id` VARCHAR(191) NOT NULL,
    `checklistId` VARCHAR(191) NOT NULL,
    `completedById` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pass',
    `responses` TEXT NOT NULL,
    `notes` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `surveys` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `targetGroup` VARCHAR(191) NULL,
    `questions` TEXT NOT NULL,
    `responses` TEXT NOT NULL,
    `totalResponses` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calibration_records` (
    `id` VARCHAR(191) NOT NULL,
    `calibrationNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `instrumentName` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `calibrationDate` DATETIME(3) NOT NULL,
    `nextDueDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'calibrated',
    `standardUsed` VARCHAR(191) NULL,
    `result` VARCHAR(191) NULL,
    `asFound` TEXT NULL,
    `asLeft` TEXT NULL,
    `uncertainty` DOUBLE NULL,
    `performedById` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `calibration_records_calibrationNumber_key`(`calibrationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_assessments` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `assessmentDate` DATETIME(3) NOT NULL,
    `nextReview` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `likelihood` INTEGER NULL,
    `consequence` INTEGER NULL,
    `riskLevel` VARCHAR(191) NULL,
    `hazards` TEXT NOT NULL,
    `controls` TEXT NOT NULL,
    `residualRisk` VARCHAR(191) NULL,
    `assessorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `risk_assessments_assessmentNumber_key`(`assessmentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loto_records` (
    `id` VARCHAR(191) NOT NULL,
    `lotoNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `workOrderId` VARCHAR(191) NULL,
    `lotoType` VARCHAR(191) NOT NULL DEFAULT 'routine',
    `energySource` VARCHAR(191) NOT NULL,
    `energySourceDesc` VARCHAR(191) NULL,
    `requestedById` VARCHAR(191) NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `scheduledDate` DATETIME(3) NULL,
    `requiredFromDate` DATETIME(3) NULL,
    `requiredToDate` DATETIME(3) NULL,
    `supervisorId` VARCHAR(191) NULL,
    `supervisorApprovedAt` DATETIME(3) NULL,
    `safetyOfficerId` VARCHAR(191) NULL,
    `safetyOfficerApprovedAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelledReason` VARCHAR(191) NULL,
    `isolationPoints` TEXT NOT NULL,
    `lockDevices` TEXT NOT NULL,
    `tagNumbers` TEXT NOT NULL,
    `verifiedBy` TEXT NULL,
    `verificationDate` DATETIME(3) NULL,
    `affectedWorkers` TEXT NULL,
    `workerCount` INTEGER NULL,
    `appliedBy` VARCHAR(191) NULL,
    `removedBy` VARCHAR(191) NULL,
    `removedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loto_records_lotoNumber_key`(`lotoNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_of_materials` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NOT NULL,
    `childAssetId` VARCHAR(191) NOT NULL,
    `partNumber` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL DEFAULT 1,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'each',
    `specification` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `revision` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `bill_of_materials_parentId_childAssetId_key`(`parentId`, `childAssetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `digital_twins` (
    `id` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'other',
    `parameters` TEXT NOT NULL,
    `connections` TEXT NOT NULL,
    `specification` TEXT NULL,
    `healthScore` INTEGER NOT NULL DEFAULT 0,
    `syncInterval` VARCHAR(191) NOT NULL DEFAULT '5min',
    `lastSynced` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `digital_twins_assetId_key`(`assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'direct',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_participants` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReadAt` DATETIME(3) NULL,

    UNIQUE INDEX `conversation_participants_userId_conversationId_key`(`userId`, `conversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roles` TEXT NOT NULL,
    `permissions` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_token_key`(`token`),
    INDEX `sessions_token_idx`(`token`),
    INDEX `sessions_userId_idx`(`userId`),
    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `messageType` VARCHAR(191) NOT NULL DEFAULT 'text',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_messages_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repair_material_requests` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `quantityRequested` DOUBLE NOT NULL,
    `quantityApproved` DOUBLE NOT NULL DEFAULT 0,
    `quantityIssued` DOUBLE NOT NULL DEFAULT 0,
    `quantityReturned` DOUBLE NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'each',
    `unitCost` DOUBLE NULL,
    `estimatedCost` DOUBLE NOT NULL DEFAULT 0,
    `urgency` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `reason` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `supervisorApprovedQuantity` DOUBLE NULL,
    `storekeeperApprovedQuantity` DOUBLE NULL,
    `stockReserved` BOOLEAN NOT NULL DEFAULT false,
    `requestedById` VARCHAR(191) NOT NULL,
    `supervisorApprovedById` VARCHAR(191) NULL,
    `supervisorApprovedAt` DATETIME(3) NULL,
    `storekeeperApprovedById` VARCHAR(191) NULL,
    `storekeeperApprovedAt` DATETIME(3) NULL,
    `issuedById` VARCHAR(191) NULL,
    `issuedAt` DATETIME(3) NULL,
    `returnedById` VARCHAR(191) NULL,
    `returnedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repair_tool_requests` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `toolId` VARCHAR(191) NULL,
    `toolName` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `urgency` VARCHAR(191) NOT NULL DEFAULT 'normal',
    `rejectionReason` VARCHAR(191) NULL,
    `toolConditionAtIssue` VARCHAR(191) NULL,
    `toolConditionAtReturn` VARCHAR(191) NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `supervisorApprovedById` VARCHAR(191) NULL,
    `supervisorApprovedAt` DATETIME(3) NULL,
    `storekeeperApprovedById` VARCHAR(191) NULL,
    `storekeeperApprovedAt` DATETIME(3) NULL,
    `issuedById` VARCHAR(191) NULL,
    `issuedAt` DATETIME(3) NULL,
    `returnedById` VARCHAR(191) NULL,
    `returnedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tool_transfer_requests` (
    `id` VARCHAR(191) NOT NULL,
    `toolId` VARCHAR(191) NOT NULL,
    `fromUserId` VARCHAR(191) NOT NULL,
    `toUserId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `rejectionReason` VARCHAR(191) NULL,
    `toolConditionAtTransfer` VARCHAR(191) NULL,
    `fromUserAcceptedAt` DATETIME(3) NULL,
    `toUserAcceptedAt` DATETIME(3) NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `storekeeperApprovedById` VARCHAR(191) NULL,
    `storekeeperApprovedAt` DATETIME(3) NULL,
    `transferredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wo_downtimes` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NULL,
    `assetName` VARCHAR(191) NOT NULL,
    `downtimeStart` DATETIME(3) NOT NULL,
    `downtimeEnd` DATETIME(3) NULL,
    `durationMinutes` DOUBLE NOT NULL DEFAULT 0,
    `reason` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'unplanned',
    `impactLevel` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `productionLoss` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repair_completions` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `completionNotes` VARCHAR(191) NULL,
    `findings` VARCHAR(191) NULL,
    `rootCause` VARCHAR(191) NULL,
    `correctiveAction` VARCHAR(191) NULL,
    `materialsUsedSummary` TEXT NOT NULL DEFAULT '[]',
    `toolsUsedSummary` TEXT NOT NULL DEFAULT '[]',
    `totalLaborHours` DOUBLE NOT NULL DEFAULT 0,
    `totalMaterialCost` DOUBLE NOT NULL DEFAULT 0,
    `totalToolCost` DOUBLE NOT NULL DEFAULT 0,
    `totalDowntimeMinutes` DOUBLE NOT NULL DEFAULT 0,
    `supervisorReviewNotes` VARCHAR(191) NULL,
    `supervisorApprovedById` VARCHAR(191) NULL,
    `supervisorApprovedAt` DATETIME(3) NULL,
    `supervisorStatus` VARCHAR(191) NOT NULL DEFAULT 'pending_review',
    `reworkReason` VARCHAR(191) NULL,
    `reworkCount` INTEGER NOT NULL DEFAULT 0,
    `plannerClosedById` VARCHAR(191) NULL,
    `plannerClosedAt` DATETIME(3) NULL,
    `plannerStatus` VARCHAR(191) NOT NULL DEFAULT 'pending_closure',
    `closureNotes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `repair_completions_workOrderId_key`(`workOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachments` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(191) NULL,

    INDEX `attachments_entityType_entityId_idx`(`entityType`(100), `entityId`(100)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_modules` ADD CONSTRAINT `company_modules_systemModuleId_fkey` FOREIGN KEY (`systemModuleId`) REFERENCES `system_modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_plantId_fkey` FOREIGN KEY (`plantId`) REFERENCES `plants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_plants` ADD CONSTRAINT `user_plants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_plants` ADD CONSTRAINT `user_plants_plantId_fkey` FOREIGN KEY (`plantId`) REFERENCES `plants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_requestedBy_fkey` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_assignedPlannerId_fkey` FOREIGN KEY (`assignedPlannerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_maintenanceRequestId_fkey` FOREIGN KEY (`maintenanceRequestId`) REFERENCES `maintenance_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_pmScheduleId_fkey` FOREIGN KEY (`pmScheduleId`) REFERENCES `pm_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_teamLeaderId_fkey` FOREIGN KEY (`teamLeaderId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_assignedSupervisorId_fkey` FOREIGN KEY (`assignedSupervisorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_plannerId_fkey` FOREIGN KEY (`plannerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_lockedBy_fkey` FOREIGN KEY (`lockedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_team_members` ADD CONSTRAINT `wo_team_members_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_team_members` ADD CONSTRAINT `wo_team_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_time_logs` ADD CONSTRAINT `wo_time_logs_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_time_logs` ADD CONSTRAINT `wo_time_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_materials` ADD CONSTRAINT `wo_materials_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_materials` ADD CONSTRAINT `wo_materials_requestedBy_fkey` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_materials` ADD CONSTRAINT `wo_materials_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_materials` ADD CONSTRAINT `wo_materials_issuedBy_fkey` FOREIGN KEY (`issuedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_comments` ADD CONSTRAINT `wo_comments_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_comments` ADD CONSTRAINT `wo_comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_categories` ADD CONSTRAINT `asset_categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `asset_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `asset_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_plantId_fkey` FOREIGN KEY (`plantId`) REFERENCES `plants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_plantId_fkey` FOREIGN KEY (`plantId`) REFERENCES `plants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `inventory_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_schedules` ADD CONSTRAINT `pm_schedules_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_schedules` ADD CONSTRAINT `pm_schedules_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_schedules` ADD CONSTRAINT `pm_schedules_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_schedules` ADD CONSTRAINT `pm_schedules_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_schedules` ADD CONSTRAINT `pm_schedules_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `pm_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_templates` ADD CONSTRAINT `pm_templates_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_template_tasks` ADD CONSTRAINT `pm_template_tasks_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `pm_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_triggers` ADD CONSTRAINT `pm_triggers_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `pm_schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_status_history` ADD CONSTRAINT `wo_status_history_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_status_history` ADD CONSTRAINT `wo_status_history_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mr_comments` ADD CONSTRAINT `mr_comments_maintenanceRequestId_fkey` FOREIGN KEY (`maintenanceRequestId`) REFERENCES `maintenance_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mr_comments` ADD CONSTRAINT `mr_comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_skills` ADD CONSTRAINT `user_skills_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_skills` ADD CONSTRAINT `user_skills_tradeId_fkey` FOREIGN KEY (`tradeId`) REFERENCES `trades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_devices` ADD CONSTRAINT `iot_devices_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_devices` ADD CONSTRAINT `iot_devices_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_readings` ADD CONSTRAINT `iot_readings_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iot_devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_alerts` ADD CONSTRAINT `iot_alerts_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iot_devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_alerts` ADD CONSTRAINT `iot_alerts_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `iot_alert_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_alert_rules` ADD CONSTRAINT `iot_alert_rules_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `iot_devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_alert_rules` ADD CONSTRAINT `iot_alert_rules_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tools` ADD CONSTRAINT `tools_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tools` ADD CONSTRAINT `tools_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transactions` ADD CONSTRAINT `tool_transactions_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `tools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transactions` ADD CONSTRAINT `tool_transactions_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transactions` ADD CONSTRAINT `tool_transactions_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transactions` ADD CONSTRAINT `tool_transactions_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_locations` ADD CONSTRAINT `inventory_locations_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_adjustments` ADD CONSTRAINT `inventory_adjustments_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_adjustments` ADD CONSTRAINT `inventory_adjustments_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_adjustments` ADD CONSTRAINT `inventory_adjustments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_requests` ADD CONSTRAINT `inventory_requests_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_requests` ADD CONSTRAINT `inventory_requests_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_request_items` ADD CONSTRAINT `inventory_request_items_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `inventory_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_request_items` ADD CONSTRAINT `inventory_request_items_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_fromLocationId_fkey` FOREIGN KEY (`fromLocationId`) REFERENCES `inventory_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_toLocationId_fkey` FOREIGN KEY (`toLocationId`) REFERENCES `inventory_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transfers` ADD CONSTRAINT `inventory_transfers_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_records` ADD CONSTRAINT `receiving_records_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_records` ADD CONSTRAINT `receiving_records_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiving_records` ADD CONSTRAINT `receiving_records_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_incidents` ADD CONSTRAINT `safety_incidents_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_incidents` ADD CONSTRAINT `safety_incidents_investigatedById_fkey` FOREIGN KEY (`investigatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_permits` ADD CONSTRAINT `safety_permits_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_permits` ADD CONSTRAINT `safety_permits_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_inspections` ADD CONSTRAINT `quality_inspections_inspectedById_fkey` FOREIGN KEY (`inspectedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `non_conformance_reports` ADD CONSTRAINT `non_conformance_reports_raisedById_fkey` FOREIGN KEY (`raisedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_audits` ADD CONSTRAINT `quality_audits_auditedById_fkey` FOREIGN KEY (`auditedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpcProcess` ADD CONSTRAINT `SpcProcess_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_orders` ADD CONSTRAINT `production_orders_workCenterId_fkey` FOREIGN KEY (`workCenterId`) REFERENCES `work_centers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meter_readings` ADD CONSTRAINT `meter_readings_readById_fkey` FOREIGN KEY (`readById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_handovers` ADD CONSTRAINT `shift_handovers_handedOverById_fkey` FOREIGN KEY (`handedOverById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shift_handovers` ADD CONSTRAINT `shift_handovers_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checklist_items` ADD CONSTRAINT `checklist_items_checklistId_fkey` FOREIGN KEY (`checklistId`) REFERENCES `checklists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bill_of_materials` ADD CONSTRAINT `bill_of_materials_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bill_of_materials` ADD CONSTRAINT `bill_of_materials_childAssetId_fkey` FOREIGN KEY (`childAssetId`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `digital_twins` ADD CONSTRAINT `digital_twins_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `digital_twins` ADD CONSTRAINT `digital_twins_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_material_requests` ADD CONSTRAINT `repair_material_requests_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_material_requests` ADD CONSTRAINT `repair_material_requests_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_material_requests` ADD CONSTRAINT `repair_material_requests_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_material_requests` ADD CONSTRAINT `repair_material_requests_supervisorApprovedById_fkey` FOREIGN KEY (`supervisorApprovedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_material_requests` ADD CONSTRAINT `repair_material_requests_storekeeperApprovedById_fkey` FOREIGN KEY (`storekeeperApprovedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_material_requests` ADD CONSTRAINT `repair_material_requests_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_material_requests` ADD CONSTRAINT `repair_material_requests_returnedById_fkey` FOREIGN KEY (`returnedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_tool_requests` ADD CONSTRAINT `repair_tool_requests_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_tool_requests` ADD CONSTRAINT `repair_tool_requests_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `tools`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_tool_requests` ADD CONSTRAINT `repair_tool_requests_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_tool_requests` ADD CONSTRAINT `repair_tool_requests_supervisorApprovedById_fkey` FOREIGN KEY (`supervisorApprovedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_tool_requests` ADD CONSTRAINT `repair_tool_requests_storekeeperApprovedById_fkey` FOREIGN KEY (`storekeeperApprovedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_tool_requests` ADD CONSTRAINT `repair_tool_requests_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_tool_requests` ADD CONSTRAINT `repair_tool_requests_returnedById_fkey` FOREIGN KEY (`returnedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transfer_requests` ADD CONSTRAINT `tool_transfer_requests_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `tools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transfer_requests` ADD CONSTRAINT `tool_transfer_requests_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transfer_requests` ADD CONSTRAINT `tool_transfer_requests_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transfer_requests` ADD CONSTRAINT `tool_transfer_requests_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tool_transfer_requests` ADD CONSTRAINT `tool_transfer_requests_storekeeperApprovedById_fkey` FOREIGN KEY (`storekeeperApprovedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wo_downtimes` ADD CONSTRAINT `wo_downtimes_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_completions` ADD CONSTRAINT `repair_completions_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `work_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_completions` ADD CONSTRAINT `repair_completions_supervisorApprovedById_fkey` FOREIGN KEY (`supervisorApprovedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repair_completions` ADD CONSTRAINT `repair_completions_plannerClosedById_fkey` FOREIGN KEY (`plannerClosedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

