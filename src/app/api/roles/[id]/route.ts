import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

// GET /api/roles/[id] — Get single role with permissions
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
    const role = await db.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, slug: true, name: true, module: true, action: true },
            },
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    // Admin role has no explicit RolePermission rows — it gets ALL permissions implicitly
    let permissions = role.rolePermissions.map((rp) => rp.permission);
    if (role.isSystem && role.slug === 'admin' && permissions.length === 0) {
      const allPermissions = await db.permission.findMany({
        select: { id: true, slug: true, name: true, module: true, action: true },
      });
      permissions = allPermissions;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        level: role.level,
        isSystem: role.isSystem,
        permissionCount: permissions.length,
        permissions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch role';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/roles/[id] — Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, level, permissionIds } = body;

    const role = await db.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    // Build update data (never modify slug or isSystem)
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (level !== undefined) updateData.level = level;

    const oldValues = {
      name: role.name,
      description: role.description,
      level: role.level,
    };

    await db.role.update({
      where: { id },
      data: updateData,
    });

    // Handle permissions — replace all if provided
    if (Array.isArray(permissionIds)) {
      await db.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        await db.rolePermission.createMany({
          data: permissionIds.map((permissionId: string) => ({ roleId: id, permissionId })),
        });
      }
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'role',
        entityId: id,
        oldValues: JSON.stringify(oldValues),
        newValues: JSON.stringify({ name, description, level, permissionIds }),
      },
    });

    // Fetch updated role with permissions
    const updatedRole = await db.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, slug: true, name: true, module: true, action: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedRole!.id,
        name: updatedRole!.name,
        slug: updatedRole!.slug,
        description: updatedRole!.description,
        level: updatedRole!.level,
        isSystem: updatedRole!.isSystem,
        permissions: updatedRole!.rolePermissions.map((rp) => rp.permission),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update role';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/roles/[id] — Delete role
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

    const role = await db.role.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } },
    });

    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system roles' },
        { status: 400 }
      );
    }

    if (role._count.userRoles > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete role with assigned users. Remove users first.' },
        { status: 400 }
      );
    }

    await db.rolePermission.deleteMany({ where: { roleId: id } });

    await db.role.delete({ where: { id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'role',
        entityId: id,
        oldValues: JSON.stringify({
          name: role.name,
          slug: role.slug,
          description: role.description,
          level: role.level,
        }),
        newValues: null,
      },
    });

    return NextResponse.json({ success: true, data: { message: 'Role deleted successfully' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete role';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
