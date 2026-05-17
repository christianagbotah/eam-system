// ============================================================================
// SLA ORCHESTRATION SERVICE — policies, tracking, compliance, business calendar
// ============================================================================

import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors';

const log = createLogger('SlaOrchestration');

// ---- Interfaces ----

export interface CreateSlaPolicyInput {
  name: string;
  entityType?: string;
  priority?: string;
  responseMinutes?: number;
  resolutionMinutes?: number;
  escalationRules?: SlaEscalationRule[];
  businessHoursOnly?: boolean;
  warningPercent?: number;
  createdById: string;
}

export interface UpdateSlaPolicyInput {
  name?: string;
  entityType?: string;
  priority?: string;
  responseMinutes?: number;
  resolutionMinutes?: number;
  escalationRules?: SlaEscalationRule[];
  businessHoursOnly?: boolean;
  warningPercent?: number;
  isActive?: boolean;
}

export interface SlaEscalationRule {
  level: number;
  percentUsed: number;
  notifyRole?: string;
  notifyUserId?: string;
  message?: string;
}

export interface SlaComplianceMetrics {
  total: number;
  withinSla: number;
  breached: number;
  active: number;
  complianceRate: number;
  avgResponseMinutes: number;
  avgResolutionMinutes: number;
  avgResponseBusinessMinutes: number;
  avgResolutionBusinessMinutes: number;
}

export interface SlaStatus {
  status: 'within_sla' | 'at_risk' | 'breached';
  responseUsed: number;
  resolutionUsed: number;
  responseRemaining: number;
  resolutionRemaining: number;
  nextEscalationAt?: Date;
}

interface HolidayEntry {
  date: string;
  name: string;
}

interface WorkingHoursEntry {
  start: string;
  end: string;
}

// ---- Helpers ----

function toJsonValue(val: unknown): Prisma.InputJsonValue {
  return val as Prisma.InputJsonValue;
}

function fromJson<T>(json: unknown, fallback: T): T {
  if (json && typeof json === 'object') return json as T;
  return fallback;
}

// ---- Service ----

export const SlaService = {
  // -------------------------------------------------------------------------
  // SLA Policy CRUD
  // -------------------------------------------------------------------------

  async createPolicy(input: CreateSlaPolicyInput) {
    const policy = await db.slaPolicy.create({
      data: {
        name: input.name,
        entityType: input.entityType,
        priority: input.priority,
        responseMinutes: input.responseMinutes,
        resolutionMinutes: input.resolutionMinutes,
        escalationRules: toJsonValue(input.escalationRules ?? null),
        businessHoursOnly: input.businessHoursOnly ?? false,
        warningPercent: input.warningPercent ?? 75,
        isActive: true,
        createdById: input.createdById,
      },
    });

    log.info('SLA policy created', { id: policy.id, name: input.name });
    return policy;
  },

  async updatePolicy(id: string, input: UpdateSlaPolicyInput) {
    const _existing = await db.slaPolicy.findUnique({ where: { id } });
    if (!_existing) throw new NotFoundError('SlaPolicy', id);

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.entityType !== undefined) updateData.entityType = input.entityType;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.responseMinutes !== undefined) updateData.responseMinutes = input.responseMinutes;
    if (input.resolutionMinutes !== undefined) updateData.resolutionMinutes = input.resolutionMinutes;
    if (input.escalationRules !== undefined) updateData.escalationRules = toJsonValue(input.escalationRules);
    if (input.businessHoursOnly !== undefined) updateData.businessHoursOnly = input.businessHoursOnly;
    if (input.warningPercent !== undefined) updateData.warningPercent = input.warningPercent;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    return db.slaPolicy.update({ where: { id }, data: updateData });
  },

  async getPolicy(id: string) {
    const policy = await db.slaPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundError('SlaPolicy', id);
    return policy;
  },

  async listPolicies(filter?: {
    entityType?: string;
    priority?: string;
    isActive?: boolean;
  }) {
    const where: Record<string, unknown> = {};
    if (filter?.entityType) where.entityType = filter.entityType;
    if (filter?.priority) where.priority = filter.priority;
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;

    return db.slaPolicy.findMany({ where, orderBy: { createdAt: 'desc' } });
  },

  async deletePolicy(id: string) {
    const policy = await db.slaPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundError('SlaPolicy', id);

    const trackingCount = await db.slaTracking.count({ where: { policyId: id, status: 'active' } });
    if (trackingCount > 0) {
      throw new ValidationError({ delete: `Cannot delete policy with ${trackingCount} active tracking records` });
    }

    await db.slaPolicy.delete({ where: { id } });
    log.info('SLA policy deleted', { id });
  },

  // -------------------------------------------------------------------------
  // SLA Tracking
  // -------------------------------------------------------------------------

  async startTracking(params: { policyId: string; entityType: string; entityId: string }) {
    const policy = await db.slaPolicy.findUnique({ where: { id: params.policyId } });
    if (!policy) throw new NotFoundError('SlaPolicy', params.policyId);

    const existing = await db.slaTracking.findUnique({
      where: { entityType_entityId: { entityType: params.entityType, entityId: params.entityId } },
    });
    if (existing && existing.status === 'active') {
      throw new ConflictError('SlaTracking', 'entity', `${params.entityType}/${params.entityId}`);
    }

    if (existing) {
      await db.slaTracking.delete({ where: { id: existing.id } });
    }

    const tracking = await db.slaTracking.create({
      data: {
        policyId: params.policyId,
        entityType: params.entityType,
        entityId: params.entityId,
        startedAt: new Date(),
        status: 'active',
      },
    });

    log.info('SLA tracking started', { trackingId: tracking.id, policyId: params.policyId });
    return tracking;
  },

  async recordResponse(entityType: string, entityId: string) {
    const tracking = await db.slaTracking.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    if (!tracking) throw new NotFoundError('SlaTracking', `${entityType}/${entityId}`);
    if (tracking.responseAt) return tracking;

    return db.slaTracking.update({
      where: { id: tracking.id },
      data: { responseAt: new Date() },
    });
  },

  async resolveTracking(entityType: string, entityId: string) {
    const tracking = await db.slaTracking.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    if (!tracking) throw new NotFoundError('SlaTracking', `${entityType}/${entityId}`);

    return db.slaTracking.update({
      where: { id: tracking.id },
      data: {
        resolvedAt: new Date(),
        status: tracking.breachedAt ? 'breached' : 'completed',
      },
    });
  },

  async cancelTracking(entityType: string, entityId: string) {
    const tracking = await db.slaTracking.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    if (!tracking) throw new NotFoundError('SlaTracking', `${entityType}/${entityId}`);

    return db.slaTracking.update({ where: { id: tracking.id }, data: { status: 'cancelled' } });
  },

  async pauseTracking(entityType: string, entityId: string) {
    const tracking = await db.slaTracking.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    if (!tracking) throw new NotFoundError('SlaTracking', `${entityType}/${entityId}`);
    if (tracking.status !== 'active') throw new ValidationError({ status: 'Only active tracking can be paused' });

    return db.slaTracking.update({
      where: { id: tracking.id },
      data: { pausedAt: new Date(), status: 'paused' },
    });
  },

  async resumeTracking(entityType: string, entityId: string) {
    const tracking = await db.slaTracking.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    if (!tracking) throw new NotFoundError('SlaTracking', `${entityType}/${entityId}`);
    if (tracking.status !== 'paused') throw new ValidationError({ status: 'Only paused tracking can be resumed' });

    const pausedMs = tracking.pausedAt ? Date.now() - tracking.pausedAt.getTime() : 0;

    return db.slaTracking.update({
      where: { id: tracking.id },
      data: {
        resumedAt: new Date(),
        pausedAt: null,
        totalPausedMs: tracking.totalPausedMs + pausedMs,
        status: 'active',
      },
    });
  },

  // -------------------------------------------------------------------------
  // SLA Status Check
  // -------------------------------------------------------------------------

  async getStatus(entityType: string, entityId: string): Promise<SlaStatus> {
    const tracking = await db.slaTracking.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    if (!tracking) {
      return { status: 'within_sla', responseUsed: 0, resolutionUsed: 0, responseRemaining: -1, resolutionRemaining: -1 };
    }

    const policy = await db.slaPolicy.findUnique({ where: { id: tracking.policyId } });
    if (!policy) {
      return { status: 'within_sla', responseUsed: 0, resolutionUsed: 0, responseRemaining: -1, resolutionRemaining: -1 };
    }

    const now = new Date();
    const effectiveStartedAt = new Date(tracking.startedAt.getTime() + tracking.totalPausedMs);
    const elapsedMinutes = (now.getTime() - effectiveStartedAt.getTime()) / (1000 * 60);

    let responseUsed = 100;
    let responseRemaining = 0;
    if (policy.responseMinutes && policy.responseMinutes > 0) {
      responseUsed = tracking.responseAt ? 100 : Math.min(100, (elapsedMinutes / policy.responseMinutes) * 100);
      responseRemaining = tracking.responseAt ? 0 : Math.max(0, policy.responseMinutes - elapsedMinutes);
    }

    let resolutionUsed = 100;
    let resolutionRemaining = 0;
    if (policy.resolutionMinutes && policy.resolutionMinutes > 0) {
      resolutionUsed = tracking.resolvedAt ? 100 : Math.min(100, (elapsedMinutes / policy.resolutionMinutes) * 100);
      resolutionRemaining = tracking.resolvedAt ? 0 : Math.max(0, policy.resolutionMinutes - elapsedMinutes);
    }

    let status: 'within_sla' | 'at_risk' | 'breached' = 'within_sla';
    if (tracking.breachedAt || resolutionUsed >= 100 || responseUsed >= 100) {
      status = 'breached';
    } else if (resolutionUsed >= policy.warningPercent || responseUsed >= policy.warningPercent) {
      status = 'at_risk';
    }

    let nextEscalationAt: Date | undefined;
    const escalationRules = fromJson<SlaEscalationRule[]>(policy.escalationRules, []);
    for (const rule of escalationRules) {
      if (rule.percentUsed > resolutionUsed) {
        const targetMinutes = (rule.percentUsed / 100) * (policy.resolutionMinutes ?? 0);
        nextEscalationAt = new Date(effectiveStartedAt.getTime() + targetMinutes * 60 * 1000);
        break;
      }
    }

    return { status, responseUsed, resolutionUsed, responseRemaining, resolutionRemaining, nextEscalationAt };
  },

  // -------------------------------------------------------------------------
  // SLA Breach Check (for cron)
  // -------------------------------------------------------------------------

  async checkBreaches() {
    const activeTrackings = await db.slaTracking.findMany({
      where: { status: 'active' },
    });

    const breached: string[] = [];

    for (const tracking of activeTrackings) {
      const policy = await db.slaPolicy.findUnique({ where: { id: tracking.policyId } });
      if (!policy || !policy.resolutionMinutes) continue;

      const now = new Date();
      const effectiveStartedAt = new Date(tracking.startedAt.getTime() + tracking.totalPausedMs);
      const elapsedMinutes = (now.getTime() - effectiveStartedAt.getTime()) / (1000 * 60);

      if (elapsedMinutes >= policy.resolutionMinutes && !tracking.breachedAt) {
        await db.slaTracking.update({
          where: { id: tracking.id },
          data: { breachedAt: now, status: 'breached' },
        });
        breached.push(tracking.id);
        sendBreachNotification(tracking, policy);
      }

      const escalationRules = fromJson<SlaEscalationRule[]>(policy.escalationRules, []);
      const usedPercent = (elapsedMinutes / policy.resolutionMinutes) * 100;
      for (const rule of escalationRules) {
        if (usedPercent >= rule.percentUsed && rule.level > tracking.escalationLevel) {
          await db.slaTracking.update({
            where: { id: tracking.id },
            data: { escalationLevel: rule.level },
          });
          sendEscalationNotification(tracking, policy, rule);
        }
      }
    }

    log.info('SLA breach check completed', { active: activeTrackings.length, breached: breached.length });
    return { checked: activeTrackings.length, breached: breached.length, breachedIds: breached };
  },

  // -------------------------------------------------------------------------
  // Compliance Metrics
  // -------------------------------------------------------------------------

  async getComplianceMetrics(filter?: {
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<SlaComplianceMetrics> {
    const where: Record<string, unknown> = {};
    if (filter?.entityType) where.entityType = filter.entityType;
    if (filter?.startDate || filter?.endDate) {
      where.startedAt = {};
      if (filter?.startDate) (where.startedAt as Record<string, unknown>).gte = filter.startDate;
      if (filter?.endDate) (where.startedAt as Record<string, unknown>).lte = filter.endDate;
    }

    const all = await db.slaTracking.findMany({ where });
    const total = all.length;
    const withinSla = all.filter((t) => t.status === 'completed' && !t.breachedAt).length;
    const breached = all.filter((t) => t.breachedAt).length;
    const active = all.filter((t) => t.status === 'active').length;

    const responseTimes: number[] = [];
    const resolutionTimes: number[] = [];

    for (const t of all) {
      if (t.responseAt) {
        responseTimes.push((t.responseAt.getTime() - t.startedAt.getTime() - t.totalPausedMs) / (1000 * 60));
      }
      if (t.resolvedAt) {
        resolutionTimes.push((t.resolvedAt.getTime() - t.startedAt.getTime() - t.totalPausedMs) / (1000 * 60));
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      total,
      withinSla,
      breached,
      active,
      complianceRate: total > 0 ? (withinSla / total) * 100 : 0,
      avgResponseMinutes: Math.round(avg(responseTimes) * 100) / 100,
      avgResolutionMinutes: Math.round(avg(resolutionTimes) * 100) / 100,
      avgResponseBusinessMinutes: Math.round(avg(responseTimes) * 100) / 100,
      avgResolutionBusinessMinutes: Math.round(avg(resolutionTimes) * 100) / 100,
    };
  },

  // -------------------------------------------------------------------------
  // Business Calendar
  // -------------------------------------------------------------------------

  async createCalendar(data: {
    name: string;
    timezone?: string;
    workingDays?: number[];
    workingHours?: WorkingHoursEntry[];
    holidays?: HolidayEntry[];
  }) {
    return db.businessCalendar.create({
      data: {
        name: data.name,
        timezone: data.timezone ?? 'UTC',
        workingDays: toJsonValue(data.workingDays ?? [1, 2, 3, 4, 5]),
        workingHours: toJsonValue(data.workingHours ?? [{ start: '08:00', end: '17:00' }]),
        holidays: toJsonValue(data.holidays ?? []),
        isActive: true,
      },
    });
  },

  async listCalendars() {
    return db.businessCalendar.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  },

  async getCalendar(id: string) {
    const cal = await db.businessCalendar.findUnique({ where: { id } });
    if (!cal) throw new NotFoundError('BusinessCalendar', id);
    return cal;
  },

  async isBusinessTime(calendarId: string, date?: Date): Promise<boolean> {
    const cal = await db.businessCalendar.findUnique({ where: { id: calendarId } });
    if (!cal) return true;

    const d = date ?? new Date();
    const dayOfWeek = d.getUTCDay();
    const workingDays = fromJson<number[]>(cal.workingDays, [1, 2, 3, 4, 5]);

    if (!workingDays.includes(dayOfWeek)) return false;

    const holidays = fromJson<HolidayEntry[]>(cal.holidays, []);
    const dateStr = d.toISOString().slice(0, 10);
    if (holidays.some((h) => h.date === dateStr)) return false;

    return true;
  },

  async calculateBusinessMinutes(calendarId: string, start: Date, end: Date): Promise<number> {
    const cal = await db.businessCalendar.findUnique({ where: { id: calendarId } });
    if (!cal) return (end.getTime() - start.getTime()) / (1000 * 60);

    const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const workingDays = fromJson<number[]>(cal.workingDays, [1, 2, 3, 4, 5]);
    const workingHours = fromJson<WorkingHoursEntry[]>(cal.workingHours, [{ start: '08:00', end: '17:00' }]);

    let businessMinutesPerDay = 0;
    for (const wh of workingHours) {
      const [startH, startM] = wh.start.split(':').map(Number);
      const [endH, endM] = wh.end.split(':').map(Number);
      businessMinutesPerDay += (endH * 60 + endM) - (startH * 60 + startM);
    }

    const workingDaysPerWeek = workingDays.length;
    const totalDays = totalMinutes / (24 * 60);
    const weeks = Math.floor(totalDays / 7);
    const remainderDays = totalDays % 7;

    const businessMinutes = (weeks * workingDaysPerWeek * businessMinutesPerDay) +
      (Math.min(remainderDays, workingDaysPerWeek) * businessMinutesPerDay);

    return Math.max(0, Math.round(businessMinutes));
  },
};

// ---- Notification Helpers ----

function sendBreachNotification(
  tracking: { id: string; entityType: string; entityId: string },
  policy: { name: string },
) {
  log.info('SLA breach notification sent', {
    trackingId: tracking.id,
    entityType: tracking.entityType,
    entityId: tracking.entityId,
    policyName: policy.name,
  });
}

function sendEscalationNotification(
  tracking: { id: string; entityType: string; entityId: string },
  policy: { name: string },
  rule: SlaEscalationRule,
) {
  log.info('SLA escalation notification sent', {
    trackingId: tracking.id,
    policyName: policy.name,
    escalationLevel: rule.level,
    message: rule.message,
  });
}
