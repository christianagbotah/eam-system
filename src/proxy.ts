import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync } from '@/lib/auth';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

const INTERNAL_SECRET = process.env.PM_CRON_SECRET || 'eam-pm-cron-secret-2025';

// Rate limiting configuration
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// SECURITY HEADERS — applied to ALL responses
// ============================================================================

const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ============================================================================
// CORS HEADERS — applied to API responses only
// ============================================================================

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ============================================================================
// RATE LIMITING — in-memory store using globalThis (survives hot reloads)
// ============================================================================

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

const globalForRateLimit = globalThis as unknown as {
  rateLimitStore: Map<string, RateLimitEntry> | undefined;
  _rateLimitCleanupTimer: ReturnType<typeof setInterval> | undefined;
};

if (!globalForRateLimit.rateLimitStore) {
  globalForRateLimit.rateLimitStore = new Map();
}

const rateLimitStore = globalForRateLimit.rateLimitStore;

// Periodically clean up expired rate limit entries (every 5 minutes)
if (!globalForRateLimit._rateLimitCleanupTimer) {
  globalForRateLimit._rateLimitCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  // Allow the process to exit without waiting for this timer
  if (globalForRateLimit._rateLimitCleanupTimer.unref) {
    globalForRateLimit._rateLimitCleanupTimer.unref();
  }
}

/**
 * Check and update rate limit for a given IP on auth endpoints.
 * Returns `null` if the request is allowed, or a NextResponse with 429 if rate limited.
 */
function checkRateLimit(ip: string): NextResponse | null {
  const now = Date.now();
  let entry = rateLimitStore.get(ip);

  // If no entry or window has expired, start a fresh window
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { attempts: 1, windowStart: now });
    return null;
  }

  // Increment attempt count
  entry.attempts += 1;

  if (entry.attempts > RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000
    );

    const response = NextResponse.json(
      {
        success: false,
        error: 'Too many login attempts. Please try again later.',
      },
      { status: 429 }
    );
    applyHeaders(response, true);
    response.headers.set('Retry-After', String(retryAfterSeconds));
    return response;
  }

  return null;
}

/**
 * Reset the rate limit counter for an IP.
 * Can be called from route handlers after a successful login.
 */
export function resetRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determine if a request pathname is a public auth endpoint.
 */
function isPublicAuthEndpoint(pathname: string): boolean {
  // Any route starting with /api/auth/ is public
  if (pathname.startsWith('/api/auth/')) {
    return true;
  }
  return false;
}

/**
 * Check if a route is an auth endpoint that should be rate-limited.
 */
function isRateLimitedEndpoint(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Extract client IP from request headers (works behind proxies).
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

/**
 * Apply security and CORS headers to a response.
 */
function applyHeaders(response: NextResponse, isApi: boolean): NextResponse {
  // Security headers on all responses
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // CORS headers only on API routes
  if (isApi) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

/**
 * Create a JSON response with all standard headers applied.
 */
function jsonResponse(data: unknown, status: number, isApi: boolean): NextResponse {
  return applyHeaders(NextResponse.json(data, { status }), isApi);
}

// ============================================================================
// PROXY — Next.js 16 replacement for middleware
// ============================================================================

/**
 * Auth & Plant-Scoping Proxy (Next.js 16 convention)
 *
 * Next.js 16 replaces the "middleware" file convention with "proxy".
 * This file is placed at src/proxy.ts and exports a named `proxy` function.
 *
 * Features:
 * - API Route Auth Guard: Validates Bearer token on protected /api/* routes
 * - Security Headers: Applied to all responses
 * - CORS Headers: Applied to API responses with preflight handling
 * - Rate Limiting: In-memory rate limiting on auth endpoints
 * - Plant Scoping: Passes plant context via headers for downstream handlers
 *
 * Public routes (no auth required):
 * - /api/auth/login              — login endpoint
 * - /api/auth/register           — register endpoint
 * - /api/auth/forgot-password    — forgot password endpoint
 * - /api/auth/reset-password     — reset password endpoint
 * - Any route starting with /api/auth/
 *
 * Internal routes (X-PM-Cron-Secret header for server-to-server):
 * - /api/pm-schedules/check-due — PM cron job trigger
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // ------------------------------------------------------------------
  // 1. CORS preflight handling for API routes
  // ------------------------------------------------------------------
  if (isApi && request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return applyHeaders(response, true);
  }

  // ------------------------------------------------------------------
  // 2. API route processing
  // ------------------------------------------------------------------
  if (isApi) {
    const isPublic = isPublicAuthEndpoint(pathname);

    // --- Rate limiting on auth endpoints (POST only) ---
    if (isRateLimitedEndpoint(pathname) && request.method === 'POST') {
      const ip = getClientIp(request);
      const rateLimitResponse = checkRateLimit(ip);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    // --- Allow public auth endpoints ---
    if (isPublic) {
      return applyHeaders(NextResponse.next(), true);
    }

    // --- Allow internal PM cron endpoint (authenticated via secret header) ---
    if (pathname === '/api/pm-schedules/check-due') {
      const cronSecret = request.headers.get('x-pm-cron-secret');
      if (cronSecret === INTERNAL_SECRET) {
        return applyHeaders(NextResponse.next(), true);
      }
      // If no valid secret header, fall through to normal auth check
    }

    // --- Auth check for protected API routes ---
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return jsonResponse(
        { success: false, error: 'Authentication required' },
        401,
        true
      );
    }

    const session = await getSessionAsync(token);

    if (!session) {
      return jsonResponse(
        { success: false, error: 'Invalid or expired session' },
        401,
        true
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

    return applyHeaders(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      true
    );
  }

  // ------------------------------------------------------------------
  // 3. Non-API routes: apply security headers and continue
  // ------------------------------------------------------------------
  return applyHeaders(NextResponse.next(), false);
}

// NOTE: Proxy always runs on Node.js runtime — no need to export runtime config

export const config = {
  // Match all routes: API routes for auth/CORS/rate-limiting, all others for security headers
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
