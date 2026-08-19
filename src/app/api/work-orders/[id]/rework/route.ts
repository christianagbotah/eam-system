import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';
import { requestRework } from '@/services/workExecution.service';
import type { SessionContext } from '@/services/workExecution.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Plant authorization
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

    const body = await request.json();

    const sessionCtx: SessionContext = {
      userId: session.userId,
      fullName: session.fullName,
      roles: session.roles || [],
      permissions: session.permissions || [],
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    const result = await requestRework(id, sessionCtx, {
      reason: body.reason,
      category: body.category,
      idempotencyKey: body.idempotencyKey,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.readiness ? 422 : 400 });
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Rework operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
