import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const componentId = searchParams.get('componentId');
    const assetId = searchParams.get('assetId');
    const maintenanceType = searchParams.get('maintenanceType');
    const difficulty = searchParams.get('difficulty');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = { isActive: true };

    if (componentId) where.componentId = componentId;
    if (assetId) where.assetId = assetId;
    if (maintenanceType) where.maintenanceType = maintenanceType;
    if (difficulty) where.difficulty = difficulty;

    const [instructions, total] = await Promise.all([
      db.workInstruction.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          creator: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workInstruction.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: instructions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load work instructions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'digital_twin.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      componentId,
      assetId,
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
    } = body;

    // Validation
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!componentId || typeof componentId !== 'string') {
      return NextResponse.json({ success: false, error: 'Component ID is required' }, { status: 400 });
    }
    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json({ success: false, error: 'Asset ID is required' }, { status: 400 });
    }

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

    // Steps validation
    if (steps && !Array.isArray(steps)) {
      return NextResponse.json({ success: false, error: 'Steps must be an array' }, { status: 400 });
    }
    if (steps && steps.length > 0) {
      for (const step of steps) {
        if (!step.title || typeof step.title !== 'string') {
          return NextResponse.json({ success: false, error: 'Each step must have a title' }, { status: 400 });
        }
        if (!step.instruction || typeof step.instruction !== 'string') {
          return NextResponse.json({ success: false, error: 'Each step must have an instruction' }, { status: 400 });
        }
      }
    }

    const instruction = await db.workInstruction.create({
      data: {
        title,
        description: description || '',
        componentId,
        assetId,
        maintenanceType: maintenanceType || 'corrective',
        estimatedDuration: estimatedDuration || 0,
        difficulty: difficulty || 'intermediate',
        safetyLevel: safetyLevel || 'medium',
        requiresLockout: requiresLockout || false,
        requiresPermit: requiresPermit || false,
        prerequisites: prerequisites || [],
        steps: steps || [],
        requiredTools: requiredTools || [],
        requiredParts: requiredParts || [],
        safetyCheckpoints: safetyCheckpoints || [],
        version: 1,
        isActive: true,
        createdById: session.userId,
      },
      include: {
        creator: { select: { id: true, fullName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'work_instruction',
        entityId: instruction.id,
        newValues: JSON.stringify({ title, maintenanceType, difficulty }),
      },
    });

    return NextResponse.json({ success: true, data: instruction }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create work instruction';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
