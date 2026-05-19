// ============================================================================
// AI ANOMALY INTERPRETATION SERVICE
// ============================================================================
// Interprets detected anomalies from monitoring systems:
// - Root cause hypothesis generation
// - Severity classification (informational vs actionable)
// - Anomaly grouping / correlation across equipment
// - Trend interpretation (worsening, stable, improving)
// - Recommended response per anomaly type
// - Anomaly-to-work-order conversion
// - Historical anomaly pattern matching
// - Equipment health narrative generation
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('ai:anomalyInterpreter');

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/** Input: a list of raw anomaly detections */
export interface AnomalyInterpretRequest {
  anomalies: RawAnomaly[];
  plantId?: string;
  includeHistory?: boolean;
  generateWorkOrders?: boolean;
}

export interface RawAnomaly {
  sourceId: string;
  assetId?: string;
  parameterName: string;
  value: number;
  unit?: string;
  expectedMin: number;
  expectedMax: number;
  deviation: number;         // standard deviations
  timestamp: string;
  type: 'spike' | 'drop' | 'drift' | 'noise' | 'level_shift';
}

/** Full interpretation output for a batch of anomalies */
export interface AnomalyInterpretation {
  interpretationId: string;
  generatedAt: string;
  summary: AnomalySummary;
  groups: AnomalyGroup[];
  individualInterpretations: IndividualAnomalyInterpretation[];
  healthNarratives: HealthNarrative[];
  workOrderRecommendations: WorkOrderRecommendation[];
}

export interface AnomalySummary {
  totalAnomalies: number;
  criticalCount: number;
  actionableCount: number;
  informationalCount: number;
  worseningTrendCount: number;
  equipmentAffected: number;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/** A group of correlated anomalies across equipment */
export interface AnomalyGroup {
  groupId: string;
  groupName: string;
  correlationType: 'cascade' | 'common_cause' | 'shared_infrastructure' | 'environmental';
  anomalies: string[];       // indices into individualInterpretations
  sharedRootCause: string;
  confidence: number;
  recommendedAction: string;
}

/** Full interpretation of a single anomaly */
export interface IndividualAnomalyInterpretation {
  index: number;
  sourceId: string;
  assetId?: string;
  assetName?: string;
  parameterName: string;
  value: number;
  expectedRange: { min: number; max: number };
  deviation: number;
  type: string;

  // AI interpretation results
  severity: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  classification: string;        // e.g. "Bearing degradation — vibration spike"
  trend: 'worsening' | 'stable' | 'improving';
  trendConfidence: number;

  rootCauseHypotheses: RootCauseHypothesis[];
  recommendedResponse: RecommendedResponse;
  historicalPattern?: HistoricalPatternMatch;

  // Work order recommendation
  shouldCreateWorkOrder: boolean;
  suggestedWorkOrder?: {
    title: string;
    type: string;
    priority: string;
    description: string;
    assetId?: string;
  };
}

/** A hypothesis about what caused the anomaly */
export interface RootCauseHypothesis {
  hypothesis: string;
  probability: number;
  supportingEvidence: string[];
  disconfirmingEvidence: string[];
  diagnosticAction: string;
}

/** Recommended response action */
export interface RecommendedResponse {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  estimatedUrgency: 'immediate' | 'within_24h' | 'within_72h' | 'within_week' | 'monitor_only';
}

/** Historical pattern match */
export interface HistoricalPatternMatch {
  similarEventCount: number;
  mostRecentSimilarDate: string;
  whatHappenedNext: string;
  historicalResolution: string;
  patternConfidence: number;
}

/** Human-readable health narrative for an asset */
export interface HealthNarrative {
  assetId: string;
  assetName: string;
  narrative: string;
  healthTrend: 'improving' | 'stable' | 'declining';
  keyConcerns: string[];
  recommendations: string[];
  lastUpdated: string;
}

/** Work order recommendation derived from anomalies */
export interface WorkOrderRecommendation {
  anomalyIndices: number[];
  title: string;
  type: string;
  priority: string;
  assetId?: string;
  assetName?: string;
  description: string;
  estimatedHours: number;
  requiredSkills: string[];
  justification: string;
  confidence: number;
}

// ============================================================================
// Domain Knowledge: Parameter → Failure Mode Mapping
// ============================================================================
// Maps monitoring parameters to likely failure modes for root cause hypothesis.

const PARAMETER_FAILURE_MAP: Record<string, Array<{ failureMode: string; threshold: number; keywords: string[] }>> = {
  vibration: [
    { failureMode: 'Bearing wear', threshold: 4.5, keywords: ['bearing', 'race', 'ball', 'roller'] },
    { failureMode: 'Mechanical imbalance', threshold: 3.0, keywords: ['imbalance', 'balance', 'weight'] },
    { failureMode: 'Misalignment', threshold: 3.5, keywords: ['alignment', 'coupling', 'shaft'] },
    { failureMode: 'Loose components', threshold: 2.5, keywords: ['loose', 'bolt', 'fastener', 'mounting'] },
    { failureMode: 'Cavitation (pumps)', threshold: 5.0, keywords: ['cavitation', 'npsh', 'suction'] },
  ],
  temperature: [
    { failureMode: 'Bearing overheating', threshold: 80, keywords: ['bearing', 'grease', 'lubrication'] },
    { failureMode: 'Cooling system failure', threshold: 70, keywords: ['cooling', 'fan', 'heat_exchanger', 'radiator'] },
    { failureMode: 'Overloading', threshold: 85, keywords: ['overload', 'capacity', 'demand'] },
    { failureMode: 'Electrical insulation degradation', threshold: 95, keywords: ['insulation', 'winding', 'motor'] },
  ],
  pressure: [
    { failureMode: 'Seal failure', threshold: 1.15, keywords: ['seal', 'gasket', 'packing'] },
    { failureMode: 'Valve malfunction', threshold: 1.2, keywords: ['valve', 'control', 'regulator'] },
    { failureMode: 'Blockage', threshold: 0.8, keywords: ['blockage', 'filter', 'strainer', 'plug'] },
    { failureMode: 'Pump degradation', threshold: 0.85, keywords: ['pump', 'impeller', 'wear'] },
  ],
  current: [
    { failureMode: 'Motor overload', threshold: 1.1, keywords: ['overload', 'mechanical', 'binding'] },
    { failureMode: 'Winding fault', threshold: 1.15, keywords: ['winding', 'short', 'insulation'] },
    { failureMode: 'Unbalanced load', threshold: 1.05, keywords: ['unbalance', 'phase', 'load'] },
  ],
  flow: [
    { failureMode: 'Blockage', threshold: 0.8, keywords: ['blockage', 'debris', 'fouling'] },
    { failureMode: 'Pump wear', threshold: 0.85, keywords: ['pump', 'wear', 'clearance'] },
    { failureMode: 'Valve failure', threshold: 1.15, keywords: ['valve', 'seat', 'passing'] },
    { failureMode: 'Leak', threshold: 0.9, keywords: ['leak', 'seal', 'crack'] },
  ],
};

// ============================================================================
// Main Service
// ============================================================================

export class AnomalyInterpreterService {

  /**
   * Interpret a batch of anomalies and produce actionable intelligence.
   *
   * Algorithm:
   * 1. Classify each anomaly's severity (informational → critical)
   * 2. Generate root cause hypotheses using domain knowledge + parameter mapping
   * 3. Analyze trends (compare to recent historical readings)
   * 4. Group correlated anomalies (same asset, cascade, common cause)
   * 5. Match against historical patterns
   * 6. Recommend responses per anomaly
   * 7. Determine which anomalies warrant work orders
   * 8. Generate human-readable health narratives per asset
   */
  static async interpretAnomalies(request: AnomalyInterpretRequest): Promise<AnomalyInterpretation> {
    const timer = logger.timer('anomaly.interpret');
    const { anomalies } = request;

    if (anomalies.length === 0) {
      return {
        interpretationId: `ai-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        summary: {
          totalAnomalies: 0, criticalCount: 0, actionableCount: 0,
          informationalCount: 0, worseningTrendCount: 0,
          equipmentAffected: 0, overallRiskLevel: 'low',
        },
        groups: [],
        individualInterpretations: [],
        healthNarratives: [],
        workOrderRecommendations: [],
      };
    }

    try {
      // --- 1. Fetch asset names for context ---
      const assetIds = [...new Set(anomalies.map(a => a.assetId).filter(Boolean) as string[])];
      const assets = assetIds.length > 0
        ? await db.asset.findMany({
            where: { id: { in: assetIds } },
            select: { id: true, name: true, condition: true, criticality: true },
          })
        : [];
      const assetMap = new Map(assets.map(a => [a.id, a]));

      // --- 2. Interpret each anomaly individually ---
      const interpretations: IndividualAnomalyInterpretation[] = [];

      for (let i = 0; i < anomalies.length; i++) {
        const anomaly = anomalies[i];
        const asset = anomaly.assetId ? assetMap.get(anomaly.assetId) : undefined;

        const interpretation = await interpretSingleAnomaly(anomaly, asset, i, request.includeHistory !== false);
        interpretations.push(interpretation);
      }

      // --- 3. Group correlated anomalies ---
      const groups = groupAnomalies(anomalies, interpretations, assetMap);

      // --- 4. Generate health narratives per affected asset ---
      const narratives = await generateHealthNarratives(
        interpretations.filter(interp => interp.assetId),
        assetMap,
      );

      // --- 5. Generate work order recommendations ---
      const woRecommendations = generateWorkOrderRecommendations(
        interpretations,
        groups,
        request.generateWorkOrders !== false,
      );

      // --- 6. Build summary ---
      const criticalCount = interpretations.filter(i => i.severity === 'critical').length;
      const actionableCount = interpretations.filter(i => ['high', 'critical'].includes(i.severity)).length;
      const informationalCount = interpretations.filter(i => i.severity === 'informational').length;
      const worseningCount = interpretations.filter(i => i.trend === 'worsening').length;
      const uniqueAssets = new Set(interpretations.filter(i => i.assetId).map(i => i.assetId)).size;

      let overallRisk: AnomalySummary['overallRiskLevel'] = 'low';
      if (criticalCount > 0 || (actionableCount > 3 && worseningCount > 2)) overallRisk = 'critical';
      else if (actionableCount > 2 || worseningCount > 3) overallRisk = 'high';
      else if (actionableCount > 0 || worseningCount > 1) overallRisk = 'medium';

      const summary: AnomalySummary = {
        totalAnomalies: anomalies.length,
        criticalCount,
        actionableCount,
        informationalCount,
        worseningTrendCount: worseningCount,
        equipmentAffected: uniqueAssets,
        overallRiskLevel: overallRisk,
      };

      timer.end();

      return {
        interpretationId: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        generatedAt: new Date().toISOString(),
        summary,
        groups,
        individualInterpretations: interpretations,
        healthNarratives: narratives,
        workOrderRecommendations: woRecommendations,
      };
    } catch (error) {
      logger.error('Anomaly interpretation failed', error);
      throw error;
    }
  }

  /**
   * Generate a health narrative for a specific asset.
   * Produces a human-readable summary of the asset's current health status.
   */
  static async generateAssetHealthNarrative(
    assetId: string,
  ): Promise<HealthNarrative> {
    const timer = logger.timer('anomaly.healthNarrative');

    try {
      const asset = await db.asset.findUnique({
        where: { id: assetId },
        select: { id: true, name: true, condition: true, criticality: true, description: true },
      });

      if (!asset) {
        throw new Error('Asset not found');
      }

      // Get health score from predictive engine
      let healthScore: { score: number; level: string } | null = null;
      try {
        const { PredictiveEngine } = await import('@/services/predictiveEngine.service');
        healthScore = await PredictiveEngine.calculateHealthScore(assetId);
      } catch { /* skip */ }

      // Get recent work orders
      const recentWOs = await db.workOrder.findMany({
        where: { assetId, createdAt: { gte: new Date(Date.now() - 90 * 86400000) } },
        select: { title: true, status: true, createdAt: true, priority: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Get recent failures
      const recentFailures = await db.failureRecord.findMany({
        where: { assetId, createdAt: { gte: new Date(Date.now() - 365 * 86400000) } },
        select: { failureMode: true, failureSeverity: true, detectedAt: true, rootCause: string | null },
        orderBy: { detectedAt: 'desc' },
        take: 10,
      });

      // Get telemetry data sources for this asset
      const telemetrySources = await db.telemetryDataSource.findMany({
        where: { assetId },
        select: { id: true, name: true, parameterName: true, unit: true },
        take: 20,
      });

      // Build narrative
      const narrative = buildHealthNarrativeText(
        asset,
        healthScore,
        recentWOs,
        recentFailures,
        telemetrySources.length,
      );

      const keyConcerns = buildKeyConcerns(asset, healthScore, recentWOs, recentFailures);
      const recommendations = buildRecommendations(asset, healthScore, recentWOs, recentFailures);

      // Determine health trend
      let healthTrend: HealthNarrative['healthTrend'] = 'stable';
      if (recentWOs.length > 5) healthTrend = 'declining';
      else if (recentFailures.length > 3) healthTrend = 'declining';
      else if (recentWOs.length <= 1 && recentFailures.length === 0) healthTrend = 'stable';
      if (healthScore && healthScore.score >= 80) healthTrend = 'improving';

      timer.end();

      return {
        assetId,
        assetName: asset.name,
        narrative,
        healthTrend,
        keyConcerns,
        recommendations,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Health narrative generation failed', error);
      throw error;
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Interpret a single anomaly.
 * Combines deviation magnitude, parameter type, and historical context
 * to produce severity, hypotheses, trend, and response recommendations.
 */
async function interpretSingleAnomaly(
  anomaly: RawAnomaly,
  asset: { id: string; name: string; condition: string | null; criticality: string | null } | undefined,
  index: number,
  includeHistory: boolean,
): Promise<IndividualAnomalyInterpretation> {
  // --- Severity classification ---
  // Based on deviation magnitude and asset criticality
  let severity: IndividualAnomalyInterpretation['severity'];
  if (anomaly.deviation > 5) severity = 'critical';
  else if (anomaly.deviation > 4) severity = 'high';
  else if (anomaly.deviation > 3) severity = 'medium';
  else if (anomaly.deviation > 2) severity = 'low';
  else severity = 'informational';

  // Boost severity for critical assets
  if (asset?.criticality === 'critical' && ['low', 'medium'].includes(severity)) {
    severity = severity === 'medium' ? 'high' : 'medium';
  }

  // --- Classification ---
  const classification = classifyAnomaly(anomaly);

  // --- Root cause hypotheses ---
  const hypotheses = generateRootCauseHypotheses(anomaly, severity, asset);

  // --- Trend analysis ---
  const { trend, confidence: trendConfidence } = await analyzeAnomalyTrend(anomaly, includeHistory);

  // --- Historical pattern matching ---
  let historicalPattern: HistoricalPatternMatch | undefined;
  if (includeHistory && asset) {
    historicalPattern = await matchHistoricalPattern(anomaly, asset.id);
  }

  // --- Recommended response ---
  const recommendedResponse = generateRecommendedResponse(anomaly, severity, classification, trend);

  // --- Work order recommendation ---
  const shouldCreateWO = shouldCreateWorkOrder(anomaly, severity, trend);
  const suggestedWO = shouldCreateWO ? buildSuggestedWorkOrder(anomaly, severity, classification, asset) : undefined;

  return {
    index,
    sourceId: anomaly.sourceId,
    assetId: anomaly.assetId,
    assetName: asset?.name,
    parameterName: anomaly.parameterName,
    value: anomaly.value,
    expectedRange: { min: anomaly.expectedMin, max: anomaly.expectedMax },
    deviation: anomaly.deviation,
    type: anomaly.type,
    severity,
    classification,
    trend,
    trendConfidence,
    rootCauseHypotheses: hypotheses,
    recommendedResponse,
    historicalPattern,
    shouldCreateWorkOrder: shouldCreateWO,
    suggestedWorkOrder: suggestedWO,
  };
}

/**
 * Classify anomaly type into a human-readable failure mode description.
 * Uses parameter name matching against domain knowledge map.
 */
function classifyAnomaly(anomaly: RawAnomaly): string {
  const paramLower = anomaly.parameterName.toLowerCase();
  const typeLabel = anomaly.type === 'spike' ? 'spike' : anomaly.type === 'drop' ? 'drop' : anomaly.type === 'drift' ? 'drift' : anomaly.type === 'level_shift' ? 'level shift' : 'irregular pattern';

  // Check parameter failure map
  for (const [paramCategory, failureModes] of Object.entries(PARAMETER_FAILURE_MAP)) {
    if (paramLower.includes(paramCategory)) {
      // Find matching failure mode based on deviation severity
      const matched = failureModes.find(fm => anomaly.deviation >= fm.threshold / 10);
      if (matched) {
        return `${matched.failureMode} — ${paramCategory} ${typeLabel}`;
      }
      return `${paramCategory} ${typeLabel} detected`;
    }
  }

  return `Anomalous ${anomaly.parameterName} reading — ${typeLabel}`;
}

/**
 * Generate root cause hypotheses for an anomaly.
 * Uses domain knowledge mapping + generic hypotheses as fallback.
 *
 * Each hypothesis includes:
 * - A description of the suspected root cause
 * - Probability (0-1) based on parameter mapping and severity
 * - Supporting evidence from the anomaly characteristics
 * - Disconfirming evidence (what would rule this out)
 * - Diagnostic action to verify/disprove
 */
function generateRootCauseHypotheses(
  anomaly: RawAnomaly,
  severity: string,
  _asset: { condition: string | null } | undefined,
): RootCauseHypothesis[] {
  const hypotheses: RootCauseHypothesis[] = [];
  const paramLower = anomaly.parameterName.toLowerCase();

  // Domain-specific hypotheses
  for (const [paramCategory, failureModes] of Object.entries(PARAMETER_FAILURE_MAP)) {
    if (!paramLower.includes(paramCategory)) continue;

    for (const fm of failureModes) {
      const isHighDeviation = anomaly.deviation >= fm.threshold / 10;
      const probability = isHighDeviation ? 0.6 + Math.random() * 0.2 : 0.2 + Math.random() * 0.2;

      hypotheses.push({
        hypothesis: `${fm.failureMode}: ${anomaly.parameterName} ${anomaly.type} of ${Math.abs(anomaly.value - anomaly.expectedMax).toFixed(1)} ${anomaly.unit || 'units'} (${anomaly.deviation}σ)`,
        probability: Math.round(probability * 100) / 100,
        supportingEvidence: [
          `${anomaly.parameterName} reading is ${anomaly.deviation}σ from expected range`,
          `Reading direction is consistent with ${fm.failureMode.toLowerCase()} (anomaly type: ${anomaly.type})`,
        ],
        disconfirmingEvidence: [
          `Other ${paramCategory}-related parameters show no anomaly`,
          `Recent maintenance on this component (if any)`,
        ],
        diagnosticAction: `Perform targeted inspection for ${fm.keywords.slice(0, 2).join('/')} — check ${fm.keywords.slice(0, 3).join(', ')}`,
      });
    }

    break; // Only match first parameter category
  }

  // Generic hypotheses (always add)
  hypotheses.push({
    hypothesis: 'Sensor malfunction: The anomalous reading may be caused by sensor drift, failure, or calibration error rather than an actual process/equipment issue.',
    probability: anomaly.deviation < 4 ? 0.4 : 0.2,
    supportingEvidence: [
      'No other parameters on the same equipment show anomalies',
      'Single-point anomaly without confirming evidence',
    ],
    disconfirmingEvidence: [
      'Multiple related parameters show correlated anomalies',
      'Anomaly persists after sensor recalibration',
    ],
    diagnosticAction: 'Verify sensor calibration against a reference measurement or spare sensor.',
  });

  hypotheses.push({
    hypothesis: 'Process transient: The anomaly may be a normal process transient caused by operational changes (startup, shutdown, load change, setpoint change).',
    probability: anomaly.type === 'spike' && anomaly.deviation < 4 ? 0.3 : 0.15,
    supportingEvidence: [
      anomaly.type === 'spike' ? 'Short-duration spike pattern' : 'Anomaly pattern',
      'No sustained deviation from normal range',
    ],
    disconfirmingEvidence: [
      'Anomaly persists beyond normal transient duration',
      'Not correlated with known process changes',
    ],
    diagnosticAction: 'Check process event log for recent operational changes at the time of anomaly.',
  });

  return hypotheses.sort((a, b) => b.probability - a.probability).slice(0, 4);
}

/**
 * Analyze whether an anomaly is worsening, stable, or improving.
 * In a real system, this would compare current readings to historical trend.
 * Uses a simplified heuristic based on anomaly type and available data.
 */
async function analyzeAnomalyTrend(
  anomaly: RawAnomaly,
  includeHistory: boolean,
): Promise<{ trend: 'worsening' | 'stable' | 'improving'; confidence: number }> {
  // If no history available, default to stable
  if (!includeHistory) {
    return { trend: 'stable', confidence: 0.3 };
  }

  try {
    // Try to fetch recent telemetry for trend analysis
    const { TimeSeriesService } = await import('@/services/timeSeries.service');
    const from = new Date(Date.now() - 72 * 3600000).toISOString();
    const recentData = await TimeSeriesService.read({ sourceId: anomaly.sourceId, from, limit: 200 });

    if (recentData.length < 10) {
      return { trend: 'stable', confidence: 0.3 };
    }

    // Simple linear regression slope on the last N data points
    const n = recentData.length;
    const xMean = (n - 1) / 2;
    const yMean = recentData.reduce((s, p) => s + p.value, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (recentData[i].value - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator > 0 ? numerator / denominator : 0;
    const range = anomaly.expectedMax - anomaly.expectedMin;
    const normalizedSlope = range > 0 ? slope / range : 0;

    // Determine trend direction
    let trend: 'worsening' | 'stable' | 'improving';
    if (normalizedSlope > 0.05) {
      trend = anomaly.type === 'drop' ? 'improving' : 'worsening';
    } else if (normalizedSlope < -0.05) {
      trend = anomaly.type === 'drop' ? 'worsening' : 'improving';
    } else {
      trend = 'stable';
    }

    // Confidence based on R² of the fit
    const ssRes = recentData.reduce((s, p, i) => s + (p.value - (yMean + slope * (i - xMean))) ** 2, 0);
    const ssTot = recentData.reduce((s, p) => s + (p.value - yMean) ** 2, 0);
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const confidence = Math.max(0.2, Math.min(0.95, 0.3 + rSquared * 0.6));

    return { trend, confidence: Math.round(confidence * 100) / 100 };
  } catch {
    return { trend: 'stable', confidence: 0.3 };
  }
}

/**
 * Match against historical anomaly patterns.
 * Looks for similar anomaly events on the same asset in the past.
 */
async function matchHistoricalPattern(
  anomaly: RawAnomaly,
  assetId: string,
): Promise<HistoricalPatternMatch | undefined> {
  try {
    // Find previous failure records for this asset with similar failure modes
    const similarFailures = await db.failureRecord.findMany({
      where: {
        assetId,
        createdAt: { gte: new Date(Date.now() - 730 * 86400000) },
      },
      select: { failureMode: true, detectedAt: true, rootCause: string | null, correctiveAction: string | null },
      orderBy: { detectedAt: 'desc' },
      take: 5,
    });

    if (similarFailures.length === 0) return undefined;

    // Check for parameter-name similarity
    const paramWords = anomaly.parameterName.toLowerCase().split(/[\s_]+/);

    for (const failure of similarFailures) {
      const fmLower = (failure.failureMode || '').toLowerCase();
      const hasOverlap = paramWords.some(pw => fmLower.includes(pw));

      if (hasOverlap || similarFailures.length <= 2) {
        return {
          similarEventCount: similarFailures.length,
          mostRecentSimilarDate: failure.detectedAt.toISOString(),
          whatHappenedNext: failure.rootCause
            ? `Root cause identified as: ${failure.rootCause}`
            : 'Root cause not recorded',
          historicalResolution: failure.correctiveAction
            ? `Resolved by: ${failure.correctiveAction}`
            : 'Resolution not recorded',
          patternConfidence: hasOverlap ? 0.7 : 0.35,
        };
      }
    }

    return {
      similarEventCount: similarFailures.length,
      mostRecentSimilarDate: similarFailures[0].detectedAt.toISOString(),
      whatHappenedNext: `${similarFailures.length} historical failure(s) on this asset`,
      historicalResolution: similarFailures[0].correctiveAction || 'Not recorded',
      patternConfidence: 0.3,
    };
  } catch {
    return undefined;
  }
}

/**
 * Generate recommended response actions for an anomaly.
 */
function generateRecommendedResponse(
  anomaly: RawAnomaly,
  severity: string,
  classification: string,
  trend: 'worsening' | 'stable' | 'improving',
): RecommendedResponse {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];

  // Immediate actions
  if (severity === 'critical') {
    immediate.push('ALERT operations team immediately — potential equipment failure imminent');
    immediate.push('Consider emergency shutdown if safety risk identified');
    immediate.push('Dispatch technician for immediate on-site inspection');
  } else if (severity === 'high') {
    immediate.push('Notify maintenance supervisor for prioritized inspection');
    immediate.push('Increase monitoring frequency to 15-minute intervals');
  } else if (severity === 'medium') {
    immediate.push('Log anomaly for maintenance team awareness');
    immediate.push('Increase monitoring frequency to hourly');
  } else {
    immediate.push('Acknowledge anomaly in monitoring system');
  }

  // Short-term (within 24-72h)
  shortTerm.push(`Verify sensor reading is genuine — check for calibration drift`);
  if (severity !== 'informational') {
    shortTerm.push(`Perform on-site inspection of ${anomaly.parameterName} sensor and associated equipment`);
  }
  if (trend === 'worsening') {
    shortTerm.push('Plan for potential maintenance intervention if trend continues');
    shortTerm.push('Review spare parts availability for related failure mode');
  }

  // Long-term (preventive)
  if (severity === 'high' || severity === 'critical') {
    longTerm.push('Add or adjust alarm thresholds for early detection');
    longTerm.push('Review PM schedule for this equipment');
    longTerm.push('Consider installing additional monitoring points');
  }

  // Determine urgency
  let estimatedUrgency: RecommendedResponse['estimatedUrgency'];
  if (severity === 'critical') estimatedUrgency = 'immediate';
  else if (severity === 'high' && trend === 'worsening') estimatedUrgency = 'within_24h';
  else if (severity === 'high') estimatedUrgency = 'within_72h';
  else if (severity === 'medium' && trend === 'worsening') estimatedUrgency = 'within_72h';
  else if (severity === 'medium') estimatedUrgency = 'within_week';
  else estimatedUrgency = 'monitor_only';

  return { immediate, shortTerm, longTerm, estimatedUrgency };
}

/**
 * Determine if an anomaly should generate a work order.
 */
function shouldCreateWorkOrder(
  anomaly: RawAnomaly,
  severity: string,
  trend: 'worsening' | 'stable' | 'improving',
): boolean {
  if (severity === 'critical' || severity === 'high') return true;
  if (severity === 'medium' && trend === 'worsening' && anomaly.deviation > 3.5) return true;
  return false;
}

/**
 * Build a suggested work order from anomaly data.
 */
function buildSuggestedWorkOrder(
  anomaly: RawAnomaly,
  severity: string,
  classification: string,
  asset?: { id: string; name: string } | undefined,
): IndividualAnomalyInterpretation['suggestedWorkOrder'] {
  const priority = severity === 'critical' ? 'emergency' : severity === 'high' ? 'critical' : 'high';

  return {
    title: `Anomaly Response: ${anomaly.parameterName} ${anomaly.type} — ${asset?.name || 'Unknown Asset'}`,
    type: 'corrective',
    priority,
    description: `AI-detected anomaly on ${anomaly.parameterName}: value ${anomaly.value} ${anomaly.unit || ''} (expected: ${anomaly.expectedMin}-${anomaly.expectedMax}). Classification: ${classification}. Deviation: ${anomaly.deviation}σ. Automated work order created for inspection and corrective action.`,
    assetId: asset?.id,
  };
}

/**
 * Group correlated anomalies.
 * Groups anomalies that share:
 * - Same asset (likely same failure)
 * - Similar timestamps (cascade or common cause)
 * - Related parameters (e.g., vibration + temperature = bearing issue)
 */
function groupAnomalies(
  anomalies: RawAnomaly[],
  interpretations: IndividualAnomalyInterpretation[],
  _assetMap: Map<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
): AnomalyGroup[] {
  const groups: AnomalyGroup[] = [];
  const assigned = new Set<number>();

  // Group by asset
  const assetGroups = new Map<string, number[]>();
  for (let i = 0; i < anomalies.length; i++) {
    const assetId = anomalies[i].assetId || 'unknown';
    const existing = assetGroups.get(assetId) || [];
    existing.push(i);
    assetGroups.set(assetId, existing);
  }

  // For assets with multiple anomalies, create a group
  for (const [assetId, indices] of assetGroups) {
    if (indices.length < 2) continue;

    // Check temporal correlation (within 4 hours)
    const timestamps = indices.map(i => new Date(anomalies[i].timestamp).getTime());
    const maxTimeDiff = Math.max(...timestamps) - Math.min(...timestamps);
    const isCorrelated = maxTimeDiff < 4 * 3600000;

    if (isCorrelated) {
      // Determine correlation type
      const parameters = indices.map(i => anomalies[i].parameterName.toLowerCase());
      const hasVibration = parameters.some(p => p.includes('vibration'));
      const hasTemperature = parameters.some(p => p.includes('temperature'));
      const hasPressure = parameters.some(p => p.includes('pressure'));
      const hasFlow = parameters.some(p => p.includes('flow'));

      let correlationType: AnomalyGroup['correlationType'] = 'common_cause';
      let sharedRootCause = 'Multiple parameters anomalous on the same equipment — likely a common failure mode.';

      if (hasVibration && hasTemperature) {
        correlationType = 'cascade';
        sharedRootCause = 'Vibration + temperature anomalies suggest bearing or mechanical degradation with thermal effects.';
      } else if (hasPressure && hasFlow) {
        correlationType = 'cascade';
        sharedRootCause = 'Pressure + flow anomalies suggest a hydraulic system issue (blockage, valve failure, or seal leak).';
      }

      const groupSeverities = indices.map(i => interpretations[i]?.severity);
      const maxSeverity = groupSeverities.includes('critical') ? 'critical' : groupSeverities.includes('high') ? 'high' : 'medium';

      groups.push({
        groupId: `grp-${assetId.slice(0, 8)}-${Date.now()}`,
        groupName: `Multi-parameter anomaly on ${assetId}`,
        correlationType,
        anomalies: indices,
        sharedRootCause,
        confidence: isCorrelated ? 0.75 : 0.5,
        recommendedAction: maxSeverity === 'critical'
          ? 'Treat as single equipment failure — dispatch inspection team for comprehensive assessment.'
          : 'Investigate as correlated anomalies — prioritize inspection of the highest-severity parameter.',
      });

      indices.forEach(i => assigned.add(i));
    }
  }

  // Group remaining unassigned anomalies by parameter similarity
  const unassigned = anomalies.map((_, i) => i).filter(i => !assigned.has(i));
  const paramGroups = new Map<string, number[]>();

  for (const i of unassigned) {
    const paramBase = anomalies[i].parameterName.split(/[\s_\-/]+/)[0].toLowerCase();
    const existing = paramGroups.get(paramBase) || [];
    existing.push(i);
    paramGroups.set(paramBase, existing);
  }

  for (const [param, indices] of paramGroups) {
    if (indices.length < 2) continue;

    groups.push({
      groupId: `grp-param-${param}-${Date.now()}`,
      groupName: `${param}-related anomalies across equipment`,
      correlationType: 'common_cause',
      anomalies: indices,
      sharedRootCause: `Multiple ${param} anomalies may indicate a common cause (e.g., shared utility issue, environmental condition, or systematic problem).`,
      confidence: 0.5,
      recommendedAction: 'Check for common cause: shared utilities, environmental conditions, or recent operational changes affecting multiple equipment.',
    });
  }

  return groups;
}

/**
 * Generate health narratives for affected assets.
 * Produces a human-readable paragraph summarizing the asset's state.
 */
async function generateHealthNarratives(
  interpretations: IndividualAnomalyInterpretation[],
  assetMap: Map<string, { name: string; condition: string | null; criticality: string | null }>,
): Promise<HealthNarrative[]> {
  // Group by asset
  const assetAnomalies = new Map<string, IndividualAnomalyInterpretation[]>();
  for (const interp of interpretations) {
    if (!interp.assetId) continue;
    const existing = assetAnomalies.get(interp.assetId) || [];
    existing.push(interp);
    assetAnomalies.set(interp.assetId, existing);
  }

  const narratives: HealthNarrative[] = [];

  for (const [assetId, assetInterps] of assetAnomalies) {
    const asset = assetMap.get(assetId);
    const name = asset?.name || 'Unknown Asset';

    const critical = assetInterps.filter(i => i.severity === 'critical');
    const high = assetInterps.filter(i => i.severity === 'high');
    const medium = assetInterps.filter(i => i.severity === 'medium');
    const worsening = assetInterps.filter(i => i.trend === 'worsening');

    // Build narrative
    const parts: string[] = [];

    parts.push(`**${name}** is currently showing ${assetInterps.length} anomaly signature(s).`);

    if (critical.length > 0) {
      parts.push(`⚠️ **CRITICAL**: ${critical.length} parameter(s) at critical deviation levels — ${critical.map(i => i.parameterName).join(', ')}.`);
    }
    if (high.length > 0) {
      parts.push(`🔴 **HIGH**: ${high.length} parameter(s) showing significant anomalies — ${high.map(i => i.parameterName).join(', ')}.`);
    }

    if (worsening.length > 0) {
      parts.push(`📉 Trend is **worsening** for ${worsening.length} parameter(s): ${worsening.map(i => i.parameterName).join(', ')}.`);
    } else {
      parts.push('📊 Anomaly trends are currently stable.');
    }

    if (assetInterps.some(i => i.shouldCreateWorkOrder)) {
      parts.push('🔧 Maintenance work order(s) have been recommended for this asset.');
    }

    const healthTrend: HealthNarrative['healthTrend'] = worsening.length > 0 ? 'declining' : 'stable';

    const keyConcerns = [
      ...critical.map(i => `Critical ${i.parameterName} anomaly (${i.deviation}σ deviation)`),
      ...worsening.map(i => `Worsening trend on ${i.parameterName}`),
    ];

    const recommendations = [
      ...assetInterps.filter(i => i.shouldCreateWorkOrder).map(i => `Create work order for ${i.parameterName} inspection`),
      'Increase monitoring frequency',
      ...(worsening.length > 0 ? ['Plan preventive maintenance intervention'] : []),
    ];

    narratives.push({
      assetId,
      assetName: name,
      narrative: parts.join(' '),
      healthTrend,
      keyConcerns,
      recommendations,
      lastUpdated: new Date().toISOString(),
    });
  }

  return narratives;
}

/**
 * Build a suggested work order from anomaly interpretations.
 */
function generateWorkOrderRecommendations(
  interpretations: IndividualAnomalyInterpretation[],
  groups: AnomalyGroup[],
  autoCreate: boolean,
): WorkOrderRecommendation[] {
  if (!autoCreate) return [];

  const recommendations: WorkOrderRecommendation[] = [];
  const woAnomalies = new Set<number>();

  // Individual WOs for critical/high anomalies not in groups
  const groupAnomalies = new Set(groups.flatMap(g => g.anomalies));

  for (const interp of interpretations) {
    if (!interp.shouldCreateWorkOrder) continue;
    if (groupAnomalies.has(interp.index)) continue;

    const wo = buildFullWorkOrderRecommendation([interp]);
    recommendations.push(wo);
    woAnomalies.add(interp.index);
  }

  // Grouped WOs for correlated anomalies
  for (const group of groups) {
    const groupInterps = group.anomalies
      .filter(i => interpretations[i]?.shouldCreateWorkOrder)
      .map(i => interpretations[i]);

    if (groupInterps.length < 2) continue;

    const wo: WorkOrderRecommendation = {
      anomalyIndices: group.anomalies,
      title: `Multi-Parameter Anomaly: ${group.groupName}`,
      type: 'corrective',
      priority: groupInterps.some(i => i.severity === 'critical') ? 'emergency' : 'critical',
      assetId: groupInterps[0]?.assetId,
      assetName: groupInterps[0]?.assetName,
      description: `AI detected ${group.anomalies.length} correlated anomalies: ${groupInterps.map(i => `${i.parameterName} (${i.severity}, ${i.deviation}σ)`).join('; ')}. Shared root cause hypothesis: ${group.sharedRootCause}`,
      estimatedHours: 4 + group.anomalies.length,
      requiredSkills: inferAnomalySkills(groupInterps.map(i => i.parameterName)),
      justification: `Automated recommendation based on correlated anomaly group with confidence ${Math.round(group.confidence * 100)}%.`,
      confidence: group.confidence,
    };

    recommendations.push(wo);
    group.anomalies.forEach(i => woAnomalies.add(i));
  }

  return recommendations.sort((a, b) => {
    const priOrder = { emergency: 0, critical: 1, high: 2, medium: 3 };
    return (priOrder[a.priority] || 4) - (priOrder[b.priority] || 4);
  });
}

function buildFullWorkOrderRecommendation(interps: IndividualAnomalyInterpretation[]): WorkOrderRecommendation {
  const interp = interps[0];
  return {
    anomalyIndices: interps.map(i => i.index),
    title: `Anomaly Response: ${interp.parameterName} ${interp.type}`,
    type: 'corrective',
    priority: interp.suggestedWorkOrder?.priority || 'high',
    assetId: interp.assetId,
    assetName: interp.assetName,
    description: interp.suggestedWorkOrder?.description || `AI-detected anomaly on ${interp.parameterName}. Classification: ${interp.classification}. Deviation: ${interp.deviation}σ.`,
    estimatedHours: 2,
    requiredSkills: inferAnomalySkills([interp.parameterName]),
    justification: `Automated recommendation based on ${interp.severity} severity anomaly with ${interp.deviation}σ deviation.`,
    confidence: interp.trend === 'worsening' ? 0.85 : 0.7,
  };
}

function inferAnomalySkills(parameters: string[]): string[] {
  const skills = new Set<string>();
  const text = parameters.join(' ').toLowerCase();
  if (text.includes('vibration')) skills.add('Vibration Analysis');
  if (text.includes('temperature')) skills.add('Thermography');
  if (text.includes('pressure') || text.includes('flow')) skills.add('Process Engineer');
  if (text.includes('current') || text.includes('voltage')) skills.add('Electrical');
  if (text.includes('electrical')) skills.add('Electrical');
  if (skills.size === 0) skills.add('General Maintenance');
  return [...skills];
}

/**
 * Build health narrative text from asset data.
 */
function buildHealthNarrativeText(
  asset: { name: string; condition: string | null; criticality: string | null; description?: string | null },
  healthScore: { score: number; level: string } | null,
  recentWOs: Array<{ title: string; status: string; priority: string; createdAt: Date }>,
  recentFailures: Array<{ failureMode: string; failureSeverity: string; detectedAt: Date }>,
  telemetryPoints: number,
): string {
  const parts: string[] = [];

  parts.push(`**${asset.name}** (Criticality: ${asset.criticality || 'medium'}, Condition: ${asset.condition || 'unknown'})`);

  if (healthScore) {
    parts.push(`Health Score: ${healthScore.score}/100 (${healthScore.level}).`);
  }

  if (recentWOs.length > 0) {
    parts.push(`${recentWOs.length} work order(s) in the last 90 days.`);
    const recentCritical = recentWOs.filter(wo => wo.priority === 'emergency' || wo.priority === 'critical');
    if (recentCritical.length > 0) {
      parts.push(`${recentCritical.length} high-priority WO(s) — may indicate recurring issues.`);
    }
  }

  if (recentFailures.length > 0) {
    parts.push(`${recentFailures.length} failure event(s) in the last 12 months.`);
    const modes = [...new Set(recentFailures.map(f => f.failureMode))].filter(Boolean);
    if (modes.length > 0) {
      parts.push(`Recurring failure modes: ${modes.join(', ')}.`);
    }
  }

  if (telemetryPoints > 0) {
    parts.push(`Monitored by ${telemetryPoints} telemetry point(s).`);
  } else {
    parts.push('⚠️ No active telemetry monitoring — consider adding sensors for condition-based monitoring.');
  }

  return parts.join(' ');
}

function buildKeyConcerns(
  _asset: { condition: string | null; criticality: string | null },
  healthScore: { score: number } | null,
  recentWOs: Array<{ title: string; priority: string }>,
  recentFailures: Array<{ failureMode: string; failureSeverity: string }>,
): string[] {
  const concerns: string[] = [];

  if (healthScore && healthScore.score < 50) {
    concerns.push(`Low health score (${healthScore.score}/100)`);
  }
  if (recentWOs.filter(wo => wo.priority === 'emergency' || wo.priority === 'critical').length > 3) {
    concerns.push('High frequency of emergency/critical work orders');
  }
  if (recentFailures.length > 5) {
    concerns.push('High failure frequency (5+ in 12 months)');
  }
  const highSeverity = recentFailures.filter(f => f.failureSeverity === 'high' || f.failureSeverity === 'critical');
  if (highSeverity.length > 0) {
    concerns.push(`${highSeverity.length} high-severity failure(s) recorded`);
  }

  return concerns.length > 0 ? concerns : ['No significant concerns identified'];
}

function buildRecommendations(
  _asset: { condition: string | null; criticality: string | null },
  healthScore: { score: number; level: string } | null,
  recentWOs: Array<{ title: string; priority: string }>,
  recentFailures: Array<{ failureMode: string }>,
): string[] {
  const recs: string[] = [];

  if (healthScore && healthScore.score < 40) {
    recs.push('Schedule immediate comprehensive inspection');
    recs.push('Consider equipment replacement or major overhaul planning');
  } else if (healthScore && healthScore.score < 60) {
    recs.push('Increase PM frequency');
    recs.push('Add condition monitoring sensors');
  }

  if (recentWOs.length > 5) {
    recs.push('Review PM effectiveness — high WO frequency suggests PM gaps');
  }

  const failureModes = [...new Set(recentFailures.map(f => f.failureMode))].filter(Boolean);
  if (failureModes.length > 0) {
    recs.push(`Focus PM efforts on: ${failureModes.join(', ')}`);
  }

  if (recs.length === 0) {
    recs.push('Continue current maintenance strategy');
  }

  return recs;
}
