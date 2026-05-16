import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { bomEngineeringService } from '@/services/bomEngineering.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bomId = searchParams.get('bomId');

    if (!bomId) {
      return NextResponse.json({ success: false, error: 'bomId is required' }, { status: 400 });
    }

    const revisions = await bomEngineeringService.listBomRevisions(bomId);
    return NextResponse.json({ success: true, data: revisions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load BOM revisions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { bomId, revision, description, changeReason, items } = body;

    if (!bomId || !revision) {
      return NextResponse.json({ success: false, error: 'bomId and revision are required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one BOM item is required' }, { status: 400 });
    }

    const result = await bomEngineeringService.createBomRevision({
      bomId,
      revision,
      description,
      changeReason,
      items,
      createdById: user.id,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create BOM revision';
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
