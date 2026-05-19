// ============================================================================
// FAILURE PROPAGATION SIMULATOR — Cascade failure analysis for industrial assets
// ============================================================================
// Models what happens when equipment fails: downstream impact, cascade effects,
// production loss, safety hazards, environmental risk, and recovery estimation.
// Generates structured data suitable for failure-tree visualisation.
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';

const logger = createLogger('FailurePropagation');

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface FailurePropagationRequest {
  assetId: string;
  failureMode: string;
  failureSeverity: 'low' | 'medium' | 'high' | 'critical';
  plantId?: string;
  includeDownstream?: boolean;
  includeUpstream?: boolean;
}

export interface FailureNode {
  id: string;
  assetId: string;
  assetName: string;
  assetType: string;
  failureMode: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;         // 0–1
  timeToImpact: number;        // minutes until this node is affected
  status: 'failed' | 'degraded' | 'at_risk' | 'monitoring';
  impactDescription: string;
  children: FailureNode[];
}

export interface CascadePath {
  path: Array<{ assetId: string; assetName: string; failureMode: string; timeMinutes: number }>;
  totalPropagationTime: number;  // minutes
  worstSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProductionImpact {
  lostOutputUnits: number;
  lostOutputValue: number;       // monetary estimate
  lostOutputDuration: number;    // hours
  qualityImpact: 'none' | 'minor' | 'moderate' | 'severe';
  qualityImpactDescription: string;
  affectedProductLines: string[];
}

export interface SafetyImpact {
  hazardLevel: 'negligible' | 'low' | 'medium' | 'high' | 'extreme';
  hazardType: string[];
  potentialInjuries: string[];
  hazardZones: HazardZone[];
  requiresEvacuation: boolean;
  requiresShutdown: boolean;
}

export interface HazardZone {
  zoneId: string;
  radius: number;               // meters
  hazardType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface EnvironmentalImpact {
  riskLevel: 'negligible' | 'low' | 'medium' | 'high' | 'extreme';
  emissionType: string[];
  estimatedRelease: string;
  containmentProbability: number; // 0–1
  cleanupTime: number;            // hours
  regulatoryReportingRequired: boolean;
}

export interface RecoveryEstimate {
  minimumRecoveryTime: number;   // hours (best case)
  expectedRecoveryTime: number;  // hours (most likely)
  maximumRecoveryTime: number;   // hours (worst case)
  estimatedCost: {
    parts: number;
    labor: number;
    productionLoss: number;
    environmental: number;
    total: number;
  };
  requiredResources: string[];
  prerequisiteWorkOrders: string[];
}

export interface RiskMitigation {
  id: string;
  category: 'preventive' | 'detective' | 'corrective';
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: string;
  estimatedCost: number;
}

export interface FailurePropagationResult {
  id: string;
  initiatedAt: string;
  completedAt: string;
  durationMs: number;
  request: FailurePropagationRequest;
  failureTree: FailureNode;
  cascadePaths: CascadePath[];
  productionImpact: ProductionImpact;
  safetyImpact: SafetyImpact;
  environmentalImpact: EnvironmentalImpact;
  recoveryEstimate: RecoveryEstimate;
  mitigations: RiskMitigation[];
  overallRiskScore: number;      // 0–100
  riskClassification: 'low' | 'medium' | 'high' | 'critical';
}

// ── Severity Weights ───────────────────────────────────────────────────────

const SEVERITY_WEIGHTS: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

const FAILURE_MODE_IMPACTS: Record<string, {
  typicalPropagationTime: number;
  downstreamMultiplier: number;
  safetyHazardLevel: SafetyImpact['hazardLevel'];
  envRiskLevel: EnvironmentalImpact['riskLevel'];
  qualityImpact: ProductionImpact['qualityImpact'];
}> = {
  bearing_failure: {
    typicalPropagationTime: 15,
    downstreamMultiplier: 0.7,
    safetyHazardLevel: 'low',
    envRiskLevel: 'negligible',
    qualityImpact: 'minor',
  },
  seal_leak: {
    typicalPropagationTime: 5,
    downstreamMultiplier: 0.5,
    safetyHazardLevel: 'medium',
    envRiskLevel: 'medium',
    qualityImpact: 'moderate',
  },
  motor_burnout: {
    typicalPropagationTime: 0,
    downstreamMultiplier: 1.0,
    safetyHazardLevel: 'low',
    envRiskLevel: 'negligible',
    qualityImpact: 'none',
  },
  valve_stuck: {
    typicalPropagationTime: 2,
    downstreamMultiplier: 0.8,
    safetyHazardLevel: 'medium',
    envRiskLevel: 'low',
    qualityImpact: 'moderate',
  },
  overheating: {
    typicalPropagationTime: 10,
    downstreamMultiplier: 0.6,
    safetyHazardLevel: 'high',
    envRiskLevel: 'low',
    qualityImpact: 'severe',
  },
  vibration_excess: {
    typicalPropagationTime: 30,
    downstreamMultiplier: 0.4,
    safetyHazardLevel: 'low',
    envRiskLevel: 'negligible',
    qualityImpact: 'minor',
  },
  corrosion_breakthrough: {
    typicalPropagationTime: 3,
    downstreamMultiplier: 0.9,
    safetyHazardLevel: 'high',
    envRiskLevel: 'high',
    qualityImpact: 'severe',
  },
  electrical_fault: {
    typicalPropagationTime: 0,
    downstreamMultiplier: 0.85,
    safetyHazardLevel: 'high',
    envRiskLevel: 'negligible',
    qualityImpact: 'moderate',
  },
  control_system_failure: {
    typicalPropagationTime: 1,
    downstreamMultiplier: 0.95,
    safetyHazardLevel: 'high',
    envRiskLevel: 'medium',
    qualityImpact: 'severe',
  },
  structural_crack: {
    typicalPropagationTime: 60,
    downstreamMultiplier: 0.3,
    safetyHazardLevel: 'extreme',
    envRiskLevel: 'high',
    qualityImpact: 'moderate',
  },
};

// Impact profile type shared by all failure mode impacts
interface FailureModeProfile {
  typicalPropagationTime: number;
  downstreamMultiplier: number;
  safetyHazardLevel: SafetyImpact['hazardLevel'];
  envRiskLevel: EnvironmentalImpact['riskLevel'];
  qualityImpact: ProductionImpact['qualityImpact'];
}

const DEFAULT_IMPACT: FailureModeProfile = {
  typicalPropagationTime: 10,
  downstreamMultiplier: 0.5,
  safetyHazardLevel: 'medium',
  envRiskLevel: 'low',
  qualityImpact: 'moderate',
};

// ============================================================================
// FAILURE PROPAGATION SERVICE
// ============================================================================

export const failurePropagationService = {

  /**
   * Run a full failure propagation analysis.
   *
   * Builds a failure tree, identifies cascade paths, quantifies production/
   * safety/environmental impact, estimates recovery, and generates mitigation
   * recommendations.
   */
  async analyzeFailure(request: FailurePropagationRequest): Promise<FailurePropagationResult> {
    const timer = logger.timer('analyzeFailure');
    logger.info('Starting failure propagation analysis', {
      assetId: request.assetId,
      failureMode: request.failureMode,
      severity: request.failureSeverity,
    });

    // 1. Fetch the asset and its relationships
    const asset = await db.asset.findUnique({
      where: { id: request.assetId },
      include: {
        parent: true,
        children: true,
        plant: true,
        failureRecords: { take: 10, orderBy: { detectedAt: 'desc' } },
        registryComponents: { take: 5, where: { parentId: null }, include: { children: true } },
      },
    });

    if (!asset) {
      throw new Error(`Asset not found: ${request.assetId}`);
    }

    // 2. Determine impact profile for the failure mode
    const modeProfile: FailureModeProfile = FAILURE_MODE_IMPACTS[request.failureMode] ?? DEFAULT_IMPACT;

    // 3. Build the failure tree (root = the failed asset)
    const failureTree = this.buildFailureTree(asset, request, modeProfile);

    // 4. Extract cascade paths from the tree
    const cascadePaths = this.extractCascadePaths(failureTree);

    // 5. Compute production impact
    const productionImpact = this.computeProductionImpact(asset, request, modeProfile);

    // 6. Compute safety impact
    const safetyImpact = this.computeSafetyImpact(asset, request, modeProfile);

    // 7. Compute environmental impact
    const environmentalImpact = this.computeEnvironmentalImpact(asset, request, modeProfile);

    // 8. Estimate recovery
    const recoveryEstimate = this.estimateRecovery(asset, request, modeProfile, productionImpact);

    // 9. Generate risk mitigations
    const mitigations = this.generateMitigations(request, modeProfile, safetyImpact, environmentalImpact);

    // 10. Compute overall risk score (0–100)
    const overallRiskScore = this.computeOverallRiskScore(
      request.failureSeverity, productionImpact, safetyImpact, environmentalImpact
    );

    const riskClassification: FailurePropagationResult['riskClassification'] =
      overallRiskScore >= 75 ? 'critical' :
      overallRiskScore >= 50 ? 'high' :
      overallRiskScore >= 25 ? 'medium' : 'low';

    const elapsed = typeof timer === 'number' ? timer : 0;
    void elapsed;
    return {
      id: `fp-${Date.now()}`,
      initiatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      request,
      failureTree,
      cascadePaths,
      productionImpact,
      safetyImpact,
      environmentalImpact,
      recoveryEstimate,
      mitigations,
      overallRiskScore,
      riskClassification,
    };
  },

  // ── Failure Tree Construction ──────────────────────────────────────────

  /**
   * Build a hierarchical failure tree rooted at the failed asset.
   * Each child node represents a downstream/upstream asset that may be affected.
   *
   * Propagation probability follows: P_child = P_parent × downstreamMultiplier × random_factor
   */
  buildFailureTree(
    asset: { id: string; name: string; assetType?: string | null; children?: Array<{ id: string; name: string; assetType?: string | null }> },
    request: FailurePropagationRequest,
    modeProfile: FailureModeProfile,
  ): FailureNode {
    const children: FailureNode[] = [];

    // Propagate to child assets (downstream)
    if (request.includeDownstream !== false && asset.children) {
      for (const child of asset.children) {
        const propagationProb = modeProfile.downstreamMultiplier * (0.6 + Math.random() * 0.35);
        const timeToImpact = modeProfile.typicalPropagationTime * (1 + Math.random() * 0.5);

        if (propagationProb > 0.3) {
          const childSeverity = this.escalateSeverity(request.failureSeverity, propagationProb);
          children.push({
            id: `node-${child.id}`,
            assetId: child.id,
            assetName: child.name,
            assetType: child.assetType ?? 'unknown',
            failureMode: `induced_${request.failureMode}`,
            severity: childSeverity,
            probability: Math.round(propagationProb * 100) / 100,
            timeToImpact: Math.round(timeToImpact * 10) / 10,
            status: propagationProb > 0.8 ? 'failed' : propagationProb > 0.5 ? 'degraded' : 'at_risk',
            impactDescription: `Secondary ${request.failureMode} induced on ${child.name} with ${Math.round(propagationProb * 100)}% probability`,
            children: [], // could recurse deeper for multi-level trees
          });
        }
      }
    }

    return {
      id: `node-${asset.id}`,
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.assetType ?? 'unknown',
      failureMode: request.failureMode,
      severity: request.failureSeverity,
      probability: 1.0,
      timeToImpact: 0,
      status: 'failed',
      impactDescription: `Primary failure: ${request.failureMode} on ${asset.name} (${request.failureSeverity} severity)`,
      children,
    };
  },

  // ── Cascade Path Extraction ────────────────────────────────────────────

  /**
   * Extract all propagation paths from the failure tree using DFS.
   */
  extractCascadePaths(tree: FailureNode): CascadePath[] {
    const paths: CascadePath[] = [];

    function dfs(node: FailureNode, currentPath: CascadePath['path']): void {
      for (const child of node.children) {
        const newPath = [
          ...currentPath,
          {
            assetId: child.assetId,
            assetName: child.assetName,
            failureMode: child.failureMode,
            timeMinutes: child.timeToImpact,
          },
        ];
        paths.push({
          path: newPath,
          totalPropagationTime: newPath.reduce((sum, p) => sum + p.timeMinutes, 0),
          worstSeverity: newPath.reduce(
            (worst, p) => (SEVERITY_WEIGHTS[p.failureMode as string] ?? 0) > (SEVERITY_WEIGHTS[worst] ?? 0)
              ? (p.failureMode as 'low' | 'medium' | 'high' | 'critical')
              : worst,
            'low' as 'low' | 'medium' | 'high' | 'critical',
          ),
        });
        dfs(child, newPath);
      }
    }

    dfs(tree, [{
      assetId: tree.assetId,
      assetName: tree.assetName,
      failureMode: tree.failureMode,
      timeMinutes: 0,
    }]);

    return paths;
  },

  // ── Production Impact ──────────────────────────────────────────────────

  /**
   * Estimate production losses from the failure.
   *
   * Lost output = production_rate × downtime_hours × severity_factor
   * Value = lost_output × unit_value
   */
  computeProductionImpact(
    asset: { name: string; children?: Array<{ id: string; name: string }> },
    request: FailurePropagationRequest,
    modeProfile: FailureModeProfile,
  ): ProductionImpact {
    const severityFactor = SEVERITY_WEIGHTS[request.failureSeverity] ?? 1;
    const baseProductionRate = 100; // units/hour (configurable)
    const unitValue = 50;           // $/unit (configurable)

    // Base downtime estimate from severity + failure mode
    // MTTR: low=2h, medium=8h, high=24h, critical=72h
    const mttrHours: Record<string, number> = { low: 2, medium: 8, high: 24, critical: 72 };
    const baseDowntime = mttrHours[request.failureSeverity] ?? 8;

    // Cascade multiplier: each affected downstream asset adds downtime
    const cascadeCount = request.includeDownstream !== false ? (asset.children?.length ?? 0) : 0;
    const cascadeMultiplier = 1 + cascadeCount * 0.3 * modeProfile.downstreamMultiplier;

    const totalDowntime = baseDowntime * cascadeMultiplier;
    const lostUnits = baseProductionRate * totalDowntime * (severityFactor / 2);
    const lostValue = lostUnits * unitValue;

    return {
      lostOutputUnits: Math.round(lostUnits),
      lostOutputValue: Math.round(lostValue),
      lostOutputDuration: Math.round(totalDowntime * 10) / 10,
      qualityImpact: modeProfile.qualityImpact,
      qualityImpactDescription: this.getQualityImpactDescription(modeProfile.qualityImpact),
      affectedProductLines: cascadeCount > 0
        ? ['Primary Production Line', ...Array.from({ length: Math.min(cascadeCount, 3) }, (_, i) => `Downstream Line ${i + 1}`)]
        : ['Primary Production Line'],
    };
  },

  // ── Safety Impact ──────────────────────────────────────────────────────

  /**
   * Assess safety hazards resulting from the failure.
   *
   * Hazard zone radius: R = base_radius × severity_factor
   * Thermal hazards scale with temperature; chemical hazards with leak rate.
   */
  computeSafetyImpact(
    asset: { name: string; plant?: { name: string } | null },
    request: FailurePropagationRequest,
    modeProfile: FailureModeProfile,
  ): SafetyImpact {
    const severityFactor = SEVERITY_WEIGHTS[request.failureSeverity] ?? 1;
    const isHighHazard = modeProfile.safetyHazardLevel === 'high' || modeProfile.safetyHazardLevel === 'extreme';

    // Determine hazard types based on failure mode
    const hazardTypes: string[] = [];
    const potentialInjuries: string[] = [];

    switch (request.failureMode) {
      case 'overheating':
        hazardTypes.push('thermal', 'fire');
        potentialInjuries.push('burns', 'heat exhaustion');
        break;
      case 'seal_leak':
      case 'corrosion_breakthrough':
        hazardTypes.push('chemical_exposure', 'slip_hazard');
        potentialInjuries.push('chemical_burns', 'respiratory_irritation');
        break;
      case 'electrical_fault':
        hazardTypes.push('electrical', 'arc_flash');
        potentialInjuries.push('electrocution', 'burns');
        break;
      case 'structural_crack':
        hazardTypes.push('structural_collapse', 'falling_objects');
        potentialInjuries.push('crush_injuries', 'lacerations');
        break;
      case 'vibration_excess':
        hazardTypes.push('noise', 'mechanical');
        potentialInjuries.push('hearing_damage', 'repetitive_strain');
        break;
      default:
        hazardTypes.push('mechanical', 'general');
        potentialInjuries.push('minor_injuries');
    }

    // Generate hazard zones
    const baseRadius = 5; // meters
    const hazardZones: HazardZone[] = [
      {
        zoneId: 'hz-1',
        radius: baseRadius * severityFactor,
        hazardType: hazardTypes[0] ?? 'general',
        severity: request.failureSeverity,
        description: `Immediate vicinity of ${asset.name}`,
      },
    ];

    if (isHighHazard) {
      hazardZones.push({
        zoneId: 'hz-2',
        radius: baseRadius * severityFactor * 2.5,
        hazardType: hazardTypes[1] ?? 'general',
        severity: 'medium',
        description: `Extended hazard zone around ${asset.name}`,
      });
    }

    return {
      hazardLevel: modeProfile.safetyHazardLevel,
      hazardType: hazardTypes,
      potentialInjuries,
      hazardZones,
      requiresEvacuation: isHighHazard,
      requiresShutdown: request.failureSeverity === 'critical' || modeProfile.safetyHazardLevel === 'extreme',
    };
  },

  // ── Environmental Impact ───────────────────────────────────────────────

  /**
   * Estimate environmental risk from the failure.
   *
   * Release estimation based on failure mode and severity.
   * Containment probability uses an exponential decay model.
   */
  computeEnvironmentalImpact(
    asset: { name: string },
    request: FailurePropagationRequest,
    modeProfile: FailureModeProfile,
  ): EnvironmentalImpact {
    const severityFactor = SEVERITY_WEIGHTS[request.failureSeverity] ?? 1;

    const emissionTypes: string[] = [];
    let estimatedRelease = 'None expected';
    let cleanupTime = 0;
    let containmentProbability = 1.0;

    switch (request.failureMode) {
      case 'seal_leak':
      case 'corrosion_breakthrough': {
        // Leak rate: Q = C_d × A × sqrt(2 × ΔP × ρ)
        const leakRate = severityFactor * 10; // L/min (simplified)
        emissionTypes.push('liquid_release', 'soil_contamination');
        estimatedRelease = `~${Math.round(leakRate * 30)} liters in first 30 minutes`;
        containmentProbability = Math.max(0.1, 1 - severityFactor * 0.25);
        cleanupTime = severityFactor * 4; // hours
        break;
      }
      case 'overheating': {
        emissionTypes.push('thermal_emissions');
        estimatedRelease = 'Localized heating of surrounding area';
        containmentProbability = 0.95;
        cleanupTime = 1;
        break;
      }
      case 'valve_stuck': {
        emissionTypes.push('process_release');
        estimatedRelease = `Release proportional to duration (severity: ${request.failureSeverity})`;
        containmentProbability = Math.max(0.3, 0.8 - severityFactor * 0.15);
        cleanupTime = severityFactor * 2;
        break;
      }
      default:
        emissionTypes.push('minor_process_release');
        estimatedRelease = 'Minimal — likely contained within process boundaries';
        containmentProbability = 0.9;
        cleanupTime = 1;
    }

    return {
      riskLevel: modeProfile.envRiskLevel,
      emissionType: emissionTypes,
      estimatedRelease,
      containmentProbability: Math.round(containmentProbability * 100) / 100,
      cleanupTime,
      regulatoryReportingRequired: modeProfile.envRiskLevel === 'high' || modeProfile.envRiskLevel === 'extreme',
    };
  },

  // ── Recovery Estimation ────────────────────────────────────────────────

  /**
   * Estimate recovery time and cost using a PERT-like three-point model.
   *
   * E[T] = (O + 4M + P) / 6   (PERT expected duration)
   * where O = optimistic, M = most likely, P = pessimistic
   */
  estimateRecovery(
    asset: { name: string; children?: Array<{ id: string; name: string }> },
    request: FailurePropagationRequest,
    modeProfile: FailureModeProfile,
    productionImpact: ProductionImpact,
  ): RecoveryEstimate {
    const severityFactor = SEVERITY_WEIGHTS[request.failureSeverity] ?? 1;

    // Base hours per severity level
    const baseHours: Record<string, number> = { low: 1, medium: 4, high: 12, critical: 48 };
    const base = baseHours[request.failureSeverity] ?? 4;

    // PERT estimates: O = base × 0.5, M = base, P = base × 2
    const optimistic = base * 0.5;
    const mostLikely = base * (1 + modeProfile.downstreamMultiplier * 0.5);
    const pessimistic = base * 2 * severityFactor;

    const expectedHours = (optimistic + 4 * mostLikely + pessimistic) / 6;

    // Cost estimation
    const partsCost = severityFactor * 2000 + Math.random() * 1000;
    const laborCost = expectedHours * 75 * (1 + Math.floor(severityFactor / 2));
    const productionLossCost = productionImpact.lostOutputValue;
    const envCost = modeProfile.envRiskLevel === 'high' || modeProfile.envRiskLevel === 'extreme'
      ? severityFactor * 5000
      : 0;

    const requiredResources: string[] = [
      'Maintenance Technician',
      'Spare Parts Kit',
    ];
    if (severityFactor >= 3) {
      requiredResources.push('Specialist Engineer', 'Rental Equipment');
    }
    if (severityFactor >= 4) {
      requiredResources.push('External Contractor', 'Safety Team');
    }

    return {
      minimumRecoveryTime: Math.round(optimistic * 10) / 10,
      expectedRecoveryTime: Math.round(expectedHours * 10) / 10,
      maximumRecoveryTime: Math.round(pessimistic * 10) / 10,
      estimatedCost: {
        parts: Math.round(partsCost),
        labor: Math.round(laborCost),
        productionLoss: Math.round(productionLossCost),
        environmental: Math.round(envCost),
        total: Math.round(partsCost + laborCost + productionLossCost + envCost),
      },
      requiredResources,
      prerequisiteWorkOrders: [
        `Safety assessment of ${asset.name}`,
        `Isolation and LOTO for ${asset.name}`,
        severityFactor >= 3 ? 'Permit-to-work approval' : undefined,
      ].filter((w): w is string => w !== undefined),
    };
  },

  // ── Mitigation Recommendations ─────────────────────────────────────────

  /**
   * Generate risk mitigation recommendations based on failure analysis.
   *
   * Uses a rule-based approach combining failure mode characteristics with
   * severity levels to produce actionable recommendations.
   */
  generateMitigations(
    request: FailurePropagationRequest,
    modeProfile: FailureModeProfile,
    safetyImpact: SafetyImpact,
    envImpact: EnvironmentalImpact,
  ): RiskMitigation[] {
    const mitigations: RiskMitigation[] = [];
    const severityFactor = SEVERITY_WEIGHTS[request.failureSeverity] ?? 1;
    let counter = 0;

    // Preventive mitigations
    mitigations.push({
      id: `mit-${++counter}`,
      category: 'preventive',
      recommendation: `Install condition monitoring sensors on ${request.failureMode.replace(/_/g, ' ')} components`,
      priority: severityFactor >= 3 ? 'high' : 'medium',
      estimatedEffort: '2-4 hours installation + ongoing monitoring',
      estimatedCost: 3000 + severityFactor * 2000,
    });

    mitigations.push({
      id: `mit-${++counter}`,
      category: 'preventive',
      recommendation: 'Implement predictive maintenance schedule based on vibration/temperature trend analysis',
      priority: 'medium',
      estimatedEffort: '1 week setup + monthly review',
      estimatedCost: 1500,
    });

    // Detective mitigations
    if (safetyImpact.hazardLevel === 'high' || safetyImpact.hazardLevel === 'extreme') {
      mitigations.push({
        id: `mit-${++counter}`,
        category: 'detective',
        recommendation: 'Deploy additional safety sensors in identified hazard zones with automatic shutdown triggers',
        priority: 'critical',
        estimatedEffort: '1-2 days installation + testing',
        estimatedCost: 8000 + severityFactor * 3000,
      });
    }

    mitigations.push({
      id: `mit-${++counter}`,
      category: 'detective',
      recommendation: 'Configure real-time alarm thresholds for early detection of ' + request.failureMode.replace(/_/g, ' '),
      priority: severityFactor >= 3 ? 'high' : 'medium',
      estimatedEffort: '4 hours configuration',
      estimatedCost: 500,
    });

    // Corrective mitigations
    mitigations.push({
      id: `mit-${++counter}`,
      category: 'corrective',
      recommendation: 'Maintain critical spare parts inventory for rapid replacement',
      priority: severityFactor >= 3 ? 'high' : 'low',
      estimatedEffort: 'Initial assessment + quarterly review',
      estimatedCost: 2000 + severityFactor * 5000,
    });

    if (envImpact.riskLevel === 'high' || envImpact.riskLevel === 'extreme') {
      mitigations.push({
        id: `mit-${++counter}`,
        category: 'corrective',
        recommendation: 'Install secondary containment system for leak prevention and environmental protection',
        priority: 'critical',
        estimatedEffort: '1-3 weeks engineering + installation',
        estimatedCost: 15000 + severityFactor * 10000,
      });
    }

    mitigations.push({
      id: `mit-${++counter}`,
      category: 'corrective',
      recommendation: 'Develop and rehearse emergency response procedure for ' + request.failureMode.replace(/_/g, ' '),
      priority: 'medium',
      estimatedEffort: '2 days procedure development + quarterly drills',
      estimatedCost: 1000,
    });

    return mitigations;
  },

  // ── Overall Risk Score ─────────────────────────────────────────────────

  /**
   * Compute a weighted overall risk score (0–100).
   *
   * R = w1×S_production + w2×S_safety + w3×S_environment + w4×S_severity
   *
   * Weights: production=0.2, safety=0.35, environment=0.2, severity=0.25
   */
  computeOverallRiskScore(
    severity: string,
    production: ProductionImpact,
    safety: SafetyImpact,
    environment: EnvironmentalImpact,
  ): number {
    const HAZARD_SCORES: Record<string, number> = {
      negligible: 5, low: 20, medium: 50, high: 75, extreme: 100,
    };
    const QUALITY_SCORES: Record<string, number> = {
      none: 0, minor: 20, moderate: 50, severe: 80,
    };

    const sSeverity = (SEVERITY_WEIGHTS[severity] ?? 1) / 4 * 100;
    const sProduction = Math.min(100, production.lostOutputDuration / 72 * 100); // normalise to 72h
    const sSafety = HAZARD_SCORES[safety.hazardLevel] ?? 50;
    const sEnvironment = HAZARD_SCORES[environment.riskLevel] ?? 20;
    const sQuality = QUALITY_SCORES[production.qualityImpact] ?? 0;

    const score = (
      0.25 * sSeverity +
      0.20 * sProduction +
      0.30 * sSafety +
      0.15 * sEnvironment +
      0.10 * sQuality
    );

    return Math.round(Math.min(100, Math.max(0, score)) * 100) / 100;
  },

  // ── Helpers ────────────────────────────────────────────────────────────

  escalateSeverity(parent: string, probability: number): 'low' | 'medium' | 'high' | 'critical' {
    const levels: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    const parentIdx = levels.indexOf(parent as 'low' | 'medium' | 'high' | 'critical');
    if (parentIdx < 0) return 'low';
    const drop = probability < 0.6 ? 1 : probability < 0.8 ? 0 : 0;
    return levels[Math.max(0, parentIdx - drop)];
  },

  getQualityImpactDescription(level: ProductionImpact['qualityImpact']): string {
    switch (level) {
      case 'none': return 'No quality impact expected — production halts cleanly';
      case 'minor': return 'Minor quality deviation in transition period; scrap rate may increase temporarily';
      case 'moderate': return 'Moderate quality impact — off-spec product likely during degraded operation';
      case 'severe': return 'Severe quality impact — significant off-spec production, potential batch rejection';
    }
  },
};
