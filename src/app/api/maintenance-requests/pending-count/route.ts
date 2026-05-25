import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/maintenance-requests/pending-count
 * Returns the count of pending maintenance requests that require attention.
 * Counts both 'pending' (awaiting approval) and 'approved' (awaiting planner assignment / conversion).
 * - Admins see all actionable requests
 * - Supervisors/managers see actionable requests from their supervised departments
 * - Planners see approved requests not yet converted to WO
 * - Other roles see their own pending requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (isAdmin(session)) {
      // Admins see all actionable requests (pending + approved)
      const count = await db.maintenanceRequest.count({
        where: { status: { in: ['pending', 'approved'] } },
      });
      return NextResponse.json({ success: true, data: { count } });
    }

    if (hasRole(session, 'maintenance_supervisor') || hasRole(session, 'maintenance_manager') || hasRole(session, 'plant_manager')) {
      // Supervisors/managers see actionable requests from their supervised departments
      const supervisedDepts = await db.department.findMany({
        where: { supervisorId: session.userId },
        select: { id: true },
      });
      const supervisedDeptIds = supervisedDepts.map(d => d.id);

      const where: Record<string, unknown> = { status: { in: ['pending', 'approved'] } };
      if (supervisedDeptIds.length > 0) {
        where.OR = [
          { supervisorId: session.userId },
          { departmentId: { in: supervisedDeptIds } },
        ];
      } else {
        where.supervisorId = session.userId;
      }

      const count = await db.maintenanceRequest.count({ where });
      return NextResponse.json({ success: true, data: { count } });
    }

    if (hasRole(session, 'maintenance_planner')) {
      // Planners see approved requests not yet converted
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
