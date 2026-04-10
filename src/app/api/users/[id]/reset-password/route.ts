import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';
import { hash } from 'bcryptjs';

// POST /api/users/[id]/reset-password — Reset user password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);

    await db.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    // Create audit log — do NOT log the password itself
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'user',
        entityId: id,
        oldValues: null,
        newValues: JSON.stringify({ field: 'password', action: 'reset' }),
      },
    });

    return NextResponse.json({ success: true, data: { message: 'Password reset successfully' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
