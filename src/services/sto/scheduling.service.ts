// ============================================================================
// STO SCHEDULING SERVICE — Multi-unit coordination, resource-constrained scheduling
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('STOScheduling');

// ---- Types ----

export interface GanttBarData {
  id: string;
  title: string;
  eventId: string;
  startDate: string;
  endDate: string;
  progress: number;
  isCriticalPath: boolean;
  discipline?: string;
  assignedTo?: string;
  dependencies?: string[];
  barColor?: string;
}

export interface GanttChartData {
  events: Array<{
    id: string;
    stoNumber: string;
    name: string;
    type: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    overallProgress: number;
    bars: GanttBarData[];
  }>;
  dateRange: { min: string; max: string };
  resourceSummary: ResourceSummary;
}

export interface ResourceSummary {
  totalLaborRequired: number;
  totalLaborAvailable: number;
  overcommitted: boolean;
  peakDay?: string;
  contractorCount: number;
}

export interface ScheduleOverlap {
  event1: { id: string; name: string };
  event2: { id: string; name: string };
  overlapDays: number;
  sharedResources: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface ScheduleVersion {
  id: string;
  eventId: string;
  version: number;
  createdAt: string;
  changes: Array<{ taskId: string; field: string; oldValue: unknown; newValue: unknown }>;
  reason: string;
  snapshot: Array<{ id: string; title: string; startDate: Date | null; endDate: Date | null; estimatedHours: number | null; sortOrder: number }>;
}

export interface WeatherConsideration {
  date: string;
  condition: string;
  impact: 'none' | 'low' | 'medium' | 'high';
  affectedDisciplines: string[];
  recommendation: string;
}

// ---- Service ----

export class StoSchedulingService {

  /**
   * Generate Gantt chart data for one or all STO events
   */
  static async generateGanttData(eventId?: string): Promise<GanttChartData> {
    const where = eventId ? { id: eventId } : {};
    const events = await db.stoEvent.findMany({
      where,
      include: {
        tasks: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { plannedStartDate: 'asc' },
    });

    if (events.length === 0) {
      return { events: [], dateRange: { min: new Date().toISOString(), max: new Date().toISOString() }, resourceSummary: { totalLaborRequired: 0, totalLaborAvailable: 0, overcommitted: false, contractorCount: 0 } };
    }

    const bars: GanttBarData[] = [];
    let minDate = Infinity;
    let maxDate = -Infinity;
    let totalLaborRequired = 0;

    const disciplineColors: Record<string, string> = {
      mechanical: '#3b82f6',
      electrical: '#f59e0b',
      instrument: '#10b981',
      civil: '#8b5cf6',
      safety: '#ef4444',
    };

    for (const event of events) {
      const eventStart = event.plannedStartDate?.getTime() ?? Date.now();
      const eventEnd = event.plannedEndDate?.getTime() ?? Date.now() + 86400000;
      minDate = Math.min(minDate, eventStart);
      maxDate = Math.max(maxDate, eventEnd);

      // Calculate overall event progress
      const tasks = event.tasks;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const overallProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

      for (const task of tasks) {
        const taskStart = task.startDate?.toISOString() ?? event.plannedStartDate?.toISOString() ?? new Date().toISOString();
        const taskEnd = task.endDate?.toISOString() ?? event.plannedEndDate?.toISOString() ?? new Date().toISOString();

        bars.push({
          id: task.id,
          title: task.title,
          eventId: event.id,
          startDate: taskStart,
          endDate: taskEnd,
          progress: task.progress,
          isCriticalPath: task.isOnCriticalPath,
          discipline: task.discipline ?? undefined,
          assignedTo: task.assignedToId ?? undefined,
          dependencies: (task.predecessorIds as string[]) ?? [],
          barColor: disciplineColors[task.discipline ?? ''] ?? '#6b7280',
        });

        totalLaborRequired += task.estimatedHours ?? 0;
      }
    }

    // Calculate resource summary
    const assignments = await db.stoContractorAssignment.findMany({
      where: { event: { id: eventId } },
    });
    const contractorLabor = assignments.reduce((sum, a) => sum + (a.laborCount ?? 0), 0);

    const resourceSummary: ResourceSummary = {
      totalLaborRequired: Math.round(totalLaborRequired),
      totalLaborAvailable: contractorLabor * 480, // assume 480 hrs per worker per quarter
      overcommitted: totalLaborRequired > contractorLabor * 480,
      contractorCount: assignments.length,
    };

    return {
      events: events.map(event => {
        const tasks = event.tasks;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const overallProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
        const eventBars = bars.filter(b => b.eventId === event.id);

        return {
          id: event.id,
          stoNumber: event.stoNumber,
          name: event.name,
          type: event.type,
          status: event.status,
          startDate: event.plannedStartDate?.toISOString() ?? null,
          endDate: event.plannedEndDate?.toISOString() ?? null,
          overallProgress,
          bars: eventBars,
        };
      }),
      dateRange: {
        min: minDate === Infinity ? new Date().toISOString() : new Date(minDate).toISOString(),
        max: maxDate === -Infinity ? new Date().toISOString() : new Date(maxDate).toISOString(),
      },
      resourceSummary,
    };
  }

  /**
   * Detect scheduling overlaps between STO events
   */
  static async detectOverlaps(plantId?: string): Promise<ScheduleOverlap[]> {
    const events = await db.stoEvent.findMany({
      where: {
        ...(plantId ? { plantId } : {}),
        status: { not: 'cancelled' },
        plannedStartDate: { not: null },
        plannedEndDate: { not: null },
      },
      include: {
        contractors: {
          include: { contractor: { select: { name: true } } },
        },
      },
    });

    const overlaps: ScheduleOverlap[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const e1 = events[i];
        const e2 = events[j];

        if (!e1.plannedStartDate || !e1.plannedEndDate || !e2.plannedStartDate || !e2.plannedEndDate) continue;

        const e1Start = e1.plannedStartDate.getTime();
        const e1End = e1.plannedEndDate.getTime();
        const e2Start = e2.plannedStartDate.getTime();
        const e2End = e2.plannedEndDate.getTime();

        // Check for overlap
        if (e1Start < e2End && e2Start < e1End) {
          const overlapStart = Math.max(e1Start, e2Start);
          const overlapEnd = Math.min(e1End, e2End);
          const overlapDays = Math.ceil((overlapEnd - overlapStart) / 86400000);

          // Find shared contractors
          const contractors1 = e1.contractors.map(c => c.contractor.name);
          const contractors2 = e2.contractors.map(c => c.contractor.name);
          const sharedResources = contractors1.filter(c => contractors2.includes(c));

          let severity: 'low' | 'medium' | 'high' = 'low';
          if (sharedResources.length > 0) severity = 'high';
          else if (overlapDays > 3) severity = 'medium';

          overlaps.push({
            event1: { id: e1.id, name: e1.name },
            event2: { id: e2.id, name: e2.name },
            overlapDays,
            sharedResources,
            severity,
          });
        }
      }
    }

    logger.info('Overlap detection complete', { overlaps: overlaps.length });
    return overlaps;
  }

  /**
   * Resource-constrained scheduling — detect resource conflicts
   */
  static async checkResourceConstraints(eventId: string): Promise<{
    isFeasible: boolean;
    conflicts: Array<{ type: string; description: string; severity: string }>;
    recommendations: string[];
  }> {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      include: {
        tasks: true,
        contractors: { include: { contractor: true } },
      },
    });

    if (!event) return { isFeasible: false, conflicts: [], recommendations: ['Event not found'] };

    const conflicts: Array<{ type: string; description: string; severity: string }> = [];
    const recommendations: string[] = [];

    // Check contractor availability
    const contractorIds = event.contractors.map(c => c.contractorId);

    if (contractorIds.length > 0) {
      const conflictingAssignments = await db.stoContractorAssignment.findMany({
        where: {
          contractorId: { in: contractorIds },
          eventId: { not: eventId },
          status: { in: ['assigned', 'mobilized', 'on_site'] },
          startDate: { lte: event.plannedEndDate ?? new Date('2099-12-31') },
          endDate: { gte: event.plannedStartDate ?? new Date('2000-01-01') },
        },
        include: {
          event: { select: { id: true, name: true, stoNumber: true } },
          contractor: { select: { name: true } },
        },
      });

      for (const conflict of conflictingAssignments) {
        conflicts.push({
          type: 'contractor_conflict',
          description: `${conflict.contractor.name} is assigned to ${conflict.event.stoNumber} (${conflict.event.name}) during the same period`,
          severity: 'high',
        });
        recommendations.push(`Consider finding alternative contractor for ${conflict.contractor.name} or reschedule to avoid overlap`);
      }
    }

    // Check total labor requirements vs available
    const totalEstimatedHours = event.tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
    const availableLaborHours = event.contractors.reduce((sum, c) => sum + ((c.laborCount ?? 0) * 480), 0);

    if (totalEstimatedHours > availableLaborHours && availableLaborHours > 0) {
      conflicts.push({
        type: 'labor_shortage',
        description: `Estimated ${Math.round(totalEstimatedHours)} man-hours but only ${Math.round(availableLaborHours)} available`,
        severity: 'medium',
      });
      recommendations.push(`Add ${Math.round((totalEstimatedHours - availableLaborHours) / 480)} more workers or extend schedule`);
    }

    // Check critical path tasks have resources
    const criticalTasks = event.tasks.filter(t => t.isOnCriticalPath);
    const unassignedCritical = criticalTasks.filter(t => !t.assignedToId);
    if (unassignedCritical.length > 0) {
      conflicts.push({
        type: 'resource_gap',
        description: `${unassignedCritical.length} critical path tasks have no assigned resources`,
        severity: 'high',
      });
      recommendations.push('Assign resources to all critical path tasks before execution');
    }

    return {
      isFeasible: conflicts.filter(c => c.severity === 'high').length === 0,
      conflicts,
      recommendations,
    };
  }

  /**
   * Reschedule an event (drag-and-drop support)
   */
  static async rescheduleEvent(
    eventId: string,
    newStartDate: string,
    newEndDate: string,
    reason: string,
    updatedById: string
  ) {
    const event = await db.stoEvent.update({
      where: { id: eventId },
      data: {
        plannedStartDate: new Date(newStartDate),
        plannedEndDate: new Date(newEndDate),
      },
    });

    // Calculate duration difference and shift tasks proportionally
    const oldStart = event.plannedStartDate;
    const oldEnd = event.plannedEndDate;
    if (oldStart && oldEnd) {
      const tasks = await db.stoTask.findMany({
        where: { eventId },
      });

      for (const task of tasks) {
        if (task.startDate && task.endDate && oldStart.getTime() !== 0) {
          const taskStartOffset = task.startDate.getTime() - oldStart.getTime();
          const taskEndOffset = task.endDate.getTime() - oldStart.getTime();
          const totalOldDuration = oldEnd.getTime() - oldStart.getTime();
          const totalNewDuration = new Date(newEndDate).getTime() - new Date(newStartDate).getTime();

          const ratio = totalNewDuration / totalOldDuration;
          const newTaskStart = new Date(new Date(newStartDate).getTime() + taskStartOffset * ratio);
          const newTaskEnd = new Date(new Date(newStartDate).getTime() + taskEndOffset * ratio);

          await db.stoTask.update({
            where: { id: task.id },
            data: {
              startDate: newTaskStart,
              endDate: newTaskEnd,
            },
          });
        }
      }
    }

    logger.info('STO event rescheduled', { eventId, newStartDate, newEndDate, reason, updatedById });
    return event;
  }

  /**
   * Create a schedule version snapshot (for version comparison)
   */
  static async createScheduleVersion(
    eventId: string,
    version: number,
    reason: string
  ): Promise<void> {
    const tasks = await db.stoTask.findMany({
      where: { eventId },
      select: { id: true, title: true, startDate: true, endDate: true, estimatedHours: true, sortOrder: true },
    });

    const versionData = {
      eventId,
      version,
      createdAt: new Date().toISOString(),
      snapshot: tasks,
      reason,
    };

    // Store version in event milestonesJson under scheduleVersions
    const event = await db.stoEvent.findUnique({ where: { id: eventId }, select: { milestonesJson: true } });
    const existing = (event?.milestonesJson as Record<string, unknown> | null) ?? {};
    const versions = (existing.scheduleVersions as ScheduleVersion[] | undefined) ?? [];

    versions.push(versionData as unknown as ScheduleVersion);

    await db.stoEvent.update({
      where: { id: eventId },
      data: { milestonesJson: JSON.parse(JSON.stringify({ ...existing, scheduleVersions: versions })) },
    });

    logger.info('Schedule version created', { eventId, version });
  }

  /**
   * Compare two schedule versions
   */
  static compareScheduleVersions(v1: ScheduleVersion, v2: ScheduleVersion): {
    addedTasks: string[];
    removedTasks: string[];
    modifiedTasks: Array<{ taskId: string; changes: string[] }>;
  } {
    const v1TaskIds = new Set(v1.snapshot.map(t => t.id));
    const v2TaskIds = new Set(v2.snapshot.map(t => t.id));

    const addedTasks: string[] = Array.from(v2TaskIds).filter(id => !v1TaskIds.has(id));
    const removedTasks: string[] = Array.from(v1TaskIds).filter(id => !v2TaskIds.has(id));

    const modifiedTasks: Array<{ taskId: string; changes: string[] }> = [];
    for (const v1Task of v1.snapshot) {
      const v2Task = v2.snapshot.find(t => t.id === v1Task.id);
      if (!v2Task) continue;

      const changes: string[] = [];
      if (v1Task.startDate?.toISOString() !== v2Task.startDate?.toISOString()) {
        changes.push(`start: ${v1Task.startDate} → ${v2Task.startDate}`);
      }
      if (v1Task.endDate?.toISOString() !== v2Task.endDate?.toISOString()) {
        changes.push(`end: ${v1Task.endDate} → ${v2Task.endDate}`);
      }
      if (v1Task.estimatedHours !== v2Task.estimatedHours) {
        changes.push(`hours: ${v1Task.estimatedHours} → ${v2Task.estimatedHours}`);
      }
      if (changes.length > 0) {
        modifiedTasks.push({ taskId: v1Task.id, changes });
      }
    }

    return { addedTasks, removedTasks, modifiedTasks };
  }

  /**
   * Weather-aware scheduling — generate weather considerations
   */
  static generateWeatherConsiderations(
    startDate: string,
    endDate: string,
    disciplines: string[]
  ): WeatherConsideration[] {
    const considerations: WeatherConsideration[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const day = new Date(start);

    const outdoorDisciplines = ['civil', 'mechanical'];
    const affectedOutdoors = disciplines.filter(d => outdoorDisciplines.includes(d));

    if (affectedOutdoors.length === 0) return considerations;

    while (day <= end) {
      const month = day.getMonth();
      // Simple seasonal heuristic
      if (month >= 5 && month <= 8) {
        // Summer months — potential heat risk
        considerations.push({
          date: day.toISOString().split('T')[0],
          condition: 'High Temperature',
          impact: 'medium',
          affectedDisciplines: affectedOutdoors,
          recommendation: 'Schedule outdoor work for early morning/evening. Ensure hydration stations.',
        });
      } else if (month >= 10 || month <= 2) {
        // Winter months — potential cold/frost
        considerations.push({
          date: day.toISOString().split('T')[0],
          condition: 'Cold Weather',
          impact: day.getMonth() === 0 || day.getMonth() === 1 ? 'medium' : 'low',
          affectedDisciplines: affectedOutdoors,
          recommendation: 'Monitor for frost. Have cold-weather PPE available.',
        });
      }

      day.setDate(day.getDate() + 7); // Weekly intervals
    }

    return considerations;
  }
}
