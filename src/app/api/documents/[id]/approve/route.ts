import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { EdmsService, type DocumentStatus } from '@/services/documents/edms.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'documents.manage') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required (approve/reject)' }, { status: 400 });
    }

    if (action === 'approve') {
      const document = await EdmsService.transitionStatus(
        id, 'approved' as DocumentStatus, session.userId, notes,
      );
      return NextResponse.json({ success: true, data: document, message: 'Document approved' });
    }

    if (action === 'issue') {
      const document = await EdmsService.transitionStatus(
        id, 'issued' as DocumentStatus, session.userId, notes,
      );
      return NextResponse.json({ success: true, data: document, message: 'Document issued' });
    }

    if (action === 'submit_review') {
      const document = await EdmsService.transitionStatus(
        id, 'under_review' as DocumentStatus, session.userId, notes,
      );
      return NextResponse.json({ success: true, data: document, message: 'Document submitted for review' });
    }

    if (action === 'reject') {
      const document = await EdmsService.transitionStatus(
        id, 'draft' as DocumentStatus, session.userId, notes,
      );
      return NextResponse.json({ success: true, data: document, message: 'Document rejected' });
    }

    if (action === 'supersede') {
      const document = await EdmsService.transitionStatus(
        id, 'superseded' as DocumentStatus, session.userId, notes,
      );
      return NextResponse.json({ success: true, data: document, message: 'Document superseded' });
    }

    if (action === 'obsolete') {
      const document = await EdmsService.transitionStatus(
        id, 'obsolete' as DocumentStatus, session.userId, notes,
      );
      return NextResponse.json({ success: true, data: document, message: 'Document obsoleted' });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process approval';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
