SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `SpcProcess` (
  `id` varchar(191) NOT NULL,
  `processName` varchar(191) NOT NULL,
  `parameter` varchar(191) NOT NULL,
  `unit` varchar(191) NOT NULL DEFAULT '',
  `specMin` double DEFAULT NULL,
  `specMax` double DEFAULT NULL,
  `target` double DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `samples` text NOT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `SpcProcess_createdById_fkey` (`createdById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asset_categories` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `parentId` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_categories_code_key` (`code`),
  KEY `asset_categories_parentId_fkey` (`parentId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `assets` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `assetTag` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `categoryId` varchar(191) NOT NULL,
  `serialNumber` varchar(191) DEFAULT NULL,
  `manufacturer` varchar(191) DEFAULT NULL,
  `model` varchar(191) DEFAULT NULL,
  `yearManufactured` int(11) DEFAULT NULL,
  `condition` varchar(191) NOT NULL DEFAULT 'new',
  `status` varchar(191) NOT NULL DEFAULT 'operational',
  `criticality` varchar(191) NOT NULL DEFAULT 'medium',
  `location` varchar(191) DEFAULT NULL,
  `building` varchar(191) DEFAULT NULL,
  `floor` varchar(191) DEFAULT NULL,
  `area` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) NOT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `purchaseDate` datetime(3) DEFAULT NULL,
  `purchaseCost` double DEFAULT NULL,
  `warrantyExpiry` datetime(3) DEFAULT NULL,
  `installedDate` datetime(3) DEFAULT NULL,
  `expectedLifeYears` int(11) DEFAULT NULL,
  `currentValue` double DEFAULT NULL,
  `depreciationRate` double DEFAULT NULL,
  `imageUrl` varchar(191) DEFAULT NULL,
  `drawingsUrl` varchar(191) DEFAULT NULL,
  `manualUrl` varchar(191) DEFAULT NULL,
  `specification` text NOT NULL,
  `parentId` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `assignedToId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assets_assetTag_key` (`assetTag`),
  UNIQUE KEY `assets_serialNumber_key` (`serialNumber`),
  KEY `assets_categoryId_fkey` (`categoryId`),
  KEY `assets_parentId_fkey` (`parentId`),
  KEY `assets_plantId_fkey` (`plantId`),
  KEY `assets_departmentId_fkey` (`departmentId`),
  KEY `assets_createdById_fkey` (`createdById`),
  KEY `assets_assignedToId_fkey` (`assignedToId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `attachments` (
  `id` varchar(191) NOT NULL,
  `fileName` varchar(191) NOT NULL,
  `fileType` varchar(191) NOT NULL,
  `fileSize` int(11) NOT NULL,
  `filePath` varchar(191) NOT NULL,
  `entityType` varchar(191) NOT NULL,
  `entityId` varchar(191) NOT NULL,
  `uploadedById` varchar(191) NOT NULL,
  `uploadedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `description` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attachments_uploadedById_fkey` (`uploadedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL,
  `entityType` varchar(191) DEFAULT NULL,
  `entityId` varchar(191) DEFAULT NULL,
  `oldValues` text DEFAULT NULL,
  `newValues` text DEFAULT NULL,
  `ipAddress` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_userId_fkey` (`userId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bill_of_materials` (
  `id` varchar(191) NOT NULL,
  `parentId` varchar(191) NOT NULL,
  `childAssetId` varchar(191) NOT NULL,
  `partNumber` varchar(191) DEFAULT NULL,
  `quantity` double NOT NULL DEFAULT 1,
  `unit` varchar(191) NOT NULL DEFAULT 'each',
  `specification` text DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `revision` varchar(191) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `bill_of_materials_parentId_childAssetId_key` (`parentId`,`childAssetId`) USING HASH,
  KEY `bill_of_materials_childAssetId_fkey` (`childAssetId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `calibration_records` (
  `id` varchar(191) NOT NULL,
  `calibrationNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `instrumentName` varchar(191) DEFAULT NULL,
  `serialNumber` varchar(191) DEFAULT NULL,
  `calibrationDate` datetime(3) NOT NULL,
  `nextDueDate` datetime(3) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'calibrated',
  `standardUsed` varchar(191) DEFAULT NULL,
  `result` varchar(191) DEFAULT NULL,
  `asFound` text DEFAULT NULL,
  `asLeft` text DEFAULT NULL,
  `uncertainty` double DEFAULT NULL,
  `performedById` varchar(191) DEFAULT NULL,
  `approvedById` varchar(191) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `calibration_records_calibrationNumber_key` (`calibrationNumber`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_messages` (
  `id` varchar(191) NOT NULL,
  `conversationId` varchar(191) NOT NULL,
  `senderId` varchar(191) NOT NULL,
  `content` varchar(191) NOT NULL,
  `messageType` varchar(191) NOT NULL DEFAULT 'text',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `chat_messages_conversationId_fkey` (`conversationId`),
  KEY `chat_messages_senderId_fkey` (`senderId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `checklist_items` (
  `id` varchar(191) NOT NULL,
  `checklistId` varchar(191) NOT NULL,
  `item` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `isRequired` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `checklist_items_checklistId_fkey` (`checklistId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `checklist_responses` (
  `id` varchar(191) NOT NULL,
  `checklistId` varchar(191) NOT NULL,
  `completedById` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pass',
  `responses` text NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `completedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `checklists` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `frequency` varchar(191) NOT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `company_modules` (
  `id` varchar(191) NOT NULL,
  `systemModuleId` varchar(191) NOT NULL,
  `companyId` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 0,
  `isEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `licensedAt` datetime(3) DEFAULT NULL,
  `licensedBy` varchar(191) DEFAULT NULL,
  `activatedAt` datetime(3) DEFAULT NULL,
  `activatedBy` varchar(191) DEFAULT NULL,
  `activationLocked` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_modules_systemModuleId_companyId_key` (`systemModuleId`,`companyId`) USING HASH
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `company_profile` (
  `id` varchar(191) NOT NULL,
  `companyName` varchar(191) NOT NULL,
  `tradingName` varchar(191) DEFAULT NULL,
  `logo` varchar(191) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `city` varchar(191) DEFAULT NULL,
  `region` varchar(191) DEFAULT NULL,
  `country` varchar(191) DEFAULT NULL,
  `postalCode` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `website` varchar(191) DEFAULT NULL,
  `industry` varchar(191) DEFAULT NULL,
  `employeeCount` varchar(191) DEFAULT NULL,
  `fiscalYearStart` varchar(191) DEFAULT NULL,
  `timezone` varchar(191) NOT NULL DEFAULT 'UTC',
  `currency` varchar(191) NOT NULL DEFAULT 'GHS',
  `dateFormat` varchar(191) NOT NULL DEFAULT 'DD/MM/YYYY',
  `isSetupComplete` tinyint(1) NOT NULL DEFAULT 0,
  `setupCompletedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversation_participants` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `conversationId` varchar(191) NOT NULL,
  `joinedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `lastReadAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conversation_participants_userId_conversationId_key` (`userId`,`conversationId`) USING HASH,
  KEY `conversation_participants_conversationId_fkey` (`conversationId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversations` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'direct',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `corrective_actions` (
  `id` varchar(191) NOT NULL,
  `capaNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `source` varchar(191) NOT NULL,
  `sourceId` varchar(191) DEFAULT NULL,
  `severity` varchar(191) NOT NULL DEFAULT 'medium',
  `status` varchar(191) NOT NULL DEFAULT 'open',
  `rootCause` varchar(191) DEFAULT NULL,
  `correctiveAction` text NOT NULL,
  `preventiveAction` text DEFAULT NULL,
  `responsibleId` varchar(191) DEFAULT NULL,
  `dueDate` datetime(3) DEFAULT NULL,
  `verifiedById` text DEFAULT NULL,
  `verifiedAt` datetime(3) DEFAULT NULL,
  `effectiveness` varchar(191) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `corrective_actions_capaNumber_key` (`capaNumber`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `departments` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `plantId` varchar(191) NOT NULL,
  `parentId` varchar(191) DEFAULT NULL,
  `supervisorId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `departments_plantId_fkey` (`plantId`),
  KEY `departments_parentId_fkey` (`parentId`),
  KEY `departments_supervisorId_fkey` (`supervisorId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `digital_twins` (
  `id` varchar(191) NOT NULL,
  `assetId` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'other',
  `parameters` text NOT NULL,
  `connections` text NOT NULL,
  `specification` text DEFAULT NULL,
  `healthScore` int(11) NOT NULL DEFAULT 0,
  `syncInterval` varchar(191) NOT NULL DEFAULT '5min',
  `lastSynced` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `digital_twins_assetId_key` (`assetId`),
  KEY `digital_twins_createdById_fkey` (`createdById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `escalation_logs` (
  `id` varchar(191) NOT NULL,
  `entityType` varchar(191) NOT NULL,
  `entityId` varchar(191) NOT NULL,
  `level` int(11) NOT NULL,
  `reason` varchar(191) NOT NULL,
  `notifiedUsers` text NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_adjustments` (
  `id` varchar(191) NOT NULL,
  `adjustmentNumber` varchar(191) NOT NULL,
  `itemId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `quantity` double NOT NULL,
  `reason` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `approvedById` varchar(191) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_adjustments_adjustmentNumber_key` (`adjustmentNumber`),
  KEY `inventory_adjustments_itemId_fkey` (`itemId`),
  KEY `inventory_adjustments_approvedById_fkey` (`approvedById`),
  KEY `inventory_adjustments_createdById_fkey` (`createdById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_items` (
  `id` varchar(191) NOT NULL,
  `itemCode` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `category` varchar(191) NOT NULL DEFAULT 'other',
  `unitOfMeasure` varchar(191) NOT NULL DEFAULT 'each',
  `currentStock` double NOT NULL DEFAULT 0,
  `minStockLevel` double NOT NULL DEFAULT 0,
  `maxStockLevel` double DEFAULT NULL,
  `reorderQuantity` double DEFAULT NULL,
  `unitCost` double DEFAULT NULL,
  `supplier` varchar(191) DEFAULT NULL,
  `supplierPartNumber` varchar(191) DEFAULT NULL,
  `location` varchar(191) DEFAULT NULL,
  `binLocation` varchar(191) DEFAULT NULL,
  `shelfLocation` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) NOT NULL,
  `locationId` varchar(191) DEFAULT NULL,
  `supplierId` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `specification` text NOT NULL,
  `imageUrls` text NOT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_items_itemCode_key` (`itemCode`),
  KEY `inventory_items_plantId_fkey` (`plantId`),
  KEY `inventory_items_createdById_fkey` (`createdById`),
  KEY `inventory_items_locationId_fkey` (`locationId`),
  KEY `inventory_items_supplierId_fkey` (`supplierId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_locations` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'warehouse',
  `address` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_locations_code_key` (`code`),
  KEY `inventory_locations_createdById_fkey` (`createdById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_request_items` (
  `id` varchar(191) NOT NULL,
  `requestId` varchar(191) NOT NULL,
  `itemId` varchar(191) NOT NULL,
  `quantityRequested` double NOT NULL,
  `quantityFulfilled` double NOT NULL DEFAULT 0,
  `unitCost` double DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_request_items_requestId_fkey` (`requestId`),
  KEY `inventory_request_items_itemId_fkey` (`itemId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_requests` (
  `id` varchar(191) NOT NULL,
  `requestNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `priority` varchar(191) NOT NULL DEFAULT 'medium',
  `requestedById` varchar(191) NOT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `approvedById` varchar(191) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_requests_requestNumber_key` (`requestNumber`),
  KEY `inventory_requests_requestedById_fkey` (`requestedById`),
  KEY `inventory_requests_approvedById_fkey` (`approvedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_transfers` (
  `id` varchar(191) NOT NULL,
  `transferNumber` varchar(191) NOT NULL,
  `itemId` varchar(191) NOT NULL,
  `fromLocationId` varchar(191) DEFAULT NULL,
  `toLocationId` varchar(191) DEFAULT NULL,
  `quantity` double NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `requestedById` varchar(191) NOT NULL,
  `approvedById` varchar(191) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_transfers_transferNumber_key` (`transferNumber`),
  KEY `inventory_transfers_itemId_fkey` (`itemId`),
  KEY `inventory_transfers_fromLocationId_fkey` (`fromLocationId`),
  KEY `inventory_transfers_toLocationId_fkey` (`toLocationId`),
  KEY `inventory_transfers_requestedById_fkey` (`requestedById`),
  KEY `inventory_transfers_approvedById_fkey` (`approvedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `iot_alert_rules` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `deviceId` varchar(191) NOT NULL,
  `parameter` varchar(191) NOT NULL,
  `operator` varchar(191) NOT NULL,
  `threshold` double NOT NULL,
  `severity` varchar(191) NOT NULL DEFAULT 'warning',
  `cooldownMinutes` int(11) NOT NULL DEFAULT 5,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `iot_alert_rules_deviceId_fkey` (`deviceId`),
  KEY `iot_alert_rules_createdById_fkey` (`createdById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `iot_alerts` (
  `id` varchar(191) NOT NULL,
  `deviceId` varchar(191) NOT NULL,
  `ruleId` varchar(191) DEFAULT NULL,
  `severity` varchar(191) NOT NULL,
  `message` varchar(191) NOT NULL,
  `value` double DEFAULT NULL,
  `threshold` double DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `acknowledgedBy` varchar(191) DEFAULT NULL,
  `acknowledgedAt` datetime(3) DEFAULT NULL,
  `resolvedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `iot_alerts_deviceId_fkey` (`deviceId`),
  KEY `iot_alerts_ruleId_fkey` (`ruleId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `iot_devices` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `deviceCode` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `protocol` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'online',
  `location` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `groupId` varchar(191) DEFAULT NULL,
  `parameter` varchar(191) NOT NULL,
  `unit` varchar(191) NOT NULL,
  `thresholdMin` double DEFAULT NULL,
  `thresholdMax` double DEFAULT NULL,
  `lastReading` double DEFAULT NULL,
  `lastSeen` datetime(3) DEFAULT NULL,
  `batteryLevel` int(11) DEFAULT NULL,
  `signalStrength` int(11) DEFAULT NULL,
  `firmwareVersion` varchar(191) DEFAULT NULL,
  `pollingInterval` int(11) DEFAULT NULL,
  `description` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `iot_devices_deviceCode_key` (`deviceCode`),
  KEY `iot_devices_assetId_fkey` (`assetId`),
  KEY `iot_devices_createdById_fkey` (`createdById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `iot_readings` (
  `id` varchar(191) NOT NULL,
  `deviceId` varchar(191) NOT NULL,
  `value` double NOT NULL,
  `unit` varchar(191) NOT NULL,
  `timestamp` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `isAnomaly` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `iot_readings_deviceId_fkey` (`deviceId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loto_records` (
  `id` varchar(191) NOT NULL,
  `lotoNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `workOrderId` varchar(191) DEFAULT NULL,
  `lotoType` varchar(191) NOT NULL DEFAULT 'routine',
  `energySource` varchar(191) NOT NULL,
  `energySourceDesc` varchar(191) DEFAULT NULL,
  `requestedById` varchar(191) DEFAULT NULL,
  `requestDate` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `scheduledDate` datetime(3) DEFAULT NULL,
  `requiredFromDate` datetime(3) DEFAULT NULL,
  `requiredToDate` datetime(3) DEFAULT NULL,
  `supervisorId` varchar(191) DEFAULT NULL,
  `supervisorApprovedAt` datetime(3) DEFAULT NULL,
  `safetyOfficerId` varchar(191) DEFAULT NULL,
  `safetyOfficerApprovedAt` datetime(3) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `startedAt` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `cancelledAt` datetime(3) DEFAULT NULL,
  `cancelledReason` varchar(191) DEFAULT NULL,
  `isolationPoints` text NOT NULL,
  `lockDevices` text NOT NULL,
  `tagNumbers` text NOT NULL,
  `verifiedBy` text DEFAULT NULL,
  `verificationDate` datetime(3) DEFAULT NULL,
  `affectedWorkers` text DEFAULT NULL,
  `workerCount` int(11) DEFAULT NULL,
  `appliedBy` varchar(191) DEFAULT NULL,
  `removedBy` varchar(191) DEFAULT NULL,
  `removedAt` datetime(3) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loto_records_lotoNumber_key` (`lotoNumber`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `maintenance_requests` (
  `id` varchar(191) NOT NULL,
  `requestNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `priority` varchar(191) NOT NULL DEFAULT 'medium',
  `category` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `workflowStatus` varchar(191) NOT NULL DEFAULT 'pending',
  `machineDownStatus` tinyint(1) DEFAULT 0,
  `assetId` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `requestedBy` varchar(191) NOT NULL,
  `supervisorId` varchar(191) DEFAULT NULL,
  `approvedBy` varchar(191) DEFAULT NULL,
  `assignedPlannerId` varchar(191) DEFAULT NULL,
  `workOrderId` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `plannedStart` datetime(3) DEFAULT NULL,
  `plannedEnd` datetime(3) DEFAULT NULL,
  `estimatedHours` double DEFAULT NULL,
  `slaHours` double DEFAULT NULL,
  `escalationLevel` int(11) NOT NULL DEFAULT 0,
  `lastEscalatedAt` datetime(3) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `maintenance_requests_requestNumber_key` (`requestNumber`),
  UNIQUE KEY `maintenance_requests_workOrderId_key` (`workOrderId`),
  KEY `maintenance_requests_assetId_fkey` (`assetId`),
  KEY `maintenance_requests_requestedBy_fkey` (`requestedBy`),
  KEY `maintenance_requests_supervisorId_fkey` (`supervisorId`),
  KEY `maintenance_requests_approvedBy_fkey` (`approvedBy`),
  KEY `maintenance_requests_assignedPlannerId_fkey` (`assignedPlannerId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `meter_readings` (
  `id` varchar(191) NOT NULL,
  `readingNumber` varchar(191) NOT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `meterName` varchar(191) NOT NULL,
  `value` double NOT NULL,
  `unit` varchar(191) NOT NULL,
  `readingDate` datetime(3) NOT NULL,
  `previousValue` double DEFAULT NULL,
  `consumption` double DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `readById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `meter_readings_readingNumber_key` (`readingNumber`),
  KEY `meter_readings_readById_fkey` (`readById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mr_comments` (
  `id` varchar(191) NOT NULL,
  `maintenanceRequestId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `content` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `mr_comments_maintenanceRequestId_fkey` (`maintenanceRequestId`),
  KEY `mr_comments_userId_fkey` (`userId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `non_conformance_reports` (
  `id` varchar(191) NOT NULL,
  `ncrNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `severity` varchar(191) NOT NULL DEFAULT 'minor',
  `status` varchar(191) NOT NULL DEFAULT 'open',
  `type` varchar(191) NOT NULL,
  `sourceInspectionId` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `itemId` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `raisedById` varchar(191) NOT NULL,
  `rootCause` varchar(191) DEFAULT NULL,
  `correctiveAction` text DEFAULT NULL,
  `dueDate` datetime(3) DEFAULT NULL,
  `completedDate` datetime(3) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `non_conformance_reports_ncrNumber_key` (`ncrNumber`),
  KEY `non_conformance_reports_raisedById_fkey` (`raisedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `message` varchar(191) NOT NULL,
  `entityType` varchar(191) DEFAULT NULL,
  `entityId` varchar(191) DEFAULT NULL,
  `actionUrl` varchar(191) DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `notifications_userId_fkey` (`userId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
  `id` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `module` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_slug_key` (`slug`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `plants` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `location` varchar(191) DEFAULT NULL,
  `country` varchar(191) DEFAULT NULL,
  `city` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plants_code_key` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pm_schedules` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) NOT NULL,
  `frequencyType` varchar(191) NOT NULL,
  `frequencyValue` int(11) NOT NULL,
  `lastCompletedDate` datetime(3) DEFAULT NULL,
  `nextDueDate` datetime(3) DEFAULT NULL,
  `estimatedDuration` double NOT NULL,
  `priority` varchar(191) NOT NULL DEFAULT 'medium',
  `assignedToId` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `autoGenerateWO` tinyint(1) NOT NULL DEFAULT 1,
  `leadDays` int(11) NOT NULL DEFAULT 3,
  `woTypeId` varchar(191) DEFAULT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `templateId` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_schedules_assetId_fkey` (`assetId`),
  KEY `pm_schedules_assignedToId_fkey` (`assignedToId`),
  KEY `pm_schedules_departmentId_fkey` (`departmentId`),
  KEY `pm_schedules_createdById_fkey` (`createdById`),
  KEY `pm_schedules_templateId_fkey` (`templateId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pm_template_tasks` (
  `id` varchar(191) NOT NULL,
  `templateId` varchar(191) NOT NULL,
  `taskNumber` int(11) NOT NULL,
  `description` varchar(191) NOT NULL,
  `taskType` varchar(191) NOT NULL DEFAULT 'check',
  `requiredParts` text DEFAULT NULL,
  `estimatedMinutes` int(11) DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `pm_template_tasks_templateId_fkey` (`templateId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pm_templates` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'preventive',
  `category` varchar(191) DEFAULT NULL,
  `estimatedDuration` double NOT NULL,
  `priority` varchar(191) NOT NULL DEFAULT 'medium',
  `requiredSkills` text DEFAULT NULL,
  `requiredTools` text DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pm_templates_createdById_fkey` (`createdById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pm_triggers` (
  `id` varchar(191) NOT NULL,
  `scheduleId` varchar(191) NOT NULL,
  `triggerType` varchar(191) NOT NULL,
  `triggerValue` double NOT NULL,
  `triggerConfig` text DEFAULT NULL,
  `lastTriggeredAt` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_triggers_scheduleId_key` (`scheduleId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `production_batches` (
  `id` varchar(191) NOT NULL,
  `batchNumber` varchar(191) NOT NULL,
  `orderId` varchar(191) DEFAULT NULL,
  `productId` varchar(191) DEFAULT NULL,
  `productName` varchar(191) DEFAULT NULL,
  `quantity` double NOT NULL,
  `completedQty` double NOT NULL DEFAULT 0,
  `status` varchar(191) NOT NULL DEFAULT 'planned',
  `startDate` datetime(3) DEFAULT NULL,
  `endDate` datetime(3) DEFAULT NULL,
  `yield_` double DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `production_batches_batchNumber_key` (`batchNumber`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `production_orders` (
  `id` varchar(191) NOT NULL,
  `orderNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'planned',
  `priority` varchar(191) NOT NULL DEFAULT 'medium',
  `productId` varchar(191) DEFAULT NULL,
  `productName` varchar(191) DEFAULT NULL,
  `quantity` double NOT NULL,
  `completedQty` double NOT NULL DEFAULT 0,
  `unitCost` double DEFAULT NULL,
  `workCenterId` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `scheduledStart` datetime(3) DEFAULT NULL,
  `scheduledEnd` datetime(3) DEFAULT NULL,
  `actualStart` datetime(3) DEFAULT NULL,
  `actualEnd` datetime(3) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `production_orders_orderNumber_key` (`orderNumber`),
  KEY `production_orders_workCenterId_fkey` (`workCenterId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `purchase_order_items` (
  `id` varchar(191) NOT NULL,
  `poId` varchar(191) NOT NULL,
  `itemId` varchar(191) NOT NULL,
  `quantity` double NOT NULL,
  `unitCost` double NOT NULL,
  `totalCost` double NOT NULL,
  `quantityReceived` double NOT NULL DEFAULT 0,
  `description` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_order_items_poId_fkey` (`poId`),
  KEY `purchase_order_items_itemId_fkey` (`itemId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `purchase_orders` (
  `id` varchar(191) NOT NULL,
  `poNumber` varchar(191) NOT NULL,
  `supplierId` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'draft',
  `priority` varchar(191) NOT NULL DEFAULT 'medium',
  `expectedDelivery` datetime(3) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `totalAmount` double NOT NULL DEFAULT 0,
  `createdById` varchar(191) NOT NULL,
  `approvedById` varchar(191) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_orders_poNumber_key` (`poNumber`),
  KEY `purchase_orders_supplierId_fkey` (`supplierId`),
  KEY `purchase_orders_createdById_fkey` (`createdById`),
  KEY `purchase_orders_approvedById_fkey` (`approvedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quality_audits` (
  `id` varchar(191) NOT NULL,
  `auditNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'planned',
  `scheduledDate` datetime(3) NOT NULL,
  `completedDate` datetime(3) DEFAULT NULL,
  `auditedById` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `scope` varchar(191) DEFAULT NULL,
  `findings` text NOT NULL,
  `score` int(11) DEFAULT NULL,
  `maxScore` int(11) DEFAULT NULL,
  `recommendation` varchar(191) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quality_audits_auditNumber_key` (`auditNumber`),
  KEY `quality_audits_auditedById_fkey` (`auditedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quality_control_plans` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `itemId` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `frequency` varchar(191) NOT NULL,
  `characteristics` text NOT NULL,
  `sampleSize` int(11) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quality_inspections` (
  `id` varchar(191) NOT NULL,
  `inspectionNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `orderId` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `itemId` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `inspectedById` varchar(191) NOT NULL,
  `scheduledDate` datetime(3) DEFAULT NULL,
  `completedDate` datetime(3) DEFAULT NULL,
  `result` varchar(191) DEFAULT NULL,
  `defects` text NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quality_inspections_inspectionNumber_key` (`inspectionNumber`),
  KEY `quality_inspections_inspectedById_fkey` (`inspectedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `receiving_records` (
  `id` varchar(191) NOT NULL,
  `poId` varchar(191) NOT NULL,
  `itemId` varchar(191) NOT NULL,
  `quantityReceived` double NOT NULL,
  `condition` varchar(191) NOT NULL DEFAULT 'good',
  `receivedById` varchar(191) NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `receiving_records_poId_fkey` (`poId`),
  KEY `receiving_records_itemId_fkey` (`itemId`),
  KEY `receiving_records_receivedById_fkey` (`receivedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `repair_completions` (
  `id` varchar(191) NOT NULL,
  `workOrderId` varchar(191) NOT NULL,
  `completionNotes` varchar(191) DEFAULT NULL,
  `findings` text DEFAULT NULL,
  `rootCause` varchar(191) DEFAULT NULL,
  `correctiveAction` text DEFAULT NULL,
  `materialsUsedSummary` text NOT NULL DEFAULT '[]',
  `toolsUsedSummary` text NOT NULL DEFAULT '[]',
  `totalLaborHours` double NOT NULL DEFAULT 0,
  `totalMaterialCost` double NOT NULL DEFAULT 0,
  `totalToolCost` double NOT NULL DEFAULT 0,
  `totalDowntimeMinutes` double NOT NULL DEFAULT 0,
  `supervisorReviewNotes` varchar(191) DEFAULT NULL,
  `supervisorApprovedById` varchar(191) DEFAULT NULL,
  `supervisorApprovedAt` datetime(3) DEFAULT NULL,
  `supervisorStatus` varchar(191) NOT NULL DEFAULT 'pending_review',
  `reworkReason` varchar(191) DEFAULT NULL,
  `reworkCount` int(11) NOT NULL DEFAULT 0,
  `plannerClosedById` varchar(191) DEFAULT NULL,
  `plannerClosedAt` datetime(3) DEFAULT NULL,
  `plannerStatus` varchar(191) NOT NULL DEFAULT 'pending_closure',
  `closureNotes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `repair_completions_workOrderId_key` (`workOrderId`),
  KEY `repair_completions_supervisorApprovedById_fkey` (`supervisorApprovedById`),
  KEY `repair_completions_plannerClosedById_fkey` (`plannerClosedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `repair_material_requests` (
  `id` varchar(191) NOT NULL,
  `workOrderId` varchar(191) NOT NULL,
  `itemId` varchar(191) DEFAULT NULL,
  `itemName` varchar(191) NOT NULL,
  `quantityRequested` double NOT NULL,
  `quantityApproved` double NOT NULL DEFAULT 0,
  `quantityIssued` double NOT NULL DEFAULT 0,
  `quantityReturned` double NOT NULL DEFAULT 0,
  `unit` varchar(191) NOT NULL DEFAULT 'each',
  `unitCost` double DEFAULT NULL,
  `estimatedCost` double NOT NULL DEFAULT 0,
  `urgency` varchar(191) NOT NULL DEFAULT 'normal',
  `reason` varchar(191) NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `supervisorApprovedQuantity` double DEFAULT NULL,
  `storekeeperApprovedQuantity` double DEFAULT NULL,
  `stockReserved` tinyint(1) NOT NULL DEFAULT 0,
  `requestedById` varchar(191) NOT NULL,
  `supervisorApprovedById` varchar(191) DEFAULT NULL,
  `supervisorApprovedAt` datetime(3) DEFAULT NULL,
  `storekeeperApprovedById` varchar(191) DEFAULT NULL,
  `storekeeperApprovedAt` datetime(3) DEFAULT NULL,
  `issuedById` varchar(191) DEFAULT NULL,
  `issuedAt` datetime(3) DEFAULT NULL,
  `returnedById` varchar(191) DEFAULT NULL,
  `returnedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `repair_material_requests_workOrderId_fkey` (`workOrderId`),
  KEY `repair_material_requests_itemId_fkey` (`itemId`),
  KEY `repair_material_requests_requestedById_fkey` (`requestedById`),
  KEY `repair_material_requests_supervisorApprovedById_fkey` (`supervisorApprovedById`),
  KEY `repair_material_requests_storekeeperApprovedById_fkey` (`storekeeperApprovedById`),
  KEY `repair_material_requests_issuedById_fkey` (`issuedById`),
  KEY `repair_material_requests_returnedById_fkey` (`returnedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `repair_tool_requests` (
  `id` varchar(191) NOT NULL,
  `workOrderId` varchar(191) NOT NULL,
  `toolId` varchar(191) DEFAULT NULL,
  `toolName` varchar(191) NOT NULL,
  `reason` varchar(191) NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `urgency` varchar(191) NOT NULL DEFAULT 'normal',
  `rejectionReason` varchar(191) DEFAULT NULL,
  `toolConditionAtIssue` varchar(191) DEFAULT NULL,
  `toolConditionAtReturn` varchar(191) DEFAULT NULL,
  `requestedById` varchar(191) NOT NULL,
  `supervisorApprovedById` varchar(191) DEFAULT NULL,
  `supervisorApprovedAt` datetime(3) DEFAULT NULL,
  `storekeeperApprovedById` varchar(191) DEFAULT NULL,
  `storekeeperApprovedAt` datetime(3) DEFAULT NULL,
  `issuedById` varchar(191) DEFAULT NULL,
  `issuedAt` datetime(3) DEFAULT NULL,
  `returnedById` varchar(191) DEFAULT NULL,
  `returnedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `repair_tool_requests_workOrderId_fkey` (`workOrderId`),
  KEY `repair_tool_requests_toolId_fkey` (`toolId`),
  KEY `repair_tool_requests_requestedById_fkey` (`requestedById`),
  KEY `repair_tool_requests_supervisorApprovedById_fkey` (`supervisorApprovedById`),
  KEY `repair_tool_requests_storekeeperApprovedById_fkey` (`storekeeperApprovedById`),
  KEY `repair_tool_requests_issuedById_fkey` (`issuedById`),
  KEY `repair_tool_requests_returnedById_fkey` (`returnedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `risk_assessments` (
  `id` varchar(191) NOT NULL,
  `assessmentNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `assessmentDate` datetime(3) NOT NULL,
  `nextReview` datetime(3) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'open',
  `likelihood` int(11) DEFAULT NULL,
  `consequence` int(11) DEFAULT NULL,
  `riskLevel` varchar(191) DEFAULT NULL,
  `hazards` text NOT NULL,
  `controls` text NOT NULL,
  `residualRisk` varchar(191) DEFAULT NULL,
  `assessorId` varchar(191) DEFAULT NULL,
  `reviewerId` varchar(191) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `risk_assessments_assessmentNumber_key` (`assessmentNumber`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `id` varchar(191) NOT NULL,
  `roleId` varchar(191) NOT NULL,
  `permissionId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_roleId_permissionId_key` (`roleId`,`permissionId`) USING HASH,
  KEY `role_permissions_permissionId_fkey` (`permissionId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `level` int(11) NOT NULL DEFAULT 0,
  `isSystem` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_slug_key` (`slug`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `safety_equipment` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'available',
  `location` varchar(191) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `expiryDate` datetime(3) DEFAULT NULL,
  `lastInspected` datetime(3) DEFAULT NULL,
  `nextInspection` datetime(3) DEFAULT NULL,
  `condition` varchar(191) NOT NULL DEFAULT 'good',
  `notes` varchar(191) DEFAULT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `safety_equipment_code_key` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `safety_incidents` (
  `id` varchar(191) NOT NULL,
  `incidentNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `severity` varchar(191) NOT NULL DEFAULT 'medium',
  `status` varchar(191) NOT NULL DEFAULT 'open',
  `incidentDate` datetime(3) NOT NULL,
  `location` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `reportedById` varchar(191) NOT NULL,
  `investigatedById` varchar(191) DEFAULT NULL,
  `rootCause` varchar(191) DEFAULT NULL,
  `correctiveAction` text DEFAULT NULL,
  `daysLost` int(11) NOT NULL DEFAULT 0,
  `cost` double DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `escalationLevel` int(11) NOT NULL DEFAULT 0,
  `lastEscalatedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `safety_incidents_incidentNumber_key` (`incidentNumber`),
  KEY `safety_incidents_reportedById_fkey` (`reportedById`),
  KEY `safety_incidents_investigatedById_fkey` (`investigatedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `safety_inspections` (
  `id` varchar(191) NOT NULL,
  `inspectionNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'scheduled',
  `scheduledDate` datetime(3) NOT NULL,
  `completedDate` datetime(3) DEFAULT NULL,
  `location` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `inspectorId` varchar(191) DEFAULT NULL,
  `findings` text NOT NULL,
  `score` int(11) DEFAULT NULL,
  `maxScore` int(11) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `safety_inspections_inspectionNumber_key` (`inspectionNumber`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `safety_permits` (
  `id` varchar(191) NOT NULL,
  `permitNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `description` varchar(191) DEFAULT NULL,
  `location` varchar(191) DEFAULT NULL,
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) NOT NULL,
  `requestedById` varchar(191) NOT NULL,
  `approvedById` varchar(191) DEFAULT NULL,
  `approvedAt` datetime(3) DEFAULT NULL,
  `hazardAssessment` varchar(191) DEFAULT NULL,
  `precautions` text NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `safety_permits_permitNumber_key` (`permitNumber`),
  KEY `safety_permits_requestedById_fkey` (`requestedById`),
  KEY `safety_permits_approvedById_fkey` (`approvedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `safety_training` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'planned',
  `trainer` varchar(191) DEFAULT NULL,
  `scheduledDate` datetime(3) DEFAULT NULL,
  `completedDate` datetime(3) DEFAULT NULL,
  `location` varchar(191) DEFAULT NULL,
  `attendees` text NOT NULL,
  `durationHours` double DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id` varchar(191) NOT NULL,
  `token` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `roles` text NOT NULL,
  `permissions` text NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `lastSeen` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_token_key` (`token`),
  KEY `sessions_userId_fkey` (`userId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `shift_handovers` (
  `id` varchar(191) NOT NULL,
  `shiftDate` datetime(3) NOT NULL,
  `shiftType` varchar(191) NOT NULL,
  `fromShift` varchar(191) DEFAULT NULL,
  `toShift` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `handedOverById` varchar(191) NOT NULL,
  `receivedById` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `tasksSummary` text NOT NULL,
  `pendingIssues` text NOT NULL,
  `safetyNotes` varchar(191) DEFAULT NULL,
  `equipmentStatus` text DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `shift_handovers_handedOverById_fkey` (`handedOverById`),
  KEY `shift_handovers_receivedById_fkey` (`receivedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `status_transitions` (
  `id` varchar(191) NOT NULL,
  `entityType` varchar(191) NOT NULL,
  `fromStatus` varchar(191) DEFAULT NULL,
  `toStatus` varchar(191) NOT NULL,
  `allowedRoleSlugs` text NOT NULL,
  `requiresApproval` tinyint(1) NOT NULL DEFAULT 0,
  `requiresReason` tinyint(1) NOT NULL DEFAULT 0,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stock_movements` (
  `id` varchar(191) NOT NULL,
  `itemId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `quantity` double NOT NULL,
  `previousStock` double NOT NULL,
  `newStock` double NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `referenceType` varchar(191) DEFAULT NULL,
  `referenceId` varchar(191) DEFAULT NULL,
  `performedById` varchar(191) NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `stock_movements_itemId_fkey` (`itemId`),
  KEY `stock_movements_performedById_fkey` (`performedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `suppliers` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `contactPerson` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `city` varchar(191) DEFAULT NULL,
  `country` varchar(191) DEFAULT NULL,
  `website` varchar(191) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `suppliers_code_key` (`code`),
  KEY `suppliers_createdById_fkey` (`createdById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `surveys` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `targetGroup` varchar(191) DEFAULT NULL,
  `questions` text NOT NULL,
  `responses` text NOT NULL,
  `totalResponses` int(11) NOT NULL DEFAULT 0,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_modules` (
  `id` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `version` varchar(191) NOT NULL DEFAULT '1.0.0',
  `isCore` tinyint(1) NOT NULL DEFAULT 0,
  `isSystemLicensed` tinyint(1) NOT NULL DEFAULT 0,
  `licenseKey` varchar(191) DEFAULT NULL,
  `validFrom` datetime(3) DEFAULT NULL,
  `validUntil` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_modules_code_key` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tool_transactions` (
  `id` varchar(191) NOT NULL,
  `toolId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `fromUserId` varchar(191) DEFAULT NULL,
  `toUserId` varchar(191) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `performedById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `tool_transactions_toolId_fkey` (`toolId`),
  KEY `tool_transactions_performedById_fkey` (`performedById`),
  KEY `tool_transactions_fromUserId_fkey` (`fromUserId`),
  KEY `tool_transactions_toUserId_fkey` (`toUserId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tool_transfer_requests` (
  `id` varchar(191) NOT NULL,
  `toolId` varchar(191) NOT NULL,
  `fromUserId` varchar(191) NOT NULL,
  `toUserId` varchar(191) NOT NULL,
  `reason` varchar(191) NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'pending',
  `rejectionReason` varchar(191) DEFAULT NULL,
  `toolConditionAtTransfer` varchar(191) DEFAULT NULL,
  `fromUserAcceptedAt` datetime(3) DEFAULT NULL,
  `toUserAcceptedAt` datetime(3) DEFAULT NULL,
  `requestedById` varchar(191) NOT NULL,
  `storekeeperApprovedById` varchar(191) DEFAULT NULL,
  `storekeeperApprovedAt` datetime(3) DEFAULT NULL,
  `transferredAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tool_transfer_requests_toolId_fkey` (`toolId`),
  KEY `tool_transfer_requests_fromUserId_fkey` (`fromUserId`),
  KEY `tool_transfer_requests_toUserId_fkey` (`toUserId`),
  KEY `tool_transfer_requests_requestedById_fkey` (`requestedById`),
  KEY `tool_transfer_requests_storekeeperApprovedById_fkey` (`storekeeperApprovedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tools` (
  `id` varchar(191) NOT NULL,
  `toolCode` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `category` varchar(191) NOT NULL,
  `serialNumber` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'available',
  `condition` varchar(191) NOT NULL DEFAULT 'good',
  `location` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `purchaseDate` datetime(3) DEFAULT NULL,
  `purchaseCost` double DEFAULT NULL,
  `currentValue` double DEFAULT NULL,
  `manufacturer` varchar(191) DEFAULT NULL,
  `model` varchar(191) DEFAULT NULL,
  `assignedToId` varchar(191) DEFAULT NULL,
  `checkedOutAt` datetime(3) DEFAULT NULL,
  `expectedReturn` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tools_toolCode_key` (`toolCode`),
  UNIQUE KEY `tools_serialNumber_key` (`serialNumber`),
  KEY `tools_assignedToId_fkey` (`assignedToId`),
  KEY `tools_createdById_fkey` (`createdById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trades` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `category` varchar(191) DEFAULT NULL,
  `description` varchar(191) DEFAULT NULL,
  `color` varchar(191) NOT NULL DEFAULT '#6b7280',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trades_name_key` (`name`),
  UNIQUE KEY `trades_code_key` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `training_courses` (
  `id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `category` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `durationHours` double NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `instructor` varchar(191) DEFAULT NULL,
  `maxParticipants` int(11) DEFAULT NULL,
  `certification` tinyint(1) NOT NULL DEFAULT 0,
  `validForMonths` int(11) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_permissions` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `permissionId` varchar(191) NOT NULL,
  `isGranted` tinyint(1) NOT NULL DEFAULT 1,
  `expiresAt` datetime(3) DEFAULT NULL,
  `grantedBy` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_permissions_userId_permissionId_key` (`userId`,`permissionId`) USING HASH,
  KEY `user_permissions_permissionId_fkey` (`permissionId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_plants` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `plantId` varchar(191) NOT NULL,
  `accessLevel` varchar(191) NOT NULL DEFAULT 'read',
  `isPrimary` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_plants_userId_plantId_key` (`userId`,`plantId`) USING HASH,
  KEY `user_plants_plantId_fkey` (`plantId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `roleId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_userId_roleId_key` (`userId`,`roleId`) USING HASH,
  KEY `user_roles_roleId_fkey` (`roleId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_skills` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `tradeId` varchar(191) NOT NULL,
  `proficiencyLevel` varchar(191) NOT NULL DEFAULT 'intermediate',
  `yearsExperience` int(11) DEFAULT NULL,
  `certified` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_skills_userId_tradeId_key` (`userId`,`tradeId`) USING HASH,
  KEY `user_skills_tradeId_fkey` (`tradeId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` varchar(191) NOT NULL,
  `username` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `passwordHash` varchar(191) NOT NULL,
  `fullName` varchar(191) NOT NULL,
  `staffId` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `avatar` varchar(191) DEFAULT NULL,
  `department` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `isVendorAdmin` tinyint(1) NOT NULL DEFAULT 0,
  `resetToken` varchar(191) DEFAULT NULL,
  `resetTokenExpires` datetime(3) DEFAULT NULL,
  `notificationPreferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`notificationPreferences`)),
  `preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`preferences`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `primaryTrade` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  UNIQUE KEY `users_email_key` (`email`),
  UNIQUE KEY `users_staffId_key` (`staffId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wo_comments` (
  `id` varchar(191) NOT NULL,
  `workOrderId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `content` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `wo_comments_workOrderId_fkey` (`workOrderId`),
  KEY `wo_comments_userId_fkey` (`userId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wo_downtimes` (
  `id` varchar(191) NOT NULL,
  `workOrderId` varchar(191) NOT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `assetName` varchar(191) NOT NULL,
  `downtimeStart` datetime(3) NOT NULL,
  `downtimeEnd` datetime(3) DEFAULT NULL,
  `durationMinutes` double NOT NULL DEFAULT 0,
  `reason` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL DEFAULT 'unplanned',
  `impactLevel` varchar(191) NOT NULL DEFAULT 'medium',
  `productionLoss` double DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `wo_downtimes_workOrderId_fkey` (`workOrderId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wo_materials` (
  `id` varchar(191) NOT NULL,
  `workOrderId` varchar(191) NOT NULL,
  `itemId` varchar(191) DEFAULT NULL,
  `itemName` varchar(191) DEFAULT NULL,
  `quantity` double DEFAULT NULL,
  `unitCost` double DEFAULT NULL,
  `totalCost` double DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'requested',
  `requestedBy` varchar(191) DEFAULT NULL,
  `approvedBy` varchar(191) DEFAULT NULL,
  `issuedBy` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `wo_materials_workOrderId_fkey` (`workOrderId`),
  KEY `wo_materials_requestedBy_fkey` (`requestedBy`),
  KEY `wo_materials_approvedBy_fkey` (`approvedBy`),
  KEY `wo_materials_issuedBy_fkey` (`issuedBy`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wo_status_history` (
  `id` varchar(191) NOT NULL,
  `workOrderId` varchar(191) NOT NULL,
  `fromStatus` varchar(191) DEFAULT NULL,
  `toStatus` varchar(191) NOT NULL,
  `performedById` varchar(191) NOT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `wo_status_history_workOrderId_fkey` (`workOrderId`),
  KEY `wo_status_history_performedById_fkey` (`performedById`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wo_team_members` (
  `id` varchar(191) NOT NULL,
  `workOrderId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL DEFAULT 'assistant',
  `accessLevel` varchar(191) NOT NULL DEFAULT 'full',
  `assignedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `wo_team_members_workOrderId_fkey` (`workOrderId`),
  KEY `wo_team_members_userId_fkey` (`userId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wo_time_logs` (
  `id` varchar(191) NOT NULL,
  `workOrderId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL,
  `duration` double DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `timestamp` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `wo_time_logs_workOrderId_fkey` (`workOrderId`),
  KEY `wo_time_logs_userId_fkey` (`userId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `work_centers` (
  `id` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'active',
  `location` varchar(191) DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `capacityUnit` varchar(191) NOT NULL DEFAULT 'units/hour',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdById` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_centers_code_key` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `work_orders` (
  `id` varchar(191) NOT NULL,
  `woNumber` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'corrective',
  `priority` varchar(191) NOT NULL DEFAULT 'medium',
  `status` varchar(191) NOT NULL DEFAULT 'draft',
  `maintenanceRequestId` varchar(191) DEFAULT NULL,
  `pmScheduleId` varchar(191) DEFAULT NULL,
  `assetId` varchar(191) DEFAULT NULL,
  `assetName` varchar(191) DEFAULT NULL,
  `departmentId` varchar(191) DEFAULT NULL,
  `assignedTo` varchar(191) DEFAULT NULL,
  `teamLeaderId` varchar(191) DEFAULT NULL,
  `assignedSupervisorId` varchar(191) DEFAULT NULL,
  `assignedBy` varchar(191) DEFAULT NULL,
  `assignmentType` varchar(191) DEFAULT NULL,
  `plannerId` varchar(191) DEFAULT NULL,
  `estimatedHours` double DEFAULT NULL,
  `actualHours` double DEFAULT NULL,
  `plannedStart` datetime(3) DEFAULT NULL,
  `plannedEnd` datetime(3) DEFAULT NULL,
  `actualStart` datetime(3) DEFAULT NULL,
  `actualEnd` datetime(3) DEFAULT NULL,
  `totalCost` double NOT NULL DEFAULT 0,
  `laborCost` double NOT NULL DEFAULT 0,
  `partsCost` double NOT NULL DEFAULT 0,
  `contractorCost` double NOT NULL DEFAULT 0,
  `failureDescription` varchar(191) DEFAULT NULL,
  `causeDescription` varchar(191) DEFAULT NULL,
  `actionDescription` varchar(191) DEFAULT NULL,
  `tradeActivity` varchar(191) DEFAULT NULL,
  `safetyNotes` varchar(191) DEFAULT NULL,
  `ppeRequired` varchar(191) DEFAULT NULL,
  `plantId` varchar(191) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `personalTools` text NOT NULL DEFAULT '[]',
  `isLocked` tinyint(1) NOT NULL DEFAULT 0,
  `lockedBy` varchar(191) DEFAULT NULL,
  `lockedAt` datetime(3) DEFAULT NULL,
  `lockReason` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `escalationLevel` int(11) NOT NULL DEFAULT 0,
  `lastEscalatedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_orders_woNumber_key` (`woNumber`),
  UNIQUE KEY `work_orders_maintenanceRequestId_key` (`maintenanceRequestId`),
  KEY `work_orders_pmScheduleId_fkey` (`pmScheduleId`),
  KEY `work_orders_assignedTo_fkey` (`assignedTo`),
  KEY `work_orders_teamLeaderId_fkey` (`teamLeaderId`),
  KEY `work_orders_assignedSupervisorId_fkey` (`assignedSupervisorId`),
  KEY `work_orders_assignedBy_fkey` (`assignedBy`),
  KEY `work_orders_plannerId_fkey` (`plannerId`),
  KEY `work_orders_lockedBy_fkey` (`lockedBy`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
