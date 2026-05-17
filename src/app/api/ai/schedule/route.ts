import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { IntelligentSchedulingService } from '@/services/intelligentScheduling.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId') || undefined;
    const days = parseInt(searchParams.get('days') || '14', 10);

    const result = await IntelligentSchedulingService.optimizeSchedule(plantId, days);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Scheduling optimization failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
