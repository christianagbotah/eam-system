import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('diagramTelemetry');

export interface TelemetryOverlayConfig {
  diagramId: string;
  refreshInterval: number; // ms
  sources: TelemetrySourceConfig[];
}

export interface TelemetrySourceConfig {
  nodeId: string;
  telemetrySourceId: string;
  mappingType: 'direct' | 'computed' | 'aggregate';
  targetField: string; // e.g., 'value', 'pressure', 'temperature'
  transform?: string; // optional transform expression
  unit?: string;
}

export interface TelemetrySnapshot {
  nodeId: string;
  field: string;
  value: number | string | null;
  unit: string;
  timestamp: string;
  quality: 'good' | 'uncertain' | 'bad';
  sourceId: string;
}

export class DiagramTelemetryService {
  /**
   * Build telemetry overlay configuration for a diagram
   */
  static async buildOverlayConfig(diagramId: string): Promise<TelemetryOverlayConfig | null> {
    try {
      const diagram = await db.systemDiagram.findUnique({
        where: { id: diagramId },
      });

      if (!diagram) return null;

      const nodes = JSON.parse(diagram.nodes || '[]') as Array<Record<string, unknown>>;
      const sources: TelemetrySourceConfig[] = [];

      for (const node of nodes) {
        const data = node.data as Record<string, unknown>;
        const nodeId = node.id as string;

        // Map instrument nodes to telemetry sources
        if (node.type === 'instrumentNode' && data.tag) {
          sources.push({
            nodeId,
            telemetrySourceId: data.tag as string,
            mappingType: 'direct',
            targetField: 'value',
            unit: (data.unit as string) || '',
          });
        }

        // Map sensor nodes
        if (node.type === 'sensorNode' && data.tag) {
          sources.push({
            nodeId,
            telemetrySourceId: data.tag as string,
            mappingType: 'direct',
            targetField: 'currentValue',
            unit: (data.unit as string) || '',
          });
        }
      }

      return {
        diagramId,
        refreshInterval: 5000,
        sources,
      };
    } catch (error) {
      log.error('Failed to build overlay config', error);
      return null;
    }
  }

  /**
   * Fetch latest telemetry snapshots for all configured sources
   */
  static async fetchSnapshots(sources: TelemetrySourceConfig[]): Promise<TelemetrySnapshot[]> {
    try {
      const snapshots: TelemetrySnapshot[] = [];

      for (const source of sources) {
        // Find the telemetry mapping by external tag, then get latest stream value
        const mapping = await db.telemetryMapping.findFirst({
          where: {
            externalId: source.telemetrySourceId,
          },
        });

        if (mapping) {
          const stream = await db.telemetryStream.findFirst({
            where: { mappingId: mapping.id },
            orderBy: { timestamp: 'desc' },
          });

          if (stream) {
            const qualityValue = stream.quality as number;
            const quality: 'good' | 'uncertain' | 'bad' = qualityValue >= 80 ? 'good' : qualityValue >= 50 ? 'uncertain' : 'bad';

            snapshots.push({
              nodeId: source.nodeId,
              field: source.targetField,
              value: stream.value,
              unit: source.unit,
              timestamp: stream.timestamp.toISOString(),
              quality,
              sourceId: source.telemetrySourceId,
            });
          }
        }
      }

      return snapshots;
    } catch (error) {
      log.error('Failed to fetch telemetry snapshots', error);
      return [];
    }
  }

  /**
   * Apply telemetry data to diagram nodes (returns updated nodes)
   */
  static applyToNodes(
    nodes: Array<Record<string, unknown>>,
    snapshots: TelemetrySnapshot[]
  ): Array<Record<string, unknown>> {
    const snapshotMap = new Map<string, TelemetrySnapshot[]>();

    for (const snap of snapshots) {
      const existing = snapshotMap.get(snap.nodeId) || [];
      existing.push(snap);
      snapshotMap.set(snap.nodeId, existing);
    }

    return nodes.map(node => {
      const nodeSnaps = snapshotMap.get(node.id as string);
      if (!nodeSnaps || nodeSnaps.length === 0) return node;

      const data = { ...(node.data as Record<string, unknown>) };

      for (const snap of nodeSnaps) {
        data[snap.targetField] = snap.value;
        data.quality = snap.quality;
        data.lastUpdate = snap.timestamp;
      }

      return { ...node, data };
    });
  }

  /**
   * Get alarm status for all instrument nodes in a diagram
   */
  static async getAlarmStatus(diagramId: string): Promise<Array<{
    nodeId: string;
    tag: string;
    alarmType: 'high' | 'low' | 'rate' | 'deviation';
    severity: 'warning' | 'critical';
    value: number;
    threshold: number;
    message: string;
  }>> {
    try {
      const diagram = await db.systemDiagram.findUnique({ where: { id: diagramId } });
      if (!diagram) return [];

      const nodes = JSON.parse(diagram.nodes || '[]') as Array<Record<string, unknown>>;
      const alarms: Array<{
        nodeId: string;
        tag: string;
        alarmType: 'high' | 'low' | 'rate' | 'deviation';
        severity: 'warning' | 'critical';
        value: number;
        threshold: number;
        message: string;
      }> = [];

      for (const node of nodes) {
        const data = node.data as Record<string, unknown>;
        if (node.type !== 'instrumentNode') continue;

        const value = data.value as number | null;
        const alarmHigh = data.alarmHigh as number | null;
        const alarmLow = data.alarmLow as number | null;
        const tag = data.tag as string;

        if (value !== null && alarmHigh !== null && value > alarmHigh) {
          alarms.push({
            nodeId: node.id as string,
            tag,
            alarmType: 'high',
            severity: value > alarmHigh * 1.1 ? 'critical' : 'warning',
            value,
            threshold: alarmHigh,
            message: `${tag}: High alarm (${value} > ${alarmHigh})`,
          });
        }

        if (value !== null && alarmLow !== null && value < alarmLow) {
          alarms.push({
            nodeId: node.id as string,
            tag,
            alarmType: 'low',
            severity: value < alarmLow * 0.9 ? 'critical' : 'warning',
            value,
            threshold: alarmLow,
            message: `${tag}: Low alarm (${value} < ${alarmLow})`,
          });
        }
      }

      return alarms;
    } catch (error) {
      log.error('Failed to get alarm status', error);
      return [];
    }
  }
}
