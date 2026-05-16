import { NextResponse } from 'next/server';

// ============================================================================
// ENTERPRISE ERROR HANDLING — structured error classes with HTTP status mapping
// ============================================================================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'NOT_FOUND', `${resource} with id '${id}' not found`);
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', 'Validation failed', { fields });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

export class ConflictError extends AppError {
  constructor(resource: string, field: string, value: string) {
    super(409, 'CONFLICT', `${resource} with ${field}='${value}' already exists`);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'RATE_LIMITED', 'Too many requests', { retryAfter });
  }
}

// Global error handler for API routes — returns structured JSON response
export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.statusCode }
    );
  }
  console.error('[UNHANDLED_ERROR]', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 }
  );
}
