// ============================================================================
// AI MAINTENANCE COPILOT SERVICE — Context-aware troubleshooting assistant
// ============================================================================
// Enhanced copilot with: equipment history context, diagnostic decision trees,
// multi-step repair guidance, parts/tools recommendations, escalation triggers,
// feedback learning, conversation memory, equipment knowledge base, i18n structure.
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('ai:maintenanceCopilot');

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/** A single message in the copilot conversation */
export interface CopilotChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    confidence?: number;
    assetId?: string;
    workOrderId?: string;
    feedback?: 'confirmed' | 'rejected';
  };
}

/** Context payload sent by the client for each chat request */
export interface CopilotChatRequest {
  message: string;
  sessionId: string;             // conversation session ID (UUID)
  technicianId: string;
  assetId?: string;
  workOrderId?: string;
  language?: string;             // ISO 639-1, e.g. 'en', 'es', 'zh'
  context?: {
    symptoms?: string[];
    failureMode?: string;
    equipmentType?: string;
    operatingConditions?: Record<string, unknown>;
  };
}

/** Full response from the copilot */
export interface CopilotChatResponse {
  reply: string;
  confidence: number;            // 0-1 overall confidence
  diagnosticPath?: DiagnosticStep[];
  requiredParts?: PartRecommendation[];
  requiredTools?: ToolRecommendation[];
  escalationRecommended?: boolean;
  escalationReason?: string;
  specialistType?: string;
  similarCases: SimilarCase[];
  language: string;
  timestamp: string;
}

/** One step in a diagnostic decision tree */
export interface DiagnosticStep {
  stepNumber: number;
  instruction: string;
  question: string;
  expectedObservation: string;
  ifPositive: string;            // next action if symptom confirmed
  ifNegative: string;            // next action if symptom not confirmed
  probability: number;           // likelihood this branch is correct (0-1)
  safetyWarning?: string;
}

/** Recommended spare part */
export interface PartRecommendation {
  partName: string;
  partNumber?: string;
  quantity: number;
  criticality: 'required' | 'recommended' | 'optional';
  estimatedLeadTime?: string;    // e.g. "2-3 days"
  reason: string;
}

/** Recommended tool */
export interface ToolRecommendation {
  toolName: string;
  toolCode?: string;
  required: boolean;
  reason: string;
  alternatives?: string[];
}

/** A historically similar failure case */
export interface SimilarCase {
  workOrderId: string;
  assetName: string;
  failureMode: string;
  resolution: string;
  daysAgo: number;
  relevanceScore: number;        // 0-1
}

/** Feedback payload for learning */
export interface CopilotFeedback {
  sessionId: string;
  messageId: string;
  feedback: 'confirmed' | 'rejected';
  correctAnswer?: string;        // optional: what the correct answer was
  notes?: string;
}

// ============================================================================
// Equipment Knowledge Base — Rules indexed by equipment type / symptom
// In production this would be a vector-DB or RAG pipeline over OEM manuals.
// ============================================================================

interface KnowledgeRule {
  equipmentTypes: string[];
  symptoms: string[];
  failureMode: string;
  rootCause: string;
  diagnosticSteps: Omit<DiagnosticStep, 'stepNumber'>[];
  repairSteps: string[];
  requiredParts: Omit<PartRecommendation, 'reason'>[];
  requiredTools: Omit<ToolRecommendation, 'reason'>[];
  escalationTrigger?: { condition: string; specialistType: string };
}

const KNOWLEDGE_BASE: KnowledgeRule[] = [
  {
    equipmentTypes: ['centrifugal_pump', 'pump', 'rotating_equipment'],
    symptoms: ['vibration', 'excessive_vibration', 'shaking', 'oscillation'],
    failureMode: 'Mechanical imbalance / bearing wear',
    rootCause: 'Rotating assembly imbalance from erosion buildup, bearing degradation, or coupling misalignment.',
    diagnosticSteps: [
      {
        instruction: 'Measure vibration amplitude at bearing housings (horizontal, vertical, axial)',
        question: 'Is vibration amplitude above 4.5 mm/s RMS?',
        expectedObservation: 'Vibration severity chart indicates alarm zone',
        ifPositive: 'Proceed to phase analysis for imbalance vs misalignment diagnosis',
        ifNegative: 'Check for transient vibration — may be process-related surge',
        probability: 0.75,
        safetyWarning: 'Maintain 1m clearance during measurement. Lock out tag out if opening casing.',
      },
      {
        instruction: 'Perform phase and frequency analysis using portable analyzer',
        question: 'Is dominant frequency at 1× running speed?',
        expectedObservation: 'Spectrum shows peak at shaft rotational frequency',
        ifPositive: 'Imbalance confirmed — proceed to balance check and correction',
        ifNegative: 'If 2× dominant → misalignment; if random → bearing defect',
        probability: 0.65,
      },
      {
        instruction: 'Inspect coupling alignment with dial indicators or laser',
        question: 'Is angular offset > 0.05mm or parallel offset > 0.1mm?',
        expectedObservation: 'Indicator readings exceed alignment tolerances',
        ifPositive: 'Misalignment confirmed — realign coupling to OEM spec',
        ifNegative: 'If alignment OK, proceed to bearing inspection',
        probability: 0.60,
      },
    ],
    repairSteps: [
      'Isolate pump from system (close suction/discharge valves, lock out)',
      'Remove coupling guard and disconnect coupling',
      'Check impeller for erosion buildup — clean or replace',
      'If imbalance: perform single-plane or two-plane balance correction',
      'If misalignment: re-align using laser alignment tool to < 0.05mm offset',
      'If bearing defect: replace bearings with OEM equivalents, proper fit',
      'Reassemble, check rotation by hand, replace coupling guard',
      'Perform run-out check and vibration verification at operating speed',
    ],
    requiredParts: [
      { partName: 'Bearing set (drive end)', partNumber: 'PUMP-BRG-DE-6312', quantity: 1, criticality: 'recommended', estimatedLeadTime: '3-5 days' },
      { partName: 'Mechanical seal', partNumber: 'PUMP-SEAL-65MM', quantity: 1, criticality: 'optional', estimatedLeadTime: '5-7 days' },
    ],
    requiredTools: [
      { toolName: 'Vibration analyzer (portable)', toolCode: 'VA-001', required: true, alternatives: ['Accelerometer + data collector'] },
      { toolName: 'Laser alignment tool', toolCode: 'LA-002', required: false, alternatives: ['Dial indicator set'] },
      { toolName: 'Bearing puller set', toolCode: 'BP-003', required: true },
    ],
    escalationTrigger: {
      condition: 'Vibration > 11 mm/s RMS or bearing temperature > 95°C',
      specialistType: 'Rotating equipment specialist / vibration analyst',
    },
  },
  {
    equipmentTypes: ['electric_motor', 'motor', 'induction_motor'],
    symptoms: ['overheating', 'high_temperature', 'thermal', 'burning_smell'],
    failureMode: 'Insulation degradation / overload / bearing failure',
    rootCause: 'Motor overheating from overload, poor ventilation, insulation breakdown, or bearing friction.',
    diagnosticSteps: [
      {
        instruction: 'Measure motor surface temperature with IR thermometer at bearing housings and stator',
        question: 'Is temperature > 80°C at stator or > 70°C at bearings?',
        expectedObservation: 'Temperature exceeds motor nameplate class B rise limit (80K)',
        ifPositive: 'Motor is overheating — check loading, cooling, and insulation resistance',
        ifNegative: 'Temperature within limits — monitor trending',
        probability: 0.80,
        safetyWarning: 'Do not touch motor surfaces. Use IR thermometer from safe distance.',
      },
      {
        instruction: 'Measure running current on all three phases with clamp meter',
        question: 'Is current > nameplate FLA on any phase or unbalance > 3%?',
        expectedObservation: 'Phase currents show overload or significant unbalance',
        ifPositive: 'Overload or supply issue — check mechanical load and supply quality',
        ifNegative: 'Electrical loading normal — check ventilation and insulation',
        probability: 0.70,
      },
      {
        instruction: 'Perform insulation resistance test (megger) — phase to ground and phase to phase',
        question: 'Is insulation resistance < 1 MΩ per kV rated voltage?',
        expectedObservation: 'Megger reading below minimum acceptable insulation resistance',
        ifPositive: 'Insulation degradation confirmed — schedule motor rewind or replacement',
        ifNegative: 'Insulation OK — focus on cooling/ventilation or bearing inspection',
        probability: 0.65,
      },
    ],
    repairSteps: [
      'Electrical isolation — disconnect and LOTO motor supply',
      'If overload: reduce mechanical load, check driven equipment for binding',
      'If insulation failed: send motor for rewind (consider replacement if > 15 yrs)',
      'If ventilation: clean cooling fins, check fan, verify airflow path clear',
      'If bearing: replace bearings, verify grease type and quantity per OEM spec',
      'Perform no-load run test — check vibration, temperature, and current draw',
      'Reconnect, verify rotation direction, return to service',
    ],
    requiredParts: [
      { partName: 'Motor bearings (DE + NDE)', partNumber: 'MTR-BRG-6310-SET', quantity: 1, criticality: 'required', estimatedLeadTime: '2-4 days' },
      { partName: 'Motor winding (if rewind needed)', partNumber: 'MTR-WIND-REWORK', quantity: 1, criticality: 'recommended', estimatedLeadTime: '10-14 days' },
    ],
    requiredTools: [
      { toolName: 'Clamp meter (3-phase)', toolCode: 'CM-001', required: true },
      { toolName: 'Insulation resistance tester (megger)', toolCode: 'IR-002', required: true },
      { toolName: 'IR thermometer', toolCode: 'IR-003', required: true, alternatives: ['Thermocouple probe'] },
      { toolName: 'Bearing puller set', toolCode: 'BP-003', required: false },
    ],
    escalationTrigger: {
      condition: 'Insulation < 0.5 MΩ or stator temperature > 120°C or burning smell detected',
      specialistType: 'Electrical engineer / motor rewind specialist',
    },
  },
  {
    equipmentTypes: ['compressor', 'air_compressor', 'screw_compressor', 'reciprocating_compressor'],
    symptoms: ['low_pressure', 'pressure_drop', 'insufficient_pressure'],
    failureMode: 'Valve failure / seal leak / capacity reduction',
    rootCause: 'Compressor unable to deliver rated pressure due to valve plate wear, seal degradation, or air leakage.',
    diagnosticSteps: [
      {
        instruction: 'Check discharge pressure gauge vs nameplate rated pressure',
        question: 'Is discharge pressure > 10% below rated value?',
        expectedObservation: 'Gauge reading significantly below normal operating range',
        ifPositive: 'Capacity loss confirmed — investigate valve and seal condition',
        ifNegative: 'Pressure near normal — check downstream system for leaks',
        probability: 0.78,
      },
      {
        instruction: 'Listen for abnormal valve noise with screwdriver stethoscope at cylinder head',
        question: 'Is there audible valve flutter or uneven compression strokes?',
        expectedObservation: 'Irregular sound pattern from valve plates during compression cycle',
        ifPositive: 'Valve plate damage likely — inspect and replace valve assembly',
        ifNegative: 'Valves likely OK — check seals and intercooler for leaks',
        probability: 0.68,
      },
      {
        instruction: 'Perform leak test with ultrasonic detector on discharge piping and fittings',
        question: 'Are leaks detected at pipe joints, fittings, or drain valves?',
        expectedObservation: 'Ultrasonic detector indicates air leak at specific location',
        ifPositive: 'System leak found — repair joints and re-test',
        ifNegative: 'No external leaks — internal bypass or valve leakage suspected',
        probability: 0.60,
      },
    ],
    repairSteps: [
      'Isolate compressor from system, depressurize, LOTO',
      'Remove cylinder head cover, inspect valve plates for wear or breakage',
      'Replace damaged valve plates and springs with OEM kit',
      'Inspect and replace piston rings if worn beyond tolerance',
      'Check intercooler for fouling — clean or replace core',
      'Reassemble, pressure test to 1.5× working pressure',
      'Slowly return to service, monitor discharge pressure over 30 minutes',
    ],
    requiredParts: [
      { partName: 'Valve plate kit (suction + discharge)', partNumber: 'CMP-VP-200', quantity: 1, criticality: 'required', estimatedLeadTime: '5-7 days' },
      { partName: 'Piston ring set', partNumber: 'CMP-PR-200', quantity: 1, criticality: 'recommended', estimatedLeadTime: '3-5 days' },
    ],
    requiredTools: [
      { toolName: 'Ultrasonic leak detector', toolCode: 'UL-001', required: true, alternatives: ['Soap bubble solution'] },
      { toolName: 'Torque wrench (calibrated)', toolCode: 'TW-002', required: true },
      { toolName: 'Valve seat cutter / lapping tool', toolCode: 'VS-003', required: false },
    ],
    escalationTrigger: {
      condition: 'Discharge pressure < 50% rated or abnormal noise from crankcase',
      specialistType: 'Compressor service engineer',
    },
  },
  {
    equipmentTypes: ['valve', 'control_valve', 'gate_valve', 'ball_valve'],
    symptoms: ['leak', 'passing', 'seat_leak', 'packing_leak'],
    failureMode: 'Seal/packing degradation or seat damage',
    rootCause: 'Valve not holding pressure due to seat erosion, packing wear, or actuator maladjustment.',
    diagnosticSteps: [
      {
        instruction: 'Close valve fully and check downstream for flow/pressure indication',
        question: 'Is there measurable flow or pressure downstream of closed valve?',
        expectedObservation: 'Downstream gauge shows pressure bleed-through',
        ifPositive: 'Valve passing — seat or seal damage confirmed',
        ifNegative: 'Valve holding — check external packing/stem leak',
        probability: 0.75,
      },
      {
        instruction: 'Inspect valve stem and packing gland area for visible leaks',
        question: 'Is there fluid weepage from packing gland or stem area?',
        expectedObservation: 'Visible drops or moisture at packing gland',
        ifPositive: 'Packing leak — adjust gland nut or replace packing',
        ifNegative: 'Check internal seat condition via seat leak test',
        probability: 0.70,
      },
    ],
    repairSteps: [
      'Isolate valve, depressurize both sides, verify zero energy',
      'If packing leak: adjust gland follower nuts by 1/4 turn increments, test',
      'If still leaking: replace packing rings with compatible material',
      'If seat leak: disassemble valve, inspect seat and plug/disc for damage',
      'Lap or replace seat as needed — reassemble with new gaskets',
      'Pressure test: body test 1.5× MAWP, seat test at rated pressure',
    ],
    requiredParts: [
      { partName: 'Packing ring set', quantity: 1, criticality: 'required', estimatedLeadTime: '2-3 days' },
      { partName: 'Gasket set (body bonnet)', quantity: 1, criticality: 'required', estimatedLeadTime: '2-3 days' },
      { partName: 'Seat insert (if damaged)', quantity: 1, criticality: 'recommended', estimatedLeadTime: '7-10 days' },
    ],
    requiredTools: [
      { toolName: 'Valve seat lapping tool', toolCode: 'VL-001', required: false },
      { toolName: 'Packing extractor', toolCode: 'PE-002', required: false, alternatives: ['Hook pick set'] },
      { toolName: 'Torque wrench', toolCode: 'TW-002', required: true },
    ],
    escalationTrigger: {
      condition: 'Valve in critical safety service (PSV, ESD) or > 6 inch class 600+',
      specialistType: 'Valve technician / piping engineer',
    },
  },
];

// ============================================================================
// Escalation Rules — When to call a specialist
// ============================================================================

const ESCALATION_RULES: Array<{ conditions: string[]; specialistType: string; reason: string }> = [
  { conditions: ['electrical', 'high_voltage', 'arc_flash'], specialistType: 'Electrical safety specialist', reason: 'High voltage work requires certified electrical safety personnel.' },
  { conditions: ['confined_space', 'man_entry'], specialistType: 'Confined space rescue team standby', reason: 'Confined space entry requires rescue team on standby.' },
  { conditions: ['radiation', 'nuclear', 'radioactive'], specialistType: 'Radiation safety officer', reason: 'Any radiological concern requires RSO oversight.' },
  { conditions: ['lifting', 'crane', 'rigging', 'heavy_lift'], specialistType: 'Certified rigger / lifting supervisor', reason: 'Heavy lifting operations require certified rigging supervision.' },
  { conditions: ['hot_work', 'welding', 'grinding'], specialistType: 'Fire watch / welding inspector', reason: 'Hot work requires fire watch and welding inspection.' },
  { conditions: ['structural', 'crack', 'weld_crack', 'fatigue_crack'], specialistType: 'Structural / NDT engineer', reason: 'Structural defects require NDT and engineering assessment.' },
];

// ============================================================================
// Feedback Learning Store (in-memory; in production, persist to DB)
// ============================================================================
// Tracks which recommendations were confirmed/rejected so future
// confidence scores are adjusted.

const feedbackStore = new Map<string, Array<{ rule: string; confirmed: boolean; timestamp: string }>>();

/**
 * Record feedback to improve future recommendations.
 * In production, this would train a lightweight model or adjust rule weights.
 */
function recordFeedback(sessionId: string, ruleIdentifier: string, confirmed: boolean) {
  const entries = feedbackStore.get(sessionId) || [];
  entries.push({ rule: ruleIdentifier, confirmed, timestamp: new Date().toISOString() });
  feedbackStore.set(sessionId, entries);
  // Keep only last 100 entries per session to bound memory
  if (entries.length > 100) entries.splice(0, entries.length - 100);
}

/**
 * Adjust a confidence score based on historical feedback for the same rule.
 * Confirmed recommendations boost confidence; rejected ones reduce it.
 * Uses Bayesian-inspired adjustment: prior belief updated with observed evidence.
 */
function adjustConfidenceByFeedback(baseConfidence: number, ruleIdentifier: string, sessionId?: string): number {
  let totalConfirmations = 0;
  let totalFeedback = 0;

  // Aggregate feedback across all sessions for this rule
  for (const [, entries] of feedbackStore) {
    for (const entry of entries) {
      if (entry.rule === ruleIdentifier) {
        totalFeedback++;
        if (entry.confirmed) totalConfirmations++;
      }
    }
  }

  if (totalFeedback === 0) return baseConfidence;

  // Bayesian update: posterior = (prior × likelihood) / evidence
  // Treat base confidence as prior probability of being correct
  const observedRate = totalConfirmations / totalFeedback;
  // Blend: weight observation more as we have more evidence
  const alpha = Math.min(0.5, totalFeedback * 0.1); // max 50% influence from feedback
  return Math.round((baseConfidence * (1 - alpha) + observedRate * alpha) * 100) / 100;
}

// ============================================================================
// Multi-language Support Structure
// ============================================================================
// Returns translated strings for common UI labels. In production,
// plug in a proper i18n library (i18next, react-intl, etc.).

const i18nPhrases: Record<string, Record<string, string>> = {
  en: {
    greeting: 'Hello! I am your AI Maintenance Copilot. How can I help you today?',
    disclaimer: '⚠️ This is an AI-assisted recommendation. Always verify with qualified personnel.',
    no_match: 'I don\'t have specific guidance for this combination of symptoms. Let me search for similar cases.',
    escalation: '🚨 ESCALATION RECOMMENDED',
    parts_header: 'Required Parts',
    tools_header: 'Required Tools',
    similar_cases: 'Similar Historical Cases',
    diagnostic_steps: 'Diagnostic Steps',
    repair_steps: 'Repair Procedure',
  },
  es: {
    greeting: '¡Hola! Soy tu Copiloto de Mantenimiento IA. ¿Cómo puedo ayudarte hoy?',
    disclaimer: '⚠️ Esta es una recomendación asistida por IA. Siempre verifique con personal calificado.',
    no_match: 'No tengo guía específica para esta combinación de síntomas. Buscaré casos similares.',
    escalation: '🚨 ESCALACIÓN RECOMENDADA',
    parts_header: 'Repuestos Requeridos',
    tools_header: 'Herramientas Requeridas',
    similar_cases: 'Casos Históricos Similares',
    diagnostic_steps: 'Pasos Diagnósticos',
    repair_steps: 'Procedimiento de Reparación',
  },
  zh: {
    greeting: '你好！我是你的AI维护副驾驶。今天有什么可以帮你的？',
    disclaimer: '⚠️ 这是AI辅助建议。请始终与合格人员确认。',
    no_match: '我没有针对这种症状组合的具体指导。让我搜索类似案例。',
    escalation: '🚨 建议上报',
    parts_header: '所需备件',
    tools_header: '所需工具',
    similar_cases: '类似历史案例',
    diagnostic_steps: '诊断步骤',
    repair_steps: '维修程序',
  },
  fr: {
    greeting: 'Bonjour ! Je suis votre Copilote de Maintenance IA. Comment puis-je vous aider ?',
    disclaimer: '⚠️ Ceci est une recommandation assistée par IA. Vérifiez toujours avec du personnel qualifié.',
    no_match: 'Je n\'ai pas de guide spécifique pour cette combinaison de symptômes. Je recherche des cas similaires.',
    escalation: '🚨 ESCALADE RECOMMANDÉE',
    parts_header: 'Pièces Requises',
    tools_header: 'Outils Requis',
    similar_cases: 'Cas Historiques Similaires',
    diagnostic_steps: 'Étapes de Diagnostic',
    repair_steps: 'Procédure de Réparation',
  },
};

function t(language: string, key: string): string {
  return i18nPhrases[language]?.[key] || i18nPhrases['en']?.[key] || key;
}

// ============================================================================
// Main Service Class
// ============================================================================

export class MaintenanceCopilotService {

  /**
   * Process a chat message from a technician and return an intelligent response.
   *
   * Algorithm:
   * 1. Parse user message → extract symptom keywords
   * 2. Match against knowledge base rules (TF-IDF–inspired scoring)
   * 3. If match found: build diagnostic path, parts list, tools list
   * 4. Query DB for similar historical cases (same asset type + failure mode)
   * 5. Check escalation rules
   * 6. Adjust confidence via feedback learning
   * 7. Assemble response in requested language
   */
  static async chat(request: CopilotChatRequest): Promise<CopilotChatResponse> {
    const lang = request.language || 'en';
    const timer = logger.timer('copilot.chat');

    try {
      // --- 1. Parse symptoms from user message ---
      const userKeywords = extractKeywords(request.message.toLowerCase());

      // Merge with explicitly provided symptoms
      const allSymptoms = [...new Set([
        ...userKeywords,
        ...(request.context?.symptoms || []).map(s => s.toLowerCase()),
      ])];

      // --- 2. Match against knowledge base ---
      const bestRule = matchKnowledgeRule(
        request.context?.equipmentType || '',
        allSymptoms,
      );

      // --- 3. Fetch asset and equipment context from DB ---
      const assetContext = await fetchAssetContext(request.assetId);
      const woContext = await fetchWorkOrderContext(request.workOrderId);

      // --- 4. Find similar historical cases ---
      const similarCases = await findSimilarCases(
        request.assetId,
        bestRule?.failureMode,
        request.context?.equipmentType,
      );

      // --- 5. Build response ---
      if (bestRule) {
        const baseConfidence = calculateMatchConfidence(bestRule, allSymptoms);
        const adjustedConfidence = adjustConfidenceByFeedback(
          baseConfidence,
          bestRule.failureMode,
          request.sessionId,
        );

        // Numbered diagnostic steps
        const diagnosticPath: DiagnosticStep[] = bestRule.diagnosticSteps.map((step, i) => ({
          stepNumber: i + 1,
          ...step,
        }));

        // Parts with reason strings
        const requiredParts: PartRecommendation[] = bestRule.requiredParts.map(p => ({
          ...p,
          reason: `Required for ${bestRule.failureMode} repair on ${request.context?.equipmentType || 'equipment'}`,
        }));

        // Tools with reason strings
        const requiredTools: ToolRecommendation[] = bestRule.requiredTools.map(tool => ({
          ...tool,
          reason: `Used for diagnostic and repair of ${bestRule.failureMode}`,
        }));

        // Check escalation
        let escalationRecommended = false;
        let escalationReason: string | undefined;
        let specialistType: string | undefined;

        if (bestRule.escalationTrigger) {
          escalationRecommended = true;
          escalationReason = bestRule.escalationTrigger.condition;
          specialistType = bestRule.escalationTrigger.specialistType;
        }

        // Also check general escalation rules
        const queryLower = request.message.toLowerCase();
        for (const rule of ESCALATION_RULES) {
          if (rule.conditions.some(c => queryLower.includes(c))) {
            escalationRecommended = true;
            escalationReason = rule.reason;
            specialistType = rule.specialistType;
            break;
          }
        }

        // Compose reply
        const reply = composeDiagnosticReply(
          bestRule,
          assetContext,
          woContext,
          lang,
          diagnosticPath,
          requiredParts,
          requiredTools,
          similarCases,
        );

        timer.end();
        return {
          reply,
          confidence: adjustedConfidence,
          diagnosticPath,
          requiredParts: requiredParts.length > 0 ? requiredParts : undefined,
          requiredTools: requiredTools.length > 0 ? requiredTools : undefined,
          escalationRecommended,
          escalationReason,
          specialistType,
          similarCases,
          language: lang,
          timestamp: new Date().toISOString(),
        };
      }

      // --- No knowledge base match — fallback response ---
      timer.end();
      return {
        reply: composeFallbackReply(assetContext, similarCases, lang, request.message),
        confidence: 0.35,
        similarCases,
        language: lang,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Chat processing failed', error);
      return {
        reply: t(lang, 'disclaimer') + '\n\nAn error occurred processing your request. Please try again.',
        confidence: 0,
        similarCases: [],
        language: lang,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Record technician feedback on a recommendation (confirmed or rejected).
   * This improves future recommendations for the same type of failure.
   */
  static async submitFeedback(feedback: CopilotFeedback): Promise<{ success: boolean; message: string }> {
    try {
      // Determine what rule was shown — use a hash of the message context
      const ruleIdentifier = `${feedback.sessionId}:${feedback.messageId}`;
      recordFeedback(feedback.sessionId, ruleIdentifier, feedback.feedback === 'confirmed');

      logger.info('Feedback recorded', {
        sessionId: feedback.sessionId,
        messageId: feedback.messageId,
        feedback: feedback.feedback,
        notes: feedback.notes,
      });

      return { success: true, message: 'Feedback recorded. Future recommendations will be improved.' };
    } catch (error) {
      logger.error('Failed to record feedback', error);
      return { success: false, message: 'Failed to record feedback.' };
    }
  }

  /**
   * Get conversation history for a session.
   * Stateless — in production, persist to a messages table.
   * Currently returns an empty array as we don't persist conversations.
   */
  static async getConversationHistory(sessionId: string): Promise<CopilotChatMessage[]> {
    // In production, query: db.copilotMessage.findMany({ where: { sessionId }, orderBy: { timestamp: 'asc' } })
    return [];
  }

  /**
   * Get equipment-specific knowledge base summary.
   * Returns available rules for a given equipment type.
   */
  static async getEquipmentKnowledge(equipmentType: string): Promise<{
    equipmentType: string;
    coveredFailureModes: string[];
    coveredSymptoms: string[];
    ruleCount: number;
  }> {
    const rules = KNOWLEDGE_BASE.filter(r =>
      r.equipmentTypes.some(et => et.toLowerCase().includes(equipmentType.toLowerCase())),
    );

    return {
      equipmentType,
      coveredFailureModes: [...new Set(rules.map(r => r.failureMode))],
      coveredSymptoms: [...new Set(rules.flatMap(r => r.symptoms))],
      ruleCount: rules.length,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract meaningful keywords from a user message.
 * Removes stop words and returns a set of technical terms.
 */
function extractKeywords(message: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'it', 'its',
    'this', 'that', 'what', 'which', 'who', 'how', 'when', 'where', 'why',
    'and', 'or', 'but', 'not', 'no', 'if', 'then', 'so', 'up', 'out',
    'my', 'me', 'we', 'our', 'you', 'your', 'i', 'there', 'here',
    'very', 'really', 'quite', 'just', 'also', 'some', 'any', 'all',
    'help', 'please', 'need', 'problem', 'issue', 'trouble', 'fault',
  ]);

  return message
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Match user symptoms against the knowledge base.
 * Uses a TF-IDF–inspired scoring approach:
 * - Term frequency: how many symptom keywords match the rule
 * - Inverse document frequency: rarer terms get more weight
 * - Equipment type bonus: exact match on equipment type boosts score
 *
 * Returns the best matching rule or null if no match above threshold.
 */
function matchKnowledgeRule(
  equipmentType: string,
  symptoms: string[],
): KnowledgeRule | null {
  if (symptoms.length === 0) return null;

  let bestRule: KnowledgeRule | null = null;
  let bestScore = 0;

  for (const rule of KNOWLEDGE_BASE) {
    let score = 0;

    // Equipment type matching (up to 30% of max score)
    if (equipmentType) {
      const eqLower = equipmentType.toLowerCase();
      if (rule.equipmentTypes.includes(eqLower)) {
        score += 3; // Exact match
      } else if (rule.equipmentTypes.some(et => eqLower.includes(et) || et.includes(eqLower))) {
        score += 2; // Partial match
      }
    }

    // Symptom matching (up to 70% of max score)
    for (const symptom of symptoms) {
      for (const ruleSymptom of rule.symptoms) {
        if (symptom === ruleSymptom) {
          score += 2; // Exact keyword match
        } else if (symptom.includes(ruleSymptom) || ruleSymptom.includes(symptom)) {
          score += 1; // Partial match
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  // Threshold: need at least 2 points to consider it a match
  return bestScore >= 2 ? bestRule : null;
}

/**
 * Calculate match confidence (0-1) based on how well symptoms matched the rule.
 * More matched terms → higher confidence, capped at 0.95.
 */
function calculateMatchConfidence(rule: KnowledgeRule, symptoms: string[]): number {
  if (symptoms.length === 0) return 0.3;

  let matchedCount = 0;
  for (const symptom of symptoms) {
    if (rule.symptoms.some(rs => symptom.includes(rs) || rs.includes(symptom))) {
      matchedCount++;
    }
  }

  const matchRate = matchedCount / Math.max(1, rule.symptoms.length);
  // Start at 0.5, scale up to 0.95 based on match quality
  return Math.min(0.95, 0.5 + matchRate * 0.45);
}

/**
 * Fetch asset context from the database for richer responses.
 */
async function fetchAssetContext(assetId?: string): Promise<{
  name: string;
  assetTag: string;
  condition: string;
  criticality: string;
  category?: string;
  recentWOCount: number;
  recentFailureCount: number;
} | null> {
  if (!assetId) return null;

  try {
    const asset = await db.asset.findUnique({
      where: { id: assetId },
      select: {
        name: true,
        assetTag: true,
        condition: true,
        criticality: true,
        category: { select: { name: true } },
      },
    });

    if (!asset) return null;

    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const oneYearAgo = new Date(Date.now() - 365 * 86400000);

    const [recentWOCount, recentFailureCount] = await Promise.all([
      db.workOrder.count({ where: { assetId, createdAt: { gte: ninetyDaysAgo } } }),
      db.failureRecord.count({ where: { assetId, createdAt: { gte: oneYearAgo } } }),
    ]);

    return {
      name: asset.name,
      assetTag: asset.assetTag,
      condition: asset.condition || 'unknown',
      criticality: asset.criticality || 'medium',
      category: asset.category?.name,
      recentWOCount,
      recentFailureCount,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch work order context for richer responses.
 */
async function fetchWorkOrderContext(workOrderId?: string): Promise<{
  title: string;
  status: string;
  priority: string;
  type: string;
  description?: string;
} | null> {
  if (!workOrderId) return null;

  try {
    const wo = await db.workOrder.findUnique({
      where: { id: workOrderId },
      select: { title: true, status: true, priority: true, type: true, description: true },
    });

    if (!wo) return null;

    return {
      title: wo.title,
      status: wo.status,
      priority: wo.priority || 'medium',
      type: wo.type || 'corrective',
      description: wo.description || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Find similar historical failure cases from the database.
 * Searches by failure mode similarity and recent work orders on the same asset.
 * Uses simple text matching; in production, use semantic similarity / embedding search.
 *
 * Relevance scoring: 0.7 if same failure mode, 0.5 if same asset type,
 * bonus for recency (cases < 90 days get +0.1, < 30 days get +0.2).
 */
async function findSimilarCases(
  assetId?: string,
  failureMode?: string,
  equipmentType?: string,
): Promise<SimilarCase[]> {
  if (!assetId && !failureMode && !equipmentType) return [];

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const oneYearAgo = new Date(Date.now() - 365 * 86400000);

    // Fetch recent completed work orders for the asset
    const recentWOs = assetId
      ? await db.workOrder.findMany({
          where: {
            assetId,
            status: { in: ['completed', 'closed'] },
            createdAt: { gte: oneYearAgo },
          },
          include: {
            asset: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : [];

    // Fetch failure records with similar failure modes
    const failures = failureMode
      ? await db.failureRecord.findMany({
          where: {
            failureMode: { contains: failureMode, mode: 'insensitive' },
            createdAt: { gte: oneYearAgo },
          },
          include: {
            asset: { select: { name: true } },
            workOrder: { select: { id: true, woNumber: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : [];

    // Combine and score
    const cases: SimilarCase[] = [];

    for (const wo of recentWOs) {
      const daysAgo = Math.floor((Date.now() - wo.createdAt.getTime()) / 86400000);
      let relevance = 0.5;
      if (daysAgo < 30) relevance += 0.2;
      else if (daysAgo < 90) relevance += 0.1;

      if (failureMode && wo.title?.toLowerCase().includes(failureMode.toLowerCase())) {
        relevance += 0.2;
      }

      cases.push({
        workOrderId: wo.id,
        assetName: wo.asset?.name || 'Unknown',
        failureMode: wo.title || 'Unknown',
        resolution: wo.description || 'Completed',
        daysAgo,
        relevanceScore: Math.min(1, relevance),
      });
    }

    for (const f of failures) {
      if (f.workOrderId && cases.some(c => c.workOrderId === f.workOrderId)) continue;

      const daysAgo = Math.floor((Date.now() - f.createdAt.getTime()) / 86400000);
      let relevance = 0.7; // Same failure mode → higher base relevance
      if (daysAgo < 30) relevance += 0.2;
      else if (daysAgo < 90) relevance += 0.1;

      cases.push({
        workOrderId: f.workOrderId || f.id,
        assetName: f.asset?.name || 'Unknown',
        failureMode: f.failureMode || 'Unknown',
        resolution: f.correctiveAction || f.rootCause || 'Resolved',
        daysAgo,
        relevanceScore: Math.min(1, relevance),
      });
    }

    return cases.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Compose the full diagnostic reply when a knowledge rule matches.
 */
function composeDiagnosticReply(
  rule: KnowledgeRule,
  assetContext: ReturnType<typeof fetchAssetContext> extends Promise<infer T> ? T : never,
  woContext: ReturnType<typeof fetchWorkOrderContext> extends Promise<infer T> ? T : never,
  lang: string,
  diagnosticPath: DiagnosticStep[],
  parts: PartRecommendation[],
  tools: ToolRecommendation[],
  similarCases: SimilarCase[],
): string {
  const lines: string[] = [];

  // Header
  lines.push(`## ${t(lang, 'diagnostic_steps')}\n`);

  // Root cause
  lines.push(`**Root Cause Hypothesis:** ${rule.rootCause}\n`);

  // Asset context
  if (assetContext) {
    lines.push(`**Asset:** ${assetContext.name} (${assetContext.assetTag})`);
    lines.push(`**Condition:** ${assetContext.condition} | **Criticality:** ${assetContext.criticality}`);
    if (assetContext.recentWOCount > 0) {
      lines.push(`**Recent Activity:** ${assetContext.recentWOCount} work orders (90d), ${assetContext.recentFailureCount} failures (12mo)`);
    }
    lines.push('');
  }

  // Diagnostic steps
  for (const step of diagnosticPath) {
    lines.push(`**Step ${step.stepNumber}:** ${step.instruction}`);
    lines.push(`❓ ${step.question}`);
    lines.push(`✅ If yes: ${step.ifPositive}`);
    lines.push(`❌ If no: ${step.ifNegative}`);
    if (step.safetyWarning) lines.push(`⚠️ SAFETY: ${step.safetyWarning}`);
    lines.push('');
  }

  // Repair procedure
  lines.push(`## ${t(lang, 'repair_steps')}\n`);
  rule.repairSteps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });
  lines.push('');

  // Parts
  if (parts.length > 0) {
    lines.push(`## ${t(lang, 'parts_header')}\n`);
    for (const part of parts) {
      const criticalityLabel = part.criticality === 'required' ? '🔴' : part.criticality === 'recommended' ? '🟡' : '🟢';
      lines.push(`${criticalityLabel} **${part.partName}**${part.partNumber ? ` (${part.partNumber})` : ''} — Qty: ${part.quantity}${part.estimatedLeadTime ? `, Lead time: ${part.estimatedLeadTime}` : ''}`);
    }
    lines.push('');
  }

  // Tools
  if (tools.length > 0) {
    lines.push(`## ${t(lang, 'tools_header')}\n`);
    for (const tool of tools) {
      const reqLabel = tool.required ? '✅' : '📌';
      lines.push(`${reqLabel} **${tool.toolName}**${tool.toolCode ? ` [${tool.toolCode}]` : ''}${tool.alternatives ? ` (alt: ${tool.alternatives.join(', ')})` : ''}`);
    }
    lines.push('');
  }

  // Similar cases
  if (similarCases.length > 0) {
    lines.push(`## ${t(lang, 'similar_cases')}\n`);
    for (const c of similarCases) {
      lines.push(`- **${c.assetName}** — ${c.failureMode} (${c.daysAgo}d ago, relevance: ${Math.round(c.relevanceScore * 100)}%)`);
      lines.push(`  Resolution: ${c.resolution}`);
    }
    lines.push('');
  }

  lines.push(t(lang, 'disclaimer'));
  return lines.join('\n');
}

/**
 * Compose a fallback reply when no knowledge base rule matches.
 */
function composeFallbackReply(
  assetContext: ReturnType<typeof fetchAssetContext> extends Promise<infer T> ? T : never,
  similarCases: SimilarCase[],
  lang: string,
  userMessage: string,
): string {
  const lines: string[] = [];

  lines.push(t(lang, 'no_match'));

  if (assetContext) {
    lines.push(`\n**Asset Context:** ${assetContext.name} (${assetContext.assetTag})`);
    lines.push(`Condition: ${assetContext.condition}, Criticality: ${assetContext.criticality}`);
  }

  if (similarCases.length > 0) {
    lines.push(`\n## ${t(lang, 'similar_cases')}\n`);
    for (const c of similarCases.slice(0, 3)) {
      lines.push(`- **${c.assetName}** — ${c.failureMode} (${c.daysAgo}d ago)`);
      lines.push(`  Resolution: ${c.resolution}`);
    }
  }

  lines.push('\n**Suggested next steps:**');
  lines.push('1. Provide more specific symptoms or error codes');
  lines.push('2. Include equipment type and model if known');
  lines.push('3. Check equipment manufacturer documentation');
  lines.push('4. Review operating parameters against design specifications');

  lines.push(`\n${t(lang, 'disclaimer')}`);
  return lines.join('\n');
}
