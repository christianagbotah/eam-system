import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { StoCriticalPathService } from '@/services/sto/criticalPath.service';

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { eventId, action, scenario } = body;

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'eventId is required' }, { status: 400 });
    }

    // Calculate critical path
    if (action === 'calculate') {
      const result = await StoCriticalPathService.calculateCriticalPath(eventId);
      return NextResponse.json({ success: true, data: result });
    }

    // What-if analysis
    if (action === 'what_if' && scenario) {
      const result = await StoCriticalPathService.analyzeScenario(eventId, scenario);
      return NextResponse.json({ success: true, data: result });
    }

    // Default: calculate critical path
    const result = await StoCriticalPathService.calculateCriticalPath(eventId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate critical path';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
