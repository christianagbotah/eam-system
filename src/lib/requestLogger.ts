import { createLogger } from '@/lib/logger';
import type { NextRequest } from 'next/server';

const logger = createLogger('api-request');

// Track slow requests
const SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds

/**
 * Log API request details — call at the start and end of each handler
 */
export function logRequestStart(request: NextRequest): { startTime: number; requestId: string } {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);

  logger.info(`${request.method} ${request.nextUrl.pathname}`, {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search,
  });

  return { startTime, requestId };
}

/**
 * Log API request completion
 */
export function logRequestEnd(
  request: NextRequest,
  startTime: number,
  requestId: string,
  statusCode: number,
  error?: unknown
): void {
  const duration = Date.now() - startTime;

  if (error) {
    logger.error(`${request.method} ${request.nextUrl.pathname} failed`, {
      requestId,
      statusCode,
      durationMs: duration,
      error: error instanceof Error ? error.message : String(error),
    });
  } else if (duration > SLOW_REQUEST_THRESHOLD) {
    logger.warn(`Slow request: ${request.method} ${request.nextUrl.pathname}`, {
      requestId,
      statusCode,
      durationMs: duration,
    });
  } else {
    logger.info(`${request.method} ${request.nextUrl.pathname} completed`, {
      requestId,
      statusCode,
      durationMs: duration,
    });
  }
}

/**
 * Wrap an API handler with request logging
 */
export function withRequestLogging(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<Response>
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<Response> => {
    const { startTime, requestId } = logRequestStart(request);
    try {
      const response = await handler(request, ...args);
      logRequestEnd(request, startTime, requestId, response.status);
      return response;
    } catch (error) {
      logRequestEnd(request, startTime, requestId, 500, error);
      throw error;
    }
  };
}
