import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { StoCriticalPathService } from '@/services/sto/criticalPath.service';
import { StoExecutionService } from '@/services/sto/execution.service';

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

    const [milestones, punchList, startupReadiness] = await Promise.all([
      StoCriticalPathService.calculateCriticalPath(id).then(r => r.milestones),
      StoExecutionService.getPunchList(id),
      StoExecutionService.verifyStartupReadiness(id),
    ]);

    return NextResponse.json({
      success: true,
      data: { milestones, punchList, startupReadiness },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load milestones';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (body.action === 'add_punch') {
      const punchList = await StoExecutionService.addPunchItem(id, body.item);
      return NextResponse.json({ success: true, data: punchList });
    }

    if (body.action === 'clear_punch') {
      const punchList = await StoExecutionService.clearPunchItem(id, body.itemId, session.userId);
      return NextResponse.json({ success: true, data: punchList });
    }

    if (body.action === 'save_handover') {
      await StoExecutionService.saveShiftHandover(body.note);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'capture_lessons') {
      await StoExecutionService.captureLessonsLearned(id, body.lessons);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update milestones';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
