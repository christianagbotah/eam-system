import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
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

    const safeRoles = roles.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      level: r.level,
      isSystem: r.isSystem,
      permissionCount: r._count.rolePermissions,
      userCount: r._count.userRoles,
      permissions: r.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        slug: rp.permission.slug,
        name: rp.permission.name,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    }));

    return NextResponse.json({ success: true, data: safeRoles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load roles';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
