import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session || !hasPermission(session, 'modules.manage')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { isEnabled } = body;

    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isEnabled (boolean) is required' },
        { status: 400 }
      );
    }

    const systemModule = await db.systemModule.findUnique({ where: { id } });
    if (!systemModule) {
      return NextResponse.json(
        { success: false, error: 'Module not found' },
        { status: 404 }
      );
    }

    // Core modules cannot be deactivated
    if (systemModule.isCore && !isEnabled) {
      return NextResponse.json(
        { success: false, error: 'Core modules cannot be deactivated' },
        { status: 400 }
      );
    }

    // Check if activation is locked
    const existingCompanyModule = await db.companyModule.findFirst({
      where: { systemModuleId: id },
    });
    if (existingCompanyModule?.activationLocked && !isEnabled) {
      return NextResponse.json(
        { success: false, error: 'Module activation is locked and cannot be changed' },
        { status: 400 }
      );
    }

    // Upsert company module activation
    const companyModule = await db.companyModule.upsert({
      where: {
        systemModuleId_companyId: {
          systemModuleId: id,
          companyId: null, // Single company setup
        },
      },
      create: {
        systemModuleId: id,
        isEnabled,
        activatedAt: isEnabled ? new Date() : null,
        activatedBy: isEnabled ? session.userId : null,
      },
      update: {
        isEnabled,
        activatedAt: isEnabled ? new Date() : null,
        activatedBy: isEnabled ? session.userId : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        isEnabled: companyModule.isEnabled,
        activatedAt: companyModule.activatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update module';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
