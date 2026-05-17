import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { downsamplingService } from '@/services/historian/downsampling.service';

// GET /api/historian/downsample/policies — list all downsampling policies
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const policies = await downsamplingService.listPolicies();
    return NextResponse.json({ success: true, data: policies });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch downsampling policies';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/historian/downsample/policies — create or update a policy
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { sourceId, rawRetentionDays, minuteRetentionDays, hourlyRetentionDays, dailyRetentionDays, weeklyRetentionDays, aggregationMethod, isActive } = body;

    const policy = await downsamplingService.upsertPolicy({
      sourceId: sourceId || undefined,
      rawRetentionDays: rawRetentionDays ? parseInt(rawRetentionDays, 10) : undefined,
      minuteRetentionDays: minuteRetentionDays ? parseInt(minuteRetentionDays, 10) : undefined,
      hourlyRetentionDays: hourlyRetentionDays ? parseInt(hourlyRetentionDays, 10) : undefined,
      dailyRetentionDays: dailyRetentionDays ? parseInt(dailyRetentionDays, 10) : undefined,
      weeklyRetentionDays: weeklyRetentionDays ? parseInt(weeklyRetentionDays, 10) : undefined,
      aggregationMethod,
      isActive,
    });

    return NextResponse.json({ success: true, data: policy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create/update downsampling policy';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/historian/downsample/policies — delete a policy
export async function DELETE(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Policy id is required' }, { status: 400 });
    }

    await downsamplingService.deletePolicy(id);
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete downsampling policy';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
