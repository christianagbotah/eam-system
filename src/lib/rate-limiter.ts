// ============================================================================
// RATE LIMITING — In-memory sliding window with per-user/IP, burst, and headers
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('rateLimiter');

// ── Types ───────────────────────────────────────────────────────────────────

interface RateLimitConfig {
  /** Maximum requests in the window (default: varies by tier). */
  maxRequests: number;
  /** Window duration in milliseconds (default: 60_000). */
  windowMs?: number;
  /** Allow short burst above limit before throttling (default: 0). */
  burstAllowance?: number;
  /** Burst window in ms — how long burst is tracked (default: 5000). */
  burstWindowMs?: number;
  /** Unique identifier for this limit tier (e.g., 'auth', 'api', 'search'). */
  tier?: string;
}

interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
  retryAfterMs: number;
}

interface RateLimitEntry {
  /** Timestamps of requests within the main sliding window. */
  timestamps: number[];
  /** Timestamps of requests within the burst sub-window. */
  burstTimestamps: number[];
}

interface RateLimitMetrics {
  tier: string;
  totalRequests: number;
  totalBlocked: number;
  activeKeys: number;
  topBlockedKeys: Array<{ key: string; blockedCount: number }>;
}

// ── Preset Tiers ────────────────────────────────────────────────────────────

/** Auth endpoints: login, logout, register — strictest limits. */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000,      // 5 per minute
  burstAllowance: 3,         // Allow 3 extra in burst
  burstWindowMs: 5 * 1000,   // burst window: 5 seconds
  tier: 'auth',
};

/** General API endpoints: standard CRUD operations. */
export const API_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000,      // 100 per minute
  burstAllowance: 20,        // Allow 20 extra in burst
  burstWindowMs: 5 * 1000,   // burst window: 5 seconds
  tier: 'api',
};

/** Search endpoints: resource-intensive queries. */
export const SEARCH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60 * 1000,      // 30 per minute
  burstAllowance: 10,        // Allow 10 extra in burst
  burstWindowMs: 5 * 1000,   // burst window: 5 seconds
  tier: 'search',
};

/** Upload endpoints: file upload operations. */
export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000,      // 10 per minute
  burstAllowance: 2,
  burstWindowMs: 5 * 1000,
  tier: 'upload',
};

/** WebSocket events: per-connection rate limiting. */
export const WS_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60 * 1000,      // 60 per minute
  burstAllowance: 15,
  burstWindowMs: 3 * 1000,
  tier: 'ws',
};

// ── In-Memory Store ─────────────────────────────────────────────────────────

const globalForRateLimit = globalThis as unknown as {
  _rlStore: Map<string, RateLimitEntry> | undefined;
  _rlMetrics: Map<string, { totalRequests: number; totalBlocked: number; blockedByIp: Map<string, number> }> | undefined;
};

if (!globalForRateLimit._rlStore) {
  globalForRateLimit._rlStore = new Map();
}
if (!globalForRateLimit._rlMetrics) {
  globalForRateLimit._rlMetrics = new Map();
}

const rlStore = globalForRateLimit._rlStore;
const rlMetrics = globalForRateLimit._rlMetrics;

// ── Auto-cleanup ────────────────────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rlStore.entries()) {
    entry.timestamps = entry.timestamps.filter(ts => now - ts < 3600_000);
    entry.burstTimestamps = entry.burstTimestamps.filter(ts => now - ts < 30_000);
    if (entry.timestamps.length === 0 && entry.burstTimestamps.length === 0) {
      rlStore.delete(key);
    }
  }
}, 60 * 1000); // every minute

// ── Core Rate Limiting Logic ────────────────────────────────────────────────

/**
 * Check rate limit for a given key.
 * Returns result with remaining count, limit, and reset time.
 */
function checkLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitCheckResult {
  const now = Date.now();
  const windowMs = config.windowMs ?? 60_000;
  const burstAllowance = config.burstAllowance ?? 0;
  const burstWindowMs = config.burstWindowMs ?? 5_000;
  const maxRequests = config.maxRequests;
  const tier = config.tier ?? 'default';

  // Get or create entry
  let entry = rlStore.get(key);
  if (!entry) {
    entry = { timestamps: [], burstTimestamps: [] };
    rlStore.set(key, entry);
  }

  // Clean old timestamps outside main window
  const windowStart = now - windowMs;
  entry.timestamps = entry.timestamps.filter(ts => ts >= windowStart);

  // Clean old burst timestamps
  const burstStart = now - burstWindowMs;
  entry.burstTimestamps = entry.burstTimestamps.filter(ts => ts >= burstStart);

  const requestCountInWindow = entry.timestamps.length;
  const burstCountInWindow = entry.burstTimestamps.length;

  // Effective limit including burst
  const effectiveLimit = maxRequests + burstAllowance;
  const effectiveRemaining = Math.max(0, effectiveLimit - requestCountInWindow);

  // Check if over hard limit (no burst)
  const overHardLimit = requestCountInWindow >= maxRequests;
  const overBurstLimit = requestCountInWindow >= effectiveLimit;
  const inBurstZone = overHardLimit && !overBurstLimit;

  // Track metrics
  let metrics = rlMetrics.get(tier);
  if (!metrics) {
    metrics = { totalRequests: 0, totalBlocked: 0, blockedByIp: new Map() };
    rlMetrics.set(tier, metrics);
  }
  metrics.totalRequests++;

  if (overBurstLimit) {
    // Hard block
    metrics.totalBlocked++;
    const blockedByIp = metrics.blockedByIp;
    blockedByIp.set(key, (blockedByIp.get(key) ?? 0) + 1);

    // Calculate retry after
    const oldestInWindow = entry.timestamps[0];
    const retryAfter = oldestInWindow
      ? oldestInWindow + windowMs - now
      : windowMs;

    logger.warn('Rate limit exceeded (hard block)', {
      key,
      tier,
      requestCountInWindow,
      maxRequests,
      effectiveLimit,
      retryAfterMs: retryAfter,
    });

    return {
      allowed: false,
      remaining: 0,
      limit: maxRequests,
      resetMs: retryAfter,
      retryAfterMs: retryAfter,
    };
  }

  if (inBurstZone) {
    // In burst zone — allow but record in burst window
    // If burst window is also full, block
    if (burstCountInWindow >= burstAllowance) {
      metrics.totalBlocked++;
      const blockedByIp = metrics.blockedByIp;
      blockedByIp.set(key, (blockedByIp.get(key) ?? 0) + 1);

      const oldestBurst = entry.burstTimestamps[0];
      const retryAfter = oldestBurst
        ? oldestBurst + burstWindowMs - now
        : burstWindowMs;

      logger.warn('Rate limit burst exhausted', {
        key,
        tier,
        requestCountInWindow,
        burstCountInWindow,
        burstAllowance,
        retryAfterMs: retryAfter,
      });

      return {
        allowed: false,
        remaining: 0,
        limit: maxRequests,
        resetMs: retryAfter,
        retryAfterMs: retryAfter,
      };
    }

    // Allow burst request
    entry.burstTimestamps.push(now);
  }

  // Record the request in the main window
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: effectiveRemaining - 1,
    limit: maxRequests,
    resetMs: windowMs,
    retryAfterMs: 0,
  };
}

// ── Next.js API Route Middleware ─────────────────────────────────────────────

/**
 * Create a rate limiting middleware for Next.js API routes.
 *
 * Usage in a route handler:
 * ```ts
 * import { rateLimit, API_RATE_LIMIT } from '@/lib/rate-limiter';
 *
 * const limiter = rateLimit(API_RATE_LIMIT);
 *
 * export async function GET(request: NextRequest) {
 *   const rlResult = limiter(request);
 *   if (!rlResult.allowed) {
 *     return rlResult.response;
 *   }
 *   // ... handle request
 * }
 * ```
 */
export function rateLimit(config: RateLimitConfig = API_RATE_LIMIT) {
  return function checkRateLimit(request: NextRequest): RateLimitCheckResult & { response?: NextResponse } {
    const result = checkRateLimit(resolveKey(request), config);

    if (!result.allowed) {
      return {
        ...result,
        response: NextResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please slow down.',
              details: {
                retryAfterMs: result.retryAfterMs,
                retryAfterSec: Math.ceil(result.retryAfterMs / 1000),
              },
            },
          },
          {
            status: 429,
            headers: buildRateLimitHeaders(result, config),
          },
        ),
      };
    }

    return result;
  };
}

/**
 * Apply rate limit and return headers for an already-handled response.
 * Use this when you want to add rate limit headers to a successful response.
 */
export function getRateLimitHeaders(
  request: NextRequest,
  config: RateLimitConfig = API_RATE_LIMIT,
): Record<string, string> {
  const result = checkLimit(resolveKey(request), config);
  return buildRateLimitHeaders(result, config);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve a rate limit key from the request (user ID or IP). */
function resolveKey(request: NextRequest): string {
  // Try to get user ID from auth header (for per-user limiting)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    // Use token as key — different from actual session validation
    // since we want rate limiting even before session lookup
    if (token && token.length > 8) {
      return `user:${token.slice(0, 16)}`;
    }
  }

  // Fallback to IP address (per-IP limiting)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return `ip:${ip}`;
}

/** Build standard rate limit response headers. */
function buildRateLimitHeaders(
  result: RateLimitCheckResult,
  config: RateLimitConfig,
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
    ...(result.retryAfterMs > 0
      ? { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) }
      : {}),
  };
}

// ── Metrics ─────────────────────────────────────────────────────────────────

/**
 * Get rate limiting metrics for monitoring.
 * Returns per-tier breakdown of total requests, blocks, and top offenders.
 */
export function getRateLimitMetrics(): RateLimitMetrics[] {
  const metrics: RateLimitMetrics[] = [];

  for (const [tier, data] of rlMetrics.entries()) {
    // Get top blocked keys
    const sortedBlocked = [...data.blockedByIp.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, blockedCount]) => ({ key, blockedCount }));

    metrics.push({
      tier,
      totalRequests: data.totalRequests,
      totalBlocked: data.totalBlocked,
      activeKeys: rlStore.size,
      topBlockedKeys: sortedBlocked,
    });
  }

  return metrics;
}

/**
 * Reset rate limit for a specific key (e.g., after successful auth).
 */
export function resetRateLimitKey(key: string): void {
  rlStore.delete(key);
}

/**
 * Reset rate limit for a request (by user or IP).
 */
export function resetRateLimitForRequest(request: NextRequest): void {
  const key = resolveKey(request);
  rlStore.delete(key);
}
