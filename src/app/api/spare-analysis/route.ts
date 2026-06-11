import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSession, hasPermission, isAdmin } from '@/lib/auth';
import { bomEngineeringService } from '@/services/bomEngineering.service';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(request)!;
    if (!hasPermission(session, 'inventory.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { componentId } = body;

    if (!componentId) {
      return NextResponse.json({ success: false, error: 'componentId is required' }, { status: 400 });
    }

    const result = await bomEngineeringService.runSpareAnalysis(componentId, user.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run spare analysis';
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const componentId = searchParams.get('componentId');

    if (!componentId) {
      return NextResponse.json({ success: false, error: 'componentId is required' }, { status: 400 });
    }

    const analysis = await bomEngineeringService.getSpareAnalysis(componentId);

    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Spare analysis not found for this component' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load spare analysis';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
