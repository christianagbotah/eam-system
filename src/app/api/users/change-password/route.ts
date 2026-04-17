import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare, hash } from 'bcryptjs';
import { sessionCache } from '@/lib/auth';

// Password complexity requirements
const MIN_LENGTH = 8;
const PASSWORD_RULES = {
  minLength: (pw: string) => pw.length >= MIN_LENGTH,
  hasUppercase: (pw: string) => /[A-Z]/.test(pw),
  hasLowercase: (pw: string) => /[a-z]/.test(pw),
  hasNumber: (pw: string) => /[0-9]/.test(pw),
  hasSpecial: (pw: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw),
};

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!PASSWORD_RULES.minLength(password)) errors.push(`At least ${MIN_LENGTH} characters`);
  if (!PASSWORD_RULES.hasUppercase(password)) errors.push('At least one uppercase letter');
  if (!PASSWORD_RULES.hasLowercase(password)) errors.push('At least one lowercase letter');
  if (!PASSWORD_RULES.hasNumber(password)) errors.push('At least one number');
  if (!PASSWORD_RULES.hasSpecial(password)) errors.push('At least one special character');
  return { valid: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Find the current session
    const currentSession = await db.session.findUnique({
      where: { token },
    });

    if (!currentSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 401 });
    }

    if (new Date(currentSession.expiresAt) < new Date()) {
      await db.session.delete({ where: { id: currentSession.id } }).catch(() => {});
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password, new password, and confirmation are required' },
        { status: 400 },
      );
    }

    // Fetch user with password hash
    const user = await db.user.findUnique({
      where: { id: currentSession.userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const validCurrentPassword = await compare(currentPassword, user.passwordHash);
    if (!validCurrentPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 },
      );
    }

    // Ensure new password is different from current
    const samePassword = await compare(newPassword, user.passwordHash);
    if (samePassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from current password' },
        { status: 400 },
      );
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New password and confirmation do not match' },
        { status: 400 },
      );
    }

    // Validate password complexity
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'Password does not meet complexity requirements', details: validation.errors },
        { status: 400 },
      );
    }

    // Hash new password and update
    const newPasswordHash = await hash(newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Delete all other sessions (force re-login on other devices)
    const otherSessions = await db.session.findMany({
      where: {
        userId: user.id,
        id: { not: currentSession.id },
      },
      select: { token: true },
    });

    for (const s of otherSessions) {
      sessionCache.delete(s.token);
    }

    await db.session.deleteMany({
      where: {
        userId: user.id,
        id: { not: currentSession.id },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. All other sessions have been revoked.',
      data: { revokedSessions: otherSessions.length },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to change password';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
