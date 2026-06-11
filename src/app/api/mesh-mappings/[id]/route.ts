import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSession, hasPermission, isAdmin } from '@/lib/auth';
import { componentMappingService } from '@/services/componentMapping.service';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = getSession(req)!;
    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const mapping = await componentMappingService.updateMapping(id, body);
    return NextResponse.json(mapping);
  } catch (error: any) {
    console.error('[PATCH /api/mesh-mappings/:id]', error);
    return NextResponse.json({ error: error.message || 'Failed to update mapping' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = getSession(req)!;
    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await params;
    await componentMappingService.deleteMapping(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/mesh-mappings/:id]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete mapping' }, { status: 500 });
  }
}
