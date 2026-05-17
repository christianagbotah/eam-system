import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
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
    const progressHistory = await StoExecutionService.getProgressHistory(id);

    return NextResponse.json({ success: true, data: progressHistory });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load progress data';
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

    if (body.overallProgress === undefined) {
      return NextResponse.json({ success: false, error: 'overallProgress is required' }, { status: 400 });
    }

    const report = await StoExecutionService.submitProgressReport(id, session.userId, body);

    return NextResponse.json({ success: true, data: report }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit progress report';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
