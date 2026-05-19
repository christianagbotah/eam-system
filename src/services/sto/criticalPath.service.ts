// ============================================================================
// STO CRITICAL PATH & MILESTONE SERVICE — CPM, float, what-if analysis
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('STOCriticalPath');

// ---- Types ----

export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';

export interface TaskDependency {
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  lag?: number; // hours
}

export interface CriticalPathResult {
  eventId: string;
  criticalPathIds: string[];
  criticalPathDuration: number; // hours
  projectDuration: number; // hours
  tasks: CriticalPathTask[];
  milestones: MilestoneStatus[];
  convergencePoints: string[];
  divergencePoints: string[];
  calculatedAt: string;
}

export interface CriticalPathTask {
  id: string;
  title: string;
  duration: number;
  earlyStart: Date;
  earlyFinish: Date;
  lateStart: Date;
  lateFinish: Date;
  totalFloat: number;
  freeFloat: number;
  isOnCriticalPath: boolean;
  predecessorIds: string[];
  successorIds: string[];
}

export interface MilestoneStatus {
  id: string;
  name: string;
  phase: string;
  plannedDate?: string;
  actualDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completionPercent: number;
}

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  changes: WhatIfChange[];
  impact: {
    newProjectDuration: number;
    originalDuration: number;
    variance: number; // hours
    newCriticalPathIds: string[];
    affectedTasks: string[];
  };
}

export interface WhatIfChange {
  type: 'add_task' | 'remove_task' | 'change_duration' | 'add_dependency' | 'remove_dependency';
  taskId?: string;
  newDuration?: number;
  predecessorId?: string;
  successorId?: string;
  newTask?: {
    title: string;
    duration: number;
    predecessorIds: string[];
  };
}

// ---- Service ----

export class StoCriticalPathService {

  /**
   * Calculate the critical path for an STO event using CPM
   * Forward pass → Backward pass → Float calculation
   */
  static async calculateCriticalPath(eventId: string): Promise<CriticalPathResult> {
    const event = await db.stoEvent.findUnique({
      where: { id: eventId },
      include: {
        tasks: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!event) throw new Error(`STO Event ${eventId} not found`);
    if (event.tasks.length === 0) {
      return {
        eventId,
        criticalPathIds: [],
        criticalPathDuration: 0,
        projectDuration: 0,
        tasks: [],
        milestones: [],
        convergencePoints: [],
        divergencePoints: [],
        calculatedAt: new Date().toISOString(),
      };
    }

    // Build task map and adjacency lists
    const taskMap = new Map<string, typeof event.tasks[0]>();
    const successors = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();

    for (const task of event.tasks) {
      taskMap.set(task.id, task);
      successors.set(task.id, []);
      predecessors.set(task.id, []);
    }

    for (const task of event.tasks) {
      const preds = (task.predecessorIds as string[]) ?? [];
      for (const predId of preds) {
        if (successors.has(predId)) {
          successors.get(predId)!.push(task.id);
        }
        predecessors.get(task.id)!.push(predId);
      }
    }

    const projectStart = event.plannedStartDate ?? new Date();

    // ---- Forward Pass ----
    const earlyStart = new Map<string, Date>();
    const earlyFinish = new Map<string, Date>();

    // Topological sort (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    for (const task of event.tasks) {
      inDegree.set(task.id, predecessors.get(task.id)!.length);
    }

    const queue: string[] = [];
    for (const [taskId, degree] of inDegree) {
      if (degree === 0) queue.push(taskId);
    }

    const topoOrder: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      topoOrder.push(current);
      for (const succ of successors.get(current) ?? []) {
        inDegree.set(succ, (inDegree.get(succ) ?? 1) - 1);
        if (inDegree.get(succ) === 0) queue.push(succ);
      }
    }

    // Forward pass
    for (const taskId of topoOrder) {
      const task = taskMap.get(taskId)!;
      const preds = predecessors.get(taskId) ?? [];

      if (preds.length === 0) {
        earlyStart.set(taskId, new Date(projectStart));
      } else {
        const maxPredFinish = Math.max(
          ...preds.map(predId => earlyFinish.get(predId)?.getTime() ?? 0)
        );
        earlyStart.set(taskId, new Date(maxPredFinish));
      }

      const durationMs = (task.estimatedHours ?? 0) * 3600000;
      earlyFinish.set(taskId, new Date(earlyStart.get(taskId)!.getTime() + durationMs));
    }

    // Project duration = max of all early finishes
    const projectFinish = Math.max(...Array.from(earlyFinish.values()).map(d => d.getTime()));

    // ---- Backward Pass ----
    const lateFinish = new Map<string, Date>();
    const lateStart = new Map<string, Date>();

    for (const taskId of [...topoOrder].reverse()) {
      const task = taskMap.get(taskId)!;
      const succs = successors.get(taskId) ?? [];

      if (succs.length === 0) {
        lateFinish.set(taskId, new Date(projectFinish));
      } else {
        const minSuccStart = Math.min(
          ...succs.map(succId => lateStart.get(succId)?.getTime() ?? Infinity)
        );
        lateFinish.set(taskId, new Date(minSuccStart));
      }

      const durationMs = (task.estimatedHours ?? 0) * 3600000;
      lateStart.set(taskId, new Date(lateFinish.get(taskId)!.getTime() - durationMs));
    }

    // ---- Float Calculation ----
    const criticalPathIds: string[] = [];
    const cpTasks: CriticalPathTask[] = [];

    for (const task of event.tasks) {
      const es = earlyStart.get(task.id)!;
      const ef = earlyFinish.get(task.id)!;
      const ls = lateStart.get(task.id)!;
      const lf = lateFinish.get(task.id)!;

      const totalFloatHours = (ls.getTime() - es.getTime()) / 3600000;
      const preds = predecessors.get(task.id) ?? [];
      const succs = successors.get(task.id) ?? [];

      // Free float = min(ES of successors) - EF of current
      let freeFloatHours = 0;
      if (succs.length > 0) {
        const minSuccES = Math.min(
          ...succs.map(succId => earlyStart.get(succId)?.getTime() ?? Infinity)
        );
        freeFloatHours = (minSuccES - ef.getTime()) / 3600000;
      }

      const isOnCriticalPath = Math.abs(totalFloatHours) < 0.01;

      if (isOnCriticalPath) criticalPathIds.push(task.id);

      cpTasks.push({
        id: task.id,
        title: task.title,
        duration: task.estimatedHours ?? 0,
        earlyStart: es,
        earlyFinish: ef,
        lateStart: ls,
        lateFinish: lf,
        totalFloat: Math.round(totalFloatHours * 100) / 100,
        freeFloat: Math.round(freeFloatHours * 100) / 100,
        isOnCriticalPath,
        predecessorIds: preds,
        successorIds: succs,
      });
    }

    // Update tasks in DB with calculated values
    for (const cpTask of cpTasks) {
      await db.stoTask.update({
        where: { id: cpTask.id },
        data: {
          earlyStart: cpTask.earlyStart,
          earlyFinish: cpTask.earlyFinish,
          lateStart: cpTask.lateStart,
          lateFinish: cpTask.lateFinish,
          totalFloat: cpTask.totalFloat,
          freeFloat: cpTask.freeFloat,
          isOnCriticalPath: cpTask.isOnCriticalPath,
        },
      });
    }

    // Identify convergence/divergence points
    const convergencePoints: string[] = [];
    const divergencePoints: string[] = [];
    for (const task of event.tasks) {
      const succs = successors.get(task.id) ?? [];
      const preds = predecessors.get(task.id) ?? [];
      if (succs.length > 1) divergencePoints.push(task.id);
      if (preds.length > 1) convergencePoints.push(task.id);
    }

    // Milestone status
    const milestones = this.calculateMilestoneStatus(event);

    const projectDurationHours = (projectFinish - projectStart.getTime()) / 3600000;
    const criticalPathDuration = criticalPathIds.reduce((sum, id) => {
      return sum + (taskMap.get(id)?.estimatedHours ?? 0);
    }, 0);

    logger.info('Critical path calculated', {
      eventId,
      criticalPathLength: criticalPathIds.length,
      projectDuration: Math.round(projectDurationHours),
    });

    return {
      eventId,
      criticalPathIds,
      criticalPathDuration: criticalPathDuration,
      projectDuration: Math.round(projectDurationHours * 100) / 100,
      tasks: cpTasks,
      milestones,
      convergencePoints,
      divergencePoints,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate milestone status from tasks
   */
  static calculateMilestoneStatus(event: {
    plannedStartDate?: Date | null;
    tasks: Array<{ status: string; progress: number; discipline?: string | null }>;
    milestonesJson?: unknown;
  }): MilestoneStatus[] {
    const defaultMilestones: MilestoneStatus[] = [
      { id: 'ms-1', name: 'STO Plan Approved', phase: 'pre_shutdown', status: 'completed', completionPercent: 100 },
      { id: 'ms-2', name: 'Materials Delivered', phase: 'pre_shutdown', status: 'pending', completionPercent: 0 },
      { id: 'ms-3', name: 'Contractors Mobilized', phase: 'pre_shutdown', status: 'pending', completionPercent: 0 },
      { id: 'ms-4', name: 'Pre-Shutdown Complete', phase: 'pre_shutdown', status: 'pending', completionPercent: 0 },
      { id: 'ms-5', name: 'Unit Shutdown', phase: 'shutdown', status: 'pending', completionPercent: 0 },
      { id: 'ms-6', name: '50% Work Complete', phase: 'execution', status: 'pending', completionPercent: 0 },
      { id: 'ms-7', name: 'All Work Complete', phase: 'execution', status: 'pending', completionPercent: 0 },
      { id: 'ms-8', name: 'Punch List Cleared', phase: 'execution', status: 'pending', completionPercent: 0 },
      { id: 'ms-9', name: 'Startup Auth', phase: 'startup', status: 'pending', completionPercent: 0 },
      { id: 'ms-10', name: 'Full Production', phase: 'startup', status: 'pending', completionPercent: 0 },
      { id: 'ms-11', name: 'Closeout Report', phase: 'post_shutdown', status: 'pending', completionPercent: 0 },
      { id: 'ms-12', name: 'Lessons Learned', phase: 'post_shutdown', status: 'pending', completionPercent: 0 },
    ];

    const tasks = event.tasks;
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const totalCount = tasks.length;
    const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Update milestones based on task progress
    if (overallProgress >= 50) {
      defaultMilestones.find(m => m.id === 'ms-6')!.status = 'completed';
      defaultMilestones.find(m => m.id === 'ms-6')!.completionPercent = 100;
    } else if (overallProgress >= 25) {
      defaultMilestones.find(m => m.id === 'ms-6')!.status = 'in_progress';
      defaultMilestones.find(m => m.id === 'ms-6')!.completionPercent = Math.round((overallProgress / 50) * 100);
    }

    if (completedCount === totalCount && totalCount > 0) {
      defaultMilestones.find(m => m.id === 'ms-7')!.status = 'completed';
      defaultMilestones.find(m => m.id === 'ms-7')!.completionPercent = 100;
    } else if (overallProgress >= 75) {
      defaultMilestones.find(m => m.id === 'ms-7')!.status = 'in_progress';
      defaultMilestones.find(m => m.id === 'ms-7')!.completionPercent = Math.round(((overallProgress - 75) / 25) * 100);
    }

    // Use stored milestones if available
    const stored = event.milestonesJson as Record<string, unknown> | null;
    if (stored?.milestones && Array.isArray(stored.milestones)) {
      const storedMilestones = stored.milestones as Array<{ id: string; status?: string }>;
      for (const sm of storedMilestones) {
        const dm = defaultMilestones.find(m => m.id === sm.id);
        if (dm && sm.status === 'completed') {
          dm.status = 'completed';
          dm.completionPercent = 100;
        }
      }
    }

    return defaultMilestones;
  }

  /**
   * What-if scenario analysis
   */
  static async analyzeScenario(
    eventId: string,
    scenario: WhatIfScenario
  ): Promise<{ originalDuration: number; newDuration: number; variance: number; newCriticalPath: string[]; affectedTasks: string[] }> {
    // Get current critical path result
    const currentResult = await this.calculateCriticalPath(eventId);

    // Clone tasks for simulation
    const tasks = await db.stoTask.findMany({
      where: { eventId },
    });

    const simulatedTasks = [...tasks];
    const taskMap = new Map<string, typeof simulatedTasks[0]>();
    for (const t of simulatedTasks) taskMap.set(t.id, t);

    // Apply changes
    let addedTaskId: string | null = null;
    for (const change of scenario.changes) {
      switch (change.type) {
        case 'change_duration':
          if (change.taskId && taskMap.has(change.taskId)) {
            const task = taskMap.get(change.taskId)!;
            taskMap.set(change.taskId, { ...task, estimatedHours: change.newDuration ?? task.estimatedHours });
          }
          break;
        case 'add_task':
          if (change.newTask) {
            addedTaskId = `sim-${Date.now()}`;
            const simulatedTask = {
              id: addedTaskId,
              eventId,
              title: change.newTask.title,
              estimatedHours: change.newTask.duration,
              predecessorIds: change.newTask.predecessorIds as unknown[],
              successorIds: [],
            } as unknown as typeof simulatedTasks[0];
            taskMap.set(addedTaskId, simulatedTask);
            simulatedTasks.push(simulatedTask);
          }
          break;
        case 'remove_task':
          if (change.taskId) {
            const idx = simulatedTasks.findIndex(t => t.id === change.taskId);
            if (idx >= 0) {
              simulatedTasks.splice(idx, 1);
              taskMap.delete(change.taskId);
            }
          }
          break;
      }
    }

    // Simple duration calculation for the simulation
    const originalDuration = currentResult.projectDuration;

    // Build dependency graph and find longest path
    const successors = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();
    for (const task of simulatedTasks) {
      successors.set(task.id, []);
      predecessors.set(task.id, []);
    }
    for (const task of simulatedTasks) {
      const preds = (task.predecessorIds as string[]) ?? [];
      for (const predId of preds) {
        if (successors.has(predId)) successors.get(predId)!.push(task.id);
        predecessors.get(task.id)!.push(predId);
      }
    }

    // Topological sort
    const inDegree = new Map<string, number>();
    for (const task of simulatedTasks) {
      inDegree.set(task.id, (predecessors.get(task.id) ?? []).length);
    }
    const queue: string[] = [];
    for (const [taskId, degree] of inDegree) {
      if (degree === 0) queue.push(taskId);
    }
    const topoOrder: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      topoOrder.push(current);
      for (const succ of successors.get(current) ?? []) {
        inDegree.set(succ, (inDegree.get(succ) ?? 1) - 1);
        if (inDegree.get(succ) === 0) queue.push(succ);
      }
    }

    // Forward pass to get max duration
    const earliestFinish = new Map<string, number>();
    const earliestStart = new Map<string, number>();

    for (const taskId of topoOrder) {
      const task = taskMap.get(taskId)!;
      const preds = predecessors.get(taskId) ?? [];

      if (preds.length === 0) {
        earliestStart.set(taskId, 0);
      } else {
        const maxPredFinish = Math.max(
          ...preds.map(p => earliestFinish.get(p) ?? 0)
        );
        earliestStart.set(taskId, maxPredFinish);
      }

      earliestFinish.set(taskId, earliestStart.get(taskId)! + (task.estimatedHours ?? 0));
    }

    const newDuration = Math.max(...Array.from(earliestFinish.values()), 0);

    // Find new critical path (tasks with zero float)
    const newCriticalPath: string[] = [];
    for (const task of simulatedTasks) {
      const succs = successors.get(task.id) ?? [];
      let float = Infinity;
      if (succs.length === 0) {
        float = newDuration - (earliestFinish.get(task.id) ?? 0);
      } else {
        float = Math.min(...succs.map(s => earliestStart.get(s) ?? Infinity)) - (earliestFinish.get(task.id) ?? 0);
      }
      if (Math.abs(float) < 0.01) {
        newCriticalPath.push(task.id);
      }
    }

    const affectedTasks = scenario.changes
      .map(c => c.taskId ?? addedTaskId)
      .filter((id): id is string => !!id);

    logger.info('What-if analysis complete', {
      eventId,
      scenario: scenario.name,
      originalDuration: Math.round(originalDuration),
      newDuration: Math.round(newDuration),
    });

    return {
      originalDuration: Math.round(originalDuration * 100) / 100,
      newDuration: Math.round(newDuration * 100) / 100,
      variance: Math.round((newDuration - originalDuration) * 100) / 100,
      newCriticalPath,
      affectedTasks,
    };
  }
}
