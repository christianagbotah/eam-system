import { NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin, hasRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/maintenance-requests/pending-count
 * Returns the count of pending maintenance requests that require attention.
 * - Supervisors/admins see pending requests awaiting their approval
 * - Planners see requests assigned to them for planning
 * - Other roles see their own pending requests
 */
export async function GET() {
  try {
    const session = getSession(await import('next/headers').then(h => h.headers()));
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    let where: Record<string, unknown> = { status: 'pending' };

    if (isAdmin(session)) {
      // Admins see all pending
    } else if (hasRole(session, 'maintenance_supervisor') || hasRole(session, 'maintenance_manager') || hasRole(session, 'plant_manager')) {
      // Supervisors/managers see pending requests from their departments
      const supervisedDepts = await db.department.findMany({
        where: { supervisorId: session.userId },
        select: { id: true },
      });
      const supervisedDeptIds = supervisedDepts.map(d => d.id);
      if (supervisedDeptIds.length > 0) {
        where.OR = [
          { supervisorId: session.userId },
          { departmentId: { in: supervisedDeptIds } },
        ];
      } else {
        where.supervisorId = session.userId;
      }
    } else if (hasRole(session, 'maintenance_planner')) {
      // Planners see approved requests not yet converted
      where.status = 'approved';
    } else {
      // Other roles see their own pending requests
      where.requestedBy = session.userId;
    }

    const count = await db.maintenanceRequest.count({ where });

    return NextResponse.json({ success: true, data: { count } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[pending-count]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
