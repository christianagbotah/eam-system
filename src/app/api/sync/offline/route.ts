// ============================================================================
// POST /api/sync/offline
// Server-side sync endpoint for offline-queued operations
// Processes records sequentially, returns individual success/failure per record
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('sync:offline');

// Allowed offline-safe operations: entityType + operation combinations
const ALLOWED_OPERATIONS: Record<string, string[]> = {
  work_order_comment: ['create'],
  work_order_task: ['update'],
  work_order_time_log: ['create'],
  work_order_measurement: ['create'],
  work_order_assistance: ['create'],
};

interface SyncRecord {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  timestamp: string;
  idempotencyKey?: string;
}

interface SyncResult {
  id: string;
  success: boolean;
  error?: string;
}

// ─── Individual Handlers ─────────────────────────────────────────────────────

async function handleCommentCreate(
  workOrderId: string,
  data: Record<string, unknown>,
  session: ReturnType<typeof getSession> & NonNullable<ReturnType<typeof getSession>>,
): Promise<void> {
  const content = data.content as string;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Comment content is required');
  }

  const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
  if (!wo) throw new Error('Work order not found');

  await db.workOrderComment.create({
    data: {
      workOrderId,
      userId: session.userId,
      content: content.trim(),
    },
  });
}

async function handleTaskUpdate(
  workOrderId: string,
  data: Record<string, unknown>,
  session: ReturnType<typeof getSession> & NonNullable<ReturnType<typeof getSession>>,
): Promise<void> {
  const taskId = data.taskId as string;
  if (!taskId) throw new Error('taskId is required in data');

  const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'failed'];
  const status = (data.status as string) || 'completed';
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const task = await db.workOrderTaskExecution.findUnique({ where: { id: taskId } });
  if (!task || task.workOrderId !== workOrderId) {
    throw new Error('Task not found or does not belong to this work order');
  }

  const updateData: Record<string, unknown> = { status, updatedAt: new Date() };

  if (['completed', 'skipped', 'failed'].includes(status)) {
    updateData.completedAt = new Date();
    updateData.completedById = session.userId;
  }
  if (['pending', 'in_progress'].includes(status)) {
    updateData.completedAt = null;
    updateData.completedById = null;
  }

  if (data.notes && typeof data.notes === 'string' && data.notes.trim()) {
    const existingNotes = task.notes || '';
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${session.username}: ${data.notes.trim()}`;
    updateData.notes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
  }

  await db.workOrderTaskExecution.update({
    where: { id: taskId },
    data: updateData,
  });
}

async function handleTimeLogCreate(
  workOrderId: string,
  data: Record<string, unknown>,
  session: ReturnType<typeof getSession> & NonNullable<ReturnType<typeof getSession>>,
): Promise<void> {
  const VALID_ACTIONS = ['start', 'pause', 'resume', 'complete'];
  const action = (data.action as string) || 'complete';
  if (!VALID_ACTIONS.includes(action)) {
    throw new Error(`Invalid time log action: ${action}`);
  }

  const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
  if (!wo) throw new Error('Work order not found');
  if (wo.isLocked) throw new Error('Work order is locked');

  await db.workOrderTimeLog.create({
    data: {
      workOrderId,
      userId: session.userId,
      action,
      duration: (data.duration as number) || null,
      notes: (data.notes as string) || null,
      timestamp: new Date(),
      activityType: (data.activityType as string) || 'maintenance',
      breakMinutes: (data.breakMinutes as number) || 0,
      pauseReason: action === 'pause' ? ((data.pauseReason as string) || null) : null,
    },
  });
}

async function handleMeasurementCreate(
  workOrderId: string,
  data: Record<string, unknown>,
  session: ReturnType<typeof getSession> & NonNullable<ReturnType<typeof getSession>>,
): Promise<void> {
  // Measurements endpoint may not exist yet — store as a work order comment
  // with a structured prefix for now, to preserve data integrity
  const value = data.value;
  const unit = (data.unit as string) || '';
  const point = (data.measurementPoint as string) || (data.point as string) || 'General';

  if (value === undefined || value === null) {
    throw new Error('Measurement value is required');
  }

  const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
  if (!wo) throw new Error('Work order not found');

  const content = `[Measurement] ${point}: ${value}${unit ? ` ${unit}` : ''}`;

  await db.workOrderComment.create({
    data: {
      workOrderId,
      userId: session.userId,
      content,
    },
  });
}

async function handleAssistanceCreate(
  workOrderId: string,
  data: Record<string, unknown>,
  session: ReturnType<typeof getSession> & NonNullable<ReturnType<typeof getSession>>,
): Promise<void> {
  const reason = data.reason as string;
  if (!reason || !reason.trim()) {
    throw new Error('Assistance reason is required');
  }

  const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
  if (!wo) throw new Error('Work order not found');
  if (wo.isLocked) throw new Error('Work order is locked');

  await db.woTeamMemberRequest.create({
    data: {
      workOrderId,
      requestedBy: session.userId,
      requestedTrade: (data.tradeSkill as string) || null,
      requestedUserId: (data.requestedUserId as string) || null,
      role: 'assistant',
      reason: reason.trim(),
    },
  });
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const records: SyncRecord[] = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'records array is required' },
        { status: 400 },
      );
    }

    if (records.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 records per sync batch' },
        { status: 400 },
      );
    }

    const results: SyncResult[] = [];

    // Process records SEQUENTIALLY to maintain order
    for (const record of records) {
      // Validate operation is allowed for offline sync
      const allowedOps = ALLOWED_OPERATIONS[record.entityType];
      if (!allowedOps || !allowedOps.includes(record.operation)) {
        results.push({
          id: record.id,
          success: false,
          error: `Operation not supported for offline execution: ${record.entityType}/${record.operation}`,
        });
        continue;
      }

      // Idempotency check
      const idempotencyKey = record.data.idempotencyKey as string | undefined;
      if (idempotencyKey) {
        const existing = await db.idempotencyRecord.findUnique({ where: { key: idempotencyKey } });
        if (existing) {
          logger.info('Idempotent record already processed', { key: idempotencyKey, recordId: record.id });
          results.push({ id: record.id, success: true });
          continue;
        }
      }

      try {
        // Route to the appropriate handler
        const key = `${record.entityType}+${record.operation}` as const;

        switch (key) {
          case 'work_order_comment+create':
            await handleCommentCreate(record.entityId, record.data, session);
            break;
          case 'work_order_task+update':
            await handleTaskUpdate(record.entityId, record.data, session);
            break;
          case 'work_order_time_log+create':
            await handleTimeLogCreate(record.entityId, record.data, session);
            break;
          case 'work_order_measurement+create':
            await handleMeasurementCreate(record.entityId, record.data, session);
            break;
          case 'work_order_assistance+create':
            await handleAssistanceCreate(record.entityId, record.data, session);
            break;
          default:
            results.push({
              id: record.id,
              success: false,
              error: `Operation not supported for offline execution: ${record.entityType}/${record.operation}`,
            });
            continue; // skip idempotency recording
        }

        // Record idempotency key if present
        if (idempotencyKey) {
          await db.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              entityType: record.entityType,
              entityId: record.entityId,
              action: record.operation,
              userId: session.userId,
            },
          });
        }

        results.push({ id: record.id, success: true });
        logger.info('Sync record processed', {
          recordId: record.id,
          entityType: record.entityType,
          operation: record.operation,
          entityId: record.entityId,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error processing record';
        logger.error('Failed to process sync record', {
          recordId: record.id,
          entityType: record.entityType,
          operation: record.operation,
          error: message,
        });
        results.push({ id: record.id, success: false, error: message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info('Offline sync batch completed', {
      total: records.length,
      success: successCount,
      failed: failCount,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    logger.error('Offline sync endpoint error', { error: message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
