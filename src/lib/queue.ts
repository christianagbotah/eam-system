// ============================================================================
// JOB QUEUE — BullMQ-like abstraction with in-memory fallback
// ============================================================================

import { createLogger } from '@/lib/logger';

const logger = createLogger('queue');

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface JobDefinition<T = unknown> {
  id?: string;
  name: string;
  data: T;
  priority?: number;
  attempts?: number;
  backoff?: number;
  delay?: number;
}

export interface JobRecord<T = unknown> {
  id: string;
  name: string;
  data: T;
  status: JobStatus;
  progress: number;
  result?: unknown;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
}

// Queue name constants — aligned with iAssetsPro EAM domain
export const QUEUES = {
  NOTIFICATION: 'notifications',
  TELEMETRY: 'telemetry-processing',
  REPORT_GENERATION: 'report-generation',
  ASSET_INDEXING: 'asset-indexing',
  EMAIL: 'email',
  MAINTENANCE_SCHEDULING: 'maintenance-scheduling',
  PREDICTIVE_ANALYSIS: 'predictive-analysis',
  CACHE_WARMING: 'cache-warming',
  AUDIT_LOGGING: 'audit-logging',
  WORKFLOW: 'workflow-orchestration',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// Human-readable labels for UI display
export const QUEUE_LABELS: Record<QueueName, string> = {
  [QUEUES.NOTIFICATION]: 'Notifications',
  [QUEUES.TELEMETRY]: 'Telemetry Processing',
  [QUEUES.REPORT_GENERATION]: 'Report Generation',
  [QUEUES.ASSET_INDEXING]: 'Asset Indexing',
  [QUEUES.EMAIL]: 'Email Delivery',
  [QUEUES.MAINTENANCE_SCHEDULING]: 'Maintenance Scheduling',
  [QUEUES.PREDICTIVE_ANALYSIS]: 'Predictive Analysis',
  [QUEUES.CACHE_WARMING]: 'Cache Warming',
  [QUEUES.AUDIT_LOGGING]: 'Audit Logging',
  [QUEUES.WORKFLOW]: 'Workflow Orchestration',
};

export const QUEUE_ICONS: Record<QueueName, string> = {
  [QUEUES.NOTIFICATION]: 'Bell',
  [QUEUES.TELEMETRY]: 'Activity',
  [QUEUES.REPORT_GENERATION]: 'FileBarChart',
  [QUEUES.ASSET_INDEXING]: 'Building2',
  [QUEUES.EMAIL]: 'Mail',
  [QUEUES.MAINTENANCE_SCHEDULING]: 'Calendar',
  [QUEUES.PREDICTIVE_ANALYSIS]: 'TrendingUp',
  [QUEUES.CACHE_WARMING]: 'Zap',
  [QUEUES.AUDIT_LOGGING]: 'ScrollText',
  [QUEUES.WORKFLOW]: 'GitBranch',
};

// ============================================================================
// In-Memory Queue Implementation
// ============================================================================

class InMemoryQueue {
  private queues = new Map<string, Map<string, JobRecord>>();
  private processors = new Map<string, Set<(job: JobRecord) => Promise<unknown>>>();
  private processing = new Set<string>();

  async add<T>(queueName: string, definition: JobDefinition<T>): Promise<string> {
    const id = definition.id || `${queueName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: JobRecord<T> = {
      id,
      name: definition.name,
      data: definition.data,
      status: definition.delay && definition.delay > 0 ? 'delayed' : 'waiting',
      progress: 0,
      attempts: 0,
      maxAttempts: definition.attempts || 3,
      createdAt: new Date().toISOString(),
    };

    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, new Map());
    }

    this.queues.get(queueName)!.set(id, job);

    if (job.status === 'waiting') {
      // Process async to not block
      setImmediate(() => this.processQueue(queueName));
    } else if (definition.delay) {
      setTimeout(() => {
        const existing = this.queues.get(queueName)?.get(id);
        if (existing && existing.status === 'delayed') {
          existing.status = 'waiting';
          this.processQueue(queueName);
        }
      }, definition.delay);
    }

    logger.info(`Job added to queue [${queueName}]`, { jobId: id, jobName: definition.name });
    return id;
  }

  private async processQueue(queueName: string) {
    if (this.processing.has(queueName)) return;
    this.processing.add(queueName);

    try {
      const processors = this.processors.get(queueName);
      if (!processors || processors.size === 0) {
        return;
      }

      const queue = this.queues.get(queueName);
      if (!queue) return;

      for (const [id, job] of queue.entries()) {
        if (job.status !== 'waiting') continue;

        // Find first processor
        const processor = [...processors][0];
        if (!processor) continue;

        job.status = 'active';
        job.startedAt = new Date().toISOString();
        job.attempts++;

        try {
          const result = await processor(job);
          job.status = 'completed';
          job.progress = 100;
          job.result = result;
          job.completedAt = new Date().toISOString();
          logger.info(`Job completed [${queueName}]`, { jobId: id, jobName: job.name });
        } catch (error) {
          job.error = error instanceof Error ? error.message : String(error);

          if (job.attempts < job.maxAttempts) {
            job.status = 'waiting';
            const backoff = (job.attempts - 1) * 5000; // 5s, 10s, 15s...
            logger.warn(`Job failed, retrying [${queueName}]`, { jobId: id, attempt: job.attempts, nextRetryInMs: backoff });
            setTimeout(() => {
              const retryJob = this.queues.get(queueName)?.get(id);
              if (retryJob && retryJob.status === 'waiting') {
                this.processQueue(queueName);
              }
            }, backoff);
          } else {
            job.status = 'failed';
            job.failedAt = new Date().toISOString();
            logger.error(`Job failed permanently [${queueName}]`, { jobId: id, jobName: job.name, error: job.error });
          }
        }
      }
    } finally {
      this.processing.delete(queueName);
    }
  }

  async process<T>(queueName: string, handler: (job: JobRecord<T>) => Promise<unknown>): Promise<void> {
    if (!this.processors.has(queueName)) {
      this.processors.set(queueName, new Set());
    }
    this.processors.get(queueName)!.add(handler as (job: JobRecord) => Promise<unknown>);

    // Start processing any waiting jobs
    this.processQueue(queueName);
  }

  async getJob(queueName: string, jobId: string): Promise<JobRecord | null> {
    return this.queues.get(queueName)?.get(jobId) || null;
  }

  async getQueueStatus(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return { name: queueName, total: 0, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };

    const jobs = [...queue.values()];
    return {
      name: queueName,
      total: jobs.length,
      waiting: jobs.filter(j => j.status === 'waiting').length,
      active: jobs.filter(j => j.status === 'active').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      delayed: jobs.filter(j => j.status === 'delayed').length,
    };
  }

  async getAllQueueStatus() {
    const statuses: Record<string, Awaited<ReturnType<typeof this.getQueueStatus>>> = {};
    for (const queueName of Object.values(QUEUES)) {
      statuses[queueName] = await this.getQueueStatus(queueName);
    }
    return statuses;
  }

  async getQueueJobs(queueName: string): Promise<JobRecord[]> {
    const queue = this.queues.get(queueName);
    if (!queue) return [];
    return [...queue.values()];
  }

  async clearQueue(queueName: string): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;
    const count = queue.size;
    queue.clear();
    return count;
  }

  async retryJob(queueName: string, jobId: string): Promise<boolean> {
    const job = this.queues.get(queueName)?.get(jobId);
    if (!job || (job.status !== 'failed' && job.status !== 'completed')) return false;
    job.status = 'waiting';
    job.attempts = 0;
    job.error = undefined;
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.failedAt = undefined;
    job.progress = 0;
    this.processQueue(queueName);
    return true;
  }

  async removeJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) return false;
    return queue.delete(jobId);
  }
}

// ============================================================================
// Queue Singleton & Public API
// ============================================================================

const queueInstance = new InMemoryQueue();

export const jobQueue = {
  add: queueInstance.add.bind(queueInstance),
  process: queueInstance.process.bind(queueInstance),
  getJob: queueInstance.getJob.bind(queueInstance),
  getJobs: queueInstance.getQueueJobs.bind(queueInstance),
  getStatus: queueInstance.getQueueStatus.bind(queueInstance),
  getAllStatus: queueInstance.getAllQueueStatus.bind(queueInstance),
  clear: queueInstance.clearQueue.bind(queueInstance),
  retry: queueInstance.retryJob.bind(queueInstance),
  remove: queueInstance.removeJob.bind(queueInstance),
};

// ============================================================================
// Pre-built Job Processors — registered on app startup
// ============================================================================

export function registerDefaultProcessors() {
  // Notification queue processor
  jobQueue.process(QUEUES.NOTIFICATION, async (job) => {
    const { userId, title, message, type } = job.data as { userId: string; title: string; message: string; type: string };
    // In production: push via WebSocket, email, SMS
    logger.info('Processing notification', { userId, type, title });
    return { delivered: true, timestamp: new Date().toISOString() };
  });

  // Telemetry processing queue
  jobQueue.process(QUEUES.TELEMETRY, async (job) => {
    const { sourceId, readings } = job.data as { sourceId: string; readings: unknown[] };
    logger.info('Processing telemetry batch', { sourceId, count: readings.length });
    return { processed: readings.length };
  });

  // Audit logging queue
  jobQueue.process(QUEUES.AUDIT_LOGGING, async (job) => {
    const { action, entityType, entityId, userId } = job.data as Record<string, unknown>;
    logger.info('Audit log entry', { action, entityType, entityId, userId });
    return { logged: true };
  });

  // Email delivery queue
  jobQueue.process(QUEUES.EMAIL, async (job) => {
    const { to, subject, template } = job.data as { to: string; subject: string; template: string };
    logger.info('Processing email job', { to, subject, template });
    // In production: use nodemailer or external email service
    return { sent: true, to };
  });

  // Report generation queue
  jobQueue.process(QUEUES.REPORT_GENERATION, async (job) => {
    const { reportType, params } = job.data as { reportType: string; params: Record<string, unknown> };
    logger.info('Generating report', { reportType });
    return { generated: true, reportType };
  });

  // Asset indexing queue
  jobQueue.process(QUEUES.ASSET_INDEXING, async (job) => {
    const { assetId, operation } = job.data as { assetId: string; operation: string };
    logger.info('Indexing asset', { assetId, operation });
    return { indexed: true };
  });

  // Maintenance scheduling queue
  jobQueue.process(QUEUES.MAINTENANCE_SCHEDULING, async (job) => {
    const { scheduleId, action } = job.data as { scheduleId: string; action: string };
    logger.info('Processing maintenance schedule', { scheduleId, action });
    return { scheduled: true };
  });

  // Predictive analysis queue
  jobQueue.process(QUEUES.PREDICTIVE_ANALYSIS, async (job) => {
    const { modelId, assetId } = job.data as { modelId: string; assetId: string };
    logger.info('Running predictive analysis', { modelId, assetId });
    return { completed: true };
  });

  // Cache warming queue
  jobQueue.process(QUEUES.CACHE_WARMING, async (job) => {
    const { cacheKey, source } = job.data as { cacheKey: string; source: string };
    logger.info('Warming cache', { cacheKey, source });
    return { warmed: true };
  });

  // Workflow orchestration queue
  jobQueue.process(QUEUES.WORKFLOW, async (job) => {
    const { workflowId, step, payload } = job.data as { workflowId: string; step: string; payload: Record<string, unknown> };
    logger.info('Processing workflow step', { workflowId, step });
    return { executed: true };
  });

  logger.info('Default job processors registered (10 queues)');
}
