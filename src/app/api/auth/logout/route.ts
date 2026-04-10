import { NextRequest, NextResponse } from 'next/server';
import { sessions } from './route';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      sessions.delete(token);
    }

    return NextResponse.json({ success: true, data: { message: 'Logged out' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
  }
}
