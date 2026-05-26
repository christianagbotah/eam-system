import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/diagnostics/status-transitions
 *
 * Diagnostic endpoint to verify status transition rules exist in the database.
 * No auth required — accessible via curl for easy VPS debugging.
 *
 * Usage:
 *   curl https://your-domain.com/api/diagnostics/status-transitions
 *
 * Returns the list of all MR and WO status transition rules.
 * If the table is empty or missing critical rules, the seed needs to be re-run.
 */
export async function GET() {
  try {
    const mrTransitions = await db.statusTransition.findMany({
      where: { entityType: 'maintenance_request' },
      orderBy: [{ fromStatus: 'asc' }, { sortOrder: 'asc' }],
    });

    const woTransitions = await db.statusTransition.findMany({
      where: { entityType: 'work_order' },
      orderBy: [{ fromStatus: 'asc' }, { sortOrder: 'asc' }],
    });

    const totalMR = mrTransitions.length;
    const totalWO = woTransitions.length;

    // Check for critical missing transitions
    const criticalMRTransitions = [
      { from: 'pending', to: 'approved', label: 'Approve request' },
      { from: 'pending', to: 'rejected', label: 'Reject request' },
      { from: 'pending', to: 'in_progress', label: 'Start review' },
      { from: 'approved', to: 'converted', label: 'Convert to WO' },
    ];

    const missingMR: string[] = [];
    for (const ct of criticalMRTransitions) {
      const found = mrTransitions.find(
        t => t.fromStatus === ct.from && t.toStatus === ct.to
      );
      if (!found) {
        missingMR.push(`${ct.label}: ${ct.from} → ${ct.to}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          maintenanceRequestTransitions: totalMR,
          workOrderTransitions: totalWO,
          missingCriticalMR: missingMR,
          status: totalMR >= 5 ? 'OK' : `INCOMPLETE (${totalMR}/5 MR transitions) — re-seed status_transitions required`,
        },
        maintenanceRequestTransitions: mrTransitions.map(t => ({
          fromStatus: t.fromStatus ?? 'NULL (initial)',
          toStatus: t.toStatus,
          allowedRoles: JSON.parse(t.allowedRoleSlugs || '[]'),
          requiresReason: t.requiresReason,
        })),
        workOrderTransitions: woTransitions.map(t => ({
          fromStatus: t.fromStatus ?? 'NULL (initial)',
          toStatus: t.toStatus,
          allowedRoles: JSON.parse(t.allowedRoleSlugs || '[]'),
          requiresReason: t.requiresReason,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: message,
      hint: 'If the statusTransitions table does not exist or is empty, run the seed script: cd ~/git/eam-system && bun run prisma/seed.ts',
    }, { status: 500 });
  }
}
