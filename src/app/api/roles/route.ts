import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const roles = await db.role.findMany({
      include: {
        _count: { select: { rolePermissions: true, userRoles: true } },
      },
      orderBy: { level: 'desc' },
    });

    const safeRoles = roles.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      level: r.level,
      isSystem: r.isSystem,
      color: r.color,
      permissionCount: r._count.rolePermissions,
      userCount: r._count.userRoles,
    }));

    return NextResponse.json({ success: true, data: safeRoles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
