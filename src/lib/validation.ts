// ============================================================================
// CENTRALIZED VALIDATION HELPERS
// ============================================================================

/**
 * Validates that all required fields are present in the request body.
 * Returns a map of field → error message if any are missing, or null if all present.
 */
export function requireFields(body: Record<string, unknown>, fields: string[]): Record<string, string> | null {
  const missing: Record<string, string> = {};
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing[field] = `${field} is required`;
    }
  }
  return Object.keys(missing).length > 0 ? missing : null;
}

/**
 * Validates that a value is one of the allowed enum options.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateEnum(value: string, allowed: string[], fieldName: string): string | null {
  if (!allowed.includes(value)) return `${fieldName} must be one of: ${allowed.join(', ')}`;
  return null;
}

/**
 * Validates that a numeric value falls within the specified range.
 * Returns an error message string if out of range, or null if valid.
 */
export function validateRange(value: number, min: number, max: number, fieldName: string): string | null {
  if (value < min || value > max) return `${fieldName} must be between ${min} and ${max}`;
  return null;
}

/**
 * Sanitizes a string by trimming whitespace and enforcing a maximum length.
 */
export function sanitizeString(value: string, maxLength: number = 255): string {
  return value.trim().slice(0, maxLength);
}

/**
 * Safely parses a JSON string, returning a fallback value on failure.
 */
export function parseJsonSafe<T = unknown>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ============================================================================
// ADDITIONAL VALIDATION UTILITIES
// ============================================================================

/** Validate UUID format */
export function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/** Validate email format */
export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/** Validate phone number (E.164 format) */
export function isPhoneNumber(value: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(value.replace(/[\s\-()]/g, ''));
}

/** Sanitize string — remove potential XSS vectors (HTML entity escaping) */
export function escapeHtml(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Validate pagination parameters */
export function validatePagination(page: unknown, limit: unknown): { page: number; limit: number } {
  const p = typeof page === 'string' ? parseInt(page, 10) : (typeof page === 'number' ? page : 1);
  const l = typeof limit === 'string' ? parseInt(limit, 10) : (typeof limit === 'number' ? limit : 20);
  return {
    page: Math.max(1, isNaN(p) ? 1 : p),
    limit: Math.min(100, Math.max(1, isNaN(l) ? 20 : l)),
  };
}

/** Validate date range */
export function validateDateRange(from?: string, to?: string): { from?: Date; to?: Date; valid: boolean } {
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  if (fromDate && isNaN(fromDate.getTime())) return { valid: false };
  if (toDate && isNaN(toDate.getTime())) return { valid: false };
  if (fromDate && toDate && fromDate > toDate) return { valid: false };

  return { from: fromDate, to: toDate, valid: true };
}

/** Validate enum value (type guard) */
export function isEnumValue<T extends string>(value: unknown, validValues: readonly T[]): value is T {
  return typeof value === 'string' && validValues.includes(value as T);
}
