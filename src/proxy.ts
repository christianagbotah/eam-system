import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync } from '@/lib/auth';

/**
 * Auth & Plant-Scoping Proxy (Next.js 16 convention)
 *
 * Next.js 16 replaces the "middleware" file convention with "proxy".
 * This file is placed at src/proxy.ts and exports a named `proxy` function
 * instead of the legacy `middleware` function.
 *
 * Protects all /api/* routes (except public auth endpoints) by validating the Bearer token.
 * Enforces multi-plant data isolation via X-Plant-ID header.
 *
 * Public routes (no auth required):
 * - /api/auth/login              — login endpoint
 * - /api/auth/forgot-password    — forgot password endpoint
 * - /api/auth/reset-password     — reset password endpoint
 *
 * Internal routes (X-PM-Cron-Secret header for server-to-server):
 * - /api/pm-schedules/check-due — PM cron job trigger
 */

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];
const INTERNAL_SECRET = process.env.PM_CRON_SECRET || 'eam-pm-cron-secret-2025';

export async function proxy(request: NextRequest) {
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

  // Token is valid — attach session info + plant context to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-session-user-id', session.userId);
  requestHeaders.set('x-session-roles', session.roles.join(','));
  requestHeaders.set('x-session-permissions', session.permissions.join(','));
  requestHeaders.set('x-user-plant-id', '');

  // Pass through X-Plant-ID as x-user-plant-id for downstream route handler convenience.
  // NOTE: Route handlers MUST use getPlantScope() from @/lib/plant-scope for actual
  // plant access validation. This passthrough is for informational purposes only and
  // does NOT guarantee the user has access to the specified plant.
  const plantIdHeader = request.headers.get('X-Plant-ID');
  if (plantIdHeader) {
    requestHeaders.set('x-user-plant-id', plantIdHeader);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// NOTE: Proxy always runs on Node.js runtime — no need to export runtime config

export const config = {
  matcher: ['/api/:path*'],
};
