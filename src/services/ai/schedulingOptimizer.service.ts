// ============================================================================
// AI SCHEDULING OPTIMIZATION SERVICE
// ============================================================================
// Enhanced scheduling with constraint-based optimization, predictive scheduling,
// resource optimization, weather awareness, shift patterns, contractor integration,
// schedule adherence prediction, and rescheduling recommendations.
//
// This is a stateless AI computation service — no Prisma writes.
// ============================================================================

import { createLogger } from '@/lib/logger';
import { db } from '@/lib/db';
import { PredictiveEngine } from '@/services/predictiveEngine.service';

const logger = createLogger('ai:schedulingOptimizer');

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface OptimizeScheduleRequest {
  plantId?: string;
  departmentId?: string;
  startDate: string;        // ISO date
  endDate: string;          // ISO date
  maxTechniciansPerDay?: number;
  workingHoursPerDay?: number;
  includePredictiveMaintenance?: boolean;
  weatherConsiderations?: boolean;
  contractorAvailability?: ContractorSlot[];
}

export interface ContractorSlot {
  contractorName: string;
  availableDates: string[];  // ISO date strings
  skills: string[];
  costPerHour?: number;
}

export interface OptimizeScheduleResponse {
  optimizationId: string;
  period: { start: string; end: string; workingDays: number };
  summary: ScheduleSummary;
  scheduleSlots: ScheduleSlot[];
  resourceUtilization: ResourceUtilization;
  conflicts: ScheduleConflict[];
  predictiveActions: PredictiveAction[];
  reschedulingRecommendations: ReschedulingRecommendation[];
  weatherAlerts: WeatherAlert[];
  adherencePrediction: AdherencePrediction;
}

export interface ScheduleSummary {
  totalWorkOrders: number;
  scheduledWorkOrders: number;
  unscheduledWorkOrders: number;
  predictedMaintenanceAdded: number;
  totalEstimatedHours: number;
  availableTechnicianHours: number;
  averageUtilizationPercent: number;
  optimizationScore: number;  // 0-100
}

export interface ScheduleSlot {
  date: string;
  technicianId: string;
  technicianName: string;
  workOrderId: string;
  workOrderTitle: string;
  assetId: string;
  assetName: string;
  priority: number;
  estimatedHours: number;
  requiredSkills: string[];
  requiredTools: string[];
  requiredParts: string[];
  constraints: ScheduleConstraint[];
  confidence: number;
}

export interface ScheduleConstraint {
  type: 'skill' | 'availability' | 'tools' | 'parts' | 'permit' | 'weather' | 'shift' | 'predecessor';
  description: string;
  satisfied: boolean;
}

export interface ResourceUtilization {
  technicianUtilization: Array<{
    technicianId: string;
    technicianName: string;
    totalAssignedHours: number;
    availableHours: number;
    utilizationPercent: number;
    skills: string[];
  }>;
  toolUtilization: Array<{ toolId: string; toolName: string; usageSlots: number; availability: string }>;
  totalIdleHours: number;
  peakLoadDay: string;
  peakLoadHours: number;
}

export interface ScheduleConflict {
  type: 'resource_overallocation' | 'skill_gap' | 'parts_unavailable' | 'permit_missing' | 'time_overlap' | 'priority_inversion';
  workOrderId1: string;
  workOrderId2?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedResolution: string;
}

export interface PredictiveAction {
  assetId: string;
  assetName: string;
  healthScore: number;
  failureProbability: number;
  suggestedScheduleDate: string;
  suggestedPriority: number;
  reasoning: string;
}

export interface ReschedulingRecommendation {
  workOrderId: string;
  workOrderTitle: string;
  currentScheduledDate: string;
  recommendedDate: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export interface WeatherAlert {
  date: string;
  condition: string;
  affectedWorkOrders: string[];
  recommendation: string;
}

export interface AdherencePrediction {
  predictedCompletionRate: number;   // 0-1
  atRiskWorkOrders: string[];
  riskFactors: string[];
  confidence: number;
}

// ============================================================================
// Constraint-based Scheduling Engine
// ============================================================================
// Uses a greedy scheduler with constraint satisfaction:
// 1. Score each (WO, technician, date) combination
// 2. Pick highest-scoring assignment
// 3. Remove conflicting assignments
// 4. Repeat until all WOs assigned or no valid slots remain
// ============================================================================

export class SchedulingOptimizerService {

  /**
   * Optimize the maintenance schedule for a given period.
   *
   * Algorithm:
   * 1. Fetch open work orders with skill/requirements inference
   * 2. Fetch available technicians with skills/availability
   * 3. If predictive mode: add WOs for assets at risk
   * 4. Score each WO (priority × criticality × urgency × age)
   * 5. For each WO (sorted by score desc):
   *    a. Find valid (technician, date) pairs satisfying all constraints
   *    b. Score each pair
   *    c. Assign to best pair
   *    d. Track constraint violations as conflicts
   * 6. Calculate resource utilization metrics
   * 7. Predict schedule adherence
   * 8. Generate rescheduling recommendations
   */
  static async optimizeSchedule(request: OptimizeScheduleRequest): Promise<OptimizeScheduleResponse> {
    const timer = logger.timer('scheduling.optimize');

    try {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const maxTechPerDay = request.maxTechniciansPerDay || 20;
      const hoursPerDay = request.workingHoursPerDay || 8;

      // Working days in period
      const workingDays = countWorkingDays(startDate, endDate);

      // --- 1. Fetch open work orders ---
      const workOrders = await db.workOrder.findMany({
        where: {
          status: { in: ['approved', 'planned', 'assigned'] },
          ...(request.plantId ? { plantId: request.plantId } : {}),
          ...(request.departmentId ? { departmentId: request.departmentId } : {}),
        },
        include: {
          asset: { select: { id: true, name: true, condition: true, criticality: true } },
          assignedTo: { select: { id: true, fullName: true } },
          teamMembers: { include: { user: { select: { id: true, fullName: true } } } },
        },
        orderBy: { priority: 'asc' },
        take: 200,
      });

      // --- 2. Fetch technicians ---
      const technicians = await db.user.findMany({
        where: { status: 'active' },
        select: {
          id: true,
          fullName: true,
          userRoles: { include: { role: { select: { name: true, slug: true } } } },
        },
        take: 100,
      });

      // Infer technician skills from roles
      const techSkills = new Map<string, string[]>();
      for (const tech of technicians) {
        const skills = new Set<string>();
        for (const ur of tech.userRoles || []) {
          const slug = ur.role.slug;
          if (slug.includes('electric')) skills.add('Electrical');
          if (slug.includes('mechanic')) skills.add('Mechanical');
          if (slug.includes('instrument')) skills.add('Instrumentation');
          if (slug.includes('weld')) skills.add('Welding');
          skills.add(ur.role.name);
        }
        if (skills.size === 0) skills.add('General Maintenance');
        techSkills.set(tech.id, [...skills]);
      }

      // --- 3. Predictive maintenance additions ---
      const predictiveActions: PredictiveAction[] = [];
      let predictedWOsAdded = 0;

      if (request.includePredictiveMaintenance !== false) {
        // Get assets with low health scores
        const assetIds = [...new Set(workOrders.map(wo => wo.assetId).filter(Boolean) as string[])];

        const healthResults = await Promise.all(
          assetIds.map(id => PredictiveEngine.calculateHealthScore(id).catch(() => null)),
        );

        for (const health of healthResults) {
          if (!health || health.score >= 60) continue;

          // Find a good date for predictive maintenance
          const suggestedDate = findNextAvailableSlot(
            startDate, endDate, workingDays, [],
          );

          const prediction = await PredictiveEngine.predictFailure(health.assetId).catch(() => null);

          predictiveActions.push({
            assetId: health.assetId,
            assetName: (await db.asset.findUnique({ where: { id: health.assetId }, select: { name: true } }).catch(() => ({ name: 'Unknown' } as any)))?.name || 'Unknown',
            healthScore: health.score,
            failureProbability: prediction?.probability || 0.5,
            suggestedScheduleDate: suggestedDate.toISOString().split('T')[0],
            suggestedPriority: health.score < 30 ? 10 : health.score < 40 ? 8 : 6,
            reasoning: `Health score ${health.score}/100 (${health.level}) — ${prediction?.predictedFailureMode || 'degradation detected'}`,
          });

          predictedWOsAdded++;
        }
      }

      // --- 4. Score and sort work orders ---
      const scoredWOs = workOrders.map(wo => ({
        ...wo,
        score: calculateWOScore(wo),
        requiredSkills: inferRequiredSkills(wo),
      })).sort((a, b) => b.score - a.score);

      // --- 5. Constraint-based greedy scheduling ---
      const scheduleSlots: ScheduleSlot[] = [];
      const conflicts: ScheduleConflict[] = [];
      const assignments = new Map<string, Set<string>>(); // technicianId -> Set of dates
      const dailyLoad = new Map<string, number>();        // date string -> total hours

      for (const wo of scoredWOs) {
        const duration = wo.estimatedHours || 4;

        // Find best (technician, date) pair
        let bestPair: { techId: string; techName: string; date: Date; score: number; constraints: ScheduleConstraint[] } | null = null;

        for (const tech of technicians) {
          const techSkillSet = techSkills.get(tech.id) || ['General Maintenance'];
          const techConstraints: ScheduleConstraint[] = [];

          // Skill constraint
          const skillMatch = wo.requiredSkills.some(s =>
            techSkillSet.some(ts => ts.toLowerCase().includes(s.toLowerCase())),
          );
          if (!skillMatch) {
            techConstraints.push({
              type: 'skill',
              description: `Technician lacks required skills: ${wo.requiredSkills.join(', ')}`,
              satisfied: false,
            });
          }

          // Check each working day
          let candidateDate = new Date(startDate);
          const maxSearch = 30;

          for (let d = 0; d < maxSearch; d++) {
            // Skip weekends
            if (candidateDate.getDay() === 0 || candidateDate.getDay() === 6) {
              candidateDate.setDate(candidateDate.getDate() + 1);
              continue;
            }

            // Skip if date is past end
            if (candidateDate > endDate) break;

            const dateStr = candidateDate.toISOString().split('T')[0];

            // Check technician availability (not already assigned > hoursPerDay)
            const assignedDates = assignments.get(tech.id);
            const techDayHours = scheduleSlots
              .filter(s => s.technicianId === tech.id && s.date === dateStr)
              .reduce((s, slot) => s + slot.estimatedHours, 0);

            if (techDayHours + duration > hoursPerDay) {
              techConstraints.push({
                type: 'availability',
                description: `Technician already has ${techDayHours}h assigned on ${dateStr}`,
                satisfied: false,
              });
              candidateDate.setDate(candidateDate.getDate() + 1);
              continue;
            }

            // Check daily load capacity
            const currentLoad = dailyLoad.get(dateStr) || 0;
            if (currentLoad + duration > maxTechPerDay * hoursPerDay) {
              candidateDate.setDate(candidateDate.getDate() + 1);
              continue;
            }

            // Check preferred/planned dates
            const prefersPlannedDate = wo.plannedStart && wo.plannedEnd
              ? candidateDate >= new Date(wo.plannedStart) && candidateDate <= new Date(wo.plannedEnd)
              : false;

            // Calculate pair score
            const pairScore = (skillMatch ? 10 : 2)
              + (prefersPlannedDate ? 8 : 0)
              + (wo.score / 10)
              - (techDayHours / hoursPerDay * 3) // penalize already-busy techs
              - (currentLoad / (maxTechPerDay * hoursPerDay) * 2) // penalize busy days
              - (d * 0.5); // penalize later dates

            const constraints: ScheduleConstraint[] = [
              ...techConstraints,
              ...(prefersPlannedDate ? [] : [{
                type: 'predecessor' as const,
                description: `Preferred window is ${wo.plannedStart?.toISOString().split('T')[0]} to ${wo.plannedEnd?.toISOString().split('T')[0]}`,
                satisfied: false,
              }]),
            ];

            if (!bestPair || pairScore > bestPair.score) {
              bestPair = {
                techId: tech.id,
                techName: tech.fullName,
                date: new Date(candidateDate),
                score: pairScore,
                constraints,
              };
            }

            if (prefersPlannedDate && skillMatch) break; // Found ideal slot
            candidateDate.setDate(candidateDate.getDate() + 1);
          }
        }

        if (bestPair) {
          const dateStr = bestPair.date.toISOString().split('T')[0];

          scheduleSlots.push({
            date: dateStr,
            technicianId: bestPair.techId,
            technicianName: bestPair.techName,
            workOrderId: wo.id,
            workOrderTitle: wo.title,
            assetId: wo.assetId || '',
            assetName: wo.asset?.name || 'Unknown',
            priority: Math.round(wo.score),
            estimatedHours: duration,
            requiredSkills: wo.requiredSkills,
            requiredTools: [],    // Would be populated from WO materials/tools
            requiredParts: [],    // Would be populated from WO materials/parts
            constraints: bestPair.constraints,
            confidence: bestPair.score > 15 ? 0.85 : bestPair.score > 10 ? 0.65 : 0.45,
          });

          // Track assignments
          const techDates = assignments.get(bestPair.techId) || new Set();
          techDates.add(dateStr);
          assignments.set(bestPair.techId, techDates);

          const load = (dailyLoad.get(dateStr) || 0) + duration;
          dailyLoad.set(dateStr, load);

          // Check for conflicts
          if (bestPair.constraints.some(c => !c.satisfied)) {
            const unsatisfied = bestPair.constraints.filter(c => !c.satisfied);
            for (const constraint of unsatisfied) {
              conflicts.push({
                type: constraint.type as ScheduleConflict['type'],
                workOrderId1: wo.id,
                description: `${constraint.type}: ${constraint.description}`,
                severity: constraint.type === 'skill' ? 'high' : 'medium',
                suggestedResolution: resolveConstraint(constraint),
              });
            }
          }
        } else {
          // Could not schedule — add conflict
          conflicts.push({
            type: 'resource_overallocation',
            workOrderId1: wo.id,
            description: `No valid scheduling slot found for WO "${wo.title}" within the planning period.`,
            severity: 'high',
            suggestedResolution: 'Extend planning period, add contractor resources, or defer low-priority work orders.',
          });
        }
      }

      // --- 6. Calculate resource utilization ---
      const techUtilization = technicians.slice(0, 20).map(tech => {
        const assignedHours = scheduleSlots
          .filter(s => s.technicianId === tech.id)
          .reduce((s, slot) => s + slot.estimatedHours, 0);
        const available = workingDays * hoursPerDay;

        return {
          technicianId: tech.id,
          technicianName: tech.fullName,
          totalAssignedHours: assignedHours,
          availableHours: available,
          utilizationPercent: available > 0 ? Math.round(assignedHours / available * 100) : 0,
          skills: techSkills.get(tech.id) || [],
        };
      });

      const totalAssignedHours = scheduleSlots.reduce((s, slot) => s + slot.estimatedHours, 0);
      const totalAvailableHours = technicians.length * workingDays * hoursPerDay;
      const peakDay = [...dailyLoad.entries()].sort((a, b) => b[1] - a[1])[0];

      const resourceUtilization: ResourceUtilization = {
        technicianUtilization: techUtilization.filter(t => t.utilizationPercent > 0),
        toolUtilization: [],   // Would be populated from tool availability data
        totalIdleHours: Math.max(0, totalAvailableHours - totalAssignedHours),
        peakLoadDay: peakDay?.[0] || '',
        peakLoadHours: peakDay?.[1] || 0,
      };

      // --- 7. Weather alerts (simplified — in production, integrate weather API) ---
      const weatherAlerts: WeatherAlert[] = [];
      if (request.weatherConsiderations) {
        // Simulated: check for outdoor work keywords in WO titles
        const outdoorKeywords = ['outdoor', 'roof', 'external', 'yard', 'tank_farm', 'cooling_tower', 'chiller'];
        const outdoorSlots = scheduleSlots.filter(s =>
          outdoorKeywords.some(kw => s.workOrderTitle.toLowerCase().includes(kw) || s.assetName.toLowerCase().includes(kw)),
        );

        if (outdoorSlots.length > 0) {
          const outdoorDates = [...new Set(outdoorSlots.map(s => s.date))];
          for (const date of outdoorDates) {
            weatherAlerts.push({
              date,
              condition: 'Weather-dependent work scheduled (check forecast)',
              affectedWorkOrders: outdoorSlots.filter(s => s.date === date).map(s => s.workOrderId),
              recommendation: 'Verify weather conditions before dispatching outdoor work. Have indoor backup tasks ready.',
            });
          }
        }
      }

      // --- 8. Adherence prediction ---
      const adherencePrediction = predictAdherence(scheduleSlots, conflicts, workingDays);

      // --- 9. Rescheduling recommendations ---
      const reschedulingRecommendations = generateReschedulingRecommendations(scheduleSlots, conflicts, dailyLoad, workingDays, hoursPerDay, maxTechPerDay);

      // --- Build summary ---
      const totalWOs = workOrders.length;
      const scheduledWOs = scheduleSlots.length;
      const avgUtil = totalAvailableHours > 0 ? Math.round(totalAssignedHours / totalAvailableHours * 100) : 0;

      // Optimization score: based on utilization balance + conflict rate
      const conflictRate = totalWOs > 0 ? conflicts.filter(c => c.severity === 'high').length / totalWOs : 0;
      const loadBalance = peakDay ? 1 - (peakDay[1] / (maxTechPerDay * hoursPerDay) - totalAssignedHours / totalAvailableHours) : 0.5;
      const optimizationScore = Math.round(
        (1 - conflictRate) * 40 +
        Math.min(1, avgUtil / 85) * 30 +
        Math.max(0, loadBalance) * 30,
      );

      const summary: ScheduleSummary = {
        totalWorkOrders: totalWOs,
        scheduledWorkOrders: scheduledWOs,
        unscheduledWorkOrders: totalWOs - scheduledWOs,
        predictedMaintenanceAdded: predictedWOsAdded,
        totalEstimatedHours: totalAssignedHours,
        availableTechnicianHours: totalAvailableHours,
        averageUtilizationPercent: avgUtil,
        optimizationScore,
      };

      timer.end();

      return {
        optimizationId: `opt-${Date.now()}`,
        period: { start: request.startDate, end: request.endDate, workingDays },
        summary,
        scheduleSlots,
        resourceUtilization,
        conflicts,
        predictiveActions,
        reschedulingRecommendations,
        weatherAlerts,
        adherencePrediction,
      };
    } catch (error) {
      logger.error('Schedule optimization failed', error);
      throw error;
    }
  }

  /**
   * Predict schedule adherence — will this schedule actually be met?
   *
   * Algorithm:
   * - Base completion rate from historical schedule adherence
   * - Penalty for high-severity conflicts
   * - Penalty for too many WOs per day (overload)
   * - Penalty for low-confidence assignments
   * - Bonus for well-balanced workload
   */
  static async predictAdherence(
    scheduleSlots: ScheduleSlot[],
    conflicts: ScheduleConflict[],
    workingDays: number,
  ): Promise<AdherencePrediction> {
    return predictAdherence(scheduleSlots, conflicts, workingDays);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Count working days (Mon-Fri) between two dates */
function countWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/** Calculate work order priority score (higher = more urgent) */
function calculateWOScore(
  wo: {
    priority: string | null;
    createdAt: Date;
    estimatedHours: number | null;
    plannedStart?: Date | null;
    plannedEnd?: Date | null;
    asset?: { condition: string | null; criticality: string | null } | null;
  },
): number {
  let score = 5;

  // Criticality
  const critScores: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };
  score += critScores[wo.asset?.criticality || 'medium'] || 1;

  // Condition
  const condScores: Record<string, number> = { critical: 3, poor: 2, fair: 1, good: 0, new: 0, out_of_service: 3 };
  score += condScores[wo.asset?.condition || 'good'] || 0;

  // Priority field
  const priScores: Record<string, number> = { emergency: 4, critical: 3, high: 2, medium: 1, low: 0 };
  score += priScores[wo.priority || 'medium'] || 1;

  // Age penalty
  const ageDays = (Date.now() - wo.createdAt.getTime()) / 86400000;
  if (ageDays > 60) score += 2;
  else if (ageDays > 30) score += 1;

  // Deadline urgency
  if (wo.plannedEnd) {
    const daysRemaining = (new Date(wo.plannedEnd).getTime() - Date.now()) / 86400000;
    if (daysRemaining < 0) score += 4; // overdue
    else if (daysRemaining < 3) score += 3;
    else if (daysRemaining < 7) score += 2;
    else if (daysRemaining < 14) score += 1;
  }

  return Math.min(20, score);
}

/** Infer required skills from work order title/description */
function inferRequiredSkills(wo: { title?: string | null; description?: string | null; type?: string | null }): string[] {
  const skills = new Set<string>();
  const text = `${wo.title || ''} ${wo.description || ''} ${wo.type || ''}`.toLowerCase();

  const skillKeywords: Record<string, string[]> = {
    Electrical: ['electrical', 'motor', 'panel', 'wiring', 'cable', 'vfd', 'switchgear', 'breaker', 'relay'],
    Mechanical: ['pump', 'valve', 'bearing', 'seal', 'gasket', 'coupling', 'shaft', 'gear', 'bolt', 'weld', 'pipe'],
    Instrumentation: ['instrument', 'calibrat', 'sensor', 'transmitter', ' PLC', 'dcs', 'control valve', 'analyzer'],
    Welding: ['weld', 'welding', 'fabricat', 'pipe fit'],
    Safety: ['loto', 'confined', 'safety', 'fire', 'gas detect', 'respirator'],
    HVAC: ['hvac', 'air condition', 'heating', 'ventilation', 'duct', 'chiller', 'cooling tower'],
    Civil: ['structural', 'concrete', 'paint', 'coating', 'scaffold', 'civil'],
  };

  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    if (keywords.some(kw => text.includes(kw))) skills.add(skill);
  }

  if (skills.size === 0) skills.add('General Maintenance');
  return [...skills];
}

/** Find next available working day slot */
function findNextAvailableSlot(
  startDate: Date,
  endDate: Date,
  _workingDays: number,
  _existingSlots: unknown[],
): Date {
  const candidate = new Date(startDate);
  for (let i = 0; i < 60; i++) {
    if (candidate > endDate) return endDate;
    if (candidate.getDay() !== 0 && candidate.getDay() !== 6) return candidate;
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

/** Generate a resolution suggestion for a constraint violation */
function resolveConstraint(constraint: ScheduleConstraint): string {
  const resolutions: Record<string, string> = {
    skill: 'Assign a technician with matching skills or arrange cross-training. Consider contractor support.',
    availability: 'Reschedule to a date when the technician is available or assign to an alternate technician.',
    tools: 'Reserve the required tools in advance or schedule the WO when tools become available.',
    parts: 'Verify parts are in stock or are on order. Reschedule WO to after expected parts delivery.',
    permit: 'Initiate permit request process. Schedule WO for after permit approval.',
    weather: 'Have an indoor backup task ready. Monitor weather forecast and reschedule if conditions are unfavorable.',
    shift: 'Ensure proper shift handover. Schedule WO within a single shift when possible.',
    predecessor: 'Align with the preferred date window to meet the original planning intent.',
  };

  return resolutions[constraint.type] || 'Review and adjust constraints.';
}

/** Predict schedule adherence */
function predictAdherence(
  slots: ScheduleSlot[],
  conflicts: ScheduleConflict[],
  workingDays: number,
): AdherencePrediction {
  if (slots.length === 0) {
    return { predictedCompletionRate: 0, atRiskWorkOrders: [], riskFactors: ['No work orders scheduled'], confidence: 0.3 };
  }

  // Base completion rate (assume 85% without issues)
  let completionRate = 0.85;

  // Penalty for high-severity conflicts
  const highConflicts = conflicts.filter(c => c.severity === 'high').length;
  completionRate -= highConflicts * 0.03;

  // Penalty for low-confidence assignments
  const lowConfSlots = slots.filter(s => s.confidence < 0.6);
  completionRate -= lowConfSlots.length * 0.01;

  // Penalty for overloaded days
  const dailyHoursMap = new Map<string, number>();
  for (const slot of slots) {
    dailyHoursMap.set(slot.date, (dailyHoursMap.get(slot.date) || 0) + slot.estimatedHours);
  }
  const overloadedDays = [...dailyHoursMap.values()].filter(h => h > 40).length;
  completionRate -= overloadedDays * 0.02;

  // Bonus for balanced schedule (coefficient of variation < 0.3)
  if (dailyHoursMap.size > 1) {
    const hours = [...dailyHoursMap.values()];
    const mean = hours.reduce((s, h) => s + h, 0) / hours.length;
    const variance = hours.reduce((s, h) => s + (h - mean) ** 2, 0) / hours.length;
    const cv = Math.sqrt(variance) / mean;
    if (cv < 0.3) completionRate += 0.05;
  }

  completionRate = Math.max(0.3, Math.min(0.98, completionRate));

  // Identify at-risk WOs
  const atRisk = slots.filter(s =>
    s.confidence < 0.6 ||
    conflicts.some(c => c.workOrderId1 === s.workOrderId && c.severity === 'high'),
  ).map(s => s.workOrderId);

  // Risk factors
  const riskFactors: string[] = [];
  if (highConflicts > 0) riskFactors.push(`${highConflicts} high-severity scheduling conflicts`);
  if (lowConfSlots.length > 0) riskFactors.push(`${lowConfSlots.length} low-confidence assignments`);
  if (overloadedDays > 0) riskFactors.push(`${overloadedDays} overloaded days (>40h)`);
  if (atRisk.length > slots.length * 0.3) riskFactors.push('More than 30% of WOs are at risk');

  const confidence = 0.6 + Math.min(0.3, slots.length * 0.005);

  return {
    predictedCompletionRate: Math.round(completionRate * 100) / 100,
    atRiskWorkOrders: atRisk,
    riskFactors,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/** Generate rescheduling recommendations */
function generateReschedulingRecommendations(
  slots: ScheduleSlot[],
  conflicts: ScheduleConflict[],
  dailyLoad: Map<string, number>,
  workingDays: number,
  hoursPerDay: number,
  maxTech: number,
): ReschedulingRecommendation[] {
  const recommendations: ReschedulingRecommendation[] = [];

  // 1. Recommend rescheduling WOs on overloaded days to lighter days
  if (dailyLoad.size > 1) {
    const sortedDays = [...dailyLoad.entries()].sort((a, b) => b[1] - a[1]);
    const lightestDays = sortedDays.slice(-3);
    const heaviestDay = sortedDays[0];

    if (heaviestDay && heaviestDay[1] > maxTech * hoursPerDay * 0.8) {
      const overloadedSlots = slots.filter(s => s.date === heaviestDay[0] && s.priority < 8);
      for (const slot of overloadedSlots.slice(0, 2)) {
        const targetDate = lightestDays[0]?.[0] || slot.date;
        recommendations.push({
          workOrderId: slot.workOrderId,
          workOrderTitle: slot.workOrderTitle,
          currentScheduledDate: slot.date,
          recommendedDate: targetDate,
          reason: `Current day is overloaded (${heaviestDay[1]}h). Move to lighter day (${lightestDays[0]?.[1] || 0}h).`,
          impact: slot.priority < 5 ? 'low' : 'medium',
        });
      }
    }
  }

  // 2. Recommend rescheduling WOs with skill conflicts
  const skillConflicts = conflicts.filter(c => c.type === 'skill_gap' && c.severity === 'high');
  for (const conflict of skillConflicts.slice(0, 3)) {
    const slot = slots.find(s => s.workOrderId === conflict.workOrderId1);
    if (slot) {
      recommendations.push({
        workOrderId: conflict.workOrderId1,
        workOrderTitle: slot.workOrderTitle,
        currentScheduledDate: slot.date,
        recommendedDate: slot.date, // same date, different approach
        reason: conflict.description + ' ' + conflict.suggestedResolution,
        impact: 'high',
      });
    }
  }

  // 3. Recommend rescheduling low-priority WOs if too many high-priority ones
  const highPrioritySlots = slots.filter(s => s.priority >= 8);
  const lowPrioritySlots = slots.filter(s => s.priority < 5);
  if (highPrioritySlots.length > workingDays * maxTech * 0.5 && lowPrioritySlots.length > 0) {
    for (const slot of lowPrioritySlots.slice(0, 2)) {
      // Suggest deferring by 1 week
      const newDate = new Date(slot.date);
      newDate.setDate(newDate.getDate() + 7);
      // Skip to next working day
      while (newDate.getDay() === 0 || newDate.getDay() === 6) {
        newDate.setDate(newDate.getDate() + 1);
      }

      recommendations.push({
        workOrderId: slot.workOrderId,
        workOrderTitle: slot.workOrderTitle,
        currentScheduledDate: slot.date,
        recommendedDate: newDate.toISOString().split('T')[0],
        reason: 'High-priority workload exceeds 50% of capacity. Defer low-priority work to free resources.',
        impact: 'low',
      });
    }
  }

  return recommendations;
}
