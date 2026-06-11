import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSession, hasPermission, isAdmin } from '@/lib/auth';
import { bomEngineeringService } from '@/services/bomEngineering.service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const plantId = searchParams.get('plantId') || undefined;
    const assetId = searchParams.get('assetId') || undefined;
    const search = searchParams.get('search') || undefined;
    let page = parseInt(searchParams.get('page') || '1', 10);
    let limit = parseInt(searchParams.get('limit') || '20', 10);
    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.min(100, Math.max(1, isNaN(limit) ? 20 : limit));

    const result = await bomEngineeringService.listECRs({
      page,
      limit,
      status,
      plantId,
      assetId,
      search,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load engineering change requests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'assets.create') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, changeType, reason, priority, impact, bomId, assetId, plantId } = body;

    if (!title || !description || !changeType || !reason) {
      return NextResponse.json({ success: false, error: 'title, description, changeType, and reason are required' }, { status: 400 });
    }

    const result = await bomEngineeringService.createECR({
      title,
      description,
      changeType,
      reason,
      priority,
      impact,
      bomId,
      assetId,
      plantId,
      requestedById: session.userId,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create engineering change request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
