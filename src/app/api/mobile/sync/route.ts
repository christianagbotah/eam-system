// ============================================================================
// POST /api/mobile/sync — Upload offline changes to the server
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:mobile:sync');

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { operations, deviceId } = body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ success: false, error: 'Operations array is required' }, { status: 400 });
    }

    if (operations.length > 100) {
      return NextResponse.json({ success: false, error: 'Maximum 100 operations per sync batch' }, { status: 400 });
    }

    const results = [];
    let conflicts = 0;
    let processed = 0;
    let failed = 0;

    for (const op of operations) {
      try {
        // Record the sync operation
        const syncOp = await db.syncOperation.create({
          data: {
            userId: session.userId,
            deviceId: deviceId || null,
            operationType: 'upload',
            entityType: op.entityType,
            entityId: op.entityId,
            dataJson: JSON.stringify(op.data || op),
            status: 'processing',
          },
        });

        // Process the operation based on entity type
        let success = true;
        let conflictReason: string | undefined;

        if (op.entityType === 'work_orders') {
          // Check version conflict
          if (op.serverVersion && op.data?.id) {
            const existing = await db.workOrder.findUnique({
              where: { id: op.data.id as string },
              select: { updatedAt: true },
            });
            if (existing) {
              const serverVersion = new Date(existing.updatedAt).getTime();
              if (Math.abs(serverVersion - (op.serverVersion as number)) > 60000) {
                conflictReason = 'Server version mismatch';
                await db.syncOperation.update({
                  where: { id: syncOp.id },
                  data: { status: 'conflict', conflictReason, resolvedAt: new Date() },
                });
                conflicts++;
                success = false;
              }
            }
          }

          if (success) {
            // Apply update
            if (op.operation === 'update' && op.entityId) {
              const { id, ...updateData } = op.data as Record<string, unknown>;
              await db.workOrder.update({
                where: { id: op.entityId },
                data: updateData,
              });
            }
          }
        } else if (op.entityType === 'inspections') {
          if (op.operation === 'create' && op.data) {
            await db.mobileInspection.create({
              data: {
                templateId: (op.data as Record<string, unknown>).templateId as string,
                assetId: (op.data as Record<string, unknown>).assetId as string | undefined,
                workOrderId: (op.data as Record<string, unknown>).workOrderId as string | undefined,
                inspectorId: session.userId,
                status: (op.data as Record<string, unknown>).status as string || 'in_progress',
                resultsJson: (op.data as Record<string, unknown>).resultsJson,
                findingsJson: (op.data as Record<string, unknown>).findingsJson,
                photosJson: (op.data as Record<string, unknown>).photosJson,
                notes: (op.data as Record<string, unknown>).notes as string | undefined,
              },
            });
          } else if (op.operation === 'update' && op.entityId) {
            const { id, ...updateData } = op.data as Record<string, unknown>;
            await db.mobileInspection.update({
              where: { id: op.entityId },
              data: updateData,
            });
          }
        }

        if (success && !conflictReason) {
          await db.syncOperation.update({
            where: { id: syncOp.id },
            data: { status: 'completed', resolvedAt: new Date() },
          });
          processed++;
        }

        results.push({
          localId: op.localId || op.entityId,
          success: success && !conflictReason,
          conflict: !!conflictReason,
          conflictReason: conflictReason || undefined,
        });
      } catch (err) {
        failed++;
        results.push({
          localId: op.localId || op.entityId,
          success: false,
          error: (err as Error).message,
        });
        logger.error('Sync operation failed', { error: (err as Error).message, entityType: op.entityType });
      }
    }

    logger.info('Sync batch processed', {
      userId: session.userId,
      total: operations.length,
      processed,
      conflicts,
      failed,
    });

    return NextResponse.json({
      success: true,
      data: { processed, conflicts, failed, results },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    logger.error('Sync POST error', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
