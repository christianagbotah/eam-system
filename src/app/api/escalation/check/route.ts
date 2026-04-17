import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import fs from 'fs';
import path from 'path';

// ============================================================================
// Escalation Check — POST
//
// Finds overdue Maintenance Requests, Work Orders, and Safety Incidents,
// and sends escalation notifications. Idempotent — uses cooldown periods
// stored in lastEscalatedAt to avoid spamming.
//
// Auth: Session (admin) OR x-escalation-secret header for cron.
// ============================================================================

const ESCALATION_SECRET = process.env.ESCALATION_SECRET || 'eam-escalation-cron-2025';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'escalation-config.json');

interface EscalationConfig {
  enabled: boolean;
  maintenanceRequests: {
    enabled: boolean;
    level1ThresholdHours: number;
    level2ThresholdHours: number;
    cooldownMinutes: number;
  };
  workOrders: {
    enabled: boolean;
    level1ThresholdHours: number;
    level2ThresholdHours: number;
    cooldownMinutes: number;
  };
  safetyIncidents: {
    enabled: boolean;
    level1ThresholdHours: number;
    level2ThresholdHours: number;
    cooldownMinutes: number;
  };
  lastCheckAt: string | null;
  lastCheckResults: Record<string, unknown> | null;
}

function readConfig(): EscalationConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return {
    enabled: true,
    maintenanceRequests: { enabled: true, level1ThresholdHours: 24, level2ThresholdHours: 48, cooldownMinutes: 360 },
    workOrders: { enabled: true, level1ThresholdHours: 0, level2ThresholdHours: 48, cooldownMinutes: 360 },
    safetyIncidents: { enabled: true, level1ThresholdHours: 4, level2ThresholdHours: 8, cooldownMinutes: 240 },
    lastCheckAt: null,
    lastCheckResults: null,
  };
}

function writeConfig(config: EscalationConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Check if enough time has passed since the last escalation to send another.
 */
function shouldEscalate(lastEscalatedAt: Date | null, cooldownMinutes: number): boolean {
  if (!lastEscalatedAt) return true;
  const elapsed = Date.now() - new Date(lastEscalatedAt).getTime();
  return elapsed >= cooldownMinutes * 60 * 1000;
}

/**
 * Log an escalation event and send notifications.
 */
async function performEscalation(params: {
  entityType: string;
  entityId: string;
  level: number;
  reason: string;
  notifiedUserIds: string[];
  referenceLabel: string;
  actionUrl?: string;
}) {
  const { entityType, entityId, level, reason, notifiedUserIds, referenceLabel, actionUrl } = params;

  // Create escalation log
  await db.escalationLog.create({
    data: {
      entityType,
      entityId,
      level,
      reason,
      notifiedUsers: JSON.stringify(notifiedUserIds),
    },
  });

  // Send notifications to each user
  const notifTitle = level === 1
    ? `Escalation Alert: ${referenceLabel}`
    : `URGENT Escalation (Level ${level}): ${referenceLabel}`;

  for (const userId of notifiedUserIds) {
    await notifyUser(
      userId,
      `escalation_l${level}`,
      notifTitle,
      reason,
      entityType,
      entityId,
      actionUrl,
    ).catch(() => { /* ignore notification errors */ });
  }
}

// Find admin/maintenance-manager users for level-2 escalation
async function findManagers(): Promise<string[]> {
  const managers = await db.user.findMany({
    where: {
      status: 'active',
      userRoles: {
        some: {
          role: {
            OR: [
              { slug: 'admin' },
              { slug: 'maintenance_manager' },
              { level: { gte: 80 } },
            ],
          },
        },
      },
    },
    select: { id: true },
  });
  return managers.map(m => m.id);
}

export async function POST(request: NextRequest) {
  try {
    // Auth: session or cron secret
    const session = getSession(request);
    const cronSecret = request.headers.get('x-escalation-secret');

    if (!session && cronSecret !== ESCALATION_SECRET) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const config = readConfig();

    if (!config.enabled) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Escalation is disabled in config',
          timestamp: new Date().toISOString(),
          results: null,
        },
      });
    }

    const now = new Date();
    const results = {
      maintenanceRequests: { checked: 0, level1: 0, level2: 0, skipped: 0 },
      workOrders: { checked: 0, level1: 0, level2: 0, skipped: 0 },
      safetyIncidents: { checked: 0, level1: 0, level2: 0, skipped: 0 },
    };

    // ────────────────────────────────────────────────────────────────────
    // 1. MAINTENANCE REQUESTS
    // ────────────────────────────────────────────────────────────────────
    if (config.maintenanceRequests.enabled) {
      const mrConfig = config.maintenanceRequests;
      const level1Cutoff = new Date(now.getTime() - mrConfig.level1ThresholdHours * 60 * 60 * 1000);
      const level2Cutoff = new Date(now.getTime() - mrConfig.level2ThresholdHours * 60 * 60 * 1000);

      const overdueMrs = await db.maintenanceRequest.findMany({
        where: {
          status: { in: ['pending', 'in_progress'] },
          createdAt: { lte: level1Cutoff },
        },
        include: {
          supervisor: { select: { id: true, fullName: true } },
          requester: { select: { id: true, fullName: true } },
        },
      });

      results.maintenanceRequests.checked = overdueMrs.length;

      for (const mr of overdueMrs) {
        const hoursSinceCreated = (now.getTime() - new Date(mr.createdAt).getTime()) / (1000 * 60 * 60);
        const isLevel2 = hoursSinceCreated >= mrConfig.level2ThresholdHours;

        // Determine target level
        const targetLevel = isLevel2 ? 2 : 1;

        // Skip if already at this level or higher and within cooldown
        if (mr.escalationLevel >= targetLevel) {
          if (!shouldEscalate(mr.lastEscalatedAt, mrConfig.cooldownMinutes)) {
            results.maintenanceRequests.skipped++;
            continue;
          }
        }

        // Collect notification targets
        const notifiedIds: string[] = [];
        if (mr.supervisorId) notifiedIds.push(mr.supervisorId);
        if (mr.requestedBy && !notifiedIds.includes(mr.requestedBy)) notifiedIds.push(mr.requestedBy);

        let reason: string;
        if (isLevel2 && mr.escalationLevel < 2) {
          // Escalate to manager
          const managers = await findManagers();
          for (const mgrId of managers) {
            if (!notifiedIds.includes(mgrId)) notifiedIds.push(mgrId);
          }
          reason = `Maintenance Request ${mr.requestNumber} "${mr.title}" has been overdue for ${Math.floor(hoursSinceCreated)} hours. Escalated to maintenance manager.`;
          results.maintenanceRequests.level2++;
        } else {
          reason = `Maintenance Request ${mr.requestNumber} "${mr.title}" has been pending/in-progress for ${Math.floor(hoursSinceCreated)} hours without resolution.`;
          results.maintenanceRequests.level1++;
        }

        if (notifiedIds.length > 0) {
          await performEscalation({
            entityType: 'maintenance_request',
            entityId: mr.id,
            level: targetLevel,
            reason,
            notifiedUserIds: notifiedIds,
            referenceLabel: `MR ${mr.requestNumber}`,
            actionUrl: `mr-detail?id=${mr.id}`,
          });
        }

        // Update escalation state
        await db.maintenanceRequest.update({
          where: { id: mr.id },
          data: {
            escalationLevel: Math.max(mr.escalationLevel, targetLevel),
            lastEscalatedAt: now,
          },
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────
    // 2. WORK ORDERS
    // ────────────────────────────────────────────────────────────────────
    if (config.workOrders.enabled) {
      const woConfig = config.workOrders;

      // Find WOs that are assigned/in_progress and past their plannedEnd
      const overdueWos = await db.workOrder.findMany({
        where: {
          status: { in: ['assigned', 'in_progress'] },
          plannedEnd: { not: null, lt: now },
        },
        include: {
          assignee: { select: { id: true, fullName: true } },
          assignedSupervisor: { select: { id: true, fullName: true } },
        },
      });

      // For WOs with no plannedEnd but old enough for level1 threshold, also check by createdAt
      const oldWos = woConfig.level1ThresholdHours > 0
        ? await db.workOrder.findMany({
            where: {
              status: { in: ['assigned', 'in_progress'] },
              plannedEnd: null,
              createdAt: { lte: new Date(now.getTime() - woConfig.level1ThresholdHours * 60 * 60 * 1000) },
              id: { notIn: overdueWos.map(w => w.id) },
            },
            include: {
              assignee: { select: { id: true, fullName: true } },
              assignedSupervisor: { select: { id: true, fullName: true } },
            },
          })
        : [];

      const allOverdueWos = [...overdueWos, ...oldWos];
      results.workOrders.checked = allOverdueWos.length;

      for (const wo of allOverdueWos) {
        // Calculate hours overdue (from plannedEnd if set, otherwise from createdAt)
        const referenceDate = wo.plannedEnd ? new Date(wo.plannedEnd) : new Date(wo.createdAt);
        const hoursOverdue = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60);

        const isLevel2 = hoursOverdue >= woConfig.level2ThresholdHours;
        const targetLevel = isLevel2 ? 2 : 1;

        if (wo.escalationLevel >= targetLevel) {
          if (!shouldEscalate(wo.lastEscalatedAt, woConfig.cooldownMinutes)) {
            results.workOrders.skipped++;
            continue;
          }
        }

        const notifiedIds: string[] = [];
        if (wo.assignedTo) notifiedIds.push(wo.assignedTo);
        if (wo.assignedSupervisorId && !notifiedIds.includes(wo.assignedSupervisorId)) {
          notifiedIds.push(wo.assignedSupervisorId);
        }

        let reason: string;
        if (isLevel2 && wo.escalationLevel < 2) {
          const managers = await findManagers();
          for (const mgrId of managers) {
            if (!notifiedIds.includes(mgrId)) notifiedIds.push(mgrId);
          }
          reason = `Work Order ${wo.woNumber} "${wo.title}" is ${Math.floor(hoursOverdue)} hours overdue (was due ${wo.plannedEnd ? new Date(wo.plannedEnd).toLocaleDateString() : '—'}). Escalated to maintenance manager.`;
          results.workOrders.level2++;
        } else {
          reason = `Work Order ${wo.woNumber} "${wo.title}" is ${Math.floor(hoursOverdue)} hours overdue (was due ${wo.plannedEnd ? new Date(wo.plannedEnd).toLocaleDateString() : '—'}). Technician and supervisor notified.`;
          results.workOrders.level1++;
        }

        if (notifiedIds.length > 0) {
          await performEscalation({
            entityType: 'work_order',
            entityId: wo.id,
            level: targetLevel,
            reason,
            notifiedUserIds: notifiedIds,
            referenceLabel: `WO ${wo.woNumber}`,
            actionUrl: `wo-detail?id=${wo.id}`,
          });
        }

        await db.workOrder.update({
          where: { id: wo.id },
          data: {
            escalationLevel: Math.max(wo.escalationLevel, targetLevel),
            lastEscalatedAt: now,
          },
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────
    // 3. SAFETY INCIDENTS
    // ────────────────────────────────────────────────────────────────────
    if (config.safetyIncidents.enabled) {
      const siConfig = config.safetyIncidents;
      const level1Cutoff = new Date(now.getTime() - siConfig.level1ThresholdHours * 60 * 60 * 1000);
      const level2Cutoff = new Date(now.getTime() - siConfig.level2ThresholdHours * 60 * 60 * 1000);

      const overdueIncidents = await db.safetyIncident.findMany({
        where: {
          status: { in: ['open', 'investigating'] },
          createdAt: { lte: level1Cutoff },
        },
        include: {
          reportedBy: { select: { id: true, fullName: true } },
          investigatedBy: { select: { id: true, fullName: true } },
        },
      });

      results.safetyIncidents.checked = overdueIncidents.length;

      for (const incident of overdueIncidents) {
        const hoursSinceCreated = (now.getTime() - new Date(incident.createdAt).getTime()) / (1000 * 60 * 60);
        const isLevel2 = hoursSinceCreated >= siConfig.level2ThresholdHours;
        const targetLevel = isLevel2 ? 2 : 1;

        if (incident.escalationLevel >= targetLevel) {
          if (!shouldEscalate(incident.lastEscalatedAt, siConfig.cooldownMinutes)) {
            results.safetyIncidents.skipped++;
            continue;
          }
        }

        const notifiedIds: string[] = [];
        if (incident.reportedById) notifiedIds.push(incident.reportedById);
        if (incident.investigatedById && !notifiedIds.includes(incident.investigatedById)) {
          notifiedIds.push(incident.investigatedById);
        }

        let reason: string;
        if (isLevel2 && incident.escalationLevel < 2) {
          // Safety is urgent — escalate to managers / plant managers
          const managers = await findManagers();
          for (const mgrId of managers) {
            if (!notifiedIds.includes(mgrId)) notifiedIds.push(mgrId);
          }
          reason = `Safety Incident ${incident.incidentNumber} "${incident.title}" has been unresolved for ${Math.floor(hoursSinceCreated)} hours. Escalated to plant manager. Severity: ${incident.severity}.`;
          results.safetyIncidents.level2++;
        } else {
          // Level 1: notify safety officer and plant manager
          const managers = await findManagers();
          for (const mgrId of managers) {
            if (!notifiedIds.includes(mgrId)) notifiedIds.push(mgrId);
          }
          reason = `Safety Incident ${incident.incidentNumber} "${incident.title}" has been open/investigating for ${Math.floor(hoursSinceCreated)} hours. Severity: ${incident.severity}. Safety officer and plant manager notified.`;
          results.safetyIncidents.level1++;
        }

        if (notifiedIds.length > 0) {
          await performEscalation({
            entityType: 'safety_incident',
            entityId: incident.id,
            level: targetLevel,
            reason,
            notifiedUserIds: notifiedIds,
            referenceLabel: `SI ${incident.incidentNumber}`,
            actionUrl: `safety-incidents`,
          });
        }

        await db.safetyIncident.update({
          where: { id: incident.id },
          data: {
            escalationLevel: Math.max(incident.escalationLevel, targetLevel),
            lastEscalatedAt: now,
          },
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────
    // Update last check timestamp in config
    // ────────────────────────────────────────────────────────────────────
    const updatedConfig = readConfig();
    updatedConfig.lastCheckAt = now.toISOString();
    updatedConfig.lastCheckResults = {
      maintenanceRequests: results.maintenanceRequests,
      workOrders: results.workOrders,
      safetyIncidents: results.safetyIncidents,
    };
    writeConfig(updatedConfig);

    const totalEscalated = results.maintenanceRequests.level1 + results.maintenanceRequests.level2
      + results.workOrders.level1 + results.workOrders.level2
      + results.safetyIncidents.level1 + results.safetyIncidents.level2;

    return NextResponse.json({
      success: true,
      data: {
        message: totalEscalated > 0
          ? `Escalation check complete: ${totalEscalated} escalation(s) processed.`
          : 'Escalation check complete: no new escalations needed.',
        timestamp: now.toISOString(),
        results,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run escalation check';
    console.error('[Escalation Check Error]', message, error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
