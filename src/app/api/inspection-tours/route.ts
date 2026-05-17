import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { cameraSystemService } from '@/services/cameraSystem.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const twinId = searchParams.get('twinId')!;
    if (!twinId) return NextResponse.json({ error: 'twinId required' }, { status: 400 });

    const tours = await cameraSystemService.listTours(twinId);
    return NextResponse.json(tours);
  } catch (error: any) {
    console.error('[GET /api/inspection-tours]', error);
    return NextResponse.json({ error: error.message || 'Failed to list tours' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const tour = await cameraSystemService.createTour({ ...body, createdById: user.id });
    return NextResponse.json(tour, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/inspection-tours]', error);
    return NextResponse.json({ error: error.message || 'Failed to create tour' }, { status: 500 });
  }
}
