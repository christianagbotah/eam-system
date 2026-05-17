// ============================================================================
// OFFLINE-FIRST PWA SERVICE — Comprehensive offline data management
// Handles data packages, sync priority, conflict resolution, storage quota
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('offlineFirst');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConflictStrategy = 'server_wins' | 'client_wins' | 'merge' | 'manual';
export type SyncPriority = 'critical' | 'high' | 'medium' | 'low';
export type OfflineStatus = 'online' | 'offline' | 'degraded';

export interface DataPackage {
  id: string;
  entityType: string;       // work_orders, assets, inspections, etc.
  priority: SyncPriority;
  version: number;
  lastModified: string;     // ISO timestamp
  recordCount: number;
  estimatedSizeKB: number;
  filters?: Record<string, unknown>;
}

export interface SyncPriorityConfig {
  entityType: string;
  priority: SyncPriority;
  includeRelations: string[];
  maxRecords: number;
  staleThresholdMinutes: number;
}

export interface OfflineOperation {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  serverVersion?: number;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  priority: SyncPriority;
  status: 'queued' | 'processing' | 'failed' | 'conflict';
  lastError?: string;
  conflictStrategy?: ConflictStrategy;
}

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  usagePercentage: number;
  breakdown: Record<string, number>;
  recommendedCleanup: string[];
}

export interface OfflineIndicator {
  status: OfflineStatus;
  lastOnlineAt: string | null;
  pendingOperations: number;
  lastSyncAt: string | null;
  connectionType: string | null;
  bandwidthKbps: number | null;
}

export interface SyncProgress {
  totalPackages: number;
  completedPackages: number;
  failedPackages: number;
  totalBytes: number;
  syncedBytes: number;
  etaSeconds: number;
  currentPackage: string | null;
}

// ---------------------------------------------------------------------------
// Default sync priority configuration
// ---------------------------------------------------------------------------

const DEFAULT_PRIORITY_CONFIG: SyncPriorityConfig[] = [
  { entityType: 'work_orders', priority: 'critical', includeRelations: ['materials', 'timeLogs', 'comments'], maxRecords: 50, staleThresholdMinutes: 30 },
  { entityType: 'assets', priority: 'high', includeRelations: ['category', 'pmSchedules'], maxRecords: 200, staleThresholdMinutes: 60 },
  { entityType: 'inventory_items', priority: 'high', includeRelations: [], maxRecords: 500, staleThresholdMinutes: 120 },
  { entityType: 'maintenance_requests', priority: 'high', includeRelations: ['comments'], maxRecords: 50, staleThresholdMinutes: 30 },
  { entityType: 'inspection_templates', priority: 'medium', includeRelations: [], maxRecords: 100, staleThresholdMinutes: 1440 },
  { entityType: 'safety_permits', priority: 'critical', includeRelations: [], maxRecords: 20, staleThresholdMinutes: 15 },
  { entityType: 'pm_schedules', priority: 'medium', includeRelations: ['asset', 'template'], maxRecords: 100, staleThresholdMinutes: 120 },
  { entityType: 'notifications', priority: 'medium', includeRelations: [], maxRecords: 100, staleThresholdMinutes: 10 },
  { entityType: 'geofence_zones', priority: 'medium', includeRelations: [], maxRecords: 50, staleThresholdMinutes: 60 },
];

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  operationQueue: 'iassetspro_offline_ops',
  dataPackages: 'iassetspro_data_packages',
  syncMeta: 'iassetspro_sync_meta',
  conflictLog: 'iassetspro_conflicts',
} as const;

// ---------------------------------------------------------------------------
// OfflineFirstService
// ---------------------------------------------------------------------------

export class OfflineFirstService {

  // =========================================================================
  // DATA PACKAGE MANAGEMENT
  // =========================================================================

  /**
   * Build data packages for offline use based on the user's assignment context.
   * Returns an array of data packages ordered by sync priority.
   */
  static async buildDataPackages(userId: string, plantId?: string): Promise<DataPackage[]> {
    const timer = logger.timer('buildDataPackages');
    const packages: DataPackage[] = [];

    try {
      for (const config of DEFAULT_PRIORITY_CONFIG) {
        try {
          const records = await OfflineFirstService.fetchEntityRecords(
            config.entityType, userId, plantId, config.maxRecords
          );
          const estimatedSizeKB = Math.ceil(JSON.stringify(records).length / 1024);

          packages.push({
            id: `pkg-${config.entityType}-${Date.now()}`,
            entityType: config.entityType,
            priority: config.priority,
            version: Date.now(),
            lastModified: new Date().toISOString(),
            recordCount: records.length,
            estimatedSizeKB,
            filters: plantId ? { plantId } : undefined,
          });
        } catch (err) {
          logger.warn(`Failed to build package for ${config.entityType}`, { error: (err as Error).message });
        }
      }

      // Sort by priority
      const priorityOrder: Record<SyncPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      packages.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      logger.info('Data packages built', { count: packages.length, userId });
      return packages;
    } finally {
      timer.end();
    }
  }

  /**
   * Fetch entity records from the database for offline packaging.
   */
  private static async fetchEntityRecords(
    entityType: string,
    userId: string,
    plantId?: string,
    limit: number = 50
  ): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {};
    if (plantId) where.plantId = plantId;

    // Special cases for user-scoped data
    switch (entityType) {
      case 'work_orders': {
        const orConditions = [
          { assignedTo: userId },
          { teamLeaderId: userId },
          { status: { in: ['assigned', 'in_progress'] } },
        ];
        return db.workOrder.findMany({
          where: { ...where, OR: orConditions },
          take: limit,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true, woNumber: true, title: true, description: true, type: true,
            priority: true, status: true, assetId: true, assetName: true,
            assignedTo: true, estimatedHours: true, plannedStart: true, plannedEnd: true,
            safetyNotes: true, ppeRequired: true, updatedAt: true,
          },
        }) as Promise<Record<string, unknown>[]>;
      }
      case 'assets': {
        return db.asset.findMany({
          where: { ...where, isActive: true },
          take: limit,
          orderBy: { name: 'asc' },
          select: { id: true, name: true, assetTag: true, status: true, criticality: true, location: true, plantId: true },
        }) as Promise<Record<string, unknown>[]>;
      }
      case 'inspection_templates': {
        return db.inspectionTemplate.findMany({
          where: { isActive: true },
          take: limit,
          orderBy: { name: 'asc' },
          select: { id: true, name: true, description: true, category: true, frequency: true, passThreshold: true },
        }) as Promise<Record<string, unknown>[]>;
      }
      default: {
        const model = (db as Record<string, unknown>)[entityType] as {
          findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
        } | undefined;
        if (!model) return [];
        return model.findMany({ where, take: limit, orderBy: { updatedAt: 'desc' } }) as Promise<Record<string, unknown>[]>;
      }
    }
  }

  // =========================================================================
  // OFFLINE OPERATION QUEUE
  // =========================================================================

  /**
   * Enqueue an operation for sync when back online.
   */
  static enqueueOperation(
    operation: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    data: Record<string, unknown>,
    priority: SyncPriority = 'medium',
    conflictStrategy: ConflictStrategy = 'server_wins'
  ): OfflineOperation {
    const op: OfflineOperation = {
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      operation,
      entityType,
      entityId,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 5,
      priority,
      status: 'queued',
      conflictStrategy,
    };

    const queue = OfflineFirstService.getOperationQueue();
    queue.push(op);
    // Sort by priority
    const priorityOrder: Record<SyncPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    OfflineFirstService.saveOperationQueue(queue);

    logger.info('Operation enqueued', { op: op.id, operation, entityType, priority });
    return op;
  }

  /**
   * Get all queued operations.
   */
  static getOperationQueue(): OfflineOperation[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.operationQueue);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static saveOperationQueue(queue: OfflineOperation[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.operationQueue, JSON.stringify(queue));
    } catch (e) {
      logger.error('Failed to save operation queue', { error: (e as Error).message });
    }
  }

  /**
   * Get pending operations count.
   */
  static getPendingCount(): number {
    return OfflineFirstService.getOperationQueue().filter(o => o.status === 'queued').length;
  }

  /**
   * Mark an operation as processed.
   */
  static markOperationCompleted(opId: string): void {
    const queue = OfflineFirstService.getOperationQueue();
    const idx = queue.findIndex(o => o.id === opId);
    if (idx !== -1) {
      queue.splice(idx, 1);
      OfflineFirstService.saveOperationQueue(queue);
      logger.info('Operation completed and removed', { opId });
    }
  }

  /**
   * Mark an operation as failed with error.
   */
  static markOperationFailed(opId: string, error: string): void {
    const queue = OfflineFirstService.getOperationQueue();
    const op = queue.find(o => o.id === opId);
    if (op) {
      op.status = 'failed';
      op.lastError = error;
      op.retryCount++;
      if (op.retryCount >= op.maxRetries) {
        op.status = 'conflict';
      } else {
        op.status = 'queued'; // Retry
      }
      OfflineFirstService.saveOperationQueue(queue);
    }
  }

  // =========================================================================
  // CONFLICT RESOLUTION
  // =========================================================================

  /**
   * Detect a version conflict between client and server data.
   */
  static detectConflict(
    clientVersion: number | undefined,
    serverVersion: number,
    strategy: ConflictStrategy = 'server_wins'
  ): { hasConflict: boolean; resolution: ConflictStrategy | 'none' } {
    if (!clientVersion || clientVersion === serverVersion) {
      return { hasConflict: false, resolution: 'none' };
    }
    return { hasConflict: true, resolution: strategy };
  }

  /**
   * Apply conflict resolution strategy to merge client and server data.
   */
  static resolveConflict(
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    strategy: ConflictStrategy
  ): Record<string, unknown> {
    switch (strategy) {
      case 'server_wins':
        return { ...serverData };
      case 'client_wins':
        return { ...clientData };
      case 'merge':
        return OfflineFirstService.mergeData(clientData, serverData);
      case 'manual':
        return { ...serverData, _conflictData: clientData, _needsManualReview: true };
      default:
        return serverData;
    }
  }

  /**
   * Deep merge two objects — server wins on field-level conflicts.
   */
  private static mergeData(
    client: Record<string, unknown>,
    server: Record<string, unknown>
  ): Record<string, unknown> {
    const merged = { ...server };
    for (const key of Object.keys(client)) {
      if (!(key in merged)) {
        (merged as Record<string, unknown>)[key] = client[key];
      } else if (
        typeof client[key] === 'object' && client[key] !== null &&
        typeof merged[key] === 'object' && merged[key] !== null
      ) {
        (merged as Record<string, unknown>)[key] = OfflineFirstService.mergeData(
          client[key] as Record<string, unknown>,
          merged[key] as Record<string, unknown>
        );
      }
      // If key exists in both, server value is kept (server_wins at field level)
    }
    return merged;
  }

  // =========================================================================
  // DATA VERSIONING
  // =========================================================================

  /**
   * Generate a version number based on timestamp.
   */
  static generateVersion(): number {
    return Date.now();
  }

  /**
   * Save a data version stamp for an entity type.
   */
  static saveEntityVersion(entityType: string, version: number): void {
    if (typeof window === 'undefined') return;
    try {
      const meta = OfflineFirstService.getSyncMeta();
      meta.entityVersions[entityType] = { version, syncedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.syncMeta, JSON.stringify(meta));
    } catch (e) {
      logger.error('Failed to save entity version', { error: (e as Error).message });
    }
  }

  /**
   * Get the last synced version for an entity type.
   */
  static getEntityVersion(entityType: string): number | null {
    const meta = OfflineFirstService.getSyncMeta();
    return meta.entityVersions[entityType]?.version ?? null;
  }

  private static getSyncMeta(): { entityVersions: Record<string, { version: number; syncedAt: string }>; lastFullSync: string | null } {
    if (typeof window === 'undefined') return { entityVersions: {}, lastFullSync: null };
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.syncMeta);
      return stored ? JSON.parse(stored) : { entityVersions: {}, lastFullSync: null };
    } catch {
      return { entityVersions: {}, lastFullSync: null };
    }
  }

  // =========================================================================
  // STORAGE QUOTA MANAGEMENT
  // =========================================================================

  /**
   * Estimate storage usage across offline data stores.
   */
  static async estimateStorageUsage(): Promise<StorageQuotaInfo> {
    const breakdown: Record<string, number> = {};

    // Estimate localStorage usage
    if (typeof window !== 'undefined') {
      for (const key of Object.values(STORAGE_KEYS)) {
        const value = localStorage.getItem(key);
        breakdown[key] = value ? new Blob([value]).size : 0;
      }
    }

    const usageBytes = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
    const quotaBytes = 50 * 1024 * 1024; // Default 50MB estimate
    const usagePercentage = (usageBytes / quotaBytes) * 100;

    const recommendedCleanup: string[] = [];
    if (usagePercentage > 80) {
      recommendedCleanup.push('Consider removing completed operations from the queue');
      recommendedCleanup.push('Clear old conflict logs');
    }
    if (usagePercentage > 90) {
      recommendedCleanup.push('URGENT: Storage nearly full. Reduce offline data scope.');
    }

    return { usageBytes, quotaBytes, usagePercentage, breakdown, recommendedCleanup };
  }

  /**
   * Perform storage cleanup — remove completed/conflicted operations, old logs.
   */
  static async performCleanup(): Promise<{ removedCount: number; freedBytes: number }> {
    const queue = OfflineFirstService.getOperationQueue();
    const beforeSize = new Blob([JSON.stringify(queue)]).size;

    const cleaned = queue.filter(op => op.status === 'queued');
    OfflineFirstService.saveOperationQueue(cleaned);

    const afterSize = new Blob([JSON.stringify(cleaned)]).size;
    const removedCount = queue.length - cleaned.length;
    const freedBytes = beforeSize - afterSize;

    logger.info('Cleanup performed', { removedCount, freedBytes });
    return { removedCount, freedBytes };
  }

  // =========================================================================
  // OFFLINE INDICATOR STATUS
  // =========================================================================

  /**
   * Get current offline/online status with context.
   */
  static getOfflineStatus(): OfflineIndicator {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const meta = OfflineFirstService.getSyncMeta();

    return {
      status: isOnline ? 'online' : 'offline',
      lastOnlineAt: meta.lastFullSync,
      pendingOperations: OfflineFirstService.getPendingCount(),
      lastSyncAt: meta.lastFullSync,
      connectionType: typeof navigator !== 'undefined' ? (navigator as unknown as Record<string, unknown>).connection
        ? ((navigator as unknown as Record<string, unknown>).connection as Record<string, unknown>).effectiveType as string
        : null
        : null,
      bandwidthKbps: null, // Would need Network Information API
    };
  }

  // =========================================================================
  // PROGRESSIVE DATA LOADING
  // =========================================================================

  /**
   * Get a progressive loading plan — essential data first, then enrichments.
   */
  static getProgressiveLoadingPlan(): Array<{ phase: string; entityTypes: string[]; priority: SyncPriority }> {
    return [
      { phase: 'essential', entityTypes: ['work_orders', 'safety_permits'], priority: 'critical' },
      { phase: 'core', entityTypes: ['assets', 'inventory_items', 'maintenance_requests'], priority: 'high' },
      { phase: 'reference', entityTypes: ['inspection_templates', 'pm_schedules'], priority: 'medium' },
      { phase: 'enrichment', entityTypes: ['notifications', 'geofence_zones'], priority: 'low' },
    ];
  }

  // =========================================================================
  // BACKGROUND SYNC TRIGGERS (SERVER-SIDE)
  // =========================================================================

  /**
   * Get pending sync operations from the database for a user.
   */
  static async getPendingSyncOperations(userId: string): Promise<unknown[]> {
    try {
      const operations = await db.syncOperation.findMany({
        where: { userId, status: { in: ['pending', 'failed'] } },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      return operations;
    } catch (err) {
      logger.error('Failed to fetch pending sync operations', { error: (err as Error).message });
      return [];
    }
  }

  /**
   * Record a sync operation in the database.
   */
  static async recordSyncOperation(data: {
    userId: string;
    deviceId?: string;
    operationType: 'upload' | 'download' | 'conflict';
    entityType?: string;
    entityId?: string;
    dataJson?: unknown;
  }): Promise<string> {
    try {
      const op = await db.syncOperation.create({
        data: {
          ...data,
          dataJson: data.dataJson ? JSON.stringify(data.dataJson) : undefined,
          status: 'pending',
        },
      });
      return op.id;
    } catch (err) {
      logger.error('Failed to record sync operation', { error: (err as Error).message });
      throw err;
    }
  }

  /**
   * Resolve a sync operation (mark completed or conflicted).
   */
  static async resolveSyncOperation(
    opId: string,
    resolution: 'completed' | 'failed' | 'conflict',
    reason?: string
  ): Promise<void> {
    try {
      await db.syncOperation.update({
        where: { id: opId },
        data: {
          status: resolution,
          conflictReason: reason,
          resolvedAt: new Date(),
        },
      });
    } catch (err) {
      logger.error('Failed to resolve sync operation', { error: (err as Error).message });
    }
  }
}
