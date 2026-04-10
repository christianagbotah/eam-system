import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const users = await db.user.findMany({
      include: {
        department: { select: { id: true, name: true, code: true } },
        plant: { select: { id: true, name: true, code: true } },
        userRoles: { include: { role: { select: { id: true, name: true, slug: true, color: true } } } },
        plantAccess: { include: { plant: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const safeUsers = users.map(({ password: _, ...user }) => user);

    return NextResponse.json({ success: true, data: safeUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, fullName, departmentId, plantId, roleIds } = body;

    if (!username || !email || !password || !fullName) {
      return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 });
    }

    const existing = await db.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Username or email already exists' }, { status: 400 });
    }

    const { hash } = await import('bcryptjs');
    const hashedPassword = await hash(password, 10);

    const user = await db.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        fullName,
        departmentId,
        plantId,
        status: 'active',
        userRoles: roleIds ? {
          create: roleIds.map((roleId: string) => ({ roleId })),
        } : undefined,
      },
      include: {
        department: true,
        plant: true,
        userRoles: { include: { role: true } },
      },
    });

    const { password: _, ...safeUser } = user;

    return NextResponse.json({ success: true, data: safeUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
