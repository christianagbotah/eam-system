import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';
import { randomUUID } from 'crypto';

// In-memory session store
export const sessions = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username },
      include: {
        department: true,
        plant: true,
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        plantAccess: { include: { plant: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Account is inactive' }, { status: 401 });
    }

    const validPassword = await compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate token
    const token = randomUUID();
    const roles = user.userRoles.map(ur => ur.role);
    const permissions = roles.flatMap(r => r.rolePermissions.map(rp => rp.permission.slug));
    const uniquePermissions = [...new Set(permissions)];

    // Store session
    sessions.set(token, {
      userId: user.id,
      permissions: uniquePermissions,
      roles: roles.map(r => r.slug),
      createdAt: new Date(),
    });

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Sanitize user
    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...safeUser,
          roles: roles.map(r => ({ id: r.id, name: r.name, slug: r.slug, level: r.level, color: r.color })),
          plantAccess: user.plantAccess.map(up => up.plant),
        },
        token,
        permissions: uniquePermissions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Login failed' }, { status: 500 });
  }
}
