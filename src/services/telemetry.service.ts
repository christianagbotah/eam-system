// ============================================================================
// TELEMETRY SERVICE — Ingestion pipeline, buffer, MQTT/OPC-UA config, aggregation
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const log = createLogger('TelemetryService');

// In-memory telemetry buffer for high-frequency data
interface TelemetryBuffer {
  [deviceId: string]: {
    readings: Array<{
      timestamp: number;
      value: number;
      unit: string;
      isAnomaly: boolean;
    }>;
    maxSize: number;
    flushInterval: number;
    lastFlush: number;
  };
}

const buffer: TelemetryBuffer = {};
const BUFFER_MAX = 1000; // readings per device before flush
const FLUSH_INTERVAL = 5000; // ms between auto-flushes

export const telemetryService = {
  // ── Ingest telemetry reading ──────────────────────────────────────────────

  ingestReading(
    deviceId: string,
    value: number,
    unit: string = '',
    isAnomaly: boolean = false,
    timestamp?: Date
  ) {
    if (!buffer[deviceId]) {
      buffer[deviceId] = {
        readings: [],
        maxSize: BUFFER_MAX,
        flushInterval: FLUSH_INTERVAL,
        lastFlush: Date.now(),
      };
    }

    buffer[deviceId].readings.push({
      timestamp: (timestamp || new Date()).getTime(),
      value,
      unit,
      isAnomaly,
    });

    // Auto-flush if buffer is full
    if (buffer[deviceId].readings.length >= buffer[deviceId].maxSize) {
      this.flushDevice(deviceId);
    }
  },

  // ── Flush buffer to database ──────────────────────────────────────────────

  async flushDevice(deviceId: string) {
    if (!buffer[deviceId] || buffer[deviceId].readings.length === 0) return;

    const readings = [...buffer[deviceId].readings];
    buffer[deviceId].readings = [];
    buffer[deviceId].lastFlush = Date.now();

    try {
      // Batch insert readings
      await db.iotReading.createMany({
        data: readings.map((r) => ({
          deviceId,
          value: r.value,
          unit: r.unit,
          isAnomaly: r.isAnomaly,
          timestamp: new Date(r.timestamp),
        })),
        skipDuplicates: true,
      });

      log.debug(`Flushed ${readings.length} readings for device ${deviceId}`);
    } catch (error) {
      log.error(`Failed to flush readings for ${deviceId}`, error as Error);
      // Re-add failed readings back to buffer
      buffer[deviceId].readings.unshift(...readings);
    }
  },

  // ── Flush all devices ─────────────────────────────────────────────────────

  async flushAll() {
    const deviceIds = Object.keys(buffer);
    await Promise.all(deviceIds.map((id) => this.flushDevice(id)));
    if (deviceIds.length > 0) {
      log.info(`Flushed telemetry for ${deviceIds.length} devices`);
    }
  },

  // ── MQTT connection placeholder ───────────────────────────────────────────

  mqttConfig: null as {
    broker: string;
    port: number;
    username?: string;
    password?: string;
    clientId?: string;
  } | null,

  configureMQTT(config: {
    broker: string;
    port: number;
    username?: string;
    password?: string;
    clientId?: string;
  }) {
    // Placeholder for MQTT broker connection
    // In production: use 'mqtt' package to connect
    this.mqttConfig = config;
    log.info('MQTT configuration set', { broker: config.broker, port: config.port });
    log.warn(
      'MQTT connection not yet implemented — requires mqtt package and broker infrastructure'
    );
  },

  // ── OPC-UA connection placeholder ─────────────────────────────────────────

  opcuaConfig: null as {
    endpoint: string;
    securityMode?: string;
    securityPolicy?: string;
  } | null,

  configureOPCUA(config: {
    endpoint: string;
    securityMode?: string;
    securityPolicy?: string;
  }) {
    this.opcuaConfig = config;
    log.info('OPC-UA configuration set', { endpoint: config.endpoint });
    log.warn(
      'OPC-UA connection not yet implemented — requires node-opcua package and server infrastructure'
    );
  },

  // ── Get recent readings for a device ──────────────────────────────────────

  async getRecentReadings(deviceId: string, limit: number = 100) {
    return db.iotReading.findMany({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  },

  // ── Get aggregated readings ───────────────────────────────────────────────

  async getAggregatedReadings(
    deviceId: string,
    interval: '1h' | '6h' | '1d' | '7d' = '1h',
    period: number = 24
  ) {
    const since = new Date(Date.now() - period * 3600000);

    const readings = await db.iotReading.findMany({
      where: { deviceId, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      select: { value: true, timestamp: true },
    });

    // Simple aggregation into time buckets
    const bucketMs: Record<string, number> = {
      '1h': 3600000,
      '6h': 21600000,
      '1d': 86400000,
      '7d': 604800000,
    };
    const bucketSize = bucketMs[interval];

    const buckets: Record<
      string,
      Array<{ value: number; timestamp: string }>
    > = {};

    for (const r of readings) {
      const bucketKey = new Date(
        Math.floor(new Date(r.timestamp).getTime() / bucketSize) * bucketSize
      ).toISOString();
      if (!buckets[bucketKey]) buckets[bucketKey] = [];
      buckets[bucketKey].push({ value: r.value, timestamp: r.timestamp.toISOString() });
    }

    return Object.entries(buckets).map(([timestamp, points]) => {
      const values = points.map((p) => p.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      return { timestamp, min, max, avg: Math.round(avg * 100) / 100, count: points.length };
    });
  },
};

// Auto-flush every 5 seconds (does not block process exit)
setInterval(() => telemetryService.flushAll(), FLUSH_INTERVAL).unref();
