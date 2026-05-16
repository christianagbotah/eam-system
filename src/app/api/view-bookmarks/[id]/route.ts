import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { cameraSystemService } from '@/services/cameraSystem.service';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await cameraSystemService.deleteBookmark(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/view-bookmarks/:id]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete bookmark' }, { status: 500 });
  }
}
