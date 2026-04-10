import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '../login/route';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const session = sessions.get(token);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        department: true,
        plant: true,
        userRoles: { include: { role: true } },
        plantAccess: { include: { plant: true } },
      },
    });

    if (!user) {
      sessions.delete(token);
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
    }

    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...safeUser,
          roles: user.userRoles.map(ur => ur.role),
          plantAccess: user.plantAccess.map(up => up.plant),
        },
        permissions: session.permissions,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
