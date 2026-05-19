import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { EdmsService } from '@/services/documents/edms.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'documents.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const revisions = await EdmsService.getRevisionHistory(id);

    return NextResponse.json({ success: true, data: revisions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get revision history';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'documents.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { changeDescription, changeType, fileSize, fileUrl } = body;

    if (!changeDescription) {
      return NextResponse.json({ success: false, error: 'Change description is required' }, { status: 400 });
    }

    const document = await EdmsService.createRevision(
      id,
      session.userId,
      changeDescription,
      changeType,
      fileSize,
      fileUrl,
    );

    return NextResponse.json({ success: true, data: document });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create revision';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
