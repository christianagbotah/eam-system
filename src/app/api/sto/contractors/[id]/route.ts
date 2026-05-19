import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { StoContractorService } from '@/services/sto/contractor.service';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const contractor = await StoContractorService.getContractor(id);

    if (!contractor) {
      return NextResponse.json({ success: false, error: 'Contractor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: contractor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load contractor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'work_orders.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const contractor = await StoContractorService.updateContractor(id, body);

    await createAuditLog(session.userId, 'sto_contractor', 'update', id, {
      newValues: body,
    });

    return NextResponse.json({ success: true, data: contractor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update contractor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const { id } = await params;
    const contractor = await StoContractorService.deleteContractor(id);

    await createAuditLog(session.userId, 'sto_contractor', 'delete', id);

    return NextResponse.json({ success: true, data: contractor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate contractor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
