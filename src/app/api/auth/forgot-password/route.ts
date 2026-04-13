import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username or email is required' },
        { status: 400 }
      );
    }

    const input = username.trim().toLowerCase();

    // Find user by username or email
    const user = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: input, mode: 'insensitive' } },
          { email: { equals: input, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      // Don't reveal whether the user exists — always return success for security
      console.log(`[Forgot Password] No user found for: ${username}`);
      return NextResponse.json({
        success: true,
        message: 'If an account exists, reset instructions have been sent',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in user record
    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    // Log the reset URL for demo purposes (in production, send via email)
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    console.log(`[Forgot Password] Reset URL for ${user.username} (${user.email}): ${resetUrl}`);
    console.log(`[Forgot Password] Token: ${resetToken}`);

    return NextResponse.json({
      success: true,
      message: 'If an account exists, reset instructions have been sent',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
