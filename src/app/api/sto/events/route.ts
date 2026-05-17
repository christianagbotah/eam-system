import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { StoPlanningService } from '@/services/sto/planning.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId') ?? undefined;
    const status = searchParams.get('status') as 'planning' | 'scheduled' | 'in_progress' | 'completed' | undefined;
    const type = searchParams.get('type') as 'planned_shutdown' | 'turnaround' | 'forced_outage' | 'emergency' | undefined;
    const search = searchParams.get('search') ?? undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await StoPlanningService.listEvents({ plantId, status, type, search, page, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load STO events';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, plantId } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ success: false, error: 'Type is required' }, { status: 400 });
    }
    if (!plantId) {
      return NextResponse.json({ success: false, error: 'Plant ID is required' }, { status: 400 });
    }

    const validTypes = ['planned_shutdown', 'turnaround', 'forced_outage', 'emergency'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, error: `Type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const event = await StoPlanningService.createEvent(body, session.userId);

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create STO event';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
