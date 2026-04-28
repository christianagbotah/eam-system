import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';

// PUT /api/roles/[id]/permissions — Set permissions for a role (replace all)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(session) && !hasPermission(session, 'roles.update')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const role = await db.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    // Prevent non-admin users from modifying system roles (privilege escalation protection)
    if (role.isSystem && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Cannot modify system role permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { success: false, error: 'permissionIds array is required' },
        { status: 400 }
      );
    }

    // Delete all existing permissions for this role
    await db.rolePermission.deleteMany({ where: { roleId: id } });

    // Validate all permission IDs exist
    if (permissionIds.length > 0) {
      const validPerms = await db.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { id: true },
      });
      const validIds = new Set(validPerms.map(p => p.id));
      const filteredIds = permissionIds.filter((id: string) => validIds.has(id));

      if (filteredIds.length > 0) {
        await db.rolePermission.createMany({
          data: filteredIds.map((permissionId: string) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    }

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

    if (!updatedRole) {
      return NextResponse.json({ success: false, error: 'Role not found after permission update' }, { status: 500 });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'role_permissions',
        entityId: id,
        oldValues: null,
        newValues: JSON.stringify({
          roleId: id,
          permissionIds,
          count: permissionIds.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedRole.id,
        name: updatedRole.name,
        slug: updatedRole.slug,
        description: updatedRole.description,
        level: updatedRole.level,
        isSystem: updatedRole.isSystem,
        permissions: (updatedRole.rolePermissions || []).map((rp) => rp.permission),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update role permissions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
