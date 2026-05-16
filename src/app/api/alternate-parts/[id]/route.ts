import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { bomEngineeringService } from '@/services/bomEngineering.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await bomEngineeringService.deleteAlternatePart(id);

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete alternate part';
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
