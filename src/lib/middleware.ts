// ============================================================================
// CENTRALIZED API MIDDLEWARE — auth, permissions, rate limiting, pagination
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import type { SessionData } from '@/lib/auth';
import { RateLimitError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

// Auth middleware — throws if no session
export async function requireAuth(request: NextRequest): Promise<SessionData> {
  const session = getSession(request);
  if (!session) throw new UnauthorizedError();
  return session;
}

// Permission middleware — throws if session lacks required permission
export async function requirePermission(request: NextRequest, permission: string): Promise<SessionData> {
  const session = await requireAuth(request);
  if (!isAdmin(session) && !hasPermission(session, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return session;
}

// Rate limiter (in-memory, per-user)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number = 60000) {
  return function checkRateLimit(session: { userId: string }): void {
    const key = session.userId;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new RateLimitError(retryAfter);
    }
  };
}

// Pagination helper — parses and validates page/limit from URLSearchParams
export function parsePagination(searchParams: URLSearchParams) {
  let page = parseInt(searchParams.get('page') || '1', 10);
  let limit = parseInt(searchParams.get('limit') || '20', 10);
  page = Math.max(1, isNaN(page) ? 1 : page);
  limit = Math.min(100, Math.max(1, isNaN(limit) ? 20 : limit));
  return { page, limit, skip: (page - 1) * limit };
}

// Search helper — builds Prisma OR filter from search term across given fields
export function parseSearch(searchParams: URLSearchParams, fields: string[]) {
  const search = searchParams.get('search')?.trim();
  if (!search) return {};
  return {
    OR: fields.map(field => ({
      [field]: { contains: search, mode: 'insensitive' as const }
    }))
  };
}

// Response helpers — standard paginated response envelope
export function paginatedResponse(data: unknown[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  };
}
