// ============================================================================
// STO PLANNING SERVICE — Event creation, scope, resources, milestones, budget
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('STOPlanning');

// ---- Types ----

export type StoEventType = 'planned_shutdown' | 'turnaround' | 'forced_outage' | 'emergency';
export type StoEventStatus = 'planning' | 'scheduled' | 'pre_shutdown' | 'in_progress' | 'startup' | 'completed' | 'cancelled';

export interface StoScopeDefinition {
  equipmentList: Array<{ assetId: string; assetName: string; workRequired: string }>;
  workPackages: Array<{ id: string; title: string; description: string; discipline: string; estimatedHours: number }>;
  inspectionRequirements: Array<{ type: string; standard: string; required: boolean }>;
}

export interface StoMilestoneDefinition {
  id: string;
  name: string;
  phase: 'pre_shutdown' | 'shutdown' | 'execution' | 'startup' | 'post_shutdown';
  targetDate?: string;
  completionCriteria: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface StoResourcePlan {
  labor: Array<{ role: string; count: number; hoursPerDay: number; startDate: string; endDate: string }>;
  equipment: Array<{ name: string; quantity: number; unit: string }>;
  materials: Array<{ name: string; quantity: number; unit: string; estimatedCost: number }>;
  contractors: Array<{ contractorId: string; role: string; laborCount: number; startDate: string; endDate: string }>;
}

export interface StoRiskItem {
  id: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
  owner: string;
}

export interface StoBudgetEstimate {
  laborCost: number;
  materialCost: number;
  contractorCost: number;
  equipmentRental: number;
  contingencyPercent: number;
  contingencyAmount: number;
  totalAmount: number;
}

export interface StoPreShutdownChecklist {
  id: string;
  item: string;
  category: string;
  responsible: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface CreateStoEventInput {
  name: string;
  description?: string;
  type: StoEventType;
  plantId: string;
  unitId?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  scope?: StoScopeDefinition;
  milestones?: StoMilestoneDefinition[];
  resourcePlan?: StoResourcePlan;
  riskAssessment?: StoRiskItem[];
  budgetEstimate?: StoBudgetEstimate;
  preShutdownChecklist?: StoPreShutdownChecklist[];
  notes?: string;
}

// ---- Service ----

export class StoPlanningService {

  /**
   * Generate STO number: STO-YYYYMM-NNNN
   */
  static async generateStoNumber(): Promise<string> {
    const now = new Date();
    const prefix = `STO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const latest = await db.stoEvent.findFirst({
      where: { stoNumber: { startsWith: prefix } },
      orderBy: { stoNumber: 'desc' },
      select: { stoNumber: true },
    });

    let nextNum = 1;
    if (latest) {
      const parts = latest.stoNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Create a new STO event with full planning data
   */
  static async createEvent(input: CreateStoEventInput, createdById: string) {
    const timer = logger.timer('createEvent');
    const stoNumber = await this.generateStoNumber();

    const { scope, milestones, resourcePlan, riskAssessment, budgetEstimate, preShutdownChecklist, ...eventData } = input;

    const scopeJson = scope ? {
      equipmentList: scope.equipmentList,
      workPackages: scope.workPackages,
      inspectionRequirements: scope.inspectionRequirements,
      resourcePlan: resourcePlan ?? null,
      preShutdownChecklist: preShutdownChecklist ?? [],
    } : null;

    const event = await db.stoEvent.create({
      data: {
        stoNumber,
        name: eventData.name,
        description: eventData.description ?? null,
        type: eventData.type,
        plantId: eventData.plantId,
        unitId: eventData.unitId ?? null,
        plannedStartDate: eventData.plannedStartDate ? new Date(eventData.plannedStartDate) : null,
        plannedEndDate: eventData.plannedEndDate ? new Date(eventData.plannedEndDate) : null,
        budgetAmount: budgetEstimate?.totalAmount ?? null,
        scopeJson: scopeJson ? JSON.parse(JSON.stringify(scopeJson)) : undefined,
        milestonesJson: milestones ? JSON.parse(JSON.stringify({ milestones })) : undefined,
        riskAssessment: riskAssessment ? JSON.parse(JSON.stringify({ risks: riskAssessment })) : undefined,
        notes: eventData.notes ?? null,
        createdById,
      },
    });

    // Create tasks from work packages
    if (scope?.workPackages && scope.workPackages.length > 0) {
      await db.stoTask.createMany({
        data: scope.workPackages.map((wp, idx) => ({
          eventId: event.id,
          title: wp.title,
          description: wp.description,
          discipline: wp.discipline,
          estimatedHours: wp.estimatedHours,
          sortOrder: idx,
          predecessorIds: [],
          successorIds: [],
        })),
      });
    }

    timer.end();
    logger.info('STO event created', { stoNumber, eventId: event.id, type: input.type });
    return event;
  }

  /**
   * Estimate duration based on work package complexity
   */
  static estimateDuration(scope?: StoScopeDefinition): number {
    if (!scope) return 0;

    const baseHours = scope.workPackages.reduce((sum, wp) => sum + wp.estimatedHours, 0);

    // Add 15% for each inspection requirement
    const inspectionOverhead = scope.inspectionRequirements
      .filter(i => i.required)
      .length * (baseHours * 0.15);

    // Add 10% per equipment item (setup/logistics overhead)
    const equipmentOverhead = scope.equipmentList.length * (baseHours * 0.10);

    // Add 20% contingency for turnaround type
    const contingency = baseHours * 0.20;

    return Math.ceil(baseHours + inspectionOverhead + equipmentOverhead + contingency);
  }

  /**
   * Estimate budget based on scope and resource plan
   */
  static estimateBudget(scope?: StoScopeDefinition, resourcePlan?: StoResourcePlan): StoBudgetEstimate {
    const laborCost = resourcePlan?.labor.reduce((sum, l) => {
      const days = Math.ceil(
        (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000
      );
      return sum + (l.count * l.hoursPerDay * days * 50); // $50/hr average
    }, 0) ?? 0;

    const materialCost = scope?.workPackages.reduce((sum, wp) => sum + (wp.estimatedHours * 25), 0) ?? 0;

    const contractorCost = resourcePlan?.contractors.reduce((sum, c) => {
      const days = Math.ceil(
        (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / 86400000
      );
      return sum + (c.laborCount * 10 * days * 75); // $75/hr average
    }, 0) ?? 0;

    const equipmentRental = resourcePlan?.equipment.reduce((sum, e) => {
      return sum + (e.quantity * 500); // $500/unit avg
    }, 0) ?? 0;

    const subtotal = laborCost + materialCost + contractorCost + equipmentRental;
    const contingencyPercent = 15;
    const contingencyAmount = subtotal * (contingencyPercent / 100);
    const totalAmount = subtotal + contingencyAmount;

    return {
      laborCost: Math.round(laborCost * 100) / 100,
      materialCost: Math.round(materialCost * 100) / 100,
      contractorCost: Math.round(contractorCost * 100) / 100,
      equipmentRental: Math.round(equipmentRental * 100) / 100,
      contingencyPercent,
      contingencyAmount: Math.round(contingencyAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  /**
   * Generate default milestones for an STO type
   */
  static generateDefaultMilestones(type: StoEventType): StoMilestoneDefinition[] {
    const baseMilestones: StoMilestoneDefinition[] = [
      { id: 'ms-1', name: 'STO Plan Approved', phase: 'pre_shutdown', completionCriteria: 'All stakeholders sign-off', status: 'pending' },
      { id: 'ms-2', name: 'Materials & Equipment Delivered', phase: 'pre_shutdown', completionCriteria: 'All materials received on-site', status: 'pending' },
      { id: 'ms-3', name: 'Contractors Mobilized', phase: 'pre_shutdown', completionCriteria: 'All crews on-site with permits', status: 'pending' },
      { id: 'ms-4', name: 'Pre-Shutdown Checklist Complete', phase: 'pre_shutdown', completionCriteria: 'All pre-shutdown checks passed', status: 'pending' },
      { id: 'ms-5', name: 'Unit Shutdown Complete', phase: 'shutdown', completionCriteria: 'Safe isolation verified', status: 'pending' },
      { id: 'ms-6', name: '50% Work Completion', phase: 'execution', completionCriteria: 'Half of critical path tasks done', status: 'pending' },
      { id: 'ms-7', name: 'All Work Packages Complete', phase: 'execution', completionCriteria: 'All tasks signed off', status: 'pending' },
      { id: 'ms-8', name: 'Punch List Cleared', phase: 'execution', completionCriteria: 'Zero open punch items', status: 'pending' },
      { id: 'ms-9', name: 'Startup Authorization', phase: 'startup', completionCriteria: 'Safety verification complete', status: 'pending' },
      { id: 'ms-10', name: 'Unit at Full Production', phase: 'startup', completionCriteria: 'Production targets met', status: 'pending' },
      { id: 'ms-11', name: 'STO Closeout Report', phase: 'post_shutdown', completionCriteria: 'Final report submitted', status: 'pending' },
      { id: 'ms-12', name: 'Lessons Learned Captured', phase: 'post_shutdown', completionCriteria: 'Review meeting completed', status: 'pending' },
    ];

    if (type === 'emergency' || type === 'forced_outage') {
      return baseMilestones.filter(m =>
        ['ms-5', 'ms-7', 'ms-8', 'ms-9', 'ms-10', 'ms-12'].includes(m.id)
      );
    }

    return baseMilestones;
  }

  /**
   * Perform STO risk assessment
   */
  static performRiskAssessment(type: StoEventType, scope?: StoScopeDefinition): StoRiskItem[] {
    const risks: StoRiskItem[] = [];

    if (type === 'emergency' || type === 'forced_outage') {
      risks.push({
        id: 'risk-1', description: 'Insufficient planning time may lead to safety gaps',
        likelihood: 'high', impact: 'high', mitigation: 'Mandatory safety briefing before any work',
        owner: 'Safety Manager',
      });
      risks.push({
        id: 'risk-2', description: 'Parts availability may delay critical repairs',
        likelihood: 'medium', impact: 'high', mitigation: 'Pre-position critical spares',
        owner: 'Materials Manager',
      });
    }

    if (type === 'turnaround') {
      risks.push({
        id: 'risk-3', description: 'Scope creep adding unplanned work',
        likelihood: 'high', impact: 'medium', mitigation: 'Strict change management process',
        owner: 'STO Manager',
      });
      risks.push({
        id: 'risk-4', description: 'Contractor resource availability',
        likelihood: 'medium', impact: 'high', mitigation: 'Backup contractor agreements',
        owner: 'Procurement',
      });
    }

    if (scope?.equipmentList && scope.equipmentList.length > 10) {
      risks.push({
        id: 'risk-5', description: 'Coordination complexity with large equipment list',
        likelihood: 'medium', impact: 'medium', mitigation: 'Dedicated area coordinators',
        owner: 'STO Coordinator',
      });
    }

    // Universal risks
    risks.push({
      id: 'risk-6', description: 'Weather impact on outdoor activities',
      likelihood: 'low', impact: 'medium', mitigation: 'Weather monitoring and indoor backup plans',
      owner: 'Site Manager',
    });

    return risks;
  }

  /**
   * Update STO event fields
   */
  static async updateEvent(eventId: string, updates: Partial<{
    name: string;
    description: string;
    type: StoEventType;
    unitId: string;
    status: StoEventStatus;
    plannedStartDate: string;
    plannedEndDate: string;
    actualStartDate: string;
    actualEndDate: string;
    estimatedDurationHours: number;
    actualDurationHours: number;
    budgetAmount: number;
    actualCost: number;
    scopeJson: object;
    milestonesJson: object;
    riskAssessment: object;
    notes: string;
    approvedById: string;
  }>) {
    const event = await db.stoEvent.update({
      where: { id: eventId },
      data: {
        ...updates,
        ...(updates.plannedStartDate ? { plannedStartDate: new Date(updates.plannedStartDate) } : {}),
        ...(updates.plannedEndDate ? { plannedEndDate: new Date(updates.plannedEndDate) } : {}),
        ...(updates.actualStartDate ? { actualStartDate: new Date(updates.actualStartDate) } : {}),
        ...(updates.actualEndDate ? { actualEndDate: new Date(updates.actualEndDate) } : {}),
      },
    });

    logger.info('STO event updated', { eventId, fields: Object.keys(updates) });
    return event;
  }

  /**
   * Get STO event with full details
   */
  static async getEvent(eventId: string) {
    return db.stoEvent.findUnique({
      where: { id: eventId },
      include: {
        tasks: {
          orderBy: { sortOrder: 'asc' },
        },
        contractors: {
          include: {
            contractor: true,
          },
        },
        progressReports: {
          orderBy: { reportDate: 'desc' },
        },
      },
    });
  }

  /**
   * List STO events with filters
   */
  static async listEvents(filters: {
    plantId?: string;
    status?: StoEventStatus;
    type?: StoEventType;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { plantId, status, type, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (plantId) where.plantId = plantId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { stoNumber: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [events, total] = await Promise.all([
      db.stoEvent.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          tasks: {
            select: { id: true, status: true, isOnCriticalPath: true },
          },
          contractors: {
            include: { contractor: { select: { id: true, name: true } } },
          },
          progressReports: {
            select: { id: true, overallProgress: true, reportDate: true },
            orderBy: { reportDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.stoEvent.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return {
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
