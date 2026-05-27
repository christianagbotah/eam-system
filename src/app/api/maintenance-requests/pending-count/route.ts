import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/maintenance-requests/pending-count
 * Returns the count of pending maintenance requests that require attention.
 * Counts both 'pending' (awaiting approval) and 'approved' (awaiting planner assignment / conversion).
 * - Admins/supervisors/managers see ALL actionable requests (they need full visibility)
 * - Planners see approved requests not yet converted to WO
 * - Other roles see their own pending requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Admins, supervisors, managers, plant managers — see ALL pending+approved requests
    if (
      isAdmin(session) ||
      hasRole(session, 'maintenance_supervisor') ||
      hasRole(session, 'maintenance_manager') ||
      hasRole(session, 'plant_manager')
    ) {
      const count = await db.maintenanceRequest.count({
        where: { status: { in: ['pending', 'approved'] } },
      });
      return NextResponse.json({ success: true, data: { count } });
    }

    // Planners see approved requests not yet converted
    if (hasRole(session, 'maintenance_planner')) {
      const count = await db.maintenanceRequest.count({ where: { status: 'approved' } });
      return NextResponse.json({ success: true, data: { count } });
    }

    // Other roles see their own actionable requests (pending + approved)
    const count = await db.maintenanceRequest.count({
      where: { status: { in: ['pending', 'approved'] }, requestedBy: session.userId },
    });
    return NextResponse.json({ success: true, data: { count } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[pending-count]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
