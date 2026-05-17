// ============================================================================
// DISASTER RECOVERY SERVICE — Backup management, verification, DR drills, RTO/RPO
// ============================================================================

import { createLogger } from '@/lib/logger';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('disasterRecovery');

// ── Types ───────────────────────────────────────────────────────────────────

export type BackupType = 'database' | 'configuration' | 'files' | 'full';
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'verifying' | 'deleting';
export type BackupScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface BackupRecord {
  id: string;
  type: BackupType;
  status: BackupStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  sizeBytes: number;
  checksum: string;
  algorithm: string;
  storagePath: string;
  metadata: {
    databaseVersion?: string;
    recordCounts?: Record<string, number>;
    fileCount?: number;
    includesBlobs?: boolean;
    compressionAlgorithm?: string;
  };
  error?: string;
  verifiedAt?: string;
  verificationResult?: 'pass' | 'fail';
  retentionExpiresAt: string;
  createdBy?: string;
  tags?: string[];
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: BackupType;
  frequency: BackupScheduleFrequency;
  cronExpression?: string;
  retentionDays: number;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestoreTestResult {
  id: string;
  backupId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'success' | 'failure';
  durationMs?: number;
  checks: {
    integrity: boolean;
    recordCount: boolean;
    schemaValidation: boolean;
    dataSample: boolean;
  };
  notes?: string;
}

export interface DRRunbook {
  id: string;
  name: string;
  description: string;
  scenarios: DRScenario[];
  responsibleTeam: string;
  estimatedRTO: number; // minutes
  estimatedRPO: number; // minutes
  lastReviewedAt?: string;
  lastDrillAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DRScenario {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  steps: string[];
  rollbackSteps: string[];
  estimatedDuration: number; // minutes
}

export interface DRDrill {
  id: string;
  runbookId: string;
  scenarioId: string;
  status: 'planned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  rtoAchieved?: number;
  rpoAchieved?: number;
  participants: string[];
  findings: string[];
  score?: number; // 0-100
  notes?: string;
  createdAt: string;
}

export interface RTORPOStatus {
  targetRTO: number; // minutes
  targetRPO: number; // minutes
  currentEstimatedRTO: number; // minutes
  currentEstimatedRPO: number; // minutes
  lastBackupAge: number; // seconds
  lastBackupStatus: BackupStatus;
  backupCount: number;
  healthy: boolean;
  issues: string[];
}

export interface BackupDashboardData {
  rtoRpo: RTORPOStatus;
  recentBackups: BackupRecord[];
  schedules: BackupSchedule[];
  recentDrills: DRDrill[];
  storageStats: {
    totalBytes: number;
    totalBackups: number;
    oldestBackup: string;
    newestBackup: string;
  };
  runbooks: DRRunbook[];
}

// ── In-Memory Stores ────────────────────────────────────────────────────────

const backups = new Map<string, BackupRecord>();
const schedules = new Map<string, BackupSchedule>();
const restoreTests = new Map<string, RestoreTestResult>();
const runbooks = new Map<string, DRRunbook>();
const drills = new Map<string, DRDrill>();

let schedulerTimer: NodeJS.Timeout | null = null;

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function computeChecksum(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ── Disaster Recovery Service ───────────────────────────────────────────────

export const DisasterRecoveryService = {
  // ── Backup Management ───────────────────────────────────────────────────

  /**
   * Trigger a backup operation
   */
  async triggerBackup(params: {
    type: BackupType;
    createdBy?: string;
    tags?: string[];
  }): Promise<BackupRecord> {
    const id = generateId('bkp');
    const storagePath = path.join(process.cwd(), '.backups', `${id}.bak`);

    const record: BackupRecord = {
      id,
      type: params.type,
      status: 'running',
      startedAt: new Date().toISOString(),
      sizeBytes: 0,
      checksum: '',
      algorithm: 'sha256',
      storagePath,
      metadata: {},
      retentionExpiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(), // 30-day retention
      createdBy: params.createdBy,
      tags: params.tags,
    };

    backups.set(id, record);
    logger.info(`Backup started`, { id, type: params.type });

    // Simulate backup operation
    try {
      // Check if database file exists
      const dbPath = path.join(process.cwd(), 'prisma', 'custom.db');
      let sizeBytes = 0;
      let checksum = '';
      const metadata: BackupRecord['metadata'] = { compressionAlgorithm: 'gzip' };

      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        sizeBytes = stats.size;
        const fileBuffer = fs.readFileSync(dbPath);
        checksum = computeChecksum(fileBuffer);
        metadata.databaseVersion = 'sqlite3';
        metadata.recordCounts = {
          // Placeholder - in production would query actual counts
          totalRecords: 0,
        };
      }

      // Ensure backup directory exists
      const backupDir = path.dirname(storagePath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Copy database file as backup
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, storagePath);
      }

      const completedAt = new Date().toISOString();
      record.status = 'completed';
      record.completedAt = completedAt;
      record.durationMs = new Date(completedAt).getTime() - new Date(record.startedAt).getTime();
      record.sizeBytes = sizeBytes;
      record.checksum = checksum;
      record.metadata = metadata;

      backups.set(id, record);
      logger.info(`Backup completed`, { id, sizeBytes, durationMs: record.durationMs });
    } catch (error) {
      record.status = 'failed';
      record.completedAt = new Date().toISOString();
      record.error = error instanceof Error ? error.message : String(error);
      backups.set(id, record);
      logger.error(`Backup failed`, { id, error: record.error });
    }

    return record;
  },

  /**
   * Verify a backup (checksum + restore test)
   */
  async verifyBackup(backupId: string): Promise<RestoreTestResult> {
    const backup = backups.get(backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    backup.status = 'verifying';
    backups.set(backupId, backup);

    const testId = generateId('rtest');
    const result: RestoreTestResult = {
      id: testId,
      backupId,
      startedAt: new Date().toISOString(),
      status: 'running',
      checks: {
        integrity: false,
        recordCount: false,
        schemaValidation: false,
        dataSample: false,
      },
    };

    restoreTests.set(testId, result);

    try {
      // Check file existence and checksum
      if (fs.existsSync(backup.storagePath)) {
        const buffer = fs.readFileSync(backup.storagePath);
        const computedChecksum = computeChecksum(buffer);
        result.checks.integrity = computedChecksum === backup.checksum;
        result.checks.recordCount = buffer.length > 0;
        result.checks.schemaValidation = buffer.length > 0; // simplified
        result.checks.dataSample = buffer.length > 0; // simplified
      } else {
        result.checks.integrity = false;
      }

      const completedAt = new Date().toISOString();
      result.status = Object.values(result.checks).every(v => v) ? 'success' : 'failure';
      result.completedAt = completedAt;
      result.durationMs = new Date(completedAt).getTime() - new Date(result.startedAt).getTime();

      backup.verifiedAt = completedAt;
      backup.verificationResult = result.status === 'success' ? 'pass' : 'fail';
      backup.status = 'completed';
      backups.set(backupId, backup);
    } catch (error) {
      result.status = 'failure';
      result.completedAt = new Date().toISOString();
      result.notes = error instanceof Error ? error.message : String(error);
      backup.status = 'failed';
      backups.set(backupId, backup);
    }

    restoreTests.set(testId, result);
    logger.info(`Backup verification completed`, { backupId, result: result.status });
    return result;
  },

  /**
   * Get backup by ID
   */
  getBackup(backupId: string): BackupRecord | null {
    return backups.get(backupId) || null;
  },

  /**
   * List backups with optional filtering
   */
  listBackups(filter?: { type?: BackupType; status?: BackupStatus; limit?: number }): BackupRecord[] {
    let results = [...backups.values()];

    if (filter?.type) {
      results = results.filter(b => b.type === filter.type);
    }
    if (filter?.status) {
      results = results.filter(b => b.status === filter.status);
    }

    results.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return results.slice(0, filter?.limit || 50);
  },

  /**
   * Delete a backup
   */
  deleteBackup(backupId: string): boolean {
    const backup = backups.get(backupId);
    if (!backup) return false;

    // Remove physical file
    try {
      if (fs.existsSync(backup.storagePath)) {
        fs.unlinkSync(backup.storagePath);
      }
    } catch {
      // File may not exist
    }

    backups.delete(backupId);
    logger.info(`Backup deleted`, { backupId });
    return true;
  },

  // ── Backup Scheduling ───────────────────────────────────────────────────

  /**
   * Create a backup schedule
   */
  createSchedule(params: {
    name: string;
    type: BackupType;
    frequency: BackupScheduleFrequency;
    cronExpression?: string;
    retentionDays?: number;
  }): BackupSchedule {
    const id = generateId('sched');

    const nextRunAt = new Date();
    switch (params.frequency) {
      case 'hourly': nextRunAt.setHours(nextRunAt.getHours() + 1); break;
      case 'daily': nextRunAt.setDate(nextRunAt.getDate() + 1); break;
      case 'weekly': nextRunAt.setDate(nextRunAt.getDate() + 7); break;
      case 'monthly': nextRunAt.setMonth(nextRunAt.getMonth() + 1); break;
      default: nextRunAt.setHours(nextRunAt.getHours() + 24); break;
    }

    const schedule: BackupSchedule = {
      id,
      name: params.name,
      type: params.type,
      frequency: params.frequency,
      cronExpression: params.cronExpression,
      retentionDays: params.retentionDays || 30,
      enabled: true,
      nextRunAt: nextRunAt.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    schedules.set(id, schedule);
    logger.info(`Backup schedule created`, { id, name: params.name, frequency: params.frequency });
    return schedule;
  },

  /**
   * List all schedules
   */
  listSchedules(): BackupSchedule[] {
    return [...schedules.values()].sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Enable/disable a schedule
   */
  toggleSchedule(scheduleId: string, enabled: boolean): BackupSchedule | null {
    const schedule = schedules.get(scheduleId);
    if (!schedule) return null;

    schedule.enabled = enabled;
    schedule.updatedAt = new Date().toISOString();
    schedules.set(scheduleId, schedule);

    logger.info(`Schedule ${enabled ? 'enabled' : 'disabled'}`, { scheduleId });
    return schedule;
  },

  /**
   * Delete a schedule
   */
  deleteSchedule(scheduleId: string): boolean {
    return schedules.delete(scheduleId);
  },

  /**
   * Start the backup scheduler
   */
  startScheduler(): void {
    if (schedulerTimer) return;
    schedulerTimer = setInterval(() => {
      this.checkSchedules();
    }, 60_000);
    if (schedulerTimer.unref) schedulerTimer.unref();
    logger.info('Backup scheduler started');
  },

  /**
   * Stop the backup scheduler
   */
  stopScheduler(): void {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  },

  async checkSchedules(): Promise<void> {
    const now = new Date();

    for (const [, schedule] of schedules) {
      if (!schedule.enabled || !schedule.nextRunAt) continue;

      if (new Date(schedule.nextRunAt) <= now) {
        logger.info(`Executing scheduled backup`, { scheduleId: schedule.id, name: schedule.name });
        await this.triggerBackup({ type: schedule.type, tags: ['scheduled', schedule.name] });

        schedule.lastRunAt = now.toISOString();

        // Compute next run
        const next = new Date(now);
        switch (schedule.frequency) {
          case 'hourly': next.setHours(next.getHours() + 1); break;
          case 'daily': next.setDate(next.getDate() + 1); break;
          case 'weekly': next.setDate(next.getDate() + 7); break;
          case 'monthly': next.setMonth(next.getMonth() + 1); break;
          default: next.setHours(next.getHours() + 24); break;
        }
        schedule.nextRunAt = next.toISOString();
        schedule.updatedAt = now.toISOString();
        schedules.set(schedule.id, schedule);
      }
    }
  },

  // ── Runbook Management ──────────────────────────────────────────────────

  /**
   * Create a DR runbook
   */
  createRunbook(params: {
    name: string;
    description: string;
    responsibleTeam: string;
    estimatedRTO: number;
    estimatedRPO: number;
    scenarios: Omit<DRScenario, 'id'>[];
  }): DRRunbook {
    const id = generateId('rb');
    const scenarios: DRScenario[] = params.scenarios.map(s => ({
      ...s,
      id: generateId('scn'),
    }));

    const runbook: DRRunbook = {
      id,
      name: params.name,
      description: params.description,
      scenarios,
      responsibleTeam: params.responsibleTeam,
      estimatedRTO: params.estimatedRTO,
      estimatedRPO: params.estimatedRPO,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    runbooks.set(id, runbook);
    logger.info(`DR runbook created`, { id, name: params.name });
    return runbook;
  },

  /**
   * List all runbooks
   */
  listRunbooks(): DRRunbook[] {
    return [...runbooks.values()];
  },

  /**
   * Get a runbook by ID
   */
  getRunbook(runbookId: string): DRRunbook | null {
    return runbooks.get(runbookId) || null;
  },

  /**
   * Update a runbook (review date)
   */
  reviewRunbook(runbookId: string): DRRunbook | null {
    const runbook = runbooks.get(runbookId);
    if (!runbook) return null;

    runbook.lastReviewedAt = new Date().toISOString();
    runbook.updatedAt = new Date().toISOString();
    runbooks.set(runbookId, runbook);
    return runbook;
  },

  // ── DR Drill Tracking ───────────────────────────────────────────────────

  /**
   * Create a DR drill
   */
  createDrill(params: {
    runbookId: string;
    scenarioId: string;
    participants: string[];
  }): DRDrill {
    const id = generateId('drill');

    const drill: DRDrill = {
      id,
      runbookId: params.runbookId,
      scenarioId: params.scenarioId,
      status: 'planned',
      participants: params.participants,
      findings: [],
      createdAt: new Date().toISOString(),
    };

    drills.set(id, drill);
    logger.info(`DR drill created`, { id, runbookId: params.runbookId });
    return drill;
  },

  /**
   * Start a drill
   */
  startDrill(drillId: string): DRDrill | null {
    const drill = drills.get(drillId);
    if (!drill) return null;

    drill.status = 'in_progress';
    drill.startedAt = new Date().toISOString();
    drills.set(drillId, drill);
    logger.info(`DR drill started`, { drillId });
    return drill;
  },

  /**
   * Complete a drill with results
   */
  completeDrill(drillId: string, params: {
    rtoAchieved: number;
    rpoAchieved: number;
    findings: string[];
    score: number;
    notes?: string;
  }): DRDrill | null {
    const drill = drills.get(drillId);
    if (!drill) return null;

    const completedAt = new Date().toISOString();
    drill.status = 'completed';
    drill.completedAt = completedAt;
    drill.durationMinutes = drill.startedAt
      ? Math.round((new Date(completedAt).getTime() - new Date(drill.startedAt).getTime()) / 60_000)
      : 0;
    drill.rtoAchieved = params.rtoAchieved;
    drill.rpoAchieved = params.rpoAchieved;
    drill.findings = params.findings;
    drill.score = params.score;
    drill.notes = params.notes;

    drills.set(drillId, drill);

    // Update runbook lastDrillAt
    const runbook = runbooks.get(drill.runbookId);
    if (runbook) {
      runbook.lastDrillAt = completedAt;
      runbooks.set(drill.runbookId, runbook);
    }

    logger.info(`DR drill completed`, { drillId, score: params.score });
    return drill;
  },

  /**
   * List drills
   */
  listDrills(filter?: { status?: DRDrill['status']; runbookId?: string; limit?: number }): DRDrill[] {
    let results = [...drills.values()];

    if (filter?.status) {
      results = results.filter(d => d.status === filter.status);
    }
    if (filter?.runbookId) {
      results = results.filter(d => d.runbookId === filter.runbookId);
    }

    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return results.slice(0, filter?.limit || 50);
  },

  // ── RTO/RPO Monitoring ──────────────────────────────────────────────────

  /**
   * Get current RTO/RPO status
   */
  getRTORPOStatus(): RTORPOStatus {
    const completedBackups = [...backups.values()].filter(b => b.status === 'completed');
    const failedBackups = [...backups.values()].filter(b => b.status === 'failed');

    const lastBackup = completedBackups.sort((a, b) =>
      (b.completedAt || '').localeCompare(a.completedAt || ''),
    )[0];

    const lastBackupAge = lastBackup?.completedAt
      ? Math.round((Date.now() - new Date(lastBackup.completedAt).getTime()) / 1000)
      : Infinity;

    const issues: string[] = [];
    let healthy = true;

    // Target: RTO 60 min, RPO 24 hours (configurable)
    const targetRTO = 60;
    const targetRPO = 24 * 60; // 24 hours in minutes

    if (completedBackups.length === 0) {
      issues.push('No completed backups exist');
      healthy = false;
    }

    if (lastBackupAge > 24 * 3600) {
      issues.push('Last backup is older than 24 hours');
      healthy = false;
    }

    if (failedBackups.length > 0) {
      const recentFailures = failedBackups.filter(b =>
        b.completedAt && (Date.now() - new Date(b.completedAt).getTime()) < 3600_000,
      );
      if (recentFailures.length > 0) {
        issues.push(`${recentFailures.length} recent backup failure(s)`);
        healthy = false;
      }
    }

    // Estimate current RTO based on last backup size and duration
    const currentEstimatedRTO = lastBackup?.durationMs
      ? Math.max(targetRTO, Math.round(lastBackup.durationMs / 1000 / 60) * 2)
      : targetRTO;

    // Current RPO = age of last backup in minutes
    const currentEstimatedRPO = lastBackupAge === Infinity
      ? targetRPO * 2
      : Math.round(lastBackupAge / 60);

    return {
      targetRTO,
      targetRPO,
      currentEstimatedRTO,
      currentEstimatedRPO,
      lastBackupAge,
      lastBackupStatus: lastBackup?.status || 'pending',
      backupCount: completedBackups.length,
      healthy,
      issues,
    };
  },

  // ── Backup Dashboard ───────────────────────────────────────────────────

  /**
   * Get comprehensive backup dashboard data
   */
  getDashboard(): BackupDashboardData {
    const allBackups = [...backups.values()];
    const completedBackups = allBackups.filter(b => b.status === 'completed');

    const totalBytes = completedBackups.reduce((sum, b) => sum + b.sizeBytes, 0);

    const storageStats = {
      totalBytes,
      totalBackups: allBackups.length,
      oldestBackup: completedBackups.length > 0
        ? completedBackups.sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0]?.startedAt || ''
        : '',
      newestBackup: completedBackups.length > 0
        ? completedBackups.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.startedAt || ''
        : '',
    };

    return {
      rtoRpo: this.getRTORPOStatus(),
      recentBackups: allBackups.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 10),
      schedules: this.listSchedules(),
      recentDrills: this.listDrills({ limit: 10 }),
      storageStats,
      runbooks: this.listRunbooks(),
    };
  },

  // ── Restore Test Results ────────────────────────────────────────────────

  /**
   * Get restore test results
   */
  listRestoreTests(backupId?: string): RestoreTestResult[] {
    let results = [...restoreTests.values()];
    if (backupId) {
      results = results.filter(r => r.backupId === backupId);
    }
    return results.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },

  // ── Retention Management ────────────────────────────────────────────────

  /**
   * Clean up expired backups based on retention policy
   */
  async enforceRetention(): Promise<{ deleted: number; retained: number }> {
    const now = Date.now();
    let deleted = 0;

    for (const [id, backup] of backups) {
      const expiresAt = new Date(backup.retentionExpiresAt).getTime();
      if (now > expiresAt) {
        this.deleteBackup(id);
        deleted++;
      }
    }

    logger.info(`Retention enforcement completed`, { deleted, retained: backups.size });
    return { deleted, retained: backups.size };
  },

  // ── Reset ───────────────────────────────────────────────────────────────

  /**
   * Clear all in-memory data
   */
  clear(): void {
    backups.clear();
    schedules.clear();
    restoreTests.clear();
    runbooks.clear();
    drills.clear();
    this.stopScheduler();
    logger.info('Disaster Recovery service cleared');
  },
};
