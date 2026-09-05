import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/maintenance-requests/pending-count
 * Returns the count of pending maintenance requests that require attention.
 * Counts both 'pending' (awaiting approval) and 'approved' (awaiting planner assignment / conversion).
 * - Admins/supervisors/managers see ALL actionable requests in their plant scope
 * - Planners see approved requests not yet converted to WO in their plant scope
 * - Other roles see their own pending requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const plantScope = await getPlantScope(request, session);
    if (plantScope.denyAccess) return NextResponse.json({ success: true, data: { count: 0 } });

    // Build plant-filtered base where clause
    const baseWhere: Record<string, unknown> = { status: { in: ['pending', 'approved'] } };
    if (!plantScope.isSystemWide) {
      Object.assign(baseWhere, applyPlantScope({}, plantScope));
    }

    // Admins, supervisors, managers, plant managers — see actionable requests in scope
    if (
      isAdmin(session) ||
      hasRole(session, 'maintenance_supervisor') ||
      hasRole(session, 'maintenance_manager') ||
      hasRole(session, 'plant_manager')
    ) {
      const count = await db.maintenanceRequest.count({ where: baseWhere });
      return NextResponse.json({ success: true, data: { count } });
    }

    // Planners see approved requests not yet converted
    if (hasRole(session, 'maintenance_planner')) {
      const plannerWhere: Record<string, unknown> = { status: 'approved' };
      if (!plantScope.isSystemWide) {
        Object.assign(plannerWhere, applyPlantScope({}, plantScope));
      }
      const count = await db.maintenanceRequest.count({ where: plannerWhere });
      return NextResponse.json({ success: true, data: { count } });
    }

    // Other roles see their own actionable requests (pending + approved)
    const myWhere: Record<string, unknown> = {
      status: { in: ['pending', 'approved'] },
      requestedBy: session.userId,
    };
    if (!plantScope.isSystemWide) {
      Object.assign(myWhere, applyPlantScope({}, plantScope));
    }
    const count = await db.maintenanceRequest.count({ where: myWhere });
    return NextResponse.json({ success: true, data: { count } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[pending-count]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
