import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { cameraSystemService } from '@/services/cameraSystem.service';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const tour = await cameraSystemService.updateTour(id, body);
    return NextResponse.json(tour);
  } catch (error: any) {
    console.error('[PATCH /api/inspection-tours/:id]', error);
    return NextResponse.json({ error: error.message || 'Failed to update tour' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await cameraSystemService.deleteTour(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/inspection-tours/:id]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete tour' }, { status: 500 });
  }
}
