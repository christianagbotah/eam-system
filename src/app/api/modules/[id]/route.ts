import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

/**
 * Find the "canonical" CompanyModule record for a given systemModuleId.
 *
 * Priority (same as GET endpoint):
 *  1. companyId = '__default__'
 *  2. companyId IS NULL  (legacy seed)
 *  3. any other companyId
 *
 * Uses orderBy: createdAt desc so that if multiple NULL records exist
 * (MariaDB allows this in unique indexes), we pick the latest.
 */
async function findCanonicalCompanyModule(systemModuleId: string) {
  return db.companyModule.findFirst({
    where: {
      systemModuleId,
      OR: [
        { companyId: '__default__' },
        { companyId: null },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Remove duplicate CompanyModule records for a given systemModuleId,
 * keeping only the canonical one (prefers '__default__' over NULL).
 * This is fire-and-forget — errors are logged but don't block the request.
 */
async function deduplicateCompanyModules(systemModuleId: string, keepId: string) {
  try {
    const duplicates = await db.companyModule.findMany({
      where: {
        systemModuleId,
        id: { not: keepId },
      },
      select: { id: true },
    });
    if (duplicates.length > 0) {
      await db.companyModule.deleteMany({
        where: {
          systemModuleId,
          id: { not: keepId },
        },
      });
      console.log(`[modules] Cleaned up ${duplicates.length} duplicate company_module(s) for systemModule ${systemModuleId.slice(0, 8)}`);
    }
  } catch (err) {
    console.warn('[modules] Failed to deduplicate company_modules:', (err as Error).message);
  }
}

// Shared handler for both PUT and PATCH
async function handleUpdate(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Accept either modules.manage or modules.activate permission (admin always has all)
    if (!hasPermission(session, 'modules.manage') && !hasPermission(session, 'modules.activate') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions — requires modules.manage or modules.activate' }, { status: 403 });
    }

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
    const { isActive, isEnabled } = body;

    if (typeof isActive !== 'boolean' && typeof isEnabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'isActive or isEnabled (boolean) is required' }, { status: 400 });
    }

    const systemModule = await db.systemModule.findUnique({ where: { id } });
    if (!systemModule) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 });
    }

    // Core modules are always active and cannot be deactivated
    if (systemModule.isCore && isActive === false) {
      return NextResponse.json({ success: false, error: 'Core modules cannot be deactivated' }, { status: 400 });
    }

    // Core modules are always enabled and cannot be disabled
    if (systemModule.isCore && isEnabled === false) {
      return NextResponse.json({ success: false, error: 'Core modules cannot be disabled' }, { status: 400 });
    }

    // Use the same deterministic strategy as the GET endpoint
    const existingCompanyModule = await findCanonicalCompanyModule(id);

    if (existingCompanyModule?.activationLocked && (isActive === false || isEnabled === false)) {
      return NextResponse.json({ success: false, error: 'Module activation is locked and cannot be changed' }, { status: 400 });
    }

    // Cannot enable a module that is not active (vendor hasn't licensed it)
    if (isEnabled === true && existingCompanyModule && !existingCompanyModule.isActive) {
      return NextResponse.json({ success: false, error: 'Module must be licensed/activated by vendor before enabling' }, { status: 400 });
    }

    // Build update data with proper typing
    const updateData: {
      isActive?: boolean;
      isEnabled?: boolean;
      licensedAt?: Date | null;
      licensedBy?: string | null;
      activatedAt?: Date | null;
      activatedBy?: string | null;
      companyId?: string;
    } = {};
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
      if (isActive) {
        updateData.licensedAt = new Date();
        updateData.licensedBy = session.userId;
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

    let companyModule;
    if (existingCompanyModule) {
      // Ensure the canonical record uses '__default__' companyId for determinism.
      // If it has NULL companyId (legacy seed), migrate it to '__default__'.
      if (!existingCompanyModule.companyId) {
        updateData.companyId = '__default__';
      }

      companyModule = await db.companyModule.update({
        where: { id: existingCompanyModule.id },
        data: updateData,
      });

      // Fire-and-forget: clean up any duplicate records
      deduplicateCompanyModules(id, existingCompanyModule.id);
    } else {
      // Create new with deterministic companyId to avoid NULL unique-index issues
      companyModule = await db.companyModule.create({
        data: {
          systemModuleId: id,
          companyId: '__default__',
          isActive: (isActive as boolean) ?? false,
          isEnabled: (isEnabled as boolean) ?? false,
          licensedAt: isActive ? new Date() : null,
          licensedBy: isActive ? session.userId : null,
          activatedAt: isEnabled ? new Date() : null,
          activatedBy: isEnabled ? session.userId : null,
        },
      });
    }

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
    console.error('[modules/update] Error updating module:', message, error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(request, context);
}
