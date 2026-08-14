import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasAnyPermission } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { convertMRToWorkOrder } from '@/services/repairPlanning.service';
import type { ConvertMRToWOPayload } from '@/services/repairPlanning.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ── 1. Auth & permissions ──
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasAnyPermission(session, ['maintenance_requests.convert_to_wo'])) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // ── 2. Parse params & body ──
    const { id } = await params;
    const body: ConvertMRToWOPayload = await request.json();

    // ── 3. Delegate to domain service ──
    const result = await convertMRToWorkOrder(id, body, {
      userId: session.userId,
      fullName: session.fullName,
      roles: session.roles,
    });

    // ── 4. Shape HTTP response ──
    if (!result.success) {
      // Conflict (already converted)
      if (result.conflictWoNumber) {
        return NextResponse.json(
          { success: false, error: result.error, conflictWoNumber: result.conflictWoNumber },
          { status: 409 },
        );
      }
      // Not found
      if (result.error?.includes('not found')) {
        return NextResponse.json({ success: false, error: result.error }, { status: 404 });
      }
      // General client error (validation, no plant access, etc.)
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // ── 5. Fire-and-forget notifications ──
    result.notifications?.forEach((n) =>
      notifyUser(n.userId, n.type, n.title, n.message, n.entityType, n.entityId, n.actionUrl, n.options as { forceSms?: boolean; forceEmail?: boolean; skipQuietHours?: boolean }).catch(() => {}),
    );

    // ── 6. Success response ──
    return NextResponse.json({ success: true, data: result.workOrder }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to convert maintenance request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
