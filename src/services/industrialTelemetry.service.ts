// ============================================================================
// INDUSTRIAL TELEMETRY SERVICE — Phase C
// Data source management, mapping, ingestion, anomaly detection, alarms
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';

const log = createLogger('IndustrialTelemetryService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ListDataSourcesParams {
  page?: number;
  limit?: number;
  sourceType?: string;
  status?: string;
  plantId?: string;
  search?: string;
}

interface CreateDataSourceData {
  name: string;
  sourceType: string;
  connectionConfig: string;
  plantId?: string;
  metadata?: string;
  createdById: string;
}

interface CreateMappingData {
  sourceId: string;
  deviceId?: string;
  externalId: string;
  parameterName: string;
  parameterUnit?: string;
  dataType?: string;
  scaleFactor?: number;
  offset?: number;
  deadband?: number;
  qualityRule?: string;
  createdById: string;
}

interface IngestReadingData {
  mappingId: string;
  value: number;
  quality?: number;
  timestamp?: Date;
  metadata?: string;
}

interface CreateAlarmRuleData {
  name: string;
  mappingId: string;
  condition: string;
  severity?: string;
  cooldownMinutes?: number;
  escalationPath?: string;
  notification?: string;
  createdById: string;
}

// Valid source types
const VALID_SOURCE_TYPES = [
  'mqtt',
  'opcua',
  'modbus_tcp',
  'rest_api',
  'siemens_s7',
  'bacnet',
];

const VALID_STATUSES = ['connected', 'disconnected', 'error'];
const VALID_DATA_TYPES = ['float', 'int', 'boolean', 'string'];
const VALID_ALARM_SEVERITIES = ['info', 'warning', 'critical'];

// ---------------------------------------------------------------------------
// In-memory cache for latest readings per mapping
// ---------------------------------------------------------------------------
const latestReadingsCache = new Map<string, { value: number; quality: number; timestamp: Date }>();

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const industrialTelemetryService = {
  // ── DATA SOURCES ──────────────────────────────────────────────────────────

  async listDataSources(params: ListDataSourcesParams) {
    const { page = 1, limit = 50, sourceType, status, plantId, search } = params;

    const where: Record<string, unknown> = { isActive: true };

    if (sourceType) {
      if (!VALID_SOURCE_TYPES.includes(sourceType)) {
        throw new ValidationError({ sourceType: `Invalid source type. Must be one of: ${VALID_SOURCE_TYPES.join(', ')}` });
      }
      where.sourceType = sourceType;
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        throw new ValidationError({ status: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      where.status = status;
    }

    if (plantId) where.plantId = plantId;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sourceType: { contains: search } },
      ];
    }

    const [sources, total] = await Promise.all([
      db.telemetryDataSource.findMany({
        where,
        include: {
          plant: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { mappings: true, streams: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.telemetryDataSource.count({ where }),
    ]);

    return {
      data: sources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async createDataSource(data: CreateDataSourceData) {
    if (!data.name?.trim()) {
      throw new ValidationError({ name: 'Source name is required' });
    }
    if (!data.sourceType?.trim()) {
      throw new ValidationError({ sourceType: 'Source type is required' });
    }
    if (!VALID_SOURCE_TYPES.includes(data.sourceType)) {
      throw new ValidationError({ sourceType: `Invalid source type. Must be one of: ${VALID_SOURCE_TYPES.join(', ')}` });
    }
    if (!data.connectionConfig?.trim()) {
      throw new ValidationError({ connectionConfig: 'Connection config is required' });
    }

    // Validate that connectionConfig is valid JSON
    try {
      JSON.parse(data.connectionConfig);
    } catch {
      throw new ValidationError({ connectionConfig: 'Connection config must be valid JSON' });
    }

    if (data.metadata) {
      try {
        JSON.parse(data.metadata);
      } catch {
        throw new ValidationError({ metadata: 'Metadata must be valid JSON' });
      }
    }

    const source = await db.telemetryDataSource.create({
      data: {
        name: data.name,
        sourceType: data.sourceType,
        connectionConfig: data.connectionConfig,
        plantId: data.plantId || null,
        metadata: data.metadata || null,
        createdById: data.createdById,
        status: 'disconnected',
      },
      include: {
        plant: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    log.info(`Created telemetry data source: ${source.name} (${source.sourceType})`);
    return source;
  },

  async updateDataSourceStatus(id: string, status: string, error?: string) {
    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError({ status: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const existing = await db.telemetryDataSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('TelemetryDataSource', id);
    }

    const source = await db.telemetryDataSource.update({
      where: { id },
      data: {
        status,
        lastConnectionAt: status === 'connected' ? new Date() : existing.lastConnectionAt,
        lastError: error || (status === 'error' ? existing.lastError : null),
      },
      include: {
        plant: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    log.info(`Updated telemetry source ${source.name} status to ${status}`);
    return source;
  },

  async deleteDataSource(id: string) {
    const existing = await db.telemetryDataSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('TelemetryDataSource', id);
    }

    // Soft delete
    await db.telemetryDataSource.update({
      where: { id },
      data: { isActive: false },
    });

    log.info(`Soft-deleted telemetry data source: ${existing.name}`);
    return { success: true, message: 'Data source removed' };
  },

  // ── MAPPINGS ─────────────────────────────────────────────────────────────

  async listMappings(sourceId: string) {
    const source = await db.telemetryDataSource.findUnique({ where: { id: sourceId } });
    if (!source) {
      throw new NotFoundError('TelemetryDataSource', sourceId);
    }

    return db.telemetryMapping.findMany({
      where: { sourceId },
      include: {
        device: { select: { id: true, name: true, deviceCode: true } },
        _count: { select: { streams: true, alarmRules: true } },
      },
      orderBy: { parameterName: 'asc' },
    });
  },

  async createMapping(data: CreateMappingData) {
    if (!data.externalId?.trim()) {
      throw new ValidationError({ externalId: 'External ID is required' });
    }
    if (!data.parameterName?.trim()) {
      throw new ValidationError({ parameterName: 'Parameter name is required' });
    }
    if (data.dataType && !VALID_DATA_TYPES.includes(data.dataType)) {
      throw new ValidationError({ dataType: `Invalid data type. Must be one of: ${VALID_DATA_TYPES.join(', ')}` });
    }

    // Verify source exists
    const source = await db.telemetryDataSource.findUnique({ where: { id: data.sourceId } });
    if (!source) {
      throw new NotFoundError('TelemetryDataSource', data.sourceId);
    }

    // Verify device exists if provided
    if (data.deviceId) {
      const device = await db.iotDevice.findUnique({ where: { id: data.deviceId } });
      if (!device) {
        throw new NotFoundError('IotDevice', data.deviceId);
      }
    }

    // Check for unique constraint (sourceId + externalId)
    const existing = await db.telemetryMapping.findUnique({
      where: {
        sourceId_externalId: {
          sourceId: data.sourceId,
          externalId: data.externalId,
        },
      },
    });
    if (existing) {
      throw new ConflictError('TelemetryMapping', 'externalId', data.externalId);
    }

    // Validate qualityRule if provided
    if (data.qualityRule) {
      try {
        JSON.parse(data.qualityRule);
      } catch {
        throw new ValidationError({ qualityRule: 'Quality rule must be valid JSON' });
      }
    }

    const mapping = await db.telemetryMapping.create({
      data: {
        sourceId: data.sourceId,
        deviceId: data.deviceId || null,
        externalId: data.externalId,
        parameterName: data.parameterName,
        parameterUnit: data.parameterUnit || null,
        dataType: data.dataType || 'float',
        scaleFactor: data.scaleFactor ?? 1,
        offset: data.offset ?? 0,
        deadband: data.deadband ?? null,
        qualityRule: data.qualityRule || null,
        createdById: data.createdById,
      },
      include: {
        source: { select: { id: true, name: true, sourceType: true } },
        device: { select: { id: true, name: true, deviceCode: true } },
      },
    });

    log.info(`Created telemetry mapping: ${mapping.parameterName} (${mapping.externalId})`);
    return mapping;
  },

  // ── READINGS / INGESTION ─────────────────────────────────────────────────

  async ingestReading(data: IngestReadingData) {
    // Fetch mapping with source info
    const mapping = await db.telemetryMapping.findUnique({
      where: { id: data.mappingId },
      include: { source: { select: { id: true, status: true } } },
    });

    if (!mapping) {
      throw new NotFoundError('TelemetryMapping', data.mappingId);
    }

    // Apply scale/offset transformation
    const transformedValue = data.value * mapping.scaleFactor + mapping.offset;

    // Deadband filter: check against last reading
    if (mapping.deadband && mapping.deadband > 0) {
      const lastReading = latestReadingsCache.get(data.mappingId);
      if (lastReading) {
        const delta = Math.abs(transformedValue - lastReading.value);
        if (delta < mapping.deadband) {
          return {
            skipped: true,
            reason: 'deadband',
            message: `Value ${transformedValue} within deadband ${mapping.deadband} of last reading ${lastReading.value}`,
          };
        }
      }
    }

    // Simple anomaly detection using quality rules
    let isAnomaly = false;
    let anomalyScore: number | null = null;

    if (mapping.qualityRule) {
      try {
        const rule = JSON.parse(mapping.qualityRule);
        if (rule.rangeMin !== undefined && transformedValue < rule.rangeMin) {
          isAnomaly = true;
          anomalyScore = Math.min(100, Math.abs(transformedValue - rule.rangeMin) * 10);
        }
        if (rule.rangeMax !== undefined && transformedValue > rule.rangeMax) {
          isAnomaly = true;
          anomalyScore = Math.min(100, Math.abs(transformedValue - rule.rangeMax) * 10);
        }
      } catch {
        // Invalid quality rule JSON — skip anomaly check
        log.warn(`Invalid qualityRule JSON for mapping ${data.mappingId}`);
      }
    }

    // Create the stream record
    const stream = await db.telemetryStream.create({
      data: {
        mappingId: data.mappingId,
        sourceId: mapping.sourceId,
        value: transformedValue,
        quality: data.quality ?? 100,
        timestamp: data.timestamp || new Date(),
        isAnomaly,
        anomalyScore,
        metadata: data.metadata || null,
      },
    });

    // Update cache
    latestReadingsCache.set(data.mappingId, {
      value: transformedValue,
      quality: data.quality ?? 100,
      timestamp: stream.timestamp,
    });

    // Check alarm rules asynchronously (fire-and-forget style, but awaited for consistency)
    this._evaluateAlarmRules(data.mappingId, mapping.sourceId, transformedValue).catch((err) => {
      log.error('Failed to evaluate alarm rules', err as Error);
    });

    return {
      skipped: false,
      data: stream,
      isAnomaly,
      anomalyScore,
    };
  },

  async getLatestReadings(mappingIds: string[]) {
    if (!mappingIds || mappingIds.length === 0) {
      return [];
    }

    // Try cache first
    const results: Array<{
      mappingId: string;
      value: number;
      quality: number;
      timestamp: Date;
      source: 'cache' | 'database';
    }> = [];

    const missingIds: string[] = [];

    for (const mappingId of mappingIds) {
      const cached = latestReadingsCache.get(mappingId);
      if (cached) {
        results.push({
          mappingId,
          ...cached,
          source: 'cache',
        });
      } else {
        missingIds.push(mappingId);
      }
    }

    // Fetch missing from DB
    if (missingIds.length > 0) {
      const latestInDb = await db.telemetryStream.groupBy({
        by: ['mappingId'],
        where: { mappingId: { in: missingIds } },
        _max: { timestamp: true },
      });

      for (const item of latestInDb) {
        if (item._max.timestamp) {
          const stream = await db.telemetryStream.findFirst({
            where: {
              mappingId: item.mappingId,
              timestamp: item._max.timestamp,
            },
            orderBy: { id: 'desc' },
          });

          if (stream) {
            results.push({
              mappingId: stream.mappingId,
              value: stream.value,
              quality: stream.quality,
              timestamp: stream.timestamp,
              source: 'database',
            });

            // Populate cache
            latestReadingsCache.set(stream.mappingId, {
              value: stream.value,
              quality: stream.quality,
              timestamp: stream.timestamp,
            });
          }
        }
      }
    }

    return results;
  },

  async getHistoricalReadings(
    mappingId: string,
    start: Date,
    end: Date,
    interval?: string
  ) {
    const mapping = await db.telemetryMapping.findUnique({ where: { id: mappingId } });
    if (!mapping) {
      throw new NotFoundError('TelemetryMapping', mappingId);
    }

    const streams = await db.telemetryStream.findMany({
      where: {
        mappingId,
        timestamp: { gte: start, lte: end },
      },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        value: true,
        quality: true,
        timestamp: true,
        isAnomaly: true,
        anomalyScore: true,
      },
    });

    // If interval specified, aggregate into time buckets
    if (interval && streams.length > 0) {
      return this._aggregateByInterval(streams, interval);
    }

    return {
      mappingId,
      mapping: {
        parameterName: mapping.parameterName,
        parameterUnit: mapping.parameterUnit,
      },
      range: { start, end },
      count: streams.length,
      data: streams,
    };
  },

  // ── ALARM RULES ──────────────────────────────────────────────────────────

  async listAlarmRules(mappingId?: string) {
    const where: Record<string, unknown> = {};
    if (mappingId) {
      const mapping = await db.telemetryMapping.findUnique({ where: { id: mappingId } });
      if (!mapping) {
        throw new NotFoundError('TelemetryMapping', mappingId);
      }
      where.mappingId = mappingId;
    }

    return db.alarmRule.findMany({
      where,
      include: {
        mapping: {
          select: {
            id: true,
            parameterName: true,
            parameterUnit: true,
            source: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { events: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createAlarmRule(data: CreateAlarmRuleData) {
    if (!data.name?.trim()) {
      throw new ValidationError({ name: 'Alarm rule name is required' });
    }
    if (!data.mappingId) {
      throw new ValidationError({ mappingId: 'Mapping ID is required' });
    }
    if (!data.condition?.trim()) {
      throw new ValidationError({ condition: 'Alarm condition is required' });
    }

    // Validate condition is valid JSON with required fields
    let parsedCondition: Record<string, unknown>;
    try {
      parsedCondition = JSON.parse(data.condition);
    } catch {
      throw new ValidationError({ condition: 'Condition must be valid JSON' });
    }

    if (!parsedCondition.operator || !parsedCondition.threshold) {
      throw new ValidationError({ condition: 'Condition must include operator and threshold' });
    }

    const validOperators = ['gt', 'lt', 'gte', 'lte', 'eq', 'neq'];
    if (!validOperators.includes(parsedCondition.operator as string)) {
      throw new ValidationError({ condition: `Invalid operator. Must be one of: ${validOperators.join(', ')}` });
    }

    if (data.severity && !VALID_ALARM_SEVERITIES.includes(data.severity)) {
      throw new ValidationError({ severity: `Invalid severity. Must be one of: ${VALID_ALARM_SEVERITIES.join(', ')}` });
    }

    // Verify mapping exists
    const mapping = await db.telemetryMapping.findUnique({ where: { id: data.mappingId } });
    if (!mapping) {
      throw new NotFoundError('TelemetryMapping', data.mappingId);
    }

    // Validate escalationPath and notification if provided
    if (data.escalationPath) {
      try { JSON.parse(data.escalationPath); } catch {
        throw new ValidationError({ escalationPath: 'Escalation path must be valid JSON' });
      }
    }
    if (data.notification) {
      try { JSON.parse(data.notification); } catch {
        throw new ValidationError({ notification: 'Notification must be valid JSON' });
      }
    }

    const rule = await db.alarmRule.create({
      data: {
        name: data.name,
        mappingId: data.mappingId,
        condition: data.condition,
        severity: data.severity || 'warning',
        cooldownMinutes: data.cooldownMinutes ?? 5,
        escalationPath: data.escalationPath || null,
        notification: data.notification || null,
        createdById: data.createdById,
      },
      include: {
        mapping: {
          select: {
            id: true,
            parameterName: true,
            parameterUnit: true,
          },
        },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    log.info(`Created alarm rule: ${rule.name} for mapping ${rule.mapping.parameterName}`);
    return rule;
  },

  // ── ALARM EVENTS ─────────────────────────────────────────────────────────

  async acknowledgeAlarm(alarmId: string, userId: string) {
    const alarm = await db.alarmEvent.findUnique({ where: { id: alarmId } });
    if (!alarm) {
      throw new NotFoundError('AlarmEvent', alarmId);
    }

    if (alarm.status !== 'active') {
      throw new ValidationError({ status: `Cannot acknowledge alarm with status '${alarm.status}'. Only 'active' alarms can be acknowledged.` });
    }

    const updated = await db.alarmEvent.update({
      where: { id: alarmId },
      data: {
        status: 'acknowledged',
        acknowledgedById: userId,
        acknowledgedAt: new Date(),
      },
      include: {
        rule: { select: { id: true, name: true } },
        mapping: {
          select: {
            id: true,
            parameterName: true,
            parameterUnit: true,
          },
        },
        acknowledgedBy: { select: { id: true, fullName: true } },
      },
    });

    log.info(`Alarm ${alarmId} acknowledged by user ${userId}`);
    return updated;
  },

  async getActiveAlarms(severity?: string) {
    const where: Record<string, unknown> = { status: 'active' };

    if (severity) {
      if (!VALID_ALARM_SEVERITIES.includes(severity)) {
        throw new ValidationError({ severity: `Invalid severity. Must be one of: ${VALID_ALARM_SEVERITIES.join(', ')}` });
      }
      where.severity = severity;
    }

    const alarms = await db.alarmEvent.findMany({
      where,
      include: {
        rule: {
          select: {
            id: true,
            name: true,
            severity: true,
          },
        },
        mapping: {
          select: {
            id: true,
            parameterName: true,
            parameterUnit: true,
            externalId: true,
            source: { select: { id: true, name: true, sourceType: true } },
          },
        },
      },
      orderBy: [
        { severity: 'desc' }, // critical first
        { createdAt: 'desc' },
      ],
    });

    // Count summary
    const [totalActive, criticalCount, warningCount, infoCount] = await Promise.all([
      db.alarmEvent.count({ where: { status: 'active' } }),
      db.alarmEvent.count({ where: { status: 'active', severity: 'critical' } }),
      db.alarmEvent.count({ where: { status: 'active', severity: 'warning' } }),
      db.alarmEvent.count({ where: { status: 'active', severity: 'info' } }),
    ]);

    return {
      data: alarms,
      summary: {
        total: totalActive,
        critical: criticalCount,
        warning: warningCount,
        info: infoCount,
      },
    };
  },

  // ── INTERNAL: Alarm rule evaluation ──────────────────────────────────────

  async _evaluateAlarmRules(mappingId: string, sourceId: string, value: number) {
    const activeRules = await db.alarmRule.findMany({
      where: {
        mappingId,
        isActive: true,
      },
    });

    for (const rule of activeRules) {
      try {
        const condition = JSON.parse(rule.condition) as {
          operator: string;
          threshold: number;
          duration?: number;
        };

        let triggered = false;
        switch (condition.operator) {
          case 'gt': triggered = value > condition.threshold; break;
          case 'lt': triggered = value < condition.threshold; break;
          case 'gte': triggered = value >= condition.threshold; break;
          case 'lte': triggered = value <= condition.threshold; break;
          case 'eq': triggered = value === condition.threshold; break;
          case 'neq': triggered = value !== condition.threshold; break;
        }

        if (triggered) {
          // Check cooldown: was there a recent alarm from this rule?
          const cooldownAgo = new Date(Date.now() - rule.cooldownMinutes * 60 * 1000);
          const recentAlarm = await db.alarmEvent.findFirst({
            where: {
              ruleId: rule.id,
              createdAt: { gte: cooldownAgo },
            },
          });

          if (!recentAlarm) {
            await db.alarmEvent.create({
              data: {
                ruleId: rule.id,
                mappingId,
                value,
                threshold: condition.threshold,
                severity: rule.severity,
              },
            });

            log.warn(
              `Alarm triggered: rule="${rule.name}" mapping=${mappingId} value=${value} threshold=${condition.threshold} severity=${rule.severity}`
            );
          }
        }
      } catch (err) {
        log.error(`Failed to evaluate alarm rule ${rule.id}`, err as Error);
      }
    }
  },

  // ── INTERNAL: Interval-based aggregation ─────────────────────────────────

  _aggregateByInterval(
    streams: Array<{ value: number; quality: number; timestamp: Date; isAnomaly: boolean; anomalyScore: number | null }>,
    interval: string
  ) {
    const bucketMs: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '6h': 21600000,
      '1d': 86400000,
    };

    const bucketSize = bucketMs[interval] || 3600000; // default 1h
    const buckets: Record<string, typeof streams> = {};

    for (const s of streams) {
      const bucketKey = new Date(
        Math.floor(new Date(s.timestamp).getTime() / bucketSize) * bucketSize
      ).toISOString();
      if (!buckets[bucketKey]) buckets[bucketKey] = [];
      buckets[bucketKey].push(s);
    }

    return Object.entries(buckets).map(([timestamp, points]) => {
      const values = points.map((p) => p.value);
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      return {
        timestamp,
        avgValue: Math.round(avg * 100) / 100,
        minValue: Math.min(...values),
        maxValue: Math.max(...values),
        sumValue: Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100,
        count: points.length,
        stdDev: Math.round(stdDev * 100) / 100,
        avgQuality: Math.round(points.reduce((s, p) => s + p.quality, 0) / points.length),
        anomalyCount: points.filter((p) => p.isAnomaly).length,
      };
    });
  },
};
