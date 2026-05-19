// ============================================================================
// STO CONTRACTOR COORDINATION SERVICE — Registration, assignment, performance
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('STOContractor');

// ---- Types ----

export interface ContractorInput {
  name: string;
  code: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  company?: string;
  taxId?: string;
  address?: string;
  specialties?: string[];
  qualificationLevel?: 'tier1' | 'tier2' | 'tier3';
  insuranceExpiry?: string;
  safetyCertExpiry?: string;
  notes?: string;
}

export interface ContractorAssignmentInput {
  contractorId: string;
  eventId: string;
  taskIds?: string[];
  laborCount?: number;
  startDate?: string;
  endDate?: string;
  budgetAmount?: number;
  accessPermitId?: string;
  notes?: string;
}

export interface ContractorPerformance {
  contractorId: string;
  contractorName: string;
  totalAssignments: number;
  completedAssignments: number;
  scheduleAdherence: number; // 0-100%
  averageRating: number;
  totalBudget: number;
  totalActualCost: number;
  budgetVariance: number; // percentage
  safetyIncidents: number;
  qualityScore: number; // 0-100%
  overallScore: number; // 0-100%
}

export interface ContractorAvailability {
  contractorId: string;
  contractorName: string;
  specialties: string[];
  qualificationLevel: string | null;
  rating: number | null;
  isAvailable: boolean;
  currentAssignment: string | null;
  nextAvailableDate: string | null;
  insuranceValid: boolean;
  safetyCertValid: boolean;
  activeAssignmentCount: number;
}

// ---- Service ----

export class StoContractorService {

  /**
   * Register a new contractor
   */
  static async registerContractor(input: ContractorInput) {
    const contractor = await db.stoContractor.create({
      data: {
        name: input.name,
        code: input.code,
        contactPerson: input.contactPerson ?? null,
        contactPhone: input.contactPhone ?? null,
        contactEmail: input.contactEmail ?? null,
        company: input.company ?? null,
        taxId: input.taxId ?? null,
        address: input.address ?? null,
        specialties: input.specialties ? JSON.parse(JSON.stringify(input.specialties)) : null,
        qualificationLevel: input.qualificationLevel ?? null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        safetyCertExpiry: input.safetyCertExpiry ? new Date(input.safetyCertExpiry) : null,
        notes: input.notes ?? null,
      },
    });

    logger.info('Contractor registered', { contractorId: contractor.id, code: input.code });
    return contractor;
  }

  /**
   * Update contractor details
   */
  static async updateContractor(contractorId: string, updates: Partial<ContractorInput>) {
    const contractor = await db.stoContractor.update({
      where: { id: contractorId },
      data: {
        ...updates,
        specialties: updates.specialties ? JSON.parse(JSON.stringify(updates.specialties)) : undefined,
        insuranceExpiry: updates.insuranceExpiry ? new Date(updates.insuranceExpiry) : undefined,
        safetyCertExpiry: updates.safetyCertExpiry ? new Date(updates.safetyCertExpiry) : undefined,
      },
    });

    logger.info('Contractor updated', { contractorId, fields: Object.keys(updates) });
    return contractor;
  }

  /**
   * List contractors with filters
   */
  static async listContractors(filters: {
    search?: string;
    specialty?: string;
    qualificationLevel?: string;
    isActive?: boolean;
    expiringSoon?: boolean; // insurance/cert expiring in 30 days
    page?: number;
    limit?: number;
  } = {}) {
    const { search, specialty, qualificationLevel, isActive, expiringSoon, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
        { company: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    if (qualificationLevel) where.qualificationLevel = qualificationLevel;
    if (isActive !== undefined) where.isActive = isActive;

    if (specialty) {
      where.specialties = { path: '$', array_contains: [specialty] as unknown[] };
    }

    if (expiringSoon) {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);
      where.OR = [
        { insuranceExpiry: { lte: thirtyDaysFromNow, gte: new Date() } },
        { safetyCertExpiry: { lte: thirtyDaysFromNow, gte: new Date() } },
      ];
    }

    const [contractors, total] = await Promise.all([
      db.stoContractor.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          assignments: {
            include: {
              event: { select: { id: true, stoNumber: true, name: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.stoContractor.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return {
      data: contractors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get contractor detail
   */
  static async getContractor(contractorId: string) {
    return db.stoContractor.findUnique({
      where: { id: contractorId },
      include: {
        assignments: {
          include: {
            event: {
              select: { id: true, stoNumber: true, name: true, status: true, plannedStartDate: true, plannedEndDate: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Delete contractor (soft delete)
   */
  static async deleteContractor(contractorId: string) {
    const activeAssignments = await db.stoContractorAssignment.count({
      where: {
        contractorId,
        status: { in: ['assigned', 'mobilized', 'on_site'] },
      },
    });

    if (activeAssignments > 0) {
      throw new Error(`Cannot deactivate contractor with ${activeAssignments} active assignment(s)`);
    }

    return db.stoContractor.update({
      where: { id: contractorId },
      data: { isActive: false },
    });
  }

  /**
   * Assign contractor to STO event
   */
  static async assignContractor(input: ContractorAssignmentInput) {
    const assignment = await db.stoContractorAssignment.create({
      data: {
        contractorId: input.contractorId,
        eventId: input.eventId,
        taskIds: input.taskIds ?? [],
        laborCount: input.laborCount ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        budgetAmount: input.budgetAmount ?? null,
        accessPermitId: input.accessPermitId ?? null,
        notes: input.notes ?? null,
      },
    });

    logger.info('Contractor assigned to event', {
      assignmentId: assignment.id,
      contractorId: input.contractorId,
      eventId: input.eventId,
    });

    return assignment;
  }

  /**
   * Update assignment status (mobilization workflow)
   */
  static async updateAssignmentStatus(
    assignmentId: string,
    status: 'assigned' | 'mobilized' | 'on_site' | 'demobilized' | 'completed',
    actualCost?: number,
    performanceRating?: number
  ) {
    const assignment = await db.stoContractorAssignment.update({
      where: { id: assignmentId },
      data: {
        status,
        ...(actualCost !== undefined ? { actualCost } : {}),
        ...(performanceRating !== undefined ? { performanceRating } : {}),
      },
    });

    logger.info('Contractor assignment status updated', { assignmentId, status });
    return assignment;
  }

  /**
   * Get contractor availability for scheduling
   */
  static async getContractorAvailability(
    startDate: string,
    endDate: string,
    specialties?: string[]
  ): Promise<ContractorAvailability[]> {
    const allContractors = await db.stoContractor.findMany({
      where: { isActive: true },
      include: {
        assignments: {
          where: {
            status: { in: ['assigned', 'mobilized', 'on_site'] },
          },
          include: {
            event: { select: { id: true, name: true, plannedEndDate: true } },
          },
        },
      },
    });

    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const availability: ContractorAvailability[] = allContractors.map(c => {
      const contractorSpecialties = (c.specialties as string[]) ?? [];
      const matchesSpecialty = !specialties || specialties.length === 0 ||
        contractorSpecialties.some(s => specialties.includes(s));

      // Check for active assignments that overlap with the requested period
      const conflictingAssignments = c.assignments.filter(a => {
        if (!a.startDate || !a.endDate) return false;
        const aStart = new Date(a.startDate);
        const aEnd = new Date(a.endDate);
        return aStart < end && aEnd > start;
      });

      const currentAssignment = c.assignments.length > 0 ? c.assignments[0] : null;
      const nextAvailableDate = currentAssignment?.event.plannedEndDate
        ? new Date(new Date(currentAssignment.event.plannedEndDate).getTime() + 86400000).toISOString()
        : null;

      const insuranceValid = !c.insuranceExpiry || c.insuranceExpiry > now;
      const safetyCertValid = !c.safetyCertExpiry || c.safetyCertExpiry > now;

      return {
        contractorId: c.id,
        contractorName: c.name,
        specialties: contractorSpecialties,
        qualificationLevel: c.qualificationLevel,
        rating: c.rating,
        isAvailable: matchesSpecialty && conflictingAssignments.length === 0 && insuranceValid && safetyCertValid,
        currentAssignment: currentAssignment ? `${currentAssignment.event.name}` : null,
        nextAvailableDate,
        insuranceValid,
        safetyCertValid,
        activeAssignmentCount: c.assignments.length,
      };
    });

    // Sort: available first, then by rating
    availability.sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    return availability;
  }

  /**
   * Track contractor performance
   */
  static async getContractorPerformance(contractorId: string): Promise<ContractorPerformance> {
    const contractor = await db.stoContractor.findUnique({
      where: { id: contractorId },
      select: { name: true, rating: true },
    });

    if (!contractor) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    const assignments = await db.stoContractorAssignment.findMany({
      where: { contractorId },
    });

    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;

    // Schedule adherence: completed on or before planned end
    const completedWithEvents = await db.stoContractorAssignment.findMany({
      where: { contractorId, status: 'completed' },
      include: { event: { select: { plannedEndDate: true } } },
    });

    const scheduleAdherence = completedWithEvents.length > 0
      ? Math.round(
          (completedWithEvents.filter(a => {
            const plannedEnd = a.event.plannedEndDate;
            if (!plannedEnd) return true;
            return a.endDate ? a.endDate <= plannedEnd : false;
          }).length / completedWithEvents.length) * 100
        )
      : 100;

    const totalBudget = assignments.reduce((sum, a) => sum + (a.budgetAmount ?? 0), 0);
    const totalActualCost = assignments.reduce((sum, a) => sum + (a.actualCost ?? 0), 0);
    const budgetVariance = totalBudget > 0
      ? Math.round(((totalActualCost - totalBudget) / totalBudget) * 100)
      : 0;

    const avgRating = assignments
      .filter(a => a.performanceRating !== null)
      .reduce((sum, a) => sum + (a.performanceRating ?? 0), 0) /
      (assignments.filter(a => a.performanceRating !== null).length || 1);

    // Quality score: based on schedule adherence, budget variance, rating
    const qualityScore = Math.round(
      (scheduleAdherence * 0.3) +
      (Math.max(0, 100 - Math.abs(budgetVariance)) * 0.3) +
      ((avgRating / 5) * 100 * 0.4)
    );

    // Overall score
    const overallScore = Math.round(
      (scheduleAdherence * 0.25) +
      (qualityScore * 0.35) +
      ((avgRating / 5) * 100 * 0.2) +
      (completedAssignments > 0 ? (completedAssignments / totalAssignments) * 100 * 0.2 : 50)
    );

    return {
      contractorId,
      contractorName: contractor.name,
      totalAssignments,
      completedAssignments,
      scheduleAdherence,
      averageRating: Math.round(avgRating * 100) / 100,
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalActualCost: Math.round(totalActualCost * 100) / 100,
      budgetVariance,
      safetyIncidents: 0, // tracked externally
      qualityScore,
      overallScore,
    };
  }

  /**
   * Check for expiring insurance/certifications
   */
  static async getExpiringCertifications(daysThreshold: number = 30): Promise<Array<{
    contractorId: string;
    contractorName: string;
    insuranceExpiry: string | null;
    safetyCertExpiry: string | null;
    expiringItems: string[];
  }>> {
    const threshold = new Date(Date.now() + daysThreshold * 86400000);

    const contractors = await db.stoContractor.findMany({
      where: {
        isActive: true,
        OR: [
          { insuranceExpiry: { lte: threshold, gte: new Date() } },
          { safetyCertExpiry: { lte: threshold, gte: new Date() } },
        ],
      },
      select: {
        id: true,
        name: true,
        insuranceExpiry: true,
        safetyCertExpiry: true,
      },
    });

    return contractors.map(c => {
      const expiringItems: string[] = [];
      if (c.insuranceExpiry && c.insuranceExpiry <= threshold) expiringItems.push(`Insurance: ${c.insuranceExpiry.toISOString().split('T')[0]}`);
      if (c.safetyCertExpiry && c.safetyCertExpiry <= threshold) expiringItems.push(`Safety Cert: ${c.safetyCertExpiry.toISOString().split('T')[0]}`);

      return {
        contractorId: c.id,
        contractorName: c.name,
        insuranceExpiry: c.insuranceExpiry?.toISOString() ?? null,
        safetyCertExpiry: c.safetyCertExpiry?.toISOString() ?? null,
        expiringItems,
      };
    });
  }
}
