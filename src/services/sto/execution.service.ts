// ============================================================================
// STO EXECUTION & REPORTING SERVICE — Progress, punch lists, closeout
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('STOExecution');

// ---- Types ----

export interface ProgressUpdate {
  overallProgress: number;
  tasksCompleted: number;
  tasksTotal: number;
  tasksInProgress: number;
  issuesCount: number;
  holdsCount: number;
  incidentsCount: number;
  manHoursToday: number;
  manHoursTotal: number;
  budgetSpent: number;
  budgetRemaining: number;
  highlights: string;
  issues?: Array<{ description: string; severity: string; status: string }>;
  notes?: string;
}

export interface PunchItem {
  id: string;
  taskId: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'cleared';
  assignedTo?: string;
  createdAt: string;
  clearedAt?: string;
  clearedBy?: string;
}

export interface ShiftHandoverNote {
  id: string;
  eventId: string;
  shift: string;
  date: string;
  workCompleted: string;
  workInProgress: string;
  pendingItems: string;
  safetyNotes: string;
  materialStatus: string;
  handoverFrom?: string;
  handoverTo?: string;
}

export interface StartupReadiness {
  eventId: string;
  isReady: boolean;
  checks: Array<{
    category: string;
    item: string;
    status: 'pass' | 'fail' | 'pending';
    notes?: string;
  }>;
  overallScore: number;
  deficiencies: string[];
}

export interface StoCloseoutReport {
  eventId: string;
  stoNumber: string;
  name: string;
  type: string;
  plantId: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  plannedDurationHours: number | null;
  actualDurationHours: number | null;
  budgetAmount: number | null;
  actualCost: number;
  budgetVariancePercent: number;
  scheduleVarianceHours: number;
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number;
  safetyIncidents: number;
  lessonsLearned: Array<{ category: string; description: string; recommendation: string }>;
  generatedAt: string;
}

// ---- Service ----

export class StoExecutionService {

  /**
   * Submit a daily progress report
   */
  static async submitProgressReport(eventId: string, reportedById: string, update: ProgressUpdate) {
    // Calculate budget remaining if not provided
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      select: { budgetAmount: true, actualCost: true },
    });

    const budgetRemaining = update.budgetRemaining ??
      ((event?.budgetAmount ?? 0) - (update.budgetSpent ?? 0));

    const report = await db.stoProgressReport.create({
      data: {
        eventId,
        reportDate: new Date(),
        overallProgress: Math.min(100, Math.max(0, update.overallProgress)),
        tasksCompleted: update.tasksCompleted,
        tasksTotal: update.tasksTotal,
        tasksInProgress: update.tasksInProgress,
        issuesCount: update.issuesCount,
        holdsCount: update.holdsCount,
        incidentsCount: update.incidentsCount,
        manHoursToday: update.manHoursToday,
        manHoursTotal: update.manHoursTotal,
        budgetSpent: update.budgetSpent,
        budgetRemaining: Math.max(0, budgetRemaining),
        highlights: update.highlights,
        issues: update.issues ?? [],
        notes: update.notes ?? null,
        reportedById,
      },
    });

    // Update event overall progress and cost
    await db.stoEvent.update({
      where: { id: eventId },
      data: {
        actualCost: update.budgetSpent,
      },
    });

    // Update individual task progress based on tasks completed
    if (update.tasksTotal > 0 && update.tasksCompleted > 0) {
      const tasks = await db.stoTask.findMany({
        where: { eventId, status: { not: 'completed' } },
        orderBy: { sortOrder: 'asc' },
        take: update.tasksTotal,
      });

      const completedCount = Math.min(update.tasksCompleted, tasks.length);
      const inProgressCount = Math.min(update.tasksInProgress, tasks.length - completedCount);

      for (let i = 0; i < completedCount && i < tasks.length; i++) {
        await db.stoTask.update({
          where: { id: tasks[i].id },
          data: { status: 'completed', progress: 100 },
        });
      }
      for (let i = completedCount; i < completedCount + inProgressCount && i < tasks.length; i++) {
        await db.stoTask.update({
          where: { id: tasks[i].id },
          data: { status: 'in_progress', progress: Math.min(90, tasks[i].progress + 10) },
        });
      }
    }

    logger.info('Progress report submitted', {
      eventId,
      progress: update.overallProgress,
      reportedById,
    });

    return report;
  }

  /**
   * Get progress history for an STO event
   */
  static async getProgressHistory(eventId: string) {
    const reports = await db.stoProgressReport.findMany({
      where: { eventId },
      orderBy: { reportDate: 'asc' },
    });

    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      select: { plannedStartDate: true, plannedEndDate: true, budgetAmount: true, tasks: true },
    });

    const tasks = event?.tasks ?? [];
    const actualCompletionRate = tasks.length > 0
      ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
      : 0;

    return {
      reports,
      summary: {
        actualCompletionRate,
        latestReport: reports.length > 0 ? reports[reports.length - 1] : null,
        totalManHours: reports.reduce((sum, r) => sum + (r.manHoursTotal ?? 0), 0),
        totalBudgetSpent: reports.length > 0
          ? reports[reports.length - 1].budgetSpent
          : 0,
        totalIssues: reports.reduce((sum, r) => sum + r.issuesCount, 0),
        totalHolds: reports.reduce((sum, r) => sum + r.holdsCount, 0),
      },
    };
  }

  /**
   * Get work completion percentage by package
   */
  static async getPackageCompletion(eventId: string): Promise<Array<{
    discipline: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    completionPercent: number;
    totalEstimatedHours: number;
    completedHours: number;
  }>> {
    const tasks = await db.stoTask.findMany({
      where: { eventId },
    });

    const byDiscipline = new Map<string, typeof tasks>();

    for (const task of tasks) {
      const discipline = task.discipline ?? 'other';
      if (!byDiscipline.has(discipline)) byDiscipline.set(discipline, []);
      byDiscipline.get(discipline)!.push(task);
    }

    return Array.from(byDiscipline.entries()).map(([discipline, dTasks]) => {
      const total = dTasks.length;
      const completed = dTasks.filter(t => t.status === 'completed').length;
      const inProgress = dTasks.filter(t => t.status === 'in_progress').length;
      const totalHours = dTasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
      const completedHours = dTasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.actualHours ?? t.estimatedHours ?? 0), 0);

      return {
        discipline,
        totalTasks: total,
        completedTasks: completed,
        inProgressTasks: inProgress,
        completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalEstimatedHours: Math.round(totalHours * 100) / 100,
        completedHours: Math.round(completedHours * 100) / 100,
      };
    });
  }

  /**
   * Actual vs planned comparison
   */
  static async getActualVsPlanned(eventId: string) {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      include: { tasks: true, progressReports: { orderBy: { reportDate: 'desc' }, take: 1 } },
    });

    if (!event) return null;

    const plannedDuration = event.estimatedDurationHours ?? 0;
    let actualDuration = 0;
    if (event.actualStartDate && event.actualEndDate) {
      actualDuration = (event.actualEndDate.getTime() - event.actualStartDate.getTime()) / 3600000;
    }

    const plannedCost = event.budgetAmount ?? 0;
    const actualCost = event.actualCost;

    const latestReport = event.progressReports[0];

    return {
      schedule: {
        plannedStart: event.plannedStartDate,
        plannedEnd: event.plannedEndDate,
        plannedDurationHours: plannedDuration,
        actualStart: event.actualStartDate,
        actualEnd: event.actualEndDate,
        actualDurationHours: Math.round(actualDuration * 100) / 100,
        varianceHours: Math.round((actualDuration - plannedDuration) * 100) / 100,
        isOnSchedule: actualDuration <= plannedDuration * 1.1, // 10% tolerance
      },
      budget: {
        plannedAmount: plannedCost,
        actualAmount: actualCost,
        variance: plannedCost > 0 ? Math.round(((actualCost - plannedCost) / plannedCost) * 100) : 0,
        isOnBudget: plannedCost > 0 ? actualCost <= plannedCost * 1.1 : true,
      },
      scope: {
        plannedTasks: event.tasks.length,
        completedTasks: event.tasks.filter(t => t.status === 'completed').length,
        inProgressTasks: event.tasks.filter(t => t.status === 'in_progress').length,
        addedTasks: 0, // tracked via scope changes
        removedTasks: 0,
      },
      progress: {
        overallProgress: latestReport?.overallProgress ?? 0,
        manHoursTotal: latestReport?.manHoursTotal ?? 0,
        issuesCount: latestReport?.issuesCount ?? 0,
        holdsCount: latestReport?.holdsCount ?? 0,
        incidentsCount: latestReport?.incidentsCount ?? 0,
      },
    };
  }

  /**
   * Manage punch list items (stored in task notes as JSON)
   */
  static async getPunchList(eventId: string): Promise<PunchItem[]> {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      select: { milestonesJson: true },
    });

    if (!event?.milestonesJson) return [];

    const data = event.milestonesJson as Record<string, unknown>;
    return (data.punchList as PunchItem[]) ?? [];
  }

  static async addPunchItem(
    eventId: string,
    item: Omit<PunchItem, 'id' | 'createdAt'>
  ): Promise<PunchItem[]> {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      select: { milestonesJson: true },
    });

    const data = (event?.milestonesJson as Record<string, unknown>) ?? {};
    const punchList = (data.punchList as PunchItem[]) ?? [];

    punchList.push({
      ...item,
      id: `pi-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });

    await db.stoEvent.update({
      where: { id: eventId },
      data: { milestonesJson: JSON.parse(JSON.stringify({ ...data, punchList })) },
    });

    return punchList;
  }

  static async clearPunchItem(eventId: string, itemId: string, clearedBy: string): Promise<PunchItem[]> {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      select: { milestonesJson: true },
    });

    const data = (event?.milestonesJson as Record<string, unknown>) ?? {};
    const punchList = (data.punchList as PunchItem[]) ?? [];

    const item = punchList.find(p => p.id === itemId);
    if (item) {
      item.status = 'cleared';
      item.clearedAt = new Date().toISOString();
      item.clearedBy = clearedBy;
    }

    await db.stoEvent.update({
      where: { id: eventId },
      data: { milestonesJson: JSON.parse(JSON.stringify({ ...data, punchList })) },
    });

    return punchList;
  }

  /**
   * Manage shift handover notes
   */
  static async saveShiftHandover(note: ShiftHandoverNote): Promise<void> {
    const event = await db.stoEvent.findUnique({
      where: { id: note.eventId },
      select: { milestonesJson: true },
    });

    const data = (event?.milestonesJson as Record<string, unknown>) ?? {};
    const handovers = (data.shiftHandovers as ShiftHandoverNote[]) ?? [];

    handovers.push({
      ...note,
      id: `sh-${Date.now()}`,
    });

    await db.stoEvent.update({
      where: { id: note.eventId },
      data: { milestonesJson: JSON.parse(JSON.stringify({ ...data, shiftHandovers: handovers })) },
    });

    logger.info('Shift handover saved', { eventId: note.eventId, shift: note.shift });
  }

  static async getShiftHandovers(eventId: string): Promise<ShiftHandoverNote[]> {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      select: { milestonesJson: true },
    });

    const data = (event?.milestonesJson as Record<string, unknown>) ?? {};
    return (data.shiftHandovers as ShiftHandoverNote[]) ?? [];
  }

  /**
   * Startup readiness verification
   */
  static async verifyStartupReadiness(eventId: string): Promise<StartupReadiness> {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      include: { tasks: true },
    });

    if (!event) {
      return { eventId, isReady: false, checks: [], overallScore: 0, deficiencies: ['Event not found'] };
    }

    const tasks = event.tasks;
    const checks: StartupReadiness['checks'] = [];

    // All tasks completed
    const allCompleted = tasks.every(t => t.status === 'completed');
    checks.push({
      category: 'Work Completion',
      item: 'All work packages completed',
      status: allCompleted ? 'pass' : 'fail',
      notes: allCompleted ? undefined : `${tasks.filter(t => t.status !== 'completed').length} tasks remaining`,
    });

    // Punch list cleared
    const punchList = await this.getPunchList(eventId);
    const allPunchCleared = punchList.length === 0 || punchList.every(p => p.status === 'cleared');
    checks.push({
      category: 'Punch List',
      item: 'All punch items cleared',
      status: allPunchCleared ? 'pass' : 'fail',
      notes: allPunchCleared ? undefined : `${punchList.filter(p => p.status !== 'cleared').length} open items`,
    });

    // Safety systems restored
    checks.push({
      category: 'Safety',
      item: 'Safety systems verified and restored',
      status: 'pending',
    });

    // LOTO removed
    checks.push({
      category: 'Safety',
      item: 'All LOTO devices removed and verified',
      status: 'pending',
    });

    // Instrumentation calibrated
    checks.push({
      category: 'Instrumentation',
      item: 'All instruments calibrated and verified',
      status: 'pending',
    });

    // Electrical systems tested
    checks.push({
      category: 'Electrical',
      item: 'Electrical systems tested and energized',
      status: 'pending',
    });

    // Materials and tools removed
    checks.push({
      category: 'Housekeeping',
      item: 'All materials, tools, and scaffolding removed',
      status: 'pending',
    });

    // Environmental checks
    checks.push({
      category: 'Environmental',
      item: 'Environmental compliance verified',
      status: 'pending',
    });

    // Operations notified
    checks.push({
      category: 'Communication',
      item: 'Operations team notified of startup readiness',
      status: 'pending',
    });

    const passedCount = checks.filter(c => c.status === 'pass').length;
    const failCount = checks.filter(c => c.status === 'fail').length;
    const overallScore = Math.round((passedCount / checks.length) * 100);

    const deficiencies = checks
      .filter(c => c.status === 'fail')
      .map(c => `${c.category}: ${c.item} ${c.notes ? `(${c.notes})` : ''}`);

    return {
      eventId,
      isReady: failCount === 0 && passedCount >= checks.length * 0.6,
      checks,
      overallScore,
      deficiencies,
    };
  }

  /**
   * Generate STO closeout report
   */
  static async generateCloseoutReport(eventId: string): Promise<StoCloseoutReport> {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      include: {
        tasks: true,
        progressReports: { orderBy: { reportDate: 'desc' } },
      },
    });

    if (!event) throw new Error(`STO Event ${eventId} not found`);

    const tasks = event.tasks;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    let actualDurationHours: number | null = null;
    if (event.actualStartDate && event.actualEndDate) {
      actualDurationHours = (event.actualEndDate.getTime() - event.actualStartDate.getTime()) / 3600000;
    }

    const scheduleVariance = actualDurationHours && event.estimatedDurationHours
      ? actualDurationHours - event.estimatedDurationHours
      : 0;

    const budgetVariancePercent = event.budgetAmount && event.budgetAmount > 0
      ? Math.round(((event.actualCost - event.budgetAmount) / event.budgetAmount) * 100)
      : 0;

    // Generate lessons learned from issues
    const allIssues = event.progressReports.flatMap(r =>
      ((r.issues as Array<{ description: string; severity: string; status: string }>) ?? [])
    );

    const lessonsLearned = [
      ...(allIssues.length > 0 ? [{
        category: 'Issues Encountered',
        description: `${allIssues.length} issues reported during execution`,
        recommendation: 'Review recurring issues for preventive measures',
      }] : []),
      {
        category: 'Schedule',
        description: scheduleVariance > 0
          ? `STO exceeded planned duration by ${Math.round(scheduleVariance)} hours`
          : 'STO completed within planned duration',
        recommendation: scheduleVariance > 0
          ? 'Consider adding buffer time for future STOs of similar scope'
          : 'Continue current planning methodology',
      },
      {
        category: 'Budget',
        description: budgetVariancePercent > 0
          ? `Cost overrun of ${budgetVariancePercent}%`
          : 'STO completed within budget',
        recommendation: budgetVariancePercent > 10
          ? 'Review contractor costs and material pricing'
          : 'Current cost estimation is accurate',
      },
    ];

    const report: StoCloseoutReport = {
      eventId: event.id,
      stoNumber: event.stoNumber,
      name: event.name,
      type: event.type,
      plantId: event.plantId,
      plannedStart: event.plannedStartDate?.toISOString() ?? null,
      plannedEnd: event.plannedEndDate?.toISOString() ?? null,
      actualStart: event.actualStartDate?.toISOString() ?? null,
      actualEnd: event.actualEndDate?.toISOString() ?? null,
      plannedDurationHours: event.estimatedDurationHours,
      actualDurationHours: actualDurationHours ? Math.round(actualDurationHours * 100) / 100 : null,
      budgetAmount: event.budgetAmount,
      actualCost: event.actualCost,
      budgetVariancePercent,
      scheduleVarianceHours: Math.round(scheduleVariance * 100) / 100,
      tasksCompleted: completedTasks,
      tasksTotal: tasks.length,
      completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
      safetyIncidents: event.progressReports.reduce((sum, r) => sum + r.incidentsCount, 0),
      lessonsLearned,
      generatedAt: new Date().toISOString(),
    };

    logger.info('Closeout report generated', { eventId, stoNumber: event.stoNumber });
    return report;
  }

  /**
   * Capture lessons learned
   */
  static async captureLessonsLearned(
    eventId: string,
    lessons: Array<{ category: string; description: string; recommendation: string }>
  ): Promise<void> {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      select: { milestonesJson: true },
    });

    const data = (event?.milestonesJson as Record<string, unknown>) ?? {};
    const existing = (data.lessonsLearned as typeof lessons) ?? [];

    const updated = [...existing, ...lessons.map((l, i) => ({
      ...l,
      id: `ll-${Date.now()}-${i}`,
      capturedAt: new Date().toISOString(),
    }))];

    await db.stoEvent.update({
      where: { id: eventId },
      data: { milestonesJson: JSON.parse(JSON.stringify({ ...data, lessonsLearned: updated })) },
    });

    logger.info('Lessons learned captured', { eventId, count: lessons.length });
  }
}
