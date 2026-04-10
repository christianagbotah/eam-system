import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { hash } from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await db.user.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        userRoles: {
          include: { role: { select: { id: true, name: true, slug: true } } },
        },
        plantAccess: {
          include: { plant: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Remove passwordHash from each user
    const safeUsers = users.map(({ passwordHash: _, ...user }) => ({
      ...user,
      roles: user.userRoles.map((ur) => ur.role),
      plants: user.plantAccess.map((up) => up.plant),
    }));

    return NextResponse.json({ success: true, data: safeUsers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load users';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !hasPermission(session, 'users.create')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      username,
      email,
      password,
      fullName,
      staffId,
      phone,
      avatar,
      department,
      roleIds,
      plantIds,
    } = body;

    if (!username || !email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Username, email, password, and fullName are required' },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existing = await db.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);

    const user = await db.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        fullName,
        staffId: staffId || null,
        phone: phone || null,
        avatar: avatar || null,
        department: department || null,
        status: 'active',
        userRoles: roleIds?.length
          ? { create: roleIds.map((roleId: string) => ({ roleId })) }
          : undefined,
        plantAccess: plantIds?.length
          ? { create: plantIds.map((plantId: string) => ({ plantId })) }
          : undefined,
      },
      include: {
        userRoles: { include: { role: true } },
        plantAccess: { include: { plant: true } },
      },
    });

    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({ success: true, data: safeUser }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
