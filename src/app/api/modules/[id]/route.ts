import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

// Shared handler for both PUT and PATCH
async function handleUpdate(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { isActive, isEnabled } = body;

    if (typeof isActive !== 'boolean' && typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isActive or isEnabled (boolean) is required' },
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

    // Core modules are always active and cannot be deactivated
    if (systemModule.isCore && isActive === false) {
      return NextResponse.json(
        { success: false, error: 'Core modules cannot be deactivated' },
        { status: 400 }
      );
    }

    // Core modules are always enabled and cannot be disabled
    if (systemModule.isCore && isEnabled === false) {
      return NextResponse.json(
        { success: false, error: 'Core modules cannot be disabled' },
        { status: 400 }
      );
    }

    // Check existing company module for lock status
    const existingCompanyModule = await db.companyModule.findFirst({
      where: { systemModuleId: id },
    });
    if (existingCompanyModule?.activationLocked && (isActive === false || isEnabled === false)) {
      return NextResponse.json(
        { success: false, error: 'Module activation is locked and cannot be changed' },
        { status: 400 }
      );
    }

    // Cannot enable a module that is not active (vendor hasn't licensed it)
    if (isEnabled === true && existingCompanyModule && !existingCompanyModule.isActive) {
      return NextResponse.json(
        { success: false, error: 'Module must be licensed/activated by vendor before enabling' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
      if (isActive) {
        updateData.licensedAt = new Date();
        updateData.licensedBy = session.userId;
        // If activating, also force isActive and reset isEnabled if needed
      }
    }
    if (typeof isEnabled === 'boolean') {
      updateData.isEnabled = isEnabled;
      if (isEnabled) {
        updateData.activatedAt = new Date();
        updateData.activatedBy = session.userId;
      } else {
        updateData.activatedAt = null;
        updateData.activatedBy = null;
      }
    }

    // Upsert company module
    const companyModule = await db.companyModule.upsert({
      where: {
        systemModuleId_companyId: {
          systemModuleId: id,
          companyId: null, // Single company setup
        },
      },
      create: {
        systemModuleId: id,
        isActive: isActive ?? false,
        isEnabled: isEnabled ?? false,
        licensedAt: isActive ? new Date() : null,
        licensedBy: isActive ? session.userId : null,
        activatedAt: isEnabled ? new Date() : null,
        activatedBy: isEnabled ? session.userId : null,
      },
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id,
        isActive: companyModule.isActive,
        isEnabled: companyModule.isEnabled,
        activatedAt: companyModule.activatedAt,
        licensedAt: companyModule.licensedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update module';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(request, context);
}
