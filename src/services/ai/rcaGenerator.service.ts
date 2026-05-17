// ============================================================================
// AI ROOT CAUSE ANALYSIS (RCA) GENERATOR
// ============================================================================
// Generates structured RCA artifacts from failure data:
// - 5-Why analysis
// - Fishbone (Ishikawa) diagram data
// - Fault tree analysis assistance
// - Failure mode correlation (cluster similar failures)
// - Temporal pattern analysis
// - Equipment interaction (cascade) analysis
// - Corrective action recommendations
// - Auto-generated RCA report
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('ai:rcaGenerator');

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/** Input for generating an RCA */
export interface RCAGenerateRequest {
  failureRecordId?: string;
  assetId?: string;
  workOrderId?: string;
  failureDescription: string;
  failureMode?: string;
  failureDate?: string;
  consequences?: {
    downtimeMinutes?: number;
    repairCost?: number;
    safetyImpact?: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
    environmentalImpact?: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
    productionImpact?: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
  };
  includeHistoricalAnalysis?: boolean;
}

/** Full RCA report output */
export interface RCAReport {
  reportId: string;
  generatedAt: string;
  summary: RCASummary;
  fiveWhyAnalysis: FiveWhyAnalysis;
  fishboneDiagram: FishboneDiagram;
  faultTreeData: FaultTreeData;
  failureCorrelations: FailureCorrelation[];
  temporalPatterns: TemporalPattern[];
  equipmentInteractions: EquipmentInteraction[];
  correctiveActions: CorrectiveAction[];
  evidenceLinks: EvidenceLink[];
  confidence: number;
}

export interface RCASummary {
  failureDescription: string;
  rootCause: string;
  contributingFactors: string[];
  failureCategory: 'mechanical' | 'electrical' | 'instrumentation' | 'process' | 'human_error' | 'external' | 'design' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probabilityOfRecurrence: number; // 0-1
  estimatedImpactIfRecurring: string;
}

/** 5-Why analysis: each why drills deeper into the cause */
export interface FiveWhyAnalysis {
  whys: Array<{
    level: number;
    question: string;
    answer: string;
    evidence?: string;
    confidence: number;
  }>;
  finalRootCause: string;
  systemicIssue: string;
}

/** Fishbone (Ishikawa) diagram data — structured cause categories */
export interface FishboneDiagram {
  title: string;
  effect: string;
  categories: FishboneCategory[];
}

export interface FishboneCategory {
  name: string;        // e.g. "Man", "Machine", "Method", "Material", "Measurement", "Environment"
  causes: string[];
  verifiedCauses: string[];
  likelyRootCauses: string[];
}

/** Simplified fault tree — AND/OR gate logic */
export interface FaultTreeData {
  topEvent: string;
  gates: FaultTreeGate[];
}

export interface FaultTreeGate {
  id: string;
  type: 'AND' | 'OR';
  description: string;
  probability: number;
  children: Array<FaultTreeGate | { type: 'basic_event'; id: string; description: string; probability: number }>;
}

/** Correlated failures — similar failure patterns across assets/time */
export interface FailureCorrelation {
  correlationId: string;
  clusterName: string;
  failureMode: string;
  affectedAssets: Array<{ assetId: string; assetName: string; date: string }>;
  commonFactors: string[];
  correlationStrength: number; // 0-1
}

/** Time-based failure pattern */
export interface TemporalPattern {
  patternType: 'seasonal' | 'weekly' | 'shift_based' | 'age_related' | 'random';
  description: string;
  peakPeriods: string[];
  confidence: number;
  evidence: string;
}

/** Equipment interaction — cascade failures between connected equipment */
export interface EquipmentInteraction {
  sourceAsset: { id: string; name: string };
  targetAsset: { id: string; name: string };
  interactionType: 'mechanical_coupling' | 'process_flow' | 'power_supply' | 'cooling' | 'shared_infrastructure' | 'control_loop';
  cascadeProbability: number;
  historicalCascadeCount: number;
  description: string;
}

/** Recommended corrective action */
export interface CorrectiveAction {
  id: string;
  action: string;
  type: 'immediate' | 'short_term' | 'long_term' | 'systemic';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;  // role, not specific person
  estimatedCost?: string;
  estimatedDuration?: string;
  preventsRecurrence: number; // 0-1
  rationale: string;
}

/** Link to supporting evidence */
export interface EvidenceLink {
  sourceType: 'failure_record' | 'work_order' | 'sensor_reading' | 'inspection' | 'pm_record';
  sourceId: string;
  title: string;
  relevance: string;
}

/** Failure patterns summary (for GET endpoint) */
export interface FailurePatternSummary {
  totalPatterns: number;
  topPatterns: Array<{
    failureMode: string;
    count: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    affectedAssetCount: number;
    lastOccurrence: string;
    suggestedRootCause: string;
  }>;
}

// ============================================================================
// Cause classification rules
// ============================================================================

const FAILURE_CATEGORY_KEYWORDS: Record<string, string[]> = {
  mechanical: ['bearing', 'gear', 'shaft', 'coupling', 'seal', 'gasket', 'vibration', 'wear', 'fatigue', 'crack', 'corrosion', 'erosion', 'misalignment', 'imbalance', 'bolt', 'weld', 'structural'],
  electrical: ['motor', 'cable', 'winding', 'insulation', 'short', 'ground_fault', 'phase', 'voltage', 'current', 'breaker', 'contactor', 'relay', 'overload', 'resistance'],
  instrumentation: ['sensor', 'transmitter', 'calibration', 'signal', 'drift', 'accuracy', ' PLC', 'dcs', 'control_valve', 'positioner', 'converter'],
  process: ['pressure', 'temperature', 'flow', 'level', 'composition', 'fouling', 'scaling', 'plugging', 'cavitation', 'surge', 'hammer'],
  human_error: ['procedure', 'training', 'operator', 'mistake', 'omission', 'bypass', 'override', 'miscommunication', 'fatigue'],
  external: ['weather', 'flood', 'earthquake', 'lightning', 'power_outage', 'grid', 'supply', 'vendor'],
  design: ['inadequate', 'undersized', 'overloaded', 'capacity', 'rating', 'specification', 'margin'],
};

const FISHBONE_CATEGORIES = [
  { name: 'Man (Personnel)', keywords: ['training', 'operator', 'procedure', 'fatigue', 'experience', 'competency', 'awareness', 'communication'] },
  { name: 'Machine (Equipment)', keywords: ['wear', 'failure', 'maintenance', 'design', 'capacity', 'age', 'condition', 'calibration'] },
  { name: 'Method (Process)', keywords: ['procedure', 'sop', 'protocol', 'sequence', 'parameter', 'setting', 'control', 'planning'] },
  { name: 'Material (Supplies)', keywords: ['quality', 'specification', 'contamination', 'compatibility', 'degradation', 'substitute', 'batch'] },
  { name: 'Measurement (Inspection)', keywords: ['inspection', 'monitoring', 'sensor', 'gauge', 'calibration', 'tolerance', 'verification', 'testing'] },
  { name: 'Environment', keywords: ['temperature', 'humidity', 'vibration', 'dust', 'chemical', 'corrosive', 'weather', 'cleanliness'] },
];

// ============================================================================
// Main Service
// ============================================================================

export class RCAGeneratorService {

  /**
   * Generate a full RCA report for a failure.
   *
   * Algorithm overview:
   * 1. Load failure data + asset history + similar failures from DB
   * 2. Classify failure category from keywords
   * 3. Generate 5-Why chain using template + historical evidence
   * 4. Build Ishikawa fishbone by mapping causes to 6M categories
   * 5. Construct fault tree with AND/OR gates from contributing factors
   * 6. Correlate with similar failures across assets (DB query)
   * 7. Analyze temporal patterns (time-of-day, day-of-week, seasonal, age)
   * 8. Identify equipment interactions (cascade risk from DB relationships)
   * 9. Recommend corrective actions prioritized by impact
   * 10. Gather evidence links from related records
   */
  static async generateRCA(request: RCAGenerateRequest): Promise<RCAReport> {
    const timer = logger.timer('rca.generate');

    try {
      // --- 1. Load context data from DB ---
      const failureRecord = request.failureRecordId
        ? await db.failureRecord.findUnique({
            where: { id: request.failureRecordId },
            include: {
              asset: { select: { id: true, name: true, assetTag: true, condition: true, criticality: true, categoryId: true, parentAssetId: true } },
              workOrder: { select: { id: true, title: true, description: true, actualHours: true, rootCause: true, findings: true, correctiveAction: true } },
              component: { select: { id: true, componentCode: true, name: true, componentType: true } },
            },
          })
        : null;

      const assetId = request.assetId || failureRecord?.assetId;
      const asset = failureRecord?.asset
        ? failureRecord.asset
        : assetId
          ? await db.asset.findUnique({
              where: { id: assetId },
              select: { id: true, name: true, assetTag: true, condition: true, criticality: true, categoryId: true, parentAssetId: true },
            })
          : null;

      const failureMode = request.failureMode || failureRecord?.failureMode || '';
      const failureDesc = request.failureDescription || failureRecord?.failureCause || '';

      // --- 2. Classify failure category ---
      const category = classifyFailureCategory(failureDesc, failureMode);
      const severity = determineSeverity(request.consequences, asset?.criticality);

      // --- 3. Fetch historical context ---
      let historicalFailures: Array<{ id: string; failureMode: string; failureCause: string; rootCause: string; correctiveAction: string; detectedAt: Date; assetId: string; asset: { id: string; name: string } }> = [];
      let historicalWOs: Array<{ id: string; title: string; type: string; createdAt: Date; completedAt: Date | null; assetId: string; asset: { id: string; name: string } }> = [];

      if (assetId && request.includeHistoricalAnalysis !== false) {
        const oneYearAgo = new Date(Date.now() - 365 * 86400000);

        [historicalFailures, historicalWOs] = await Promise.all([
          db.failureRecord.findMany({
            where: { assetId, detectedAt: { gte: oneYearAgo } },
            include: { asset: { select: { id: true; name: true } } },
            orderBy: { detectedAt: 'desc' },
            take: 20,
          }),
          db.workOrder.findMany({
            where: { assetId, createdAt: { gte: oneYearAgo }, status: { in: ['completed', 'closed'] } },
            include: { asset: { select: { id: true; name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
        ]);
      }

      // Also get similar failures across all assets with same failure mode
      let similarFailuresAcrossAssets: Array<{ id: string; failureMode: string; failureCause: string; rootCause: string; detectedAt: Date; assetId: string; asset: { id: string; name: string } }> = [];
      if (failureMode) {
        similarFailuresAcrossAssets = await db.failureRecord.findMany({
          where: {
            failureMode: { contains: failureMode, mode: 'insensitive' },
            ...(assetId ? { assetId: { not: assetId } } : {}),
            detectedAt: { gte: new Date(Date.now() - 365 * 86400000) },
          },
          include: { asset: { select: { id: true; name: true } } },
          orderBy: { detectedAt: 'desc' },
          take: 10,
        });
      }

      // --- 4. Generate 5-Why analysis ---
      const fiveWhyAnalysis = generateFiveWhy(
        failureDesc,
        failureMode,
        category,
        failureRecord,
        historicalFailures,
      );

      // --- 5. Build fishbone diagram ---
      const fishboneDiagram = buildFishboneDiagram(failureDesc, failureMode, category, historicalFailures);

      // --- 6. Construct fault tree ---
      const faultTreeData = buildFaultTree(failureDesc, failureMode, fiveWhyAnalysis);

      // --- 7. Correlate failures ---
      const failureCorrelations = correlateFailures(
        historicalFailures,
        similarFailuresAcrossAssets,
      );

      // --- 8. Analyze temporal patterns ---
      const temporalPatterns = analyzeTemporalPatterns(historicalFailures, historicalWOs);

      // --- 9. Identify equipment interactions ---
      const equipmentInteractions = await identifyEquipmentInteractions(assetId, asset, historicalFailures);

      // --- 10. Generate corrective actions ---
      const correctiveActions = generateCorrectiveActions(
        category,
        severity,
        fiveWhyAnalysis,
        fishboneDiagram,
      );

      // --- 11. Gather evidence links ---
      const evidenceLinks = gatherEvidenceLinks(failureRecord, assetId, historicalFailures, historicalWOs);

      // --- Build summary ---
      const recurrenceProbability = estimateRecurrenceProbability(category, severity, historicalFailures.length, correctiveActions);
      const estimatedImpact = estimateRecurringImpact(request.consequences);

      const summary: RCASummary = {
        failureDescription: failureDesc,
        rootCause: fiveWhyAnalysis.finalRootCause,
        contributingFactors: fiveWhyAnalysis.whys.slice(0, 4).map(w => w.answer),
        failureCategory: category,
        severity,
        probabilityOfRecurrence: recurrenceProbability,
        estimatedImpactIfRecurring: estimatedImpact,
      };

      const overallConfidence = calculateRCAConfidence(fiveWhyAnalysis, fishboneDiagram, historicalFailures.length);

      timer.end();

      return {
        reportId: `rca-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        generatedAt: new Date().toISOString(),
        summary,
        fiveWhyAnalysis,
        fishboneDiagram,
        faultTreeData,
        failureCorrelations,
        temporalPatterns,
        equipmentInteractions,
        correctiveActions,
        evidenceLinks,
        confidence: overallConfidence,
      };
    } catch (error) {
      logger.error('RCA generation failed', error);
      throw error;
    }
  }

  /**
   * Get failure patterns summary for dashboard / analytics.
   * Aggregates failure modes, trends, and suggested root causes.
   */
  static async getFailurePatterns(
    plantId?: string,
    months?: number,
  ): Promise<FailurePatternSummary> {
    const lookbackDays = (months || 12) * 30;

    try {
      const failures = await db.failureRecord.findMany({
        where: {
          detectedAt: { gte: new Date(Date.now() - lookbackDays * 86400000) },
          ...(plantId ? { asset: { plantId } } : {}),
        },
        include: { asset: { select: { id: true, name: true, plantId: true } } },
        orderBy: { detectedAt: 'desc' },
        take: 500,
      });

      // Group by failure mode
      const modeMap = new Map<string, { count: number; assets: Set<string>; dates: Date[]; causes: string[] }>();

      for (const f of failures) {
        const mode = f.failureMode || 'Unspecified';
        const entry = modeMap.get(mode) || { count: 0, assets: new Set<string>(), dates: [], causes: [] };
        entry.count++;
        if (f.assetId) entry.assets.add(f.assetId);
        entry.dates.push(f.detectedAt);
        if (f.rootCause) entry.causes.push(f.rootCause);
        modeMap.set(mode, entry);
      }

      const topPatterns = [...modeMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([failureMode, data]) => {
          // Determine trend: compare count in first half vs second half of period
          const midPoint = new Date(Date.now() - (lookbackDays / 2) * 86400000);
          const firstHalf = data.dates.filter(d => d < midPoint).length;
          const secondHalf = data.dates.filter(d => d >= midPoint).length;

          let trend: 'increasing' | 'stable' | 'decreasing';
          if (secondHalf > firstHalf * 1.3) trend = 'increasing';
          else if (secondHalf < firstHalf * 0.7) trend = 'decreasing';
          else trend = 'stable';

          const suggestedCause = data.causes.length > 0
            ? data.causes.sort((a, b) =>
                data.causes.filter(c => c === a).length - data.causes.filter(c => c === b).length,
              ).pop() || 'Investigate'
            : 'Investigate further';

          return {
            failureMode,
            count: data.count,
            trend,
            affectedAssetCount: data.assets.size,
            lastOccurrence: data.dates.length > 0
              ? new Date(Math.max(...data.dates.map(d => d.getTime()))).toISOString()
              : '',
            suggestedRootCause: suggestedCause,
          };
        });

      return {
        totalPatterns: modeMap.size,
        topPatterns,
      };
    } catch (error) {
      logger.error('Failed to get failure patterns', error);
      return { totalPatterns: 0, topPatterns: [] };
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Classify failure into a category based on keyword matching.
 * Uses bag-of-words approach — counts keyword hits per category,
 * picks the category with the most matches.
 */
function classifyFailureCategory(description: string, failureMode: string): RCASummary['failureCategory'] {
  const text = `${description} ${failureMode}`.toLowerCase();
  let bestCategory: RCASummary['failureCategory'] = 'unknown';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(FAILURE_CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as RCASummary['failureCategory'];
    }
  }

  return bestScore > 0 ? bestCategory : 'unknown';
}

/**
 * Determine severity from consequences and asset criticality.
 * Uses a scoring matrix that combines safety, environmental, production
 * impact with asset criticality.
 */
function determineSeverity(
  consequences?: RCAGenerateRequest['consequences'],
  assetCriticality?: string | null,
): RCASummary['severity'] {
  let score = 0;

  const impactScores: Record<string, number> = { none: 0, minor: 1, moderate: 2, major: 3, critical: 4 };
  if (consequences) {
    score += impactScores[consequences.safetyImpact || 'none'] * 3;        // Safety weighted 3x
    score += impactScores[consequences.environmentalImpact || 'none'] * 2; // Environmental 2x
    score += impactScores[consequences.productionImpact || 'none'] * 2;   // Production 2x
  }

  const critScores: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  score += critScores[assetCriticality || 'medium'] || 1;

  if (score >= 12) return 'critical';
  if (score >= 8) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

/**
 * Generate a 5-Why analysis chain.
 * Uses template-based generation keyed by failure category,
 * enriched with actual failure data from historical records.
 *
 * Each "why" level should have:
 * - A question that drills into the cause
 * - An answer derived from the failure data + domain knowledge
 * - Evidence linking to actual records when available
 * - A confidence score (decreases with depth)
 */
function generateFiveWhy(
  description: string,
  failureMode: string,
  category: string,
  failureRecord: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  historicalFailures: Array<{ rootCause: string | null; correctiveAction: string | null }>,
): FiveWhyAnalysis {
  // Category-specific 5-Why templates
  const templates: Record<string, Array<{ question: string; answerPrefix: string }>> = {
    mechanical: [
      { question: 'Why did the equipment fail mechanically?', answerPrefix: 'The component experienced ' },
      { question: 'Why did the component experience this condition?', answerPrefix: 'This was caused by ' },
      { question: 'Why was this underlying cause present?', answerPrefix: 'The underlying cause was ' },
      { question: 'Why was the underlying cause not detected earlier?', answerPrefix: 'It was not detected because ' },
      { question: 'Why did the detection/prevention system fail?', answerPrefix: 'The prevention system failed because ' },
    ],
    electrical: [
      { question: 'Why did the electrical failure occur?', answerPrefix: 'The electrical system failed because ' },
      { question: 'Why was the electrical fault not prevented?', answerPrefix: 'The fault was not prevented due to ' },
      { question: 'Why did the protection system not operate correctly?', answerPrefix: 'The protection system ' },
      { question: 'Why was the condition that led to the fault present?', answerPrefix: 'The condition existed because ' },
      { question: 'Why was this condition not identified during maintenance?', answerPrefix: 'It was not identified because ' },
    ],
    process: [
      { question: 'Why did the process deviation occur?', answerPrefix: 'The process deviated because ' },
      { question: 'Why were the process parameters outside limits?', answerPrefix: 'Parameters went outside limits due to ' },
      { question: 'Why was the control system unable to maintain parameters?', answerPrefix: 'The control system ' },
      { question: 'Why was the root process disturbance present?', answerPrefix: 'The disturbance was caused by ' },
      { question: 'Why was the disturbance not anticipated or mitigated?', answerPrefix: 'It was not mitigated because ' },
    ],
  };

  const defaultTemplate = [
    { question: 'Why did the failure occur?', answerPrefix: 'The failure occurred because ' },
    { question: 'Why was the direct cause present?', answerPrefix: 'The direct cause was ' },
    { question: 'Why was the contributing factor not controlled?', answerPrefix: 'The factor was not controlled because ' },
    { question: 'Why did the management system allow this?', answerPrefix: 'The system allowed it because ' },
    { question: 'Why was the systemic issue not addressed?', answerPrefix: 'The systemic issue was not addressed because ' },
  ];

  const template = templates[category] || defaultTemplate;

  // Extract information from failure record
  const knownRootCause = failureRecord?.rootCause || '';
  const knownCorrectiveAction = failureRecord?.correctiveAction || '';
  const commonRootCauses = historicalFailures
    .map(f => f.rootCause)
    .filter((rc): rc is string => !!rc);

  // Build 5-Why chain
  const whys = template.map((tpl, index) => {
    const confidence = Math.max(0.3, 0.9 - index * 0.12);

    let answer = '';

    if (index === 0) {
      // First why: use actual failure description
      answer = `${tpl.answerPrefix}${description || failureMode || 'an unexpected failure condition was detected'}.`;
    } else if (index === 1 && knownRootCause) {
      answer = `${tpl.answerPrefix}${knownRootCause}.`;
    } else if (index === 4 && knownCorrectiveAction) {
      answer = `${tpl.answerPrefix}${knownCorrectiveAction}.`;
    } else if (index < commonRootCauses.length) {
      answer = `${tpl.answerPrefix}${commonRootCauses[index]} (based on historical pattern).`;
    } else {
      // Generate plausible answer based on category
      const genericAnswers: Record<string, string[]> = {
        mechanical: ['excessive mechanical stress beyond design limits', 'inadequate lubrication leading to accelerated wear', 'material fatigue from cyclic loading', 'lack of condition monitoring on critical parameters', 'PM inspection interval too long for the operating conditions'],
        electrical: ['insulation degradation from thermal aging', 'voltage transient from grid disturbance', 'overloading due to process demand increase', 'connection degradation from thermal cycling', 'inadequate electrical maintenance schedule'],
        process: ['upstream process disturbance propagated downstream', 'control loop tuning inadequate for current operating range', 'process fluid contamination leading to fouling', 'capacity constraint from increased production demand', 'operator procedure not updated for current operating mode'],
        human_error: ['procedure not followed or unavailable at point of use', 'insufficient training on the specific task', 'time pressure led to shortcut being taken', 'communication breakdown between shift teams', 'fatigue from extended work period'],
        instrumentation: ['sensor drift not caught by calibration schedule', 'transmitter failed without alarm indication', 'signal noise masked the actual reading', 'calibration procedure not matching field conditions', 'sensor selection inadequate for process conditions'],
      };

      const answers = genericAnswers[category] || [
        'contributing factors aligned to create the failure condition',
        'mitigation measures were insufficient or not in place',
        'risk assessment did not identify this scenario',
        'inspection frequency was not adequate for the degradation rate',
        'organizational priorities did not allocate resources to this area',
      ];

      answer = `${tpl.answerPrefix}${answers[index] || answers[answers.length - 1]}.`;
    }

    return {
      level: index + 1,
      question: tpl.question,
      answer,
      evidence: index === 1 && knownRootCause ? `From failure record root cause analysis` : undefined,
      confidence,
    };
  });

  const finalRootCause = knownRootCause || whys[whys.length - 1]?.answer || 'Requires further investigation';
  const systemicIssue = whys[whys.length - 1]?.answer || 'Systemic issue identified in 5th why analysis';

  return { whys, finalRootCause, systemicIssue };
}

/**
 * Build a fishbone (Ishikawa) diagram data structure.
 * Maps failure description keywords to the 6M categories
 * (Man, Machine, Method, Material, Measurement, Environment).
 *
 * Algorithm:
 * 1. Tokenize failure description + failure mode
 * 2. Score each category by keyword overlap
 * 3. Generate plausible causes for top categories
 * 4. Mark causes that appear in historical data as "verified"
 * 5. Rank likely root causes by combined score
 */
function buildFishboneDiagram(
  description: string,
  failureMode: string,
  category: string,
  historicalFailures: Array<{ failureCause: string | null; rootCause: string | null }>,
): FishboneDiagram {
  const text = `${description} ${failureMode}`.toLowerCase();

  // Historical root causes for verification
  const historicalRootCauses = historicalFailures
    .map(f => [f.failureCause, f.rootCause])
    .flat()
    .filter((rc): rc is string => !!rc)
    .map(rc => rc.toLowerCase());

  const categories: FishboneCategory[] = FISHBONE_CATEGORIES.map(cat => {
    // Score this category
    const matchedKeywords = cat.keywords.filter(kw => text.includes(kw));
    const score = matchedKeywords.length;

    // Generate causes based on category and score
    const causeTemplates: Record<string, string[]> = {
      'Man (Personnel)': [
        'Insufficient training on equipment operation',
        'Procedure not followed correctly',
        'Operator fatigue or distraction',
        'Inadequate handover between shifts',
        'Safety protocol bypassed',
        'Lack of competency certification',
      ],
      'Machine (Equipment)': [
        'Component wear beyond service limits',
        'Inadequate preventive maintenance',
        'Equipment operated beyond design limits',
        'Age-related degradation',
        'Known design weakness',
        'Incorrect assembly after previous maintenance',
      ],
      'Method (Process)': [
        'Operating procedure not current',
        'Process parameters outside safe limits',
        'Startup/shutdown procedure inadequate',
        'Change management process not followed',
        'Emergency procedure insufficient',
        'Quality check bypassed',
      ],
      'Material (Supplies)': [
        'Wrong material/part installed',
        'Material quality below specification',
        'Contaminated lubricant or fluid',
        'Counterfeit or non-OEM part used',
        'Material exceeded shelf life',
        'Incompatible material combination',
      ],
      'Measurement (Inspection)': [
        'Inspection interval too long',
        'Wrong measurement technique used',
        'Calibration out of date',
        'Critical parameter not monitored',
        'Inspection checklist incomplete',
        'Non-destructive test not performed',
      ],
      'Environment': [
        'Extreme temperature exposure',
        'High humidity / moisture ingress',
        'Corrosive atmosphere',
        'Vibration from adjacent equipment',
        'Dust or particulate contamination',
        'Severe weather event',
      ],
    };

    const causes = causeTemplates[cat.name] || ['Under investigation'];

    // Filter to most relevant causes
    const relevantCauses = score > 0
      ? causes.slice(0, 3 + score)
      : causes.slice(0, 2);

    // Check which causes match historical data
    const verifiedCauses = relevantCauses.filter(cause =>
      historicalRootCauses.some(hrc => hrc.includes(cause.split(' ').slice(0, 3).join(' '))),
    );

    return {
      name: cat.name,
      causes: relevantCauses,
      verifiedCauses,
      likelyRootCauses: verifiedCauses.length > 0 ? verifiedCauses : [causes[0]],
    };
  });

  return {
    title: `Root Cause Analysis — ${failureMode || 'Equipment Failure'}`,
    effect: description || failureMode || 'Equipment failure occurred',
    categories,
  };
}

/**
 * Build a simplified fault tree with AND/OR gates.
 * The tree represents the logic of how sub-events combine to cause the top event.
 *
 * The tree structure:
 * - Top event = the failure
 * - First level: OR gate of failure categories (any can cause the top event)
 * - Second level: AND gates for combined causes within categories
 * - Leaf nodes: basic events (individual failure mechanisms)
 *
 * Probability is propagated bottom-up:
 * - OR gate: P = 1 - (1-P1)(1-P2)...(1-Pn) (union)
 * - AND gate: P = P1 × P2 × ... × Pn (intersection)
 */
function buildFaultTree(
  description: string,
  failureMode: string,
  fiveWhy: FiveWhyAnalysis,
): FaultTreeData {
  const topEvent = `${failureMode || 'Equipment Failure'}: ${description}`;

  // Build gates from 5-Why contributing factors
  const contributingCauses = fiveWhy.whys.slice(0, 4).map(w => ({
    id: `cause-${w.level}`,
    description: w.answer.replace(/^The .* (?:was|occurred because) /, '').replace(/\.$/, ''),
    probability: w.confidence,
  }));

  // Top-level OR gate: failure occurs if ANY contributing cause materializes
  const topGate: FaultTreeGate = {
    id: 'gate-top',
    type: 'OR',
    description: 'Failure occurs if any contributing cause is present',
    probability: 0, // calculated below
    children: [
      // AND gate: direct cause + enabling condition
      {
        id: 'gate-direct',
        type: 'AND',
        description: 'Direct cause AND enabling condition both required',
        probability: 0,
        children: contributingCauses.slice(0, 2).map(c => ({
          type: 'basic_event' as const,
          id: c.id,
          description: c.description,
          probability: c.probability,
        })),
      },
      // AND gate: latent conditions
      {
        id: 'gate-latent',
        type: 'AND',
        description: 'Latent condition AND trigger event',
        probability: 0,
        children: contributingCauses.slice(2, 4).map(c => ({
          type: 'basic_event' as const,
          id: c.id,
          description: c.description,
          probability: c.probability,
        })),
      },
    ],
  };

  // Calculate probabilities bottom-up
  calculateGateProbability(topGate);

  return { topEvent, gates: [topGate] };
}

/**
 * Recursively calculate gate probability from children.
 * OR gate: P = 1 - Π(1 - Pi)  →  "any child triggers"
 * AND gate: P = Π Pi           →  "all children must trigger"
 */
function calculateGateProbability(gate: FaultTreeGate): number {
  let prob = 0;

  for (const child of gate.children) {
    const childProb = 'probability' in child && 'children' in child
      ? calculateGateProbability(child as FaultTreeGate)
      : (child as { type: 'basic_event'; probability: number }).probability;

    if (gate.type === 'OR') {
      prob = 1 - (1 - prob) * (1 - childProb);
    } else {
      prob = prob * childProb;
    }
  }

  gate.probability = Math.round(prob * 1000) / 1000;
  return gate.probability;
}

/**
 * Correlate failures — cluster similar failure modes across assets.
 * Uses simple string similarity (Jaccard on tokenized failure modes)
 * and temporal proximity to identify clusters.
 *
 * In production, use DBSCAN clustering on failure mode embeddings.
 */
function correlateFailures(
  localFailures: Array<{ failureMode: string; failureCause: string | null; assetId: string; detectedAt: Date; asset: { id: string; name: string } }>,
  crossAssetFailures: Array<{ failureMode: string; failureCause: string | null; assetId: string; detectedAt: Date; asset: { id: string; name: string } }>,
): FailureCorrelation[] {
  const allFailures = [...localFailures, ...crossAssetFailures];
  if (allFailures.length < 2) return [];

  // Group by similar failure mode (exact match for now)
  const modeGroups = new Map<string, typeof allFailures>();
  for (const f of allFailures) {
    const mode = (f.failureMode || 'unknown').toLowerCase();
    const existing = modeGroups.get(mode) || [];
    existing.push(f as typeof allFailures[number]);
    modeGroups.set(mode, existing);
  }

  const correlations: FailureCorrelation[] = [];

  for (const [mode, failures] of modeGroups) {
    if (failures.length < 2) continue;

    // Unique assets affected
    const uniqueAssets = [...new Map(failures.map(f => [f.assetId, f])).values()];

    if (uniqueAssets.length < 2) continue; // Only correlate across assets

    // Common factors: extract shared words from failure causes
    const causes = failures.map(f => (f.failureCause || '').toLowerCase()).filter(Boolean);
    const commonWords = findCommonTerms(causes);

    correlations.push({
      correlationId: `corr-${mode.slice(0, 20).replace(/\s+/g, '-')}`,
      clusterName: `${mode} cluster`,
      failureMode: mode,
      affectedAssets: uniqueAssets.slice(0, 5).map(a => ({
        assetId: a.assetId,
        assetName: a.asset.name,
        date: a.detectedAt.toISOString(),
      })),
      commonFactors: commonWords.slice(0, 5),
      correlationStrength: Math.min(1, uniqueAssets.length / 5 * (causes.length > 2 ? 0.8 : 0.5)),
    });
  }

  return correlations.sort((a, b) => b.correlationStrength - a.correlationStrength).slice(0, 5);
}

/**
 * Find common terms across multiple text strings.
 * Returns words that appear in > 50% of the inputs.
 */
function findCommonTerms(texts: string[]): string[] {
  if (texts.length === 0) return [];

  const wordSets = texts.map(t => new Set(t.split(/[\s,;.]+/).filter(w => w.length > 3)));
  const allWords = new Set(wordSets.flat());

  return [...allWords].filter(word => {
    const count = wordSets.filter(ws => ws.has(word)).length;
    return count / wordSets.length > 0.5;
  });
}

/**
 * Analyze temporal patterns in failure data.
 * Checks for: seasonal, weekly, shift-based, age-related patterns.
 *
 * Algorithm:
 * - Seasonal: check if failures cluster in specific months
 * - Weekly: check if failures cluster on specific weekdays
 * - Shift-based: check if failures cluster in specific hours
 * - Age-related: check if failure rate increases with asset age
 *
 * Uses chi-squared-inspired deviation from uniform distribution.
 */
function analyzeTemporalPatterns(
  failures: Array<{ detectedAt: Date }>,
  workOrders: Array<{ createdAt: Date; completedAt: Date | null }>,
): TemporalPattern[] {
  const patterns: TemporalPattern[] = [];
  const events = [
    ...failures.map(f => f.detectedAt),
    ...workOrders.map(w => w.createdAt),
  ];

  if (events.length < 5) return patterns;

  // --- Seasonal pattern ---
  const monthCounts = new Array(12).fill(0) as number[];
  for (const e of events) monthCounts[e.getMonth()]++;
  const avgPerMonth = events.length / 12;
  const peakMonths = monthCounts
    .map((c, i) => ({ month: i, count: c }))
    .filter(m => m.count > avgPerMonth * 1.5)
    .sort((a, b) => b.count - a.count);

  if (peakMonths.length > 0) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    patterns.push({
      patternType: 'seasonal',
      description: `Failures are ${peakMonths.length > 1 ? 'more frequent' : 'peaking'} during ${peakMonths.map(p => monthNames[p.month]).join(', ')}.`,
      peakPeriods: peakMonths.map(p => monthNames[p.month]),
      confidence: Math.min(0.9, 0.5 + peakMonths.length * 0.1),
      evidence: `Peak months have ${Math.round(peakMonths[0].count / avgPerMonth * 100)}% of average monthly failures.`,
    });
  }

  // --- Weekly pattern ---
  const dayCounts = new Array(7).fill(0) as number[];
  for (const e of events) dayCounts[e.getDay()]++;
  const avgPerDay = events.length / 7;
  const peakDays = dayCounts
    .map((c, i) => ({ day: i, count: c }))
    .filter(d => d.count > avgPerDay * 1.8);

  if (peakDays.length > 0) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    patterns.push({
      patternType: 'weekly',
      description: `Failures are elevated on ${peakDays.map(d => dayNames[d.day]).join(', ')}.`,
      peakPeriods: peakDays.map(d => dayNames[d.day]),
      confidence: Math.min(0.85, 0.4 + peakDays.length * 0.15),
      evidence: `Peak days show ${Math.round(peakDays[0].count / avgPerDay * 100)}% of average daily failures.`,
    });
  }

  // --- Shift pattern ---
  const shiftCounts = { night: 0, day: 0, evening: 0 };
  for (const e of events) {
    const hour = e.getHours();
    if (hour >= 22 || hour < 6) shiftCounts.night++;
    else if (hour >= 6 && hour < 14) shiftCounts.day++;
    else shiftCounts.evening++;
  }
  const totalShiftEvents = shiftCounts.night + shiftCounts.day + shiftCounts.evening;
  const avgPerShift = totalShiftEvents / 3;

  const peakShifts = Object.entries(shiftCounts)
    .filter(([, count]) => count > avgPerShift * 1.8)
    .map(([name]) => name);

  if (peakShifts.length > 0) {
    patterns.push({
      patternType: 'shift_based',
      description: `Failures are more frequent during the ${peakShifts.join('/')} shift(s).`,
      peakPeriods: peakShifts.map(s => `${s} shift (6h blocks)`),
      confidence: Math.min(0.8, 0.4 + peakShifts.length * 0.15),
      evidence: `${peakShifts[0]} shift has ${Math.round(shiftCounts[peakShifts[0] as keyof typeof shiftCounts] / avgPerShift * 100)}% of average failures.`,
    });
  }

  // --- Age-related pattern ---
  // Check if recent failures are increasing in frequency (suggests aging)
  if (events.length >= 10) {
    const sorted = [...events].sort((a, b) => a.getTime() - b.getTime());
    const third = Math.floor(sorted.length / 3);
    const firstThirdRate = third / ((sorted[third].getTime() - sorted[0].getTime()) / (30 * 86400000) || 1);
    const lastThirdRate = (sorted.length - 2 * third) / ((sorted[sorted.length - 1].getTime() - sorted[2 * third].getTime()) / (30 * 86400000) || 1);

    if (lastThirdRate > firstThirdRate * 1.5) {
      patterns.push({
        patternType: 'age_related',
        description: 'Failure rate is increasing over time, suggesting age-related degradation.',
        peakPeriods: ['Most recent period'],
        confidence: Math.min(0.85, 0.5 + (lastThirdRate / firstThirdRate - 1) * 0.3),
        evidence: `Recent failure rate (${lastThirdRate.toFixed(1)}/month) is ${Math.round(lastThirdRate / firstThirdRate * 100)}% of early rate (${firstThirdRate.toFixed(1)}/month).`,
      });
    }
  }

  return patterns;
}

/**
 * Identify equipment interactions — potential cascade failures.
 * Checks for parent-child asset relationships and shared infrastructure.
 *
 * Algorithm:
 * 1. Find parent/sibling assets via asset hierarchy
 * 2. Check if those assets also had failures around the same time
 * 3. Classify interaction type based on relationship
 * 4. Calculate cascade probability from historical coincidence rate
 */
async function identifyEquipmentInteractions(
  assetId: string | undefined,
  asset: { id: string; name: string; parentAssetId: string | null } | null | undefined,
  historicalFailures: Array<{ assetId: string; detectedAt: Date }>,
): Promise<EquipmentInteraction[]> {
  if (!assetId || !asset) return [];

  const interactions: EquipmentInteraction[] = [];

  try {
    // Find child assets (equipment that depends on this one)
    const childAssets = await db.asset.findMany({
      where: { parentAssetId: assetId },
      select: { id: true, name: true },
      take: 10,
    });

    // Find sibling assets (same parent)
    const siblingAssets = asset.parentAssetId
      ? await db.asset.findMany({
          where: { parentAssetId: asset.parentAssetId, id: { not: assetId } },
          select: { id: true, name: true },
          take: 10,
        })
      : [];

    const relatedAssets = [
      ...childAssets.map(a => ({ ...a, interactionType: 'process_flow' as const })),
      ...siblingAssets.map(a => ({ ...a, interactionType: 'shared_infrastructure' as const })),
    ];

    // Check if failures correlate temporally
    const localFailureDates = historicalFailures.map(f => f.detectedAt.getTime());

    for (const related of relatedAssets) {
      const relatedFailures = await db.failureRecord.findMany({
        where: {
          assetId: related.id,
          detectedAt: { gte: new Date(Date.now() - 365 * 86400000) },
        },
        select: { detectedAt: true },
        take: 20,
      });

      if (relatedFailures.length === 0) continue;

      // Count cascade events: failures within 48 hours of each other
      let cascadeCount = 0;
      for (const rf of relatedFailures) {
        const rfTime = rf.detectedAt.getTime();
        if (localFailureDates.some(lfd => Math.abs(rfTime - lfd) < 48 * 3600000)) {
          cascadeCount++;
        }
      }

      if (cascadeCount > 0) {
        const cascadeProbability = Math.min(0.9, cascadeCount / Math.max(1, historicalFailures.length) * 2);

        interactions.push({
          sourceAsset: { id: asset.id, name: asset.name },
          targetAsset: { id: related.id, name: related.name },
          interactionType: related.interactionType,
          cascadeProbability: Math.round(cascadeProbability * 100) / 100,
          historicalCascadeCount: cascadeCount,
          description: `${cascadeCount} historical cascade event(s) detected within 48-hour window between these assets.`,
        });
      }
    }
  } catch {
    // Silently fail — equipment interaction analysis is supplementary
  }

  return interactions.sort((a, b) => b.cascadeProbability - a.cascadeProbability).slice(0, 5);
}

/**
 * Generate corrective action recommendations.
 * Prioritized by: impact on recurrence, cost-benefit, and severity.
 */
function generateCorrectiveActions(
  category: string,
  severity: RCASummary['severity'],
  fiveWhy: FiveWhyAnalysis,
  fishbone: FishboneDiagram,
): CorrectiveAction[] {
  const actions: CorrectiveAction[] = [];
  const idCounter = { value: 0 };
  const nextId = () => `ca-${++idCounter.value}`;

  // Immediate actions (for all failures)
  actions.push({
    id: nextId(),
    action: 'Restore equipment to safe operating condition',
    type: 'immediate',
    priority: severity === 'critical' ? 'critical' : 'high',
    assignedTo: 'Maintenance Technician',
    estimatedDuration: 'Per work order scope',
    preventsRecurrence: 0.1,
    rationale: 'Immediate restoration is required regardless of root cause.',
  });

  // Short-term corrective actions based on category
  const categoryActions: Record<string, string[]> = {
    mechanical: [
      'Implement condition monitoring (vibration, temperature) on affected equipment',
      'Review and adjust PM schedule based on actual degradation rate',
      'Inspect all similar equipment for same failure mode',
      'Update lubrication schedule with OEM-recommended intervals',
    ],
    electrical: [
      'Perform thermographic survey of all electrical connections',
      'Review and update electrical PM checklist',
      'Install power quality monitoring on critical circuits',
      'Verify protection relay settings match current load requirements',
    ],
    process: [
      'Review and update operating procedures to prevent parameter excursions',
      'Install additional process monitoring/alarm points',
      'Review control loop tuning and adjust for current operating range',
      'Conduct process hazard review for affected unit',
    ],
    human_error: [
      'Update and simplify the relevant operating/maintenance procedure',
      'Schedule refresher training for all operators/technicians',
      'Implement pre-task briefing / job safety analysis requirement',
      'Add verification checkpoints in the procedure',
    ],
    instrumentation: [
      'Review calibration schedule and reduce intervals if needed',
      'Install redundant sensing for critical process parameters',
      'Implement sensor health monitoring with drift detection',
      'Update instrument PM checklist with specific acceptance criteria',
    ],
    external: [
      'Install environmental protection (weather shields, lightning arrestors)',
      'Review emergency preparedness for external events',
      'Install UPS/backup power for critical equipment',
      'Update risk assessment to include identified external threats',
    ],
    design: [
      'Conduct engineering review of equipment sizing/capacity',
      'Submit capital request for equipment upgrade/replacement',
      'Install temporary mitigation measures pending permanent fix',
      'Update equipment specifications for future procurement',
    ],
  };

  const actionsForCategory = categoryActions[category] || categoryActions['mechanical'];

  for (const action of actionsForCategory.slice(0, 3)) {
    actions.push({
      id: nextId(),
      action,
      type: 'short_term',
      priority: severity === 'critical' ? 'high' : 'medium',
      assignedTo: 'Maintenance Supervisor',
      estimatedDuration: '2-4 weeks',
      preventsRecurrence: 0.5 + Math.random() * 0.3,
      rationale: `Addresses contributing factors identified in ${category} failure category.`,
    });
  }

  // Long-term / systemic actions
  if (fiveWhy.systemicIssue) {
    actions.push({
      id: nextId(),
      action: `Address systemic issue: ${fiveWhy.systemicIssue.slice(0, 100)}`,
      type: 'long_term',
      priority: 'medium',
      assignedTo: 'Reliability Engineer',
      estimatedDuration: '1-3 months',
      preventsRecurrence: 0.7,
      rationale: 'Addresses the deepest root cause from 5-Why analysis.',
    });
  }

  // Verify fishbone verified causes
  const verifiedCauses = fishbone.categories.flatMap(c => c.verifiedCauses);
  if (verifiedCauses.length > 0) {
    actions.push({
      id: nextId(),
      action: `Validate and close verified root cause gaps: ${verifiedCauses.slice(0, 3).join('; ')}`,
      type: 'systemic',
      priority: 'medium',
      assignedTo: 'Reliability Engineer',
      estimatedDuration: '1-2 months',
      preventsRecurrence: 0.6,
      rationale: 'Historically verified causes — addressing these has proven effective.',
    });
  }

  return actions.sort((a, b) => b.preventsRecurrence - a.preventsRecurrence);
}

/**
 * Gather evidence links from related records in the database.
 */
function gatherEvidenceLinks(
  failureRecord: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  assetId: string | undefined,
  failures: Array<{ id: string; detectedAt: Date }>,
  workOrders: Array<{ id: string; title: string; createdAt: Date }>,
): EvidenceLink[] {
  const links: EvidenceLink[] = [];

  if (failureRecord) {
    links.push({
      sourceType: 'failure_record',
      sourceId: failureRecord.id,
      title: `Failure Record: ${failureRecord.failureMode || 'Unknown'}`,
      relevance: 'Primary failure record being analyzed',
    });
  }

  if (failureRecord?.workOrderId) {
    links.push({
      sourceType: 'work_order',
      sourceId: failureRecord.workOrderId,
      title: `Work Order: ${failureRecord.workOrder?.title || failureRecord.workOrderId}`,
      relevance: 'Corrective work order for this failure',
    });
  }

  // Recent failures on same asset
  for (const f of failures.slice(0, 3)) {
    links.push({
      sourceType: 'failure_record',
      sourceId: f.id,
      title: `Previous Failure: ${f.id.slice(0, 8)}`,
      relevance: `Previous failure on same asset (${Math.round((Date.now() - f.detectedAt.getTime()) / 86400000)} days ago)`,
    });
  }

  // Recent work orders
  for (const wo of workOrders.slice(0, 3)) {
    links.push({
      sourceType: 'work_order',
      sourceId: wo.id,
      title: `Related WO: ${wo.title}`,
      relevance: `Maintenance performed on same asset`,
    });
  }

  return links;
}

/**
 * Estimate probability of failure recurrence.
 * Based on: number of past failures, failure category, and
 * effectiveness of proposed corrective actions.
 */
function estimateRecurrenceProbability(
  category: string,
  severity: RCASummary['severity'],
  pastFailureCount: number,
  actions: CorrectiveAction[],
): number {
  // Base recurrence probability from historical frequency
  let prob = Math.min(0.8, pastFailureCount * 0.15);

  // Category adjustment
  const categoryRisk: Record<string, number> = {
    human_error: 0.3, design: 0.25, external: 0.2,
    mechanical: 0.1, electrical: 0.1, process: 0.1,
    instrumentation: 0.05, unknown: 0.15,
  };
  prob += categoryRisk[category] || 0.1;

  // Severity adjustment (critical failures more likely to recur without action)
  if (severity === 'critical') prob += 0.1;

  // Action effectiveness reduction
  const avgEffectiveness = actions.reduce((s, a) => s + a.preventsRecurrence, 0) / Math.max(1, actions.length);
  prob *= (1 - avgEffectiveness * 0.7);

  return Math.round(Math.max(0.05, Math.min(0.9, prob)) * 100) / 100;
}

/**
 * Estimate impact if failure recurs.
 */
function estimateRecurringImpact(consequences?: RCAGenerateRequest['consequences']): string {
  if (!consequences) return 'Moderate — based on failure category';

  const parts: string[] = [];
  if (consequences.downtimeMinutes) parts.push(`${consequences.downtimeMinutes} min downtime`);
  if (consequences.repairCost) parts.push(`$${consequences.repairCost.toLocaleString()} repair cost`);
  if (consequences.safetyImpact && consequences.safetyImpact !== 'none') parts.push(`${consequences.safetyImpact} safety impact`);
  if (consequences.productionImpact && consequences.productionImpact !== 'none') parts.push(`${consequences.productionImpact} production impact`);

  return parts.length > 0 ? `Repeat impact: ${parts.join(', ')}` : 'Moderate — similar to original failure';
}

/**
 * Calculate overall RCA confidence based on data quality.
 * Higher confidence when: more historical data, verified causes, strong correlations.
 */
function calculateRCAConfidence(
  fiveWhy: FiveWhyAnalysis,
  fishbone: FishboneDiagram,
  historicalFailureCount: number,
): number {
  let confidence = 0.4; // base

  // Evidence from 5-Why
  const fiveWhyEvidence = fiveWhy.whys.filter(w => w.evidence).length;
  confidence += fiveWhyEvidence * 0.1;

  // Verified fishbone causes
  const verifiedCount = fishbone.categories.reduce((s, c) => s + c.verifiedCauses.length, 0);
  confidence += verifiedCount * 0.08;

  // Historical data volume
  if (historicalFailureCount >= 10) confidence += 0.15;
  else if (historicalFailureCount >= 5) confidence += 0.1;
  else if (historicalFailureCount >= 2) confidence += 0.05;

  return Math.round(Math.min(0.95, confidence) * 100) / 100;
}
