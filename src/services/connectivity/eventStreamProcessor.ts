// ============================================================================
// EVENT STREAM PROCESSOR — Event-driven telemetry processing pipeline
// Processes events: data_ingested, alarm_triggered, anomaly_detected,
// connection_changed, batch_processed, sync_completed
// Supports event correlation, routing, and downstream notification
// ============================================================================
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
}

// Event handlers registered by consumers
type EventHandler = (event: StreamEvent) => void | Promise<void>;

export class EventStreamProcessor extends EventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventBuffer: StreamEvent[] = [];
  private bufferSize = 10000;
  private processingCount = 0;
  private errorCount = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.persistBuffer(), 5000);
    log.info('Event stream processor started');
  }

  stop(): void {
    if (this.flushTimer) { clearInterval(this.flushTimer); this.flushTimer = null; }
    this.persistBuffer();
    log.info('Event stream processor stopped');
  }

  // Register handler for event type(s)
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

  // Process an incoming event
  async processEvent(event: StreamEvent): Promise<void> {
    this.processingCount++;

    // Buffer for persistence
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.bufferSize) {
      this.eventBuffer.shift();
    }

    // Persist to DB (fire-and-forget for performance)
    this.persistEvent(event).catch(err => {
      log.error('Failed to persist event', err as Error);
      this.errorCount++;
    });

    // Route to registered handlers
    const handlers = this.handlers.get(event.eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          log.error(`Event handler error for ${event.eventType}`, error as Error);
          this.errorCount++;
        }
      }
    }

    // Also route to wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          await handler(event);
        } catch (error) {
          this.errorCount++;
        }
      }
    }

    // Emit for legacy consumers
    this.emit(event.eventType, event);
    this.emit('*', event);
  }

  // Convenience methods for common events
  emitDataIngested(sourceType: string, sourceId: string, mappingId: string, value: number, metadata?: Record<string, unknown>): void {
    this.processEvent({
      eventType: 'data_ingested',
      sourceType,
      sourceId,
      entityId: mappingId,
      severity: 'info',
      payload: { value, ...metadata },
    });
  }

  emitAlarmTriggered(alarmId: string, mappingId: string, ruleName: string, severity: EventSeverity, value: number, threshold: number): void {
    this.processEvent({
      eventType: 'alarm_triggered',
      entityId: alarmId,
      severity,
      payload: { mappingId, ruleName, value, threshold },
    });
  }

  emitAnomalyDetected(mappingId: string, value: number, anomalyScore: number, metadata?: Record<string, unknown>): void {
    this.processEvent({
      eventType: 'anomaly_detected',
      entityId: mappingId,
      severity: anomalyScore > 80 ? 'critical' : anomalyScore > 50 ? 'warning' : 'info',
      payload: { value, anomalyScore, ...metadata },
    });
  }

  emitConnectionChanged(sourceId: string, protocol: string, status: string, metadata?: Record<string, unknown>): void {
    this.processEvent({
      eventType: 'connection_changed',
      sourceType: protocol,
      sourceId,
      severity: status === 'connected' ? 'info' : status === 'error' ? 'error' : 'warning',
      payload: { status, ...metadata },
    });
  }

  emitBatchProcessed(sourceId: string, count: number, duration: number, metadata?: Record<string, unknown>): void {
    this.processEvent({
      eventType: 'batch_processed',
      sourceId,
      severity: 'info',
      payload: { count, duration, ...metadata },
    });
  }

  // Query event history
  async queryEvents(params: { eventType?: string; severity?: EventSeverity; sourceId?: string; startTime?: Date; endTime?: Date; limit?: number }): Promise<Array<StreamEvent & { id: string }>> {
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
      where,
      orderBy: { timestamp: 'desc' },
      take: params.limit || 100,
    });

    return records.map(r => ({
      id: r.id,
      eventType: r.eventType,
      sourceType: r.sourceType || undefined,
      sourceId: r.sourceId || undefined,
      entityId: r.entityId || undefined,
      severity: r.severity as EventSeverity,
      payload: (r.payload as Record<string, unknown>) || {},
      correlationId: r.correlationId || undefined,
    }));
  }

  async getEventStats(): Promise<{ totalByType: Record<string, number>; totalBySeverity: Record<string, number>; recentErrors: number }> {
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
    return { bufferLength: this.eventBuffer.length, processingCount: this.processingCount, errorCount: this.errorCount, registeredHandlers: Array.from(this.handlers.entries()).map(([type, handlers]) => ({ type, count: handlers.size })) };
  }

  private async persistEvent(event: StreamEvent): Promise<void> {
    await db.eventStreamRecord.create({
      data: {
        eventType: event.eventType,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        entityId: event.entityId,
        severity: event.severity,
        payload: event.payload,
        correlationId: event.correlationId,
        timestamp: new Date(),
      },
    });
  }

  private async persistBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    // Already persisted individually in processEvent for reliability
    // This is for any buffered-but-unpersisted events (shouldn't happen normally)
    this.eventBuffer = [];
  }
}

export const eventStreamProcessor = new EventStreamProcessor();
