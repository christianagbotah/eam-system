import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';

// GET /api/users/[id] — Get single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Admin or self-access only
    if (!isAdmin(session) && session.userId !== id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              select: { id: true, name: true, slug: true, level: true },
            },
          },
        },
        plantAccess: {
          include: {
            plant: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: {
        ...safeUser,
        roles: safeUser.userRoles.map((ur) => ur.role),
        plants: safeUser.plantAccess.map((up) => up.plant),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/users/[id] — Update user profile and assignments
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(session) && !hasPermission(session, 'users.update')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fullName, email, phone, department, staffId, status, roleIds, plantIds } = body;

    // Check user exists
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // If email is being changed, check for duplicates
    if (email && email !== existing.email) {
      const dup = await db.user.findFirst({ where: { email } });
      if (dup) {
        return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 });
      }
    }

    // Update basic fields
    const updateData: Record<string, unknown> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (department !== undefined) updateData.department = department;
    if (staffId !== undefined) updateData.staffId = staffId;
    if (status !== undefined) updateData.status = status;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        userRoles: { include: { role: true } },
        plantAccess: { include: { plant: true } },
      },
    });

    // Handle role assignments — delete existing, create new
    if (Array.isArray(roleIds)) {
      await db.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length > 0) {
        await db.userRole.createMany({
          data: roleIds.map((roleId: string) => ({ userId: id, roleId })),
        });
      }
    }

    // Handle plant assignments — delete existing, create new
    if (Array.isArray(plantIds)) {
      await db.userPlant.deleteMany({ where: { userId: id } });
      if (plantIds.length > 0) {
        await db.userPlant.createMany({
          data: plantIds.map((plantId: string) => ({ userId: id, plantId })),
        });
      }
    }

    // Fetch final state with updated relations
    const finalUser = await db.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: true } },
        plantAccess: { include: { plant: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'user',
        entityId: id,
        oldValues: JSON.stringify({
          fullName: existing.fullName,
          email: existing.email,
          phone: existing.phone,
          department: existing.department,
          staffId: existing.staffId,
          status: existing.status,
        }),
        newValues: JSON.stringify({
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          department: updatedUser.department,
          staffId: updatedUser.staffId,
          status: updatedUser.status,
          roleIds,
          plantIds,
        }),
      },
    });

    const { passwordHash: _, ...safeUser } = finalUser!;

    return NextResponse.json({
      success: true,
      data: {
        ...safeUser,
        roles: safeUser.userRoles.map((ur) => ur.role),
        plants: safeUser.plantAccess.map((up) => up.plant),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/users/[id] — Deactivate user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.status === 'inactive') {
      return NextResponse.json({ success: false, error: 'User is already inactive' }, { status: 400 });
    }

    await db.user.update({
      where: { id },
      data: { status: 'inactive' },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'user',
        entityId: id,
        oldValues: JSON.stringify({ status: user.status }),
        newValues: JSON.stringify({ status: 'inactive' }),
      },
    });

    return NextResponse.json({ success: true, data: { message: 'User deactivated successfully' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deactivate user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
