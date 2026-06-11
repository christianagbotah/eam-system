import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSession, hasPermission, isAdmin } from '@/lib/auth';
import { cameraSystemService } from '@/services/cameraSystem.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sceneId = searchParams.get('sceneId')!;
    if (!sceneId) return NextResponse.json({ error: 'sceneId required' }, { status: 400 });

    const bookmarks = await cameraSystemService.listBookmarks(sceneId);
    return NextResponse.json(bookmarks);
  } catch (error: any) {
    console.error('[GET /api/view-bookmarks]', error);
    return NextResponse.json({ error: error.message || 'Failed to list bookmarks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = getSession(req)!;
    if (!hasPermission(session, 'dashboard.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const bookmark = await cameraSystemService.createBookmark({ ...body, createdById: user.id });
    return NextResponse.json(bookmark, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/view-bookmarks]', error);
    return NextResponse.json({ error: error.message || 'Failed to create bookmark' }, { status: 500 });
  }
}
