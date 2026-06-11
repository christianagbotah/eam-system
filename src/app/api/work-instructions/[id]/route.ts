import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const instruction = await db.workInstruction.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, fullName: true } },
      },
    });

    if (!instruction) {
      return NextResponse.json({ success: false, error: 'Work instruction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: instruction });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work instruction';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.workInstruction.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Work instruction not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      maintenanceType,
      estimatedDuration,
      difficulty,
      safetyLevel,
      requiresLockout,
      requiresPermit,
      prerequisites,
      steps,
      requiredTools,
      requiredParts,
      safetyCheckpoints,
      isActive,
    } = body;

    const validMaintenanceTypes = ['corrective', 'preventive', 'predictive', 'inspection', 'installation', 'overhaul'];
    if (maintenanceType && !validMaintenanceTypes.includes(maintenanceType)) {
      return NextResponse.json(
        { success: false, error: `Invalid maintenanceType. Must be one of: ${validMaintenanceTypes.join(', ')}` },
        { status: 400 },
      );
    }

    const validDifficulties = ['basic', 'intermediate', 'advanced', 'expert'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { success: false, error: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` },
        { status: 400 },
      );
    }

    const validSafetyLevels = ['low', 'medium', 'high', 'critical'];
    if (safetyLevel && !validSafetyLevels.includes(safetyLevel)) {
      return NextResponse.json(
        { success: false, error: `Invalid safetyLevel. Must be one of: ${validSafetyLevels.join(', ')}` },
        { status: 400 },
      );
    }

    const updated = await db.workInstruction.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(maintenanceType !== undefined ? { maintenanceType } : {}),
        ...(estimatedDuration !== undefined ? { estimatedDuration } : {}),
        ...(difficulty !== undefined ? { difficulty } : {}),
        ...(safetyLevel !== undefined ? { safetyLevel } : {}),
        ...(requiresLockout !== undefined ? { requiresLockout } : {}),
        ...(requiresPermit !== undefined ? { requiresPermit } : {}),
        ...(prerequisites !== undefined ? { prerequisites } : {}),
        ...(steps !== undefined ? { steps } : {}),
        ...(requiredTools !== undefined ? { requiredTools } : {}),
        ...(requiredParts !== undefined ? { requiredParts } : {}),
        ...(safetyCheckpoints !== undefined ? { safetyCheckpoints } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        version: existing.version + 1,
      },
      include: {
        creator: { select: { id: true, fullName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_instruction',
        entityId: id,
        newValues: JSON.stringify({ version: updated.version }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update work instruction';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'digital_twin.manage') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.workInstruction.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Work instruction not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await db.workInstruction.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'work_instruction',
        entityId: id,
        newValues: JSON.stringify({ softDeleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete work instruction';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
