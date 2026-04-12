import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync } from '@/lib/auth';

/**
 * Auth Middleware
 *
 * Protects all /api/* routes (except public auth endpoints) by validating the Bearer token.
 * Uses DB-backed sessions with in-memory cache for performance.
 *
 * Public routes (no auth required):
 * - /api/auth/login  — login endpoint
 *
 * Internal routes (X-PM-Cron-Secret header for server-to-server):
 * - /api/pm-schedules/check-due — PM cron job trigger
 */

const PUBLIC_PATHS = ['/api/auth/login'];
const INTERNAL_SECRET = process.env.PM_CRON_SECRET || 'eam-pm-cron-secret-2025';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only handle /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public auth endpoints
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow internal PM cron endpoint (authenticated via secret header)
  if (pathname === '/api/pm-schedules/check-due') {
    const cronSecret = request.headers.get('x-pm-cron-secret');
    if (cronSecret === INTERNAL_SECRET) {
      return NextResponse.next();
    }
    // If no secret header, fall through to normal auth check
  }

  // Check for Bearer token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Validate token via DB-backed session (with in-memory cache)
  const session = await getSessionAsync(token);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired session' },
      { status: 401 }
    );
  }

  // Token is valid — attach session info to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-session-user-id', session.userId);
  requestHeaders.set('x-session-roles', session.roles.join(','));
  requestHeaders.set('x-session-permissions', session.permissions.join(','));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};
