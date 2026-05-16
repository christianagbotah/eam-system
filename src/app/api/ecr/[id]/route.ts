import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { bomEngineeringService } from '@/services/bomEngineering.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const ecr = await bomEngineeringService.getECR(id);

    return NextResponse.json({ success: true, data: ecr });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load engineering change request';
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 });
    }

    const validStatuses = ['draft', 'submitted', 'reviewing', 'approved', 'rejected', 'implemented', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const result = await bomEngineeringService.updateECRStatus(id, status, user.id);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update engineering change request';
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
