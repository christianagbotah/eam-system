// ============================================================================
// TELEMETRY BATCHER — High-frequency data batching for efficient DB writes
// Accumulates readings, flushes on batch size or time threshold
// ============================================================================
import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';
import { EventEmitter } from 'events';

const log = createLogger('TelemetryBatcher');

interface BatchConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
  retryOnFail: boolean;
  maxRetries: number;
}

interface PendingBatch {
  sourceId: string;
  readings: Array<{
    mappingId: string;
    value: number;
    quality: number;
    timestamp: Date;
    isAnomaly?: boolean;
    anomalyScore?: number | null;
  }>;
  retryCount: number;
}

export class TelemetryBatcher extends EventEmitter {
  private batches: Map<string, PendingBatch> = new Map();
  private config: BatchConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private totalBatchesFlushed = 0;
  private totalReadingsProcessed = 0;
  private totalErrors = 0;

  constructor(config?: Partial<BatchConfig>) {
    super();
    this.config = {
      maxBatchSize: config?.maxBatchSize || 500,
      flushIntervalMs: config?.flushIntervalMs || 3000,
      retryOnFail: config?.retryOnFail ?? true,
      maxRetries: config?.maxRetries || 3,
    };
  }

  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flushAll(), this.config.flushIntervalMs);
    log.info(`Telemetry batcher started (batchSize=${this.config.maxBatchSize}, interval=${this.config.flushIntervalMs}ms)`);
  }

  stop(): void {
    if (this.flushTimer) { clearInterval(this.flushTimer); this.flushTimer = null; }
    this.flushAll();
    log.info('Telemetry batcher stopped');
  }

  add(sourceId: string, reading: { mappingId: string; value: number; quality: number; timestamp: Date; isAnomaly?: boolean; anomalyScore?: number | null }): void {
    let batch = this.batches.get(sourceId);
    if (!batch) {
      batch = { sourceId, readings: [], retryCount: 0 };
      this.batches.set(sourceId, batch);
    }
    batch.readings.push(reading);
    this.totalReadingsProcessed++;

    if (batch.readings.length >= this.config.maxBatchSize) {
      this.flushSource(sourceId);
    }
  }

  async flushSource(sourceId: string): Promise<{ flushed: number; error: string | null }> {
    const batch = this.batches.get(sourceId);
    if (!batch || batch.readings.length === 0) return { flushed: 0, error: null };

    const readings = [...batch.readings];
    batch.readings = [];

    try {
      await db.telemetryStream.createMany({
        data: readings.map(r => ({
          mappingId: r.mappingId,
          sourceId,
          value: r.value,
          quality: r.quality,
          timestamp: r.timestamp,
          isAnomaly: r.isAnomaly || false,
          anomalyScore: r.anomalyScore,
        })),
        skipDuplicates: true,
      });

      this.totalBatchesFlushed++;
      this.emit('batch_flushed', { sourceId, count: readings.length });
      log.debug(`Flushed ${readings.length} readings for source ${sourceId}`);
      return { flushed: readings.length, error: null };
    } catch (error) {
      this.totalErrors++;
      if (this.config.retryOnFail && batch.retryCount < this.config.maxRetries) {
        batch.retryCount++;
        batch.readings.unshift(...readings);
        log.warn(`Batch flush failed for ${sourceId}, retry ${batch.retryCount}/${this.config.maxRetries}`);
        return { flushed: 0, error: (error as Error).message };
      }
      log.error(`Batch flush permanently failed for ${sourceId}: ${(error as Error).message}`);
      this.emit('batch_error', { sourceId, count: readings.length, error: (error as Error).message });
      return { flushed: 0, error: (error as Error).message };
    }
  }

  async flushAll(): Promise<void> {
    const sourceIds = Array.from(this.batches.keys());
    await Promise.all(sourceIds.map(id => this.flushSource(id)));
    if (sourceIds.length > 0) log.debug(`Flushed all ${sourceIds.length} source batches`);
  }

  getStats() {
    return {
      activeBatches: this.batches.size,
      pendingReadings: Array.from(this.batches.values()).reduce((sum, b) => sum + b.readings.length, 0),
      totalBatchesFlushed: this.totalBatchesFlushed,
      totalReadingsProcessed: this.totalReadingsProcessed,
      totalErrors: this.totalErrors,
      config: this.config,
    };
  }
}

export const telemetryBatcher = new TelemetryBatcher();
