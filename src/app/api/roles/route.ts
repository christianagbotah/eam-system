import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const roles = await db.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, slug: true, name: true, module: true, action: true },
            },
          },
        },
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
      orderBy: { level: 'desc' },
    });

    // Fetch all permissions once for admin role special handling
    const allPermissions = await db.permission.findMany({
      select: { id: true, slug: true, name: true, module: true, action: true },
    });

    const safeRoles = roles.map((r) => {
      // Admin role has no explicit RolePermission rows — it gets ALL permissions implicitly
      let permissions = r.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        slug: rp.permission.slug,
        name: rp.permission.name,
        module: rp.permission.module,
        action: rp.permission.action,
      }));
      if (r.isSystem && r.slug === 'admin' && permissions.length === 0) {
        permissions = allPermissions;
      }
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        level: r.level,
        isSystem: r.isSystem,
        permissionCount: permissions.length,
        userCount: r._count.userRoles,
        permissions,
      };
    });

    return NextResponse.json({ success: true, data: safeRoles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load roles';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/roles — Create a new role
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(session) && !hasPermission(session, 'roles.create')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, description, level, permissionIds } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await db.role.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Role slug already exists' },
        { status: 400 }
      );
    }

    const role = await db.role.create({
      data: {
        name,
        slug,
        description: description || null,
        level: level ?? 0,
        rolePermissions: permissionIds?.length
          ? {
              create: permissionIds.map((permissionId: string) => ({ permissionId })),
            }
          : undefined,
      },
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

    return NextResponse.json(
      {
        success: true,
        data: {
          id: role.id,
          name: role.name,
          slug: role.slug,
          description: role.description,
          level: role.level,
          isSystem: role.isSystem,
          permissions: role.rolePermissions.map((rp) => rp.permission),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create role';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
