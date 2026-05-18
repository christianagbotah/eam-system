// ============================================================================
// EVENT STREAM PROCESSOR — Event-driven telemetry processing pipeline
// Processes events: data_ingested, alarm_triggered, anomaly_detected,
// connection_changed, batch_processed, sync_completed
// Supports event correlation, routing, and downstream notification
// Features: backpressure, throttling, quality scoring, timestamp sync,
//           deduplication, dead-letter queue, source registry
// ============================================================================
import { createHash } from 'crypto';
import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';
import { EventEmitter } from 'events';

const log = createLogger('EventStreamProcessor');

type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

interface StreamEvent {
  eventType: string;
  sourceType?: string;
  sourceId?: string;
  entityId?: string;
  severity: EventSeverity;
  payload: Record<string, unknown>;
  correlationId?: string;
  qualityScore?: number;
  receivedAt?: number;
  correctedTimestamp?: number;
}

// Event handlers registered by consumers
type EventHandler = (event: StreamEvent) => void | Promise<void>;

/** Configuration for a registered event source */
export interface EventSourceConfig {
  id: string;
  maxEventsPerSecond?: number;
  qualityBaseline?: number;
  timeOffset?: number;
  enabled?: boolean;
}

/** Entry in the dead-letter queue */
export interface DeadLetterEntry {
  event: StreamEvent;
  error: string;
  timestamp: number;
  retryCount: number;
}

// Required payload fields per event type for quality scoring (40 pts)
const REQUIRED_FIELDS: Record<string, string[]> = {
  data_ingested: ['value'],
  alarm_triggered: ['ruleName', 'value', 'threshold'],
  anomaly_detected: ['value', 'anomalyScore'],
  connection_changed: ['status'],
  batch_processed: ['count'],
  sync_completed: [],
};

export class EventStreamProcessor extends EventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventBuffer: StreamEvent[] = [];
  private bufferSize = 10000;
  private processingCount = 0;
  private errorCount = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  // --- Backpressure (concurrent processing limit) ---
  private maxConcurrency = 100;
  private _activeCount = 0;
  private waitingQueue: Array<{ event: StreamEvent; resolve: () => void }> = [];

  // --- Per-source throttling ---
  private defaultMaxEventsPerSecond = 1000;
  private sourceEventTimestamps: Map<string, number[]> = new Map();

  // --- Quality scoring ---
  private qualityTotalScore = 0;
  private qualityCount = 0;

  // --- Timestamp synchronization (EWMA clock skew per source) ---
  private sourceTimeOffsets: Map<string, number> = new Map();

  // --- SHA-256 deduplication ---
  private dedupWindowMs = 60000;
  private dedupCache: Map<string, number> = new Map();

  // --- Dead-letter queue ---
  private deadLetterQueue: DeadLetterEntry[] = [];
  private deadLetterCount = 0;
  private maxDeadLetterSize = 10000;
  private maxRetries = 3;

  // --- Event source registry ---
  private sources: Map<string, EventSourceConfig> = new Map();

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.persistBuffer();
      this.cleanupDedupCache();
    }, 5000);
    log.info('Event stream processor started');
  }

  stop(): void {
    if (this.flushTimer) { clearInterval(this.flushTimer); this.flushTimer = null; }
    this.persistBuffer();
    log.info('Event stream processor stopped');
  }

  // ==========================================================================
  // Event Source Registry
  // ==========================================================================

  /** Register a source with optional per-source throttling and quality config */
  registerSource(config: EventSourceConfig): void {
    this.sources.set(config.id, {
      maxEventsPerSecond: this.defaultMaxEventsPerSecond,
      enabled: true,
      ...config,
    });
    log.info(`Registered event source: ${config.id}`);
  }

  /** Unregister a source and clean up its tracking state */
  unregisterSource(sourceId: string): void {
    this.sources.delete(sourceId);
    this.sourceEventTimestamps.delete(sourceId);
    this.sourceTimeOffsets.delete(sourceId);
    log.info(`Unregistered event source: ${sourceId}`);
  }

  /** Get the configuration for a registered source */
  getSourceConfig(sourceId: string): EventSourceConfig | undefined {
    return this.sources.get(sourceId);
  }

  /** Runtime configuration for processor parameters */
  configure(options: {
    maxConcurrency?: number;
    maxEventsPerSecond?: number;
    dedupWindowMs?: number;
    maxDeadLetterSize?: number;
    maxRetries?: number;
  }): void {
    if (options.maxConcurrency !== undefined) this.maxConcurrency = options.maxConcurrency;
    if (options.maxEventsPerSecond !== undefined) this.defaultMaxEventsPerSecond = options.maxEventsPerSecond;
    if (options.dedupWindowMs !== undefined) this.dedupWindowMs = options.dedupWindowMs;
    if (options.maxDeadLetterSize !== undefined) this.maxDeadLetterSize = options.maxDeadLetterSize;
    if (options.maxRetries !== undefined) this.maxRetries = options.maxRetries;
  }

  // ==========================================================================
  // Handler Registration
  // ==========================================================================

  onEvent(eventType: string | string[], handler: EventHandler): void {
    const types = Array.isArray(eventType) ? eventType : [eventType];
    for (const type of types) {
      if (!this.handlers.has(type)) this.handlers.set(type, new Set());
      this.handlers.get(type)!.add(handler);
    }
  }

  offEvent(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  // ==========================================================================
  // Main Event Processing Pipeline
  // ==========================================================================

  async processEvent(event: StreamEvent): Promise<void> {
    const now = Date.now();
    const sourceKey = event.sourceId || 'unknown';

    // 1. Deduplication — skip if seen within window
    const dedupHash = this.computeDedupHash(event);
    const dedupKey = `${event.eventType}:${dedupHash}`;
    if (this.dedupCache.has(dedupKey)) return;
    this.dedupCache.set(dedupKey, now);

    // 2. Throttling — only for registered sources with explicit rate limit
    const srcConfig = this.sources.get(sourceKey);
    if (srcConfig?.enabled === false) return; // disabled source
    if (srcConfig && srcConfig.maxEventsPerSecond !== undefined) {
      if (!this.checkRateLimit(sourceKey, now, srcConfig.maxEventsPerSecond)) return;
    }

    // 3. Backpressure — queue if at concurrency capacity
    if (this._activeCount >= this.maxConcurrency) {
      await new Promise<void>(resolve => this.waitingQueue.push({ event, resolve }));
      return;
    }

    await this.processEventInternal(event);
  }

  /** Internal processing: score, persist, route (called after gate checks) */
  private async processEventInternal(event: StreamEvent): Promise<void> {
    this.processingCount++; // cumulative (backward compat)
    this._activeCount++;    // concurrent (backpressure)

    const now = Date.now();
    const sourceKey = event.sourceId || 'unknown';

    // 4. Timestamp synchronization — EWMA smoothing of source clock offset
    const sourceTs = event.payload.sourceTimestamp as number | undefined;
    if (sourceTs && typeof sourceTs === 'number') {
      const offset = now - sourceTs;
      const current = this.sourceTimeOffsets.get(sourceKey);
      this.sourceTimeOffsets.set(sourceKey, current === undefined ? offset : current * 0.8 + offset * 0.2);
    }
    event.correctedTimestamp = now;
    event.receivedAt = now;

    // 5. Quality scoring
    const qualityScore = this.scoreQuality(event);
    event.qualityScore = qualityScore;
    this.qualityTotalScore += qualityScore;
    this.qualityCount++;

    // Buffer (trim at capacity)
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.bufferSize) this.eventBuffer.shift();

    // Persist — fire-and-forget for performance (DLQ on failure)
    this.persistEvent(event).catch(err => {
      log.error('Failed to persist event', err as Error);
      this.errorCount++;
      this.moveToDeadLetter(event, err instanceof Error ? err.message : String(err));
    });

    // Route to registered handlers
    await this.routeToHandlers(event);

    // Legacy EventEmitter
    this.emit(event.eventType, event);
    this.emit('*', event);

    this._activeCount--;
    this.drainWaitingQueue();
  }

  // ==========================================================================
  // Convenience Emit Methods
  // ==========================================================================

  emitDataIngested(sourceType: string, sourceId: string, mappingId: string, value: number, metadata?: Record<string, unknown>): void {
    this.processEvent({
      eventType: 'data_ingested', sourceType, sourceId, entityId: mappingId,
      severity: 'info', payload: { value, ...metadata },
    });
  }

  emitAlarmTriggered(alarmId: string, mappingId: string, ruleName: string, severity: EventSeverity, value: number, threshold: number): void {
    this.processEvent({
      eventType: 'alarm_triggered', entityId: alarmId, severity,
      payload: { mappingId, ruleName, value, threshold },
    });
  }

  emitAnomalyDetected(mappingId: string, value: number, anomalyScore: number, metadata?: Record<string, unknown>): void {
    this.processEvent({
      eventType: 'anomaly_detected', entityId: mappingId,
      severity: anomalyScore > 80 ? 'critical' : anomalyScore > 50 ? 'warning' : 'info',
      payload: { value, anomalyScore, ...metadata },
    });
  }

  emitConnectionChanged(sourceId: string, protocol: string, status: string, metadata?: Record<string, unknown>): void {
    this.processEvent({
      eventType: 'connection_changed', sourceType: protocol, sourceId,
      severity: status === 'connected' ? 'info' : status === 'error' ? 'error' : 'warning',
      payload: { status, ...metadata },
    });
  }

  emitBatchProcessed(sourceId: string, count: number, duration: number, metadata?: Record<string, unknown>): void {
    this.processEvent({
      eventType: 'batch_processed', sourceId, severity: 'info',
      payload: { count, duration, ...metadata },
    });
  }

  // ==========================================================================
  // Quality Scoring (0-100)
  // ==========================================================================

  /** Evaluate event quality: timestamp validity (30) + completeness (40) + sanity (30) */
  scoreQuality(event: StreamEvent): number {
    let score = 0;
    const now = Date.now();

    // Timestamp validity — 30 pts (within 24h, not in future)
    const ts = event.payload.timestamp as number | undefined;
    if (ts && typeof ts === 'number') {
      if (ts <= now && ts >= now - 86400000) score += 30;
      else if (ts <= now && ts >= now - 172800000) score += 15; // 24-48h: partial
    }

    // Payload completeness — 40 pts (required fields present)
    const required = REQUIRED_FIELDS[event.eventType] || [];
    if (required.length > 0) {
      const present = required.filter(f => f in event.payload).length;
      score += Math.round((present / required.length) * 40);
    } else {
      score += 30; // unknown event type: baseline
    }

    // Value range sanity — 30 pts (numeric fields within ±1e12, finite)
    const numericFields = ['value', 'anomalyScore', 'count', 'duration', 'threshold'];
    let checked = 0, sane = 0;
    for (const f of numericFields) {
      const v = event.payload[f];
      if (typeof v === 'number' && isFinite(v)) {
        checked++;
        if (v >= -1e12 && v <= 1e12) sane++;
      }
    }
    score += checked > 0 ? Math.round((sane / checked) * 30) : 20;

    return Math.min(100, score);
  }

  /** Get aggregated quality metrics */
  getQualityMetrics(): { average: number; totalScored: number } {
    return {
      average: this.qualityCount > 0 ? Math.round(this.qualityTotalScore / this.qualityCount) : 0,
      totalScored: this.qualityCount,
    };
  }

  // ==========================================================================
  // Deduplication (SHA-256)
  // ==========================================================================

  private computeDedupHash(event: StreamEvent): string {
    const data = JSON.stringify({
      t: event.eventType, s: event.sourceId,
      e: event.entityId, p: event.payload, c: event.correlationId,
    });
    return createHash('sha256').update(data).digest('hex').slice(0, 32);
  }

  /** Remove expired dedup entries (called by flush timer) */
  private cleanupDedupCache(): void {
    const cutoff = Date.now() - this.dedupWindowMs;
    for (const [key, ts] of this.dedupCache) {
      if (ts < cutoff) this.dedupCache.delete(key);
    }
  }

  // ==========================================================================
  // Per-Source Throttling (sliding window)
  // ==========================================================================

  /** Returns false if source exceeded its rate limit within the last second */
  private checkRateLimit(sourceKey: string, now: number, maxPerSecond: number): boolean {
    let timestamps = this.sourceEventTimestamps.get(sourceKey);
    if (!timestamps) { timestamps = []; this.sourceEventTimestamps.set(sourceKey, timestamps); }
    const windowStart = now - 1000;
    timestamps = timestamps.filter(t => t >= windowStart);
    this.sourceEventTimestamps.set(sourceKey, timestamps);
    if (timestamps.length >= maxPerSecond) return false;
    timestamps.push(now);
    return true;
  }

  // ==========================================================================
  // Backpressure (semaphore pattern)
  // ==========================================================================

  /** Release events from the waiting queue when capacity opens */
  private drainWaitingQueue(): void {
    while (this.waitingQueue.length > 0 && this._activeCount < this.maxConcurrency) {
      const { event, resolve } = this.waitingQueue.shift()!;
      resolve();
      this.processEventInternal(event).catch(err =>
        log.error('Waiting queue event processing failed', err as Error),
      );
    }
  }

  // ==========================================================================
  // Dead-Letter Queue
  // ==========================================================================

  /** Move a failed event to DLQ (max 10,000 entries) */
  private moveToDeadLetter(event: StreamEvent, errorMsg: string): void {
    if (this.deadLetterQueue.length >= this.maxDeadLetterSize) {
      this.deadLetterQueue.shift();
    }
    this.deadLetterQueue.push({
      event, error: errorMsg, timestamp: Date.now(), retryCount: 0,
    });
    this.deadLetterCount++;
    log.warn(`Event moved to DLQ: ${event.eventType} from ${event.sourceId || 'unknown'} (DLQ: ${this.deadLetterQueue.length})`);
  }

  /** Retrieve dead-letter entries (newest first) */
  getDeadLetterEvents(limit = 100): DeadLetterEntry[] {
    return this.deadLetterQueue.slice(-limit).reverse();
  }

  /** Retry a dead-letter event by index; removes from DLQ, re-processes */
  async retryDeadLetterEvent(index: number): Promise<boolean> {
    const entry = this.deadLetterQueue[index];
    if (!entry) return false;
    this.deadLetterQueue.splice(index, 1);
    this.deadLetterCount = Math.max(0, this.deadLetterCount - 1);
    // Clear dedup cache so the event can be re-processed
    const hash = this.computeDedupHash(entry.event);
    this.dedupCache.delete(`${entry.event.eventType}:${hash}`);
    entry.retryCount++;
    try {
      await this.processEvent(entry.event);
      return true;
    } catch {
      if (entry.retryCount < this.maxRetries) {
        this.deadLetterQueue.push(entry);
        this.deadLetterCount++;
      }
      return false;
    }
  }

  // ==========================================================================
  // Timestamp Synchronization
  // ==========================================================================

  /** Get the estimated clock skew (ms) for a source */
  getTimeOffset(sourceId: string): number | undefined {
    return this.sourceTimeOffsets.get(sourceId);
  }

  // ==========================================================================
  // Handler Routing (error-isolated)
  // ==========================================================================

  private async routeToHandlers(event: StreamEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType);
    if (handlers) {
      for (const handler of handlers) {
        try { await handler(event); }
        catch (error) {
          log.error(`Event handler error for ${event.eventType}`, error as Error);
          this.errorCount++;
        }
      }
    }
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try { await handler(event); }
        catch (error) { this.errorCount++; }
      }
    }
  }

  // ==========================================================================
  // Query & Stats
  // ==========================================================================

  async queryEvents(params: {
    eventType?: string; severity?: EventSeverity; sourceId?: string;
    startTime?: Date; endTime?: Date; limit?: number;
  }): Promise<Array<StreamEvent & { id: string }>> {
    const where: Record<string, unknown> = {};
    if (params.eventType) where.eventType = params.eventType;
    if (params.severity) where.severity = params.severity;
    if (params.sourceId) where.sourceId = params.sourceId;
    if (params.startTime || params.endTime) {
      where.timestamp = {};
      if (params.startTime) (where.timestamp as Record<string, unknown>).gte = params.startTime;
      if (params.endTime) (where.timestamp as Record<string, unknown>).lte = params.endTime;
    }

    const records = await db.eventStreamRecord.findMany({
      where, orderBy: { timestamp: 'desc' }, take: params.limit || 100,
    });

    return records.map(r => ({
      id: r.id, eventType: r.eventType, sourceType: r.sourceType || undefined,
      sourceId: r.sourceId || undefined, entityId: r.entityId || undefined,
      severity: r.severity as EventSeverity, payload: (r.payload as Record<string, unknown>) || {},
      correlationId: r.correlationId || undefined,
    }));
  }

  async getEventStats(): Promise<{
    totalByType: Record<string, number>;
    totalBySeverity: Record<string, number>;
    recentErrors: number;
  }> {
    const [byType, bySeverity, recentErrors] = await Promise.all([
      db.eventStreamRecord.groupBy({ by: ['eventType'], _count: true, orderBy: { _count: { eventType: 'desc' } }, take: 20 }),
      db.eventStreamRecord.groupBy({ by: ['severity'], _count: true }),
      db.eventStreamRecord.count({ where: { severity: { in: ['error', 'critical'] }, timestamp: { gte: new Date(Date.now() - 3600000) } } }),
    ]);

    return {
      totalByType: Object.fromEntries(byType.map(r => [r.eventType, r._count])),
      totalBySeverity: Object.fromEntries(bySeverity.map(r => [r.severity, r._count])),
      recentErrors,
    };
  }

  getStats() {
    return {
      bufferLength: this.eventBuffer.length,
      processingCount: this.processingCount,
      errorCount: this.errorCount,
      activeProcessing: this._activeCount,
      waitingQueueLength: this.waitingQueue.length,
      deadLetterCount: this.deadLetterCount,
      dedupCacheSize: this.dedupCache.size,
      registeredSources: this.sources.size,
      registeredHandlers: Array.from(this.handlers.entries()).map(([type, handlers]) => ({ type, count: handlers.size })),
      qualityMetrics: this.getQualityMetrics(),
    };
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  private async persistEvent(event: StreamEvent): Promise<void> {
    const correctedTs = event.correctedTimestamp ? new Date(event.correctedTimestamp) : new Date();
    await db.eventStreamRecord.create({
      data: {
        eventType: event.eventType,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        entityId: event.entityId,
        severity: event.severity,
        payload: { ...event.payload, qualityScore: event.qualityScore },
        correlationId: event.correlationId,
        timestamp: correctedTs,
      },
    });
  }

  private async persistBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    // Events are persisted individually in processEvent for reliability.
    // This clears the in-memory buffer periodically.
    this.eventBuffer = [];
  }
}

export const eventStreamProcessor = new EventStreamProcessor();
