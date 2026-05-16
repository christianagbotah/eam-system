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
