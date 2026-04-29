import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        directPerms: {
          include: { permission: true },
        },
        plantAccess: {
          include: { plant: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is inactive' },
        { status: 401 }
      );
    }

    const validPassword = await compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session (handles role/permission resolution internally)
    const { token, session } = await createSession(user.id);

    // Get primary plant
    const primaryPlant = (user.plantAccess || []).find((up) => up.isPrimary);

    // Build response
    const { passwordHash: _, ...safeUser } = user;
    const roles = (user.userRoles || []).map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      slug: ur.role.slug,
      level: ur.role.level,
      isSystem: ur.role.isSystem,
      description: ur.role.description,
    }));

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
          plantAccess: (user.plantAccess || []).map((up) => ({
            id: up.plant.id,
            code: up.plant.code,
            name: up.plant.name,
            location: up.plant.location,
            accessLevel: up.accessLevel,
            isPrimary: up.isPrimary,
          })),
        },
        token,
        permissions: session.permissions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
