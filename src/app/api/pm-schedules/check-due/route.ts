import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateNextDueDate, isAutoCalculableFrequency } from '@/lib/pm-utils';
import { notifyUser } from '@/lib/notifications';

/**
 * POST /api/pm-schedules/check-due
 *
 * Checks all active PM schedules where autoGenerateWO is true and
 * nextDueDate is within the lead window (now + leadDays).
 * For each due schedule, creates a Work Order and advances nextDueDate.
 *
 * Auth: Requires session (admin/planner role) OR internal secret header.
 * The internal secret header (X-PM-Cron-Secret) is used by cron jobs
 * so they don't need an active session token.
 */

// Helper: generate WO number WO-YYYYMM-NNNN
async function generateWoNumber(): Promise<string> {
  const now = new Date();
  const prefix = `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.workOrder.findFirst({
    where: { woNumber: { startsWith: prefix } },
    orderBy: { woNumber: 'desc' },
    select: { woNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.woNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

// Internal cron secret (env-based, fallback to a default for dev)
const CRON_SECRET = process.env.PM_CRON_SECRET || 'pm-scheduler-internal-2025';

export async function POST(request: NextRequest) {
  try {
    // Auth: either session or internal cron secret
    const session = getSession(request);
    const cronSecret = request.headers.get('x-pm-cron-secret');

    if (!session && cronSecret !== CRON_SECRET) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const now = new Date();

    // Find all active schedules where:
    // 1. autoGenerateWO is true
    // 2. nextDueDate is not null
    // 3. nextDueDate <= now + leadDays (the lead window)
    // 4. frequency is auto-calculable (not meter_based / custom_hours)
    const dueSchedules = await db.pmSchedule.findMany({
      where: {
        isActive: true,
        autoGenerateWO: true,
        nextDueDate: { not: null },
      },
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, plantId: true, departmentId: true },
        },
        assignedTo: { select: { id: true, fullName: true, username: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    const results: {
      scheduleId: string;
      scheduleTitle: string;
      workOrderId: string;
      woNumber: string;
      skipped: boolean;
      reason?: string;
    }[] = [];

    for (const schedule of dueSchedules) {
      // Skip if frequency is not auto-calculable
      if (!isAutoCalculableFrequency(schedule.frequencyType)) {
        results.push({
          scheduleId: schedule.id,
          scheduleTitle: schedule.title,
          workOrderId: '',
          woNumber: '',
          skipped: true,
          reason: `${schedule.frequencyType} requires external trigger (meter reading)`,
        });
        continue;
      }

      const nextDueDate = new Date(schedule.nextDueDate!);
      const leadWindow = new Date(now.getTime() + schedule.leadDays * 24 * 60 * 60 * 1000);

      // Check if within lead window
      if (nextDueDate > leadWindow) {
        results.push({
          scheduleId: schedule.id,
          scheduleTitle: schedule.title,
          workOrderId: '',
          woNumber: '',
          skipped: true,
          reason: 'Not within lead window yet',
        });
        continue;
      }

      // Check if a WO was already generated for this schedule's current nextDueDate
      // We look for WOs with pmScheduleId = schedule.id, type = 'preventive',
      // created after the last nextDueDate minus a small buffer
      const existingWo = await db.workOrder.findFirst({
        where: {
          pmScheduleId: schedule.id,
          type: 'preventive',
          status: { not: 'cancelled' },
          createdAt: { gte: new Date(nextDueDate.getTime() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingWo) {
        results.push({
          scheduleId: schedule.id,
          scheduleTitle: schedule.title,
          workOrderId: existingWo.id,
          woNumber: existingWo.woNumber,
          skipped: true,
          reason: 'WO already generated for this due cycle',
        });
        continue;
      }

      // Generate the WO
      const woNumber = await generateWoNumber();
      const wo = await db.workOrder.create({
        data: {
          woNumber,
          title: `PM: ${schedule.title}`,
          description: `Preventive maintenance scheduled for asset: ${schedule.asset.name || schedule.asset.assetTag}`,
          type: 'preventive',
          priority: schedule.priority,
          status: 'draft',
          assetId: schedule.assetId,
          assetName: schedule.asset.name,
          assignedTo: schedule.assignedToId,
          departmentId: schedule.asset.departmentId || schedule.departmentId || null,
          plantId: schedule.asset.plantId || null,
          estimatedHours: schedule.estimatedDuration || null,
          pmScheduleId: schedule.id,
          plannedStart: nextDueDate,
          notes: `Auto-generated from PM schedule "${schedule.title}" (${schedule.frequencyType}: ${schedule.frequencyValue})`,
        },
      });

      // Calculate the next due date
      const newNextDueDate = calculateNextDueDate(
        nextDueDate,
        schedule.frequencyType,
        schedule.frequencyValue,
      );

      // Update the schedule
      await db.pmSchedule.update({
        where: { id: schedule.id },
        data: {
          lastCompletedDate: nextDueDate,
          nextDueDate: newNextDueDate,
        },
      });

      // Notify assigned user
      if (schedule.assignedToId) {
        await notifyUser(
          schedule.assignedToId,
          'wo_assigned',
          'PM Work Order Generated',
          `A preventive maintenance WO (${woNumber}) has been auto-generated for ${schedule.asset.name}. Due: ${nextDueDate.toLocaleDateString()}.`,
          'work_order',
          wo.id,
          `wo-detail?id=${wo.id}`,
        );
      }

      // Audit log (use system user if cron, or session user if manual)
      const auditUserId = session?.userId || 'system';
      await db.auditLog.create({
        data: {
          userId: auditUserId,
          action: 'create',
          entityType: 'work_order',
          entityId: wo.id,
          newValues: JSON.stringify({
            woNumber,
            title: wo.title,
            type: 'preventive',
            pmScheduleId: schedule.id,
            autoGenerated: true,
          }),
        },
      });

      results.push({
        scheduleId: schedule.id,
        scheduleTitle: schedule.title,
        workOrderId: wo.id,
        woNumber,
        skipped: false,
      });
    }

    const generated = results.filter((r) => !r.skipped);
    const skipped = results.filter((r) => r.skipped);

    return NextResponse.json({
      success: true,
      data: {
        checked: dueSchedules.length,
        generated: generated.length,
        skipped: skipped.length,
        results,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check PM schedules';
    console.error('[PM Check-Due Error]', message, error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
