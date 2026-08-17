-- CreateTable: labor_rates
CREATE TABLE IF NOT EXISTS `labor_rates` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `tradeId` VARCHAR(191) NULL,
    `plantId` VARCHAR(191) NULL,
    `normalHourlyRate` DOUBLE NOT NULL,
    `overtimeHourlyRate` DOUBLE NULL,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'GHS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `labor_rates_userId_effectiveFrom_effectiveTo_idx` (`userId`, `effectiveFrom`, `effectiveTo`),
    INDEX `labor_rates_tradeId_effectiveFrom_effectiveTo_idx` (`tradeId`, `effectiveFrom`, `effectiveTo`),
    INDEX `labor_rates_plantId_idx` (`plantId`),

    CONSTRAINT `labor_rates_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `labor_rates_tradeId_fkey` FOREIGN KEY (`tradeId`) REFERENCES `trades` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `labor_rates_plantId_fkey` FOREIGN KEY (`plantId`) REFERENCES `plants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: Add labor rate snapshot fields to work_orders
ALTER TABLE `work_orders` ADD COLUMN `laborRateApplied` DOUBLE NULL;
ALTER TABLE `work_orders` ADD COLUMN `laborCurrency` VARCHAR(191) NULL DEFAULT 'GHS';
