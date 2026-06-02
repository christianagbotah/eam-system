import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { bomEngineeringService } from '@/services/bomEngineering.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const componentId = searchParams.get('componentId');

    if (!componentId) {
      return NextResponse.json({ success: false, error: 'componentId is required' }, { status: 400 });
    }

    const altParts = await bomEngineeringService.listAlternateParts(componentId);
    return NextResponse.json({ success: true, data: altParts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load alternate parts';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'parts.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { primaryPartId, alternatePartId, interchangeability, notes } = body;

    if (!primaryPartId || !alternatePartId) {
      return NextResponse.json({ success: false, error: 'primaryPartId and alternatePartId are required' }, { status: 400 });
    }

    const result = await bomEngineeringService.createAlternatePart({
      primaryPartId,
      alternatePartId,
      interchangeability,
      notes,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create alternate part';
    let status = 500;
    if (error instanceof Error) {
      if (message.includes('different')) status = 400;
      if (message.includes('already exists')) status = 409;
    }
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
