import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { StoSchedulingService } from '@/services/sto/scheduling.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const ganttData = await StoSchedulingService.generateGanttData(id);

    return NextResponse.json({ success: true, data: ganttData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load schedule data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
