import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        userRoles: {
          include: { role: true },
        },
        plantAccess: {
          include: { plant: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    const { passwordHash: _, ...safeUser } = user;
    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      slug: ur.role.slug,
      level: ur.role.level,
      isSystem: ur.role.isSystem,
      description: ur.role.description,
    }));

    const primaryPlant = user.plantAccess.find((up) => up.isPrimary);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          avatar: user.avatar,
          department: user.department,
          phone: user.phone,
          status: user.status,
          roles,
          permissions: session.permissions,
          plantId: primaryPlant?.plantId ?? null,
          plantAccess: user.plantAccess.map((up) => ({
            id: up.plant.id,
            code: up.plant.code,
            name: up.plant.name,
            location: up.plant.location,
            accessLevel: up.accessLevel,
            isPrimary: up.isPrimary,
          })),
        },
        permissions: session.permissions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
