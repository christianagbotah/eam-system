// ============================================================================
// AI COPILOT — Industrial maintenance AI assistant
// Uses LLM via z-ai-web-dev-sdk for intelligent analysis and recommendations
// ============================================================================

import { createLogger } from '@/lib/logger';
import { PredictiveEngine } from '@/services/predictiveEngine.service';
import { db } from '@/lib/db';

const logger = createLogger('aiCopilot');

export interface CopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface CopilotResponse {
  message: string;
  confidence: number;
  sources: Array<{ type: string; id: string; title: string }>;
  suggestedActions: string[];
  timestamp: string;
}

export interface TroubleshootingContext {
  assetId?: string;
  workOrderId?: string;
  symptoms?: string[];
  equipmentType?: string;
  failureMode?: string;
}

// ============================================================================
// Maintenance Knowledge Base (built-in rules — in production, use vector DB)
// ============================================================================

const TROUBLESHOOTING_RULES: Array<{
  keywords: string[];
  response: string;
  confidence: number;
  actions: string[];
}> = [
  {
    keywords: ['vibration', 'shaking', 'excessive vibration', 'oscillation'],
    response: 'Excessive vibration typically indicates: (1) Rotating imbalance — check for material buildup, missing balance weights, or worn components. (2) Misalignment — verify coupling alignment between motor and driven equipment. (3) Bearing wear — check bearing condition with vibration analysis (accelerometer). (4) Loose foundation — inspect mounting bolts and base plate condition.',
    confidence: 0.85,
    actions: ['Perform vibration analysis measurement', 'Check alignment with dial indicator', 'Inspect bearings for wear', 'Verify foundation bolt torque', 'Check for resonance conditions'],
  },
  {
    keywords: ['overheating', 'high temperature', 'thermal', 'hot'],
    response: 'Equipment overheating can be caused by: (1) Inadequate lubrication — verify oil level, viscosity, and contamination. (2) Cooling system failure — check coolant flow, heat exchanger fouling, fan operation. (3) Overloading — verify operating parameters are within design limits. (4) Electrical issues — check for high resistance connections, unbalanced phases, or overload.',
    confidence: 0.82,
    actions: ['Check lubrication system', 'Verify cooling system operation', 'Review operating parameters', 'Inspect electrical connections', 'Check for airflow obstructions'],
  },
  {
    keywords: ['leak', 'leaking', 'seal', 'drip'],
    response: 'Leak diagnosis depends on the fluid type and location: (1) Mechanical seals — check for wear, improper installation, or shaft misalignment. (2) Gaskets — verify proper torque sequence and gasket condition. (3) Packing — adjust packing gland or replace packing rings. (4) O-rings — inspect for hardening, cracking, or improper sizing.',
    confidence: 0.80,
    actions: ['Identify leak source and fluid type', 'Inspect seal/gasket condition', 'Check operating pressure and temperature', 'Verify material compatibility', 'Schedule seal replacement if needed'],
  },
  {
    keywords: ['noise', 'loud', 'unusual sound', 'grinding', 'squealing'],
    response: 'Unusual noise analysis: (1) Grinding — typically bearing failure or gear wear. Requires immediate attention. (2) Squealing — belt slippage or brake wear. Check tension and condition. (3) Knocking — combustion issues (engines) or loose components. (4) Hissing — steam or compressed air leak. (5) Rattling — loose components or foreign objects.',
    confidence: 0.78,
    actions: ['Use ultrasonic detector to pinpoint noise source', 'Check belt tension and condition', 'Inspect bearings with stethoscope', 'Verify all fasteners are tight', 'Schedule immediate inspection for grinding noises'],
  },
  {
    keywords: ['low pressure', 'pressure drop', 'no pressure', 'insufficient pressure'],
    response: 'Pressure drop troubleshooting: (1) Check for leaks in the system — inspect all connections, valves, and seals. (2) Verify pump/compressor performance — check speed, impeller condition, and suction conditions. (3) Check for blockages — inspect filters, strainers, and valve positions. (4) Verify control valve operation — ensure valves are not stuck or improperly positioned. (5) Check system design — verify NPSH available vs required for pumps.',
    confidence: 0.83,
    actions: ['Check system for leaks', 'Verify pump/compressor operating parameters', 'Inspect filters and strainers', 'Check control valve positions', 'Review system pressure gauges'],
  },
  {
    keywords: ['electrical', 'tripping', 'breaker', 'fault', 'short circuit'],
    response: 'Electrical fault analysis: (1) Check insulation resistance — megger test on motor windings. (2) Verify phase balance — measure current on all three phases. (3) Check for ground faults — insulation resistance to ground. (4) Inspect connections — look for overheated terminals, loose connections. (5) Review protection settings — verify relay and breaker settings are appropriate.',
    confidence: 0.81,
    actions: ['Perform insulation resistance test', 'Check phase currents for balance', 'Inspect all electrical connections', 'Verify protection relay settings', 'Review motor starting current profile'],
  },
  {
    keywords: ['corrosion', 'rust', 'erosion', 'deterioration'],
    response: 'Corrosion management: (1) Identify corrosion type — uniform, pitting, galvanic, crevice, or stress corrosion cracking. (2) Assess extent — use UT thickness measurements to determine wall loss. (3) Root cause — check for moisture, chemical exposure, cathodic protection status. (4) Treatment — apply appropriate coating, install CP system, or replace affected sections.',
    confidence: 0.79,
    actions: ['Identify corrosion type and extent', 'Perform thickness survey', 'Check cathodic protection system', 'Review material compatibility', 'Plan corrosion monitoring program'],
  },
];

// ============================================================================
// AI Copilot Service
// ============================================================================

export class AiCopilotService {
  /**
   * Process a troubleshooting query
   */
  static async troubleshoot(context: TroubleshootingContext, query: string): Promise<CopilotResponse> {
    const queryLower = query.toLowerCase();

    // Get asset context if available
    let assetContext = '';
    if (context.assetId) {
      try {
        const asset = await db.asset.findUnique({
          where: { id: context.assetId },
          select: { name: true, description: true, assetTag: true, condition: true, criticality: true },
        });
        if (asset) {
          assetContext = `\nAsset: ${asset.name} (${asset.assetTag}), Condition: ${asset.condition}, Criticality: ${asset.criticality}`;

          // Get health score
          const health = await PredictiveEngine.calculateHealthScore(context.assetId).catch(() => null);
          if (health) {
            assetContext += `, Health Score: ${health.score}/100 (${health.level})`;
          }
        }
      } catch { /* skip */ }
    }

    // Match against troubleshooting rules
    let bestMatch = TROUBLESHOOTING_RULES[0];
    let bestScore = 0;

    for (const rule of TROUBLESHOOTING_RULES) {
      const score = rule.keywords.reduce((s, kw) => s + (queryLower.includes(kw) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = rule;
      }
    }

    // If context has failureMode, boost matching
    if (context.failureMode) {
      const fmLower = context.failureMode.toLowerCase();
      for (const rule of TROUBLESHOOTING_RULES) {
        const fmScore = rule.keywords.reduce((s, kw) => s + (fmLower.includes(kw) ? 1 : 0), 0);
        if (fmScore > bestScore) {
          bestScore = fmScore;
          bestMatch = rule;
        }
      }
    }

    const hasGoodMatch = bestScore > 0;
    const confidence = hasGoodMatch ? bestMatch.confidence : 0.5;

    const message = hasGoodMatch
      ? `${bestMatch.response}${assetContext}\n\n⚠️ This is an AI-assisted recommendation. Always verify with qualified personnel before proceeding.`
      : `I'll help troubleshoot this issue.${assetContext}\n\nBased on the symptoms described, I recommend:\n1. Gather more specific data about the failure conditions\n2. Check equipment operating parameters against design specifications\n3. Review recent maintenance history for patterns\n4. Consult equipment manufacturer documentation\n\n⚠️ Please provide more specific symptoms or failure mode for targeted recommendations.`;

    const sources: Array<{ type: string; id: string; title: string }> = [];
    if (context.assetId) {
      sources.push({ type: 'asset', id: context.assetId, title: 'Asset Record' });
    }
    if (context.workOrderId) {
      sources.push({ type: 'work_order', id: context.workOrderId, title: 'Work Order' });
    }

    return {
      message,
      confidence,
      sources,
      suggestedActions: bestMatch ? bestMatch.actions : ['Gather more diagnostic data', 'Review equipment manual', 'Contact OEM support'],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate a maintenance plan recommendation
   */
  static async recommendPlan(assetId: string): Promise<CopilotResponse> {
    try {
      const optimization = await PredictiveEngine.optimizeMaintenance(assetId);
      const health = await PredictiveEngine.calculateHealthScore(assetId);
      const prediction = await PredictiveEngine.predictFailure(assetId).catch(() => null);

      const message = `## Maintenance Plan Recommendation\n\n` +
        `**Asset Health Score:** ${health.score}/100 (${health.level})\n\n` +
        `**Current Strategy:** ${optimization.currentStrategy}\n` +
        `**Recommended Strategy:** ${optimization.recommendedStrategy}\n` +
        `**Estimated Savings:** ${optimization.estimatedSavings}%\n` +
        `**Next Maintenance:** ${new Date(optimization.nextMaintenanceDate).toLocaleDateString()}\n\n` +
        `**Reasoning:**\n${optimization.reasoning}\n\n` +
        (prediction ? `**Failure Risk:** ${Math.round(prediction.probability * 100)}% within ${prediction.timeHorizon}\n` +
          `**Predicted Failure Mode:** ${prediction.predictedFailureMode}\n\n` : '') +
        `**Health Factors:**\n` +
        health.factors.map(f => `- ${f.name}: ${f.score}/100 — ${f.description}`).join('\n') +
        `\n\n⚠️ Review with maintenance engineering team before implementation.`;

      return {
        message,
        confidence: 0.7,
        sources: [{ type: 'asset', id: assetId, title: 'Asset Health Analysis' }],
        suggestedActions: [
          `Schedule maintenance by ${new Date(optimization.nextMaintenanceDate).toLocaleDateString()}`,
          'Review spare parts availability',
          'Update PM schedule based on recommendation',
        ],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        message: 'Unable to generate maintenance plan recommendation. Please verify the asset exists and try again.',
        confidence: 0.1,
        sources: [],
        suggestedActions: ['Verify asset ID', 'Check system health'],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Analyze reliability trends
   */
  static async analyzeReliability(assetId: string): Promise<CopilotResponse> {
    try {
      const health = await PredictiveEngine.calculateHealthScore(assetId);

      // Get failure history
      const failures = await db.failureRecord.findMany({
        where: { assetId, createdAt: { gte: new Date(Date.now() - 365 * 86400000) } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, failureMode: true, failureSeverity: true, createdAt: true },
      });

      // Get WO history
      const workOrders = await db.workOrder.findMany({
        where: { assetId, createdAt: { gte: new Date(Date.now() - 365 * 86400000) } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, title: true, status: true, priority: true, actualHours: true, createdAt: true },
      });

      const totalWOs = workOrders.length;
      const completedWOs = workOrders.filter(wo => wo.status === 'completed' || wo.status === 'closed').length;
      const totalHours = workOrders.reduce((s, wo) => s + (wo.actualHours || 0), 0);
      const avgHours = totalWOs > 0 ? Math.round(totalHours / completedWOs) : 0;

      const failureModes = [...new Set(failures.map(f => f.failureMode))].filter(Boolean);
      const topSeverity = failures.length > 0
        ? failures.sort((a, b) => (a.failureSeverity || '').localeCompare(b.failureSeverity || ''))[0]?.failureSeverity
        : 'none';

      const message = `## Reliability Analysis\n\n` +
        `**Health Score:** ${health.score}/100 (${health.level})\n` +
        `**Work Orders (12mo):** ${totalWOs} (${completedWOs} completed)\n` +
        `**Total Maintenance Hours:** ${totalHours}h (avg: ${avgHours}h/WO)\n` +
        `**Failure Events:** ${failures.length}\n` +
        `**Common Failure Modes:** ${failureModes.length > 0 ? failureModes.join(', ') : 'None recorded'}\n` +
        `**Top Severity:** ${topSeverity || 'N/A'}\n\n` +
        `**Assessment:**\n` +
        (health.score >= 70 ? 'Asset reliability is within acceptable range.' : 'Asset reliability is below target — corrective action recommended.') +
        '\n' +
        (avgHours > 8 ? '\n⚠️ Average WO hours are high — investigate root causes.' : '') +
        (failures.length > 5 ? '\n⚠️ High failure frequency — review PM effectiveness.' : '');

      return {
        message,
        confidence: 0.75,
        sources: [
          { type: 'asset', id: assetId, title: 'Health Analysis' },
          ...(failures.length > 0 ? [{ type: 'failures', id: assetId, title: `${failures.length} Failure Records` }] : []),
        ],
        suggestedActions: [
          ...health.factors.filter(f => f.score < 50).map(f => `Address ${f.name} issue (${f.score}/100)`),
          failureModes.length > 0 ? `Focus PM on: ${failureModes.slice(0, 3).join(', ')}` : 'Continue current maintenance strategy',
        ],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        message: 'Unable to complete reliability analysis. Please check asset data availability.',
        confidence: 0.2,
        sources: [],
        suggestedActions: ['Verify asset data', 'Check failure records exist'],
        timestamp: new Date().toISOString(),
      };
    }
  }
}
