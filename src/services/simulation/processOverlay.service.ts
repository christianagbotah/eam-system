// ============================================================================
// LIVE PROCESS OVERLAY SERVICE — Real-time telemetry overlay for 3D digital twin
// ============================================================================
// Generates overlay data for rendering live process information on top of a
// 3D digital twin model: color-coded status, animated flow, heat maps,
// KPI displays, vibration intensity, and alert zones.
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('ProcessOverlay');

// ── Interfaces ─────────────────────────────────────────────────────────────

export type AssetStatus = 'normal' | 'warning' | 'alarm' | 'offline' | 'maintenance' | 'unknown';

export interface OverlayData {
  twinId: string;
  timestamp: string;
  assets: AssetOverlay[];
  flows: FlowVisualization[];
  heatMaps: HeatMapData[];
  kpiDisplays: KpiOverlay[];
  alertZones: AlertZone[];
  summary: OverlaySummary;
}

export interface AssetOverlay {
  assetId: string;
  assetName: string;
  assetType: string;
  status: AssetStatus;
  statusColor: string;             // hex color code
  statusPriority: number;          // 0–5 (higher = more urgent)
  metrics: Record<string, MetricOverlay>;
  position?: { x: number; y: number; z: number };
  meshBindingId?: string;
}

export interface MetricOverlay {
  value: number;
  unit: string;
  label: string;
  trend: 'up' | 'down' | 'stable';
  deviation: number;               // % deviation from normal
  isAlarm: boolean;
  alarmThreshold?: { low?: number; high?: number };
}

export interface FlowVisualization {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  flowRate: number;                // normalised 0–1
  flowDirection: 'forward' | 'reverse' | 'stopped';
  color: string;
  particleSpeed: number;           // 0–1
  particleDensity: number;         // 0–1
  animationPhase: number;          // radians — for particle animation sync
}

export interface HeatMapData {
  id: string;
  type: 'temperature' | 'pressure' | 'vibration';
  metricKey: string;
  min: number;
  max: number;
  unit: string;
  points: HeatMapPoint[];
  colorScale: ColorScaleStop[];
}

export interface HeatMapPoint {
  x: number;
  y: number;
  z: number;
  value: number;
  normalizedValue: number;         // 0–1
}

export interface ColorScaleStop {
  value: number;                   // 0–1
  color: string;                   // hex
  label: string;
}

export interface KpiOverlay {
  id: string;
  assetId: string;
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  icon?: string;                   // icon identifier for 3D label
  position: { x: number; y: number; z: number };
}

export interface AlertZone {
  id: string;
  assetId: string;
  zoneType: 'temperature' | 'pressure' | 'vibration' | 'leak' | 'general';
  severity: AssetStatus;
  color: string;
  radius: number;                  // meters
  pulseAnimation: boolean;
  label: string;
  description: string;
}

export interface OverlaySummary {
  totalAssets: number;
  normalCount: number;
  warningCount: number;
  alarmCount: number;
  offlineCount: number;
  maintenanceCount: number;
  overallHealthScore: number;      // 0–100
  activeAlerts: number;
}

// ── Color Constants ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AssetStatus, string> = {
  normal: '#10b981',     // emerald-500
  warning: '#f59e0b',    // amber-500
  alarm: '#ef4444',      // red-500
  offline: '#6b7280',    // gray-500
  maintenance: '#3b82f6', // blue-500
  unknown: '#a3a3a3',    // neutral-400
};

const STATUS_PRIORITY: Record<AssetStatus, number> = {
  alarm: 5,
  warning: 4,
  offline: 3,
  maintenance: 2,
  normal: 1,
  unknown: 0,
};

const DEFAULT_COLOR_SCALE: ColorScaleStop[] = [
  { value: 0, color: '#3b82f6', label: 'Low' },
  { value: 0.25, color: '#06b6d4', label: 'Normal-Low' },
  { value: 0.5, color: '#10b981', label: 'Normal' },
  { value: 0.75, color: '#f59e0b', label: 'Elevated' },
  { value: 1, color: '#ef4444', label: 'Critical' },
];

// ============================================================================
// PROCESS OVERLAY SERVICE
// ============================================================================

export const processOverlayService = {

  /**
   * Generate full overlay data for a digital twin.
   *
   * Fetches live telemetry, maps to asset mesh bindings, computes status
   * colors, flow animations, heat maps, and KPI labels.
   */
  async generateOverlay(twinId: string): Promise<OverlayData> {
    const timer = logger.timer('generateOverlay');
    logger.info('Generating process overlay', { twinId });

    // 1. Fetch twin with related assets and their mesh bindings
    const twin = await db.digitalTwin.findUnique({
      where: { id: twinId },
      include: {
        asset: {
          include: {
            children: {
              include: { category: { select: { name: true } } },
            },
            plant: true,
            category: { select: { name: true } },
          },
        },
        scenes: {
          include: {
            hotspots: true,
          },
        },
      },
    });

    if (!twin) {
      throw new Error(`Digital twin not found: ${twinId}`);
    }

    // 2. Collect all asset IDs (root + children)
    const assetIds = [
      twin.assetId,
      ...twin.asset.children.map(c => c.id),
    ];

    // 3. Fetch mesh bindings for these assets
    const meshBindings = await db.assetMeshBinding.findMany({
      where: { assetId: { in: assetIds } },
    });

    const bindingMap = new Map(meshBindings.map(b => [b.assetId, b]));

    // 4. Fetch latest telemetry for all assets
    const telemetryData = await this.fetchTelemetryBatch(assetIds);

    // 5. Fetch active work orders (to detect maintenance status)
    const activeWOs = await db.workOrder.findMany({
      where: {
        assetId: { in: assetIds },
        status: { in: ['in_progress', 'assigned', 'on_hold'] },
      },
      select: { assetId: true, status: true, type: true },
    });

    const woMap = new Map(activeWOs.map(wo => [wo.assetId, wo]));

    // 6. Build asset overlays
    const assets: AssetOverlay[] = [];
    for (const assetId of assetIds) {
      const asset = assetId === twin.assetId ? twin.asset : twin.asset.children.find(c => c.id === assetId);
      if (!asset) continue;

      const metrics = telemetryData.get(assetId) ?? {};
      const status = this.determineAssetStatus(metrics, woMap.get(assetId));
      const metricOverlays = this.buildMetricOverlays(metrics);

      assets.push({
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.category?.name ?? 'unknown',
        status,
        statusColor: STATUS_COLORS[status],
        statusPriority: STATUS_PRIORITY[status],
        metrics: metricOverlays,
        meshBindingId: bindingMap.get(assetId)?.id,
      });
    }

    // 7. Generate flow visualisations
    const flows = this.generateFlowVisualizations(assets, telemetryData);

    // 8. Generate heat maps
    const heatMaps = this.generateHeatMaps(assets, telemetryData);

    // 9. Generate KPI overlays
    const kpiDisplays = this.generateKpiOverlays(assets, telemetryData);

    // 10. Generate alert zones
    const alertZones = this.generateAlertZones(assets);

    // 11. Compute summary
    const summary = this.computeOverlaySummary(assets);

    timer.end();
    return {
      twinId,
      timestamp: new Date().toISOString(),
      assets,
      flows,
      heatMaps,
      kpiDisplays,
      alertZones,
      summary,
    };
  },

  /**
   * Generate a lightweight status-only overlay (for polling / SSE).
   * Returns only asset statuses and alert count — no heat maps or flows.
   */
  async generateStatusOnly(twinId: string): Promise<{
    twinId: string;
    timestamp: string;
    assets: Array<{ assetId: string; status: AssetStatus; statusColor: string; statusPriority: number }>;
    alertCount: number;
    healthScore: number;
  }> {
    const twin = await db.digitalTwin.findUnique({
      where: { id: twinId },
      include: {
        asset: { include: { children: true } },
      },
    });

    if (!twin) throw new Error(`Digital twin not found: ${twinId}`);

    const assetIds = [twin.assetId, ...twin.asset.children.map(c => c.id)];
    const telemetryData = await this.fetchTelemetryBatch(assetIds);

    const assets = assetIds.map(assetId => {
      const asset = assetId === twin.assetId ? twin.asset : twin.asset.children.find(c => c.id === assetId);
      const metrics = telemetryData.get(assetId) ?? {};
      const status = this.determineAssetStatus(metrics);
      return {
        assetId,
        status,
        statusColor: STATUS_COLORS[status],
        statusPriority: STATUS_PRIORITY[status],
      };
    });

    const alertCount = assets.filter(a => a.status === 'alarm' || a.status === 'warning').length;
    const normalCount = assets.filter(a => a.status === 'normal').length;
    const healthScore = assetIds.length > 0 ? Math.round((normalCount / assetIds.length) * 100) : 100;

    return {
      twinId,
      timestamp: new Date().toISOString(),
      assets,
      alertCount,
      healthScore,
    };
  },

  // ── Telemetry Fetching ─────────────────────────────────────────────────

  /**
   * Batch-fetch the latest telemetry readings for multiple assets.
   * Uses telemetry readings keyed by sourceId, then maps sources to assets
   * via TelemetryMapping and IotDevice relationships.
   * Returns a Map<assetId, Map<metricKey, { value, unit, timestamp }>>.
   */
  async fetchTelemetryBatch(assetIds: string[]): Promise<Map<string, Record<string, { value: number; unit: string; timestamp: Date }>>> {
    const result = new Map<string, Record<string, { value: number; unit: string; timestamp: Date }>>();

    if (assetIds.length === 0) return result;

    try {
      // Find IoT devices linked to these assets
      const devices = await db.iotDevice.findMany({
        where: { assetId: { in: assetIds } },
        select: { id: true, assetId: true },
      });

      const deviceAssetMap = new Map(devices.map(d => [d.id, d.assetId]));

      // Find telemetry sources linked to these devices
      const mappings = await db.telemetryMapping.findMany({
        where: { deviceId: { in: devices.map(d => d.id), not: null } },
        select: { sourceId: true, deviceId: true, parameterName: true, parameterUnit: true },
      });

      const sourceToMetric = new Map(mappings.map(m => [`${m.deviceId}:${m.sourceId}`, { name: m.parameterName, unit: m.parameterUnit ?? '' }]));

      // Get unique source IDs
      const sourceIds = [...new Set(mappings.map(m => m.sourceId))];
      if (sourceIds.length === 0) return result;

      // Fetch latest readings for these sources
      const readings = await db.telemetryReading.findMany({
        where: { sourceId: { in: sourceIds } },
        orderBy: { timestamp: 'desc' },
        take: sourceIds.length * 3,
      });

      // Deduplicate: keep latest per sourceId
      const seen = new Set<string>();
      for (const reading of readings) {
        const sourceKey = reading.sourceId;
        if (seen.has(sourceKey)) continue;
        seen.add(sourceKey);

        // Find the asset this reading belongs to
        for (const mapping of mappings) {
          if (mapping.sourceId !== sourceKey) continue;
          const assetId = deviceAssetMap.get(mapping.deviceId ?? '');
          if (!assetId) continue;

          if (!result.has(assetId)) {
            result.set(assetId, {});
          }
          const metricKey = mapping.parameterName.toLowerCase().replace(/\s+/g, '_');
          result.get(assetId)![metricKey] = {
            value: Number(reading.value) || 0,
            unit: mapping.parameterUnit ?? '',
            timestamp: reading.timestamp,
          };
          break;
        }
      }
    } catch (err) {
      logger.warn('Failed to fetch telemetry batch', { error: (err as Error).message });
    }

    return result;
  },

  // ── Asset Status Determination ─────────────────────────────────────────

  /**
   * Determine the operational status of an asset from its telemetry metrics.
   *
   * Rules:
   *  - Any metric in alarm → 'alarm'
   *  - Any metric in warning → 'warning'
   *  - Asset has active WO → 'maintenance'
   *  - No telemetry data → 'offline'
   *  - All metrics normal → 'normal'
   */
  determineAssetStatus(
    metrics: Record<string, { value: number; unit: string; timestamp: Date }>,
    activeWO?: { status: string; type: string },
  ): AssetStatus {
    if (!metrics || Object.keys(metrics).length === 0) {
      return activeWO ? 'maintenance' : 'offline';
    }

    if (activeWO) {
      return 'maintenance';
    }

    const values = Object.values(metrics);
    const now = Date.now();
    const staleThreshold = 15 * 60 * 1000; // 15 minutes

    // Check for stale data
    const isStale = values.every(v => now - v.timestamp.getTime() > staleThreshold);
    if (isStale) return 'offline';

    // Check for alarm/warning conditions (simplified threshold checks)
    for (const metric of values) {
      const val = metric.value;
      const key = Object.keys(metrics).find(k => metrics[k] === metric) ?? '';

      // Temperature alarms
      if (key.toLowerCase().includes('temp')) {
        if (val > 150) return 'alarm';
        if (val > 100) return 'warning';
      }

      // Vibration alarms
      if (key.toLowerCase().includes('vib')) {
        if (val > 10) return 'alarm';
        if (val > 5) return 'warning';
      }

      // Pressure alarms
      if (key.toLowerCase().includes('press')) {
        if (val > 12 || val < 1) return 'alarm';
        if (val > 10 || val < 2) return 'warning';
      }

      // Flow alarms
      if (key.toLowerCase().includes('flow')) {
        if (val < 5) return 'alarm';
        if (val < 20) return 'warning';
      }
    }

    return 'normal';
  },

  // ── Metric Overlay Construction ────────────────────────────────────────

  /**
   * Build MetricOverlay objects from raw telemetry.
   *
   * Computes trend (up/down/stable) based on value sign,
   * and deviation % from typical operating ranges.
   */
  buildMetricOverlays(
    metrics: Record<string, { value: number; unit: string; timestamp: Date }>,
  ): Record<string, MetricOverlay> {
    const result: Record<string, MetricOverlay> = {};

    // Typical operating ranges for common metrics
    const typicalRanges: Record<string, { min: number; max: number; warnLow: number; warnHigh: number; alarmLow: number; alarmHigh: number }> = {
      temperature: { min: 20, max: 80, warnLow: 10, warnHigh: 100, alarmLow: 0, alarmHigh: 150 },
      pressure:    { min: 3, max: 8, warnLow: 2, warnHigh: 10, alarmLow: 1, alarmHigh: 12 },
      vibration:   { min: 0, max: 5, warnLow: 0, warnHigh: 5, alarmLow: 0, alarmHigh: 10 },
      flow:        { min: 30, max: 120, warnLow: 20, warnHigh: 150, alarmLow: 5, alarmHigh: 200 },
      rpm:         { min: 1000, max: 3600, warnLow: 800, warnHigh: 3800, alarmLow: 500, alarmHigh: 4000 },
      current:     { min: 0, max: 50, warnLow: 0, warnHigh: 55, alarmLow: 0, alarmHigh: 65 },
    };

    for (const [key, data] of Object.entries(metrics)) {
      const normalizedKey = key.toLowerCase();
      const range = Object.entries(typicalRanges).find(([k]) => normalizedKey.includes(k))?.[1];

      const midPoint = range ? (range.min + range.max) / 2 : data.value;
      const isAlarm = range ? (data.value < range.alarmLow || data.value > range.alarmHigh) : false;
      const deviation = midPoint !== 0
        ? Math.round(((data.value - midPoint) / midPoint) * 10000) / 100
        : 0;

      result[key] = {
        value: Math.round(data.value * 100) / 100,
        unit: data.unit,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        trend: Math.abs(deviation) < 5 ? 'stable' : deviation > 0 ? 'up' : 'down',
        deviation,
        isAlarm,
        alarmThreshold: range ? { low: range.alarmLow, high: range.alarmHigh } : undefined,
      };
    }

    return result;
  },

  // ── Flow Visualization ─────────────────────────────────────────────────

  /**
   * Generate animated flow visualizations between assets.
   *
   * Flow rate normalised to 0–1 for rendering. Particle speed and density
   * scale with flow rate. Animation phase provides sync offset.
   */
  generateFlowVisualizations(
    assets: AssetOverlay[],
    _telemetryData: Map<string, Record<string, { value: number; unit: string; timestamp: Date }>>,
  ): FlowVisualization[] {
    const flows: FlowVisualization[] = [];

    // Create flow between parent and children (sequential process flow)
    for (let i = 0; i < assets.length - 1; i++) {
      const from = assets[i];
      const to = assets[i + 1];

      // Look for flow rate metric
      const flowMetric = Object.values(from.metrics).find(m =>
        m.label.toLowerCase().includes('flow')
      );

      const rawFlow = flowMetric?.value ?? 50;
      const normalisedFlow = Math.max(0, Math.min(1, rawFlow / 120)); // assume max 120 m³/h

      flows.push({
        id: `flow-${from.assetId}-${to.assetId}`,
        fromAssetId: from.assetId,
        toAssetId: to.assetId,
        flowRate: Math.round(normalisedFlow * 100) / 100,
        flowDirection: normalisedFlow > 0.01 ? 'forward' : 'stopped',
        color: normalisedFlow > 0.7 ? '#10b981' : normalisedFlow > 0.3 ? '#f59e0b' : '#ef4444',
        particleSpeed: Math.round(normalisedFlow * 100) / 100,
        particleDensity: Math.round(normalisedFlow * 100) / 100,
        animationPhase: (Date.now() / 1000) % (2 * Math.PI), // continuous animation
      });
    }

    return flows;
  },

  // ── Heat Map Generation ────────────────────────────────────────────────

  /**
   * Generate heat map data from telemetry values.
   *
   * Values are normalised across the min–max range and mapped to the
   * color scale for rendering. Each point gets a random position for
   * overlay rendering (real positions come from mesh bindings at render time).
   */
  generateHeatMaps(
    assets: AssetOverlay[],
    _telemetryData: Map<string, Record<string, { value: number; unit: string; timestamp: Date }>>,
  ): HeatMapData[] {
    const heatMaps: HeatMapData[] = [];
    const metricGroups = [
      { type: 'temperature' as const, keyPattern: 'temp', unit: '°C' },
      { type: 'pressure' as const, keyPattern: 'press', unit: 'bar' },
      { type: 'vibration' as const, keyPattern: 'vib', unit: 'mm/s' },
    ];

    for (const group of metricGroups) {
      const points: HeatMapPoint[] = [];
      let globalMin = Infinity;
      let globalMax = -Infinity;

      for (const asset of assets) {
        for (const [key, metric] of Object.entries(asset.metrics)) {
          if (!key.toLowerCase().includes(group.keyPattern)) continue;

          const val = metric.value;
          if (val < globalMin) globalMin = val;
          if (val > globalMax) globalMax = val;

          points.push({
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10,
            z: (Math.random() - 0.5) * 10,
            value: val,
            normalizedValue: 0, // will be filled below
          });
        }
      }

      if (points.length === 0) continue;

      // Normalise values
      const range = globalMax - globalMin || 1;
      for (const point of points) {
        point.normalizedValue = (point.value - globalMin) / range;
      }

      heatMaps.push({
        id: `heatmap-${group.type}`,
        type: group.type,
        metricKey: group.keyPattern,
        min: Math.round(globalMin * 10) / 10,
        max: Math.round(globalMax * 10) / 10,
        unit: group.unit,
        points,
        colorScale: DEFAULT_COLOR_SCALE,
      });
    }

    return heatMaps;
  },

  // ── KPI Overlay Generation ─────────────────────────────────────────────

  /**
   * Generate KPI labels for display on 3D model elements.
   *
   * Shows the most relevant metric per asset with trend indicator.
   */
  generateKpiOverlays(
    assets: AssetOverlay[],
    _telemetryData: Map<string, Record<string, { value: number; unit: string; timestamp: Date }>>,
  ): KpiOverlay[] {
    const kpis: KpiOverlay[] = [];

    for (const asset of assets) {
      const metrics = Object.entries(asset.metrics);
      if (metrics.length === 0) continue;

      // Pick the first metric as primary KPI
      const [key, metric] = metrics[0];

      kpis.push({
        id: `kpi-${asset.assetId}`,
        assetId: asset.assetId,
        label: metric.label,
        value: metric.value.toFixed(1),
        unit: metric.unit,
        trend: metric.trend,
        position: {
          x: (Math.random() - 0.5) * 10,
          y: 2 + Math.random() * 3, // slightly above the asset
          z: (Math.random() - 0.5) * 10,
        },
      });
    }

    return kpis;
  },

  // ── Alert Zone Generation ──────────────────────────────────────────────

  /**
   * Generate alert zones around assets in alarm or warning state.
   *
   * Alarm assets get a large pulsing zone; warnings get a smaller static zone.
   */
  generateAlertZones(assets: AssetOverlay[]): AlertZone[] {
    const zones: AlertZone[] = [];

    for (const asset of assets) {
      if (asset.status !== 'alarm' && asset.status !== 'warning') continue;

      const isAlarm = asset.status === 'alarm';

      // Determine zone type from metric alarms
      let zoneType: AlertZone['zoneType'] = 'general';
      for (const [key, metric] of Object.entries(asset.metrics)) {
        if (metric.isAlarm) {
          const k = key.toLowerCase();
          if (k.includes('temp')) zoneType = 'temperature';
          else if (k.includes('press')) zoneType = 'pressure';
          else if (k.includes('vib')) zoneType = 'vibration';
          else if (k.includes('flow')) zoneType = 'leak'; // low flow = potential leak
          break;
        }
      }

      zones.push({
        id: `alert-${asset.assetId}`,
        assetId: asset.assetId,
        zoneType,
        severity: asset.status,
        color: STATUS_COLORS[asset.status],
        radius: isAlarm ? 8 : 4,
        pulseAnimation: isAlarm,
        label: `${asset.assetName} — ${asset.status.toUpperCase()}`,
        description: isAlarm
          ? `Asset in ALARM state: ${Object.entries(asset.metrics).filter(([, m]) => m.isAlarm).map(([, m]) => m.label).join(', ') || 'unknown cause'}`
          : `Asset showing WARNING: deviation detected`,
      });
    }

    return zones;
  },

  // ── Summary Computation ────────────────────────────────────────────────

  /**
   * Compute overall overlay summary statistics.
   *
   * Health score: weighted by status priorities.
   * H = (Σ priority_weight) / (N × max_priority) × 100
   */
  computeOverlaySummary(assets: AssetOverlay[]): OverlaySummary {
    const counts: Record<AssetStatus, number> = {
      normal: 0, warning: 0, alarm: 0, offline: 0, maintenance: 0, unknown: 0,
    };

    for (const asset of assets) {
      counts[asset.status]++;
    }

    // Health score: each asset contributes inversely to its priority
    let totalWeight = 0;
    for (const asset of assets) {
      // Higher status priority → lower health contribution
      const healthContribution = 6 - asset.statusPriority; // 6–1 range
      totalWeight += healthContribution;
    }
    const maxPossible = assets.length * 6;
    const overallHealthScore = maxPossible > 0 ? Math.round((totalWeight / maxPossible) * 100) : 100;

    return {
      totalAssets: assets.length,
      normalCount: counts.normal,
      warningCount: counts.warning,
      alarmCount: counts.alarm,
      offlineCount: counts.offline,
      maintenanceCount: counts.maintenance,
      overallHealthScore,
      activeAlerts: counts.alarm + counts.warning,
    };
  },
};
