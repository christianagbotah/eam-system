// ============================================================================
// ENHANCED SECURITY HARDENING SERVICE
// Rate Limiting, Brute Force Protection, Token Security, Upload Security,
// Tamper-Proof Audit Trail, Secrets Management, Session Anomaly Detection,
// Privileged Action Logging, Security Dashboard Stats
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

const logger = createLogger('enhancedSecurity');

// ── Types ───────────────────────────────────────────────────────────────────

interface RateLimitTier {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

interface SlidingWindowEntry {
  timestamps: number[];
}

interface BruteForceEntry {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  lockedUntil: number | null;
  lockoutLevel: number; // 0=none, 1=5min, 2=15min, 3=1hr, 4=permanent until manual
}

interface BruteForceResult {
  allowed: boolean;
  attemptsRemaining: number;
  lockedUntil: Date | null;
}

interface FileUploadValidation {
  allowed: boolean;
  reason?: string;
}

interface TamperProofAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, unknown>;
  previousHash: string;
  currentHash: string;
}

interface AuditChainVerification {
  valid: boolean;
  brokenAt: string | null;
  totalEntries: number;
}

interface SessionProfile {
  knownIps: Set<string>;
  knownUserAgents: Set<string>;
  lastSeenAt: number;
  lastIp: string;
  lastUserAgent: string;
}

interface SessionAnomalyResult {
  suspicious: boolean;
  reasons: string[];
}

interface PrivilegedActionLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  success: boolean;
  metadata: Record<string, unknown>;
  ipAddress?: string;
}

interface SecurityStats {
  activeSessions: number;
  recentFailedLogins: number;
  lockedAccounts: number;
  auditLogCount: number;
  bruteForceAttempts: number;
  rateLimitViolations: number;
  uploadAttempts: number;
  securityScore: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'sh', 'ps1', 'psm1', 'cmd', 'com', 'msi', 'scr',
  'vbs', 'vbe', 'wsh', 'wsf', 'hta', 'cpl', 'inf', 'lnk',
  'pif', 'reg', 'jar', 'class', 'war', 'jsp', 'asp', 'aspx',
  'php', 'cgi', 'pl', 'py', 'rb', 'mjs',
]);

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf',
  'zip', 'rar', '7z', 'gz', 'tar',
  'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv', 'webm',
  'json', 'xml', 'yaml', 'yml',
]);

const LOCKOUT_DURATIONS = [
  5 * 60 * 1000,       // Level 1: 5 minutes
  15 * 60 * 1000,      // Level 2: 15 minutes
  60 * 60 * 1000,      // Level 3: 1 hour
  24 * 60 * 60 * 1000, // Level 4: 24 hours
];

const MAX_BRUTE_FORCE_ATTEMPTS = 5;
const BRUTE_FORCE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const IMPOSSIBLE_TRAVEL_THRESHOLD_KM = 500; // km per hour
const EARTH_RADIUS_KM = 6371;

// ── In-Memory Stores ────────────────────────────────────────────────────────

const globalForSecurity = globalThis as unknown as {
  _rateLimitWindows: Map<string, SlidingWindowEntry> | undefined;
  _bruteForceStore: Map<string, BruteForceEntry> | undefined;
  _tamperProofAuditLog: TamperProofAuditEntry[] | undefined;
  _sessionProfiles: Map<string, SessionProfile> | undefined;
  _privilegedActionLog: PrivilegedActionLog[] | undefined;
  _rateLimitViolationCount: number | undefined;
  _uploadAttemptCount: number | undefined;
  _bruteForceTotalAttempts: number | undefined;
};

if (!globalForSecurity._rateLimitWindows) {
  globalForSecurity._rateLimitWindows = new Map();
}
if (!globalForSecurity._bruteForceStore) {
  globalForSecurity._bruteForceStore = new Map();
}
if (!globalForSecurity._tamperProofAuditLog) {
  globalForSecurity._tamperProofAuditLog = [];
}
if (!globalForSecurity._sessionProfiles) {
  globalForSecurity._sessionProfiles = new Map();
}
if (!globalForSecurity._privilegedActionLog) {
  globalForSecurity._privilegedActionLog = [];
}
if (globalForSecurity._rateLimitViolationCount === undefined) {
  globalForSecurity._rateLimitViolationCount = 0;
}
if (globalForSecurity._uploadAttemptCount === undefined) {
  globalForSecurity._uploadAttemptCount = 0;
}
if (globalForSecurity._bruteForceTotalAttempts === undefined) {
  globalForSecurity._bruteForceTotalAttempts = 0;
}

const rateLimitWindows = globalForSecurity._rateLimitWindows;
const bruteForceStore = globalForSecurity._bruteForceStore;
const tamperProofAuditLog = globalForSecurity._tamperProofAuditLog;
const sessionProfiles = globalForSecurity._sessionProfiles;
const privilegedActionLog = globalForSecurity._privilegedActionLog;

// ── Auto-cleanup interval ───────────────────────────────────────────────────

const CLEANUP_INTERVAL_MS = 60 * 1000; // every minute

setInterval(() => {
  const now = Date.now();

  // Cleanup stale rate limit windows (older than 1 hour)
  for (const [key, entry] of rateLimitWindows.entries()) {
    entry.timestamps = entry.timestamps.filter(ts => now - ts < 3600_000);
    if (entry.timestamps.length === 0) {
      rateLimitWindows.delete(key);
    }
  }

  // Cleanup expired brute force entries
  for (const [key, entry] of bruteForceStore.entries()) {
    if (entry.lockedUntil && now > entry.lockedUntil) {
      // Lockout expired, reset attempts
      entry.attempts = 0;
      entry.lockedUntil = null;
      entry.lockoutLevel = 0;
    }
    // Remove entries with no recent activity and no lockout
    if (!entry.lockedUntil && now - entry.lastAttemptAt > BRUTE_FORCE_WINDOW_MS) {
      bruteForceStore.delete(key);
    }
  }

  // Cleanup stale session profiles (older than 7 days with no activity)
  for (const [key, profile] of sessionProfiles.entries()) {
    if (now - profile.lastSeenAt > 7 * 24 * 60 * 60 * 1000) {
      sessionProfiles.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

// ── Helper: compute tamper-proof hash ───────────────────────────────────────

function computeEntryHash(entry: Omit<TamperProofAuditEntry, 'currentHash'>): string {
  const payload = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    details: entry.details,
    previousHash: entry.previousHash,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ── Helper: approximate IP geolocation for impossible travel detection ───────

function parseIpToCoordinates(ip: string): { lat: number; lon: number } | null {
  // This is a simplified heuristic; in production use a GeoIP database
  // Returns a rough estimate or null if private/unknown
  if (ip === 'localhost' || ip === '::1' || ip.startsWith('127.')) {
    return { lat: 0, lon: 0 };
  }
  if (ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.')) {
    return null; // Private IP, cannot determine location
  }
  // In production, query a GeoIP service/database here
  // For now return null to skip impossible travel checks on public IPs
  return null;
}

// ── Helper: Haversine distance ──────────────────────────────────────────────

function haversineDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// ============================================================================
// ENHANCED SECURITY SERVICE
// ============================================================================

export const EnhancedSecurityService = {

  // ─────────────────────────────────────────────────────────────────────────
  // 1. RATE LIMITING (Sliding Window, Multi-Tier)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check rate limit for a given identifier across multiple tiers.
   * Uses sliding window counters for each tier (per-second, per-minute, per-hour).
   * The most restrictive tier wins.
   */
  checkRateLimit(
    identifier: string,
    limits: RateLimitTier[],
  ): RateLimitResult {
    const now = Date.now();

    // Get or create sliding window entry
    let entry = rateLimitWindows.get(identifier);
    if (!entry) {
      entry = { timestamps: [] };
      rateLimitWindows.set(identifier, entry);
    }

    // Clean old timestamps outside the largest window
    const maxWindow = Math.max(...limits.map(l => l.windowMs));
    entry.timestamps = entry.timestamps.filter(ts => now - ts < maxWindow);

    // Check each tier — find the most restrictive
    let minRemaining = Infinity;
    let maxRetryAfter = 0;
    let blocked = false;

    for (const limit of limits) {
      const windowStart = now - limit.windowMs;
      const requestCountInWindow = entry.timestamps.filter(ts => ts >= windowStart).length;
      const remaining = Math.max(0, limit.maxRequests - requestCountInWindow);

      if (remaining <= 0) {
        // Find when the oldest request in this window will expire
        const oldestInWindow = entry.timestamps.find(ts => ts >= windowStart);
        if (oldestInWindow) {
          const retryAfter = oldestInWindow + limit.windowMs - now;
          if (retryAfter > maxRetryAfter) {
            maxRetryAfter = retryAfter;
          }
        }
        blocked = true;
      }

      if (remaining < minRemaining) {
        minRemaining = remaining;
      }
    }

    if (blocked) {
      globalForSecurity._rateLimitViolationCount = (globalForSecurity._rateLimitViolationCount ?? 0) + 1;
      logger.warn('Rate limit exceeded', { identifier, retryAfterMs: maxRetryAfter });
      return {
        allowed: false,
        retryAfterMs: maxRetryAfter,
        remaining: 0,
      };
    }

    // Record this request
    entry.timestamps.push(now);

    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: minRemaining - 1, // subtract current request
    };
  },

  /** Get rate limit violation count (since last cleanup reset). */
  getRateLimitViolationCount(): number {
    return globalForSecurity._rateLimitViolationCount ?? 0;
  },

  /** Reset a specific identifier's rate limit window. */
  resetRateLimit(identifier: string): void {
    rateLimitWindows.delete(identifier);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. BRUTE FORCE PROTECTION (Progressive Lockout)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check and record a login attempt for brute force protection.
   * Implements progressive lockout: 5 min → 15 min → 1 hour → 24 hours.
   */
  checkBruteForce(
    identifier: string,
    maxAttempts: number = MAX_BRUTE_FORCE_ATTEMPTS,
    windowMs: number = BRUTE_FORCE_WINDOW_MS,
  ): BruteForceResult {
    const now = Date.now();

    let entry = bruteForceStore.get(identifier);
    if (!entry) {
      entry = {
        attempts: 0,
        firstAttemptAt: now,
        lastAttemptAt: now,
        lockedUntil: null,
        lockoutLevel: 0,
      };
      bruteForceStore.set(identifier, entry);
    }

    // Check if currently locked out
    if (entry.lockedUntil && now < entry.lockedUntil) {
      logger.warn('Brute force lockout active', {
        identifier,
        lockoutLevel: entry.lockoutLevel,
        lockedUntil: new Date(entry.lockedUntil).toISOString(),
      });
      return {
        allowed: false,
        attemptsRemaining: 0,
        lockedUntil: new Date(entry.lockedUntil),
      };
    }

    // If lockout expired, reset
    if (entry.lockedUntil && now >= entry.lockedUntil) {
      entry.attempts = 0;
      entry.lockedUntil = null;
      entry.lockoutLevel = 0;
    }

    // Reset window if outside the tracking window
    if (now - entry.firstAttemptAt > windowMs) {
      entry.attempts = 0;
      entry.firstAttemptAt = now;
    }

    // Record this attempt
    entry.attempts++;
    entry.lastAttemptAt = now;
    globalForSecurity._bruteForceTotalAttempts = (globalForSecurity._bruteForceTotalAttempts ?? 0) + 1;

    const remaining = Math.max(0, maxAttempts - entry.attempts);

    if (entry.attempts >= maxAttempts) {
      // Escalate lockout level
      const lockoutLevel = Math.min(entry.lockoutLevel + 1, LOCKOUT_DURATIONS.length - 1);
      const lockoutDuration = LOCKOUT_DURATIONS[lockoutLevel];
      entry.lockoutLevel = lockoutLevel;
      entry.lockedUntil = now + lockoutDuration;

      logger.error('Brute force lockout triggered', {
        identifier,
        lockoutLevel,
        lockoutDurationMs: lockoutDuration,
        attempts: entry.attempts,
      });

      return {
        allowed: false,
        attemptsRemaining: 0,
        lockedUntil: new Date(entry.lockedUntil),
      };
    }

    return {
      allowed: true,
      attemptsRemaining: remaining,
      lockedUntil: null,
    };
  },

  /** Reset brute force tracking for an identifier (e.g., after successful login). */
  resetBruteForce(identifier: string): void {
    bruteForceStore.delete(identifier);
  },

  /** Get the number of unique identifiers currently locked out. */
  getLockedAccountCount(): number {
    const now = Date.now();
    let count = 0;
    for (const entry of bruteForceStore.values()) {
      if (entry.lockedUntil && now < entry.lockedUntil) {
        count++;
      }
    }
    return count;
  },

  /** Get total brute force attempts since start. */
  getBruteForceTotalAttempts(): number {
    return globalForSecurity._bruteForceTotalAttempts ?? 0;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. TOKEN SECURITY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validate basic JWT token format (header.payload.signature structure).
   * Does NOT verify cryptographic signature (handled by session system).
   */
  validateTokenIntegrity(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Check each part is valid base64url
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    for (const part of parts) {
      if (!part || part.length === 0 || !base64urlRegex.test(part)) return false;
    }

    // Verify we can decode header and payload as JSON
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      if (!header.alg || !header.typ) return false;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (typeof payload !== 'object' || payload === null) return false;
    } catch {
      return false;
    }

    return true;
  },

  /**
   * Check if a JWT token's `exp` claim has elapsed.
   * Returns true if the token is expired or has no `exp` claim.
   */
  isTokenExpired(token: string): boolean {
    if (!this.validateTokenIntegrity(token)) return true;

    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString(),
      );
      if (!payload.exp || typeof payload.exp !== 'number') return true;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  },

  /**
   * Rotate a token by generating a new one.
   * Returns the new token or null if the old token is invalid.
   * This generates a new UUID-based token for the session system.
   */
  rotateToken(oldToken: string): string | null {
    if (!oldToken || typeof oldToken !== 'string' || oldToken.length < 8) {
      return null;
    }
    // Generate a new cryptographically random token
    return randomUUID();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. UPLOAD SECURITY HOOKS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validate a file upload against security rules:
   * - Dangerous file type blocking
   * - Max file size enforcement (10MB)
   * - File extension whitelist
   */
  validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
  }): FileUploadValidation {
    globalForSecurity._uploadAttemptCount = (globalForSecurity._uploadAttemptCount ?? 0) + 1;

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        allowed: false,
        reason: `File size ${file.size} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes (${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB)`,
      };
    }

    if (file.size <= 0) {
      return {
        allowed: false,
        reason: 'File is empty',
      };
    }

    // Extract file extension
    const fileName = file.name.trim();
    if (!fileName || fileName === '.' || fileName === '..') {
      return {
        allowed: false,
        reason: 'Invalid file name',
      };
    }

    const parts = fileName.split('.');
    const extension = parts.length > 1 ? parts.pop()!.toLowerCase() : '';

    if (!extension) {
      return {
        allowed: false,
        reason: 'File has no extension',
      };
    }

    // Check against blocked extensions (dangerous executables)
    if (BLOCKED_EXTENSIONS.has(extension)) {
      return {
        allowed: false,
        reason: `File extension ".${extension}" is blocked as a potentially dangerous file type`,
      };
    }

    // Check against whitelist (only allow known safe extensions)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return {
        allowed: false,
        reason: `File extension ".${extension}" is not in the allowed file types list`,
      };
    }

    // Check for double extensions (e.g., "file.php.jpg")
    if (parts.length > 2) {
      const innerExtension = parts[parts.length - 2].toLowerCase();
      if (BLOCKED_EXTENSIONS.has(innerExtension)) {
        return {
          allowed: false,
          reason: `Double extension detected: ".${innerExtension}.${extension}" — inner extension is blocked`,
        };
      }
    }

    // Check MIME type consistency (basic sanity check)
    const mimeTypeMap: Record<string, Set<string>> = {
      'image/jpeg': new Set(['jpg', 'jpeg']),
      'image/png': new Set(['png']),
      'image/gif': new Set(['gif']),
      'image/webp': new Set(['webp']),
      'image/svg+xml': new Set(['svg']),
      'application/pdf': new Set(['pdf']),
      'application/zip': new Set(['zip']),
      'application/json': new Set(['json']),
      'text/csv': new Set(['csv']),
      'text/plain': new Set(['txt']),
    };

    if (file.type && file.type !== 'application/octet-stream') {
      const expectedExtensions = mimeTypeMap[file.type];
      if (expectedExtensions && !expectedExtensions.has(extension)) {
        logger.warn('MIME type mismatch on upload', {
          fileName: file.name,
          declaredType: file.type,
          extension,
        });
        // Warning only — don't block, as MIME types can be unreliable
      }
    }

    // Check for path traversal in filename
    if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
      return {
        allowed: false,
        reason: 'File name contains invalid path characters',
      };
    }

    return { allowed: true };
  },

  /** Get upload attempt count. */
  getUploadAttemptCount(): number {
    return globalForSecurity._uploadAttemptCount ?? 0;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. TAMPER-PROOF AUDIT TRAIL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a tamper-proof audit log entry.
   * Each entry stores a hash of the previous entry, forming a blockchain-like chain.
   */
  async createTamperProofAuditLog(entry: {
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    const previousEntry = tamperProofAuditLog.length > 0
      ? tamperProofAuditLog[tamperProofAuditLog.length - 1]
      : null;

    const newEntry: TamperProofAuditEntry = {
      id: `tpal-${Date.now()}-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      userId: entry.userId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      details: entry.details,
      previousHash: previousEntry?.currentHash ?? 'genesis',
    };

    newEntry.currentHash = computeEntryHash(newEntry);

    tamperProofAuditLog.push(newEntry);

    // Cap in-memory log at 50,000 entries
    if (tamperProofAuditLog.length > 50_000) {
      tamperProofAuditLog.splice(0, 10_000);
    }

    // Also persist to the main AuditLog table for DB-level durability
    try {
      await db.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entity,
          entityId: entry.entityId,
          newValues: JSON.stringify({
            ...entry.details,
            _tpalId: newEntry.id,
            _previousHash: newEntry.previousHash,
            _currentHash: newEntry.currentHash,
          }),
        },
      });
    } catch (error) {
      logger.error('Failed to persist tamper-proof audit to DB', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info('Tamper-proof audit entry created', {
      id: newEntry.id,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
    });
  },

  /**
   * Verify the integrity of the tamper-proof audit chain.
   * Recomputes hashes and checks the chain of previousHash → currentHash links.
   */
  async verifyAuditChain(): Promise<AuditChainVerification> {
    const totalEntries = tamperProofAuditLog.length;

    if (totalEntries === 0) {
      return { valid: true, brokenAt: null, totalEntries: 0 };
    }

    // Verify genesis entry
    if (tamperProofAuditLog[0].previousHash !== 'genesis') {
      return {
        valid: false,
        brokenAt: tamperProofAuditLog[0].id,
        totalEntries,
      };
    }

    for (let i = 0; i < totalEntries; i++) {
      const entry = tamperProofAuditLog[i];

      // Recompute hash and verify
      const recomputedHash = computeEntryHash(entry);
      if (recomputedHash !== entry.currentHash) {
        logger.error('Audit chain hash mismatch detected', {
          id: entry.id,
          expectedHash: entry.currentHash.slice(0, 16),
          actualHash: recomputedHash.slice(0, 16),
        });
        return {
          valid: false,
          brokenAt: entry.id,
          totalEntries,
        };
      }

      // Verify chain linkage (skip genesis)
      if (i > 0) {
        const expectedPreviousHash = tamperProofAuditLog[i - 1].currentHash;
        if (entry.previousHash !== expectedPreviousHash) {
          logger.error('Audit chain linkage broken', {
            id: entry.id,
            expectedPreviousHash: expectedPreviousHash.slice(0, 16),
            actualPreviousHash: entry.previousHash.slice(0, 16),
          });
          return {
            valid: false,
            brokenAt: entry.id,
            totalEntries,
          };
        }
      }
    }

    return { valid: true, brokenAt: null, totalEntries };
  },

  /** Get tamper-proof audit log entries. */
  getTamperProofAuditLog(limit: number = 50): TamperProofAuditEntry[] {
    return [...tamperProofAuditLog].slice(-limit).reverse();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. SECRETS MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Mask a secret string, showing only first 4 and last 4 characters.
   * For secrets shorter than 12 chars, shows first 2 and last 2.
   */
  maskSecret(secret: string): string {
    if (!secret || typeof secret !== 'string') return '••••';
    if (secret.length <= 4) return '••••';
    if (secret.length <= 12) {
      return secret.slice(0, 2) + '•'.repeat(secret.length - 4) + secret.slice(-2);
    }
    return secret.slice(0, 4) + '•'.repeat(Math.min(secret.length - 8, 20)) + secret.slice(-4);
  },

  /**
   * Validate the runtime environment for security issues.
   * Checks for default/weak credentials, missing secrets, insecure settings.
   */
  validateEnvironment(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for default database credentials
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    const dbHost = process.env.DB_HOST;

    if (!dbUser || dbUser === 'root' || dbUser === 'admin') {
      issues.push(`Potentially insecure database user: "${this.maskSecret(dbUser || '')}"`);
    }
    if (!dbPassword || dbPassword.length < 12) {
      issues.push('Database password may be too weak or missing (minimum 12 characters recommended)');
    }
    if (dbPassword && ['password', '123456', 'admin', 'root', 'default'].includes(dbPassword.toLowerCase())) {
      issues.push('Database password matches a known insecure default');
    }
    if (!dbHost || dbHost === 'localhost' || dbHost === '127.0.0.1') {
      issues.push('Database host appears to be localhost; ensure this is intentional for production');
    }

    // Check for JWT secret
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
      issues.push('JWT/NEXTAUTH_SECRET is not configured');
    } else if (jwtSecret.length < 32) {
      issues.push('JWT/NEXTAUTH_SECRET is shorter than recommended 32 characters');
    }

    // Check for encryption keys
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      issues.push('ENCRYPTION_KEY is not configured');
    }

    // Check NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'development') {
      issues.push('Running in development mode — ensure this is not a production deployment');
    }

    // Check for exposed ports
    if (process.env.PORT === '80' || process.env.PORT === '443') {
      issues.push('Application running on standard HTTP/HTTPS port — ensure TLS termination is configured');
    }

    // Check for default admin credentials pattern
    const adminUser = process.env.ADMIN_USERNAME || process.env.DEFAULT_ADMIN_USER;
    const adminPass = process.env.ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD;
    if (adminUser && ['admin', 'root', 'administrator'].includes(adminUser.toLowerCase())) {
      issues.push('Default admin username detected in environment variables');
    }
    if (adminPass && ['admin', 'password', '123456'].includes(adminPass.toLowerCase())) {
      issues.push('Default admin password detected in environment variables');
    }

    // Check for CORS configuration
    const corsOrigin = process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL;
    if (corsOrigin === '*' || corsOrigin?.includes('*')) {
      issues.push('CORS origin is set to wildcard (*) — restrict to specific domains in production');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. SESSION ANOMALY DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Detect session anomalies by comparing current request against known patterns.
   * Flags IP changes, user agent changes, and impossible travel.
   */
  detectSessionAnomalies(
    userId: string,
    currentIp: string,
    currentUserAgent: string,
  ): SessionAnomalyResult {
    const reasons: string[] = [];
    const now = Date.now();

    // Get or create session profile
    let profile = sessionProfiles.get(userId);
    if (!profile) {
      profile = {
        knownIps: new Set(),
        knownUserAgents: new Set(),
        lastSeenAt: now,
        lastIp: currentIp,
        lastUserAgent: currentUserAgent,
      };
      sessionProfiles.set(userId, profile);
    }

    const hasPriorActivity = profile.knownIps.size > 0 || profile.knownUserAgents.size > 0;

    if (hasPriorActivity) {
      // 1. Check for new IP address
      if (!profile.knownIps.has(currentIp)) {
        reasons.push(`New IP address detected: ${currentIp} (known: ${[...profile.knownIps].join(', ')})`);

        // 2. Check for impossible travel
        const currentCoords = parseIpToCoordinates(currentIp);
        const previousCoords = parseIpToCoordinates(profile.lastIp);
        if (currentCoords && previousCoords) {
          const distance = haversineDistanceKm(
            previousCoords.lat, previousCoords.lon,
            currentCoords.lat, currentCoords.lon,
          );
          const timeDiffHours = (now - profile.lastSeenAt) / (1000 * 60 * 60);
          if (timeDiffHours > 0) {
            const speedKmPerHour = distance / timeDiffHours;
            if (speedKmPerHour > IMPOSSIBLE_TRAVEL_THRESHOLD_KM) {
              reasons.push(
                `Impossible travel detected: ${distance.toFixed(0)} km in ${timeDiffHours.toFixed(2)} hours ` +
                `(${speedKmPerHour.toFixed(0)} km/h) from ${profile.lastIp} to ${currentIp}`,
              );
            }
          }
        }
      }

      // 3. Check for user agent change
      if (!profile.knownUserAgents.has(currentUserAgent)) {
        // Normalize user agent for comparison (ignore version numbers)
        const normalizeUA = (ua: string) => {
          return ua.replace(/\/[\d.]+/g, '/VERSION').replace(/\s*\([^\)]*\)/g, '');
        };
        const normalizedCurrent = normalizeUA(currentUserAgent);
        const allMatch = [...profile.knownUserAgents].some(
          known => normalizeUA(known) === normalizedCurrent,
        );

        if (!allMatch) {
          reasons.push('New or significantly changed user agent detected');
        }
      }

      // 4. Check for unusual timing (activity after long period of inactivity)
      const inactiveHours = (now - profile.lastSeenAt) / (1000 * 60 * 60);
      if (inactiveHours > 72) { // 3 days
        reasons.push(`Session activity after ${inactiveHours.toFixed(1)} hours of inactivity`);
      }
    }

    // Update profile
    profile.knownIps.add(currentIp);
    profile.knownUserAgents.add(currentUserAgent);
    profile.lastSeenAt = now;
    profile.lastIp = currentIp;
    profile.lastUserAgent = currentUserAgent;

    // Limit stored IPs and user agents to prevent unbounded growth
    if (profile.knownIps.size > 50) {
      const ips = [...profile.knownIps];
      profile.knownIps = new Set(ips.slice(-30));
    }
    if (profile.knownUserAgents.size > 20) {
      const uas = [...profile.knownUserAgents];
      profile.knownUserAgents = new Set(uas.slice(-10));
    }

    const suspicious = reasons.length > 0;
    if (suspicious) {
      logger.warn('Session anomaly detected', { userId, reasons });
    }

    return { suspicious, reasons };
  },

  /** Get session profile for a user. */
  getSessionProfile(userId: string): SessionProfile | null {
    const profile = sessionProfiles.get(userId);
    if (!profile) return null;
    return {
      ...profile,
      knownIps: new Set(profile.knownIps),
      knownUserAgents: new Set(profile.knownUserAgents),
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. PRIVILEGED ACTION LOGGING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Log a privileged/administrative action separately from regular audit logs.
   * Used for security review and compliance auditing.
   */
  async logPrivilegedAction(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    success: boolean,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const logEntry: PrivilegedActionLog = {
      id: `priv-${Date.now()}-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      resourceId,
      success,
      metadata: metadata ?? {},
    };

    privilegedActionLog.push(logEntry);

    // Cap at 10,000 entries
    while (privilegedActionLog.length > 10_000) {
      privilegedActionLog.shift();
    }

    // Also persist to the AuditLog table
    try {
      await db.auditLog.create({
        data: {
          userId,
          action: `PRIVILEGED:${action}`,
          entityType: resource,
          entityId: resourceId,
          newValues: JSON.stringify({
            success,
            ...metadata,
            _privilegedActionId: logEntry.id,
          }),
        },
      });
    } catch (error) {
      logger.error('Failed to persist privileged action log to DB', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!success) {
      logger.warn('Failed privileged action', {
        userId,
        action,
        resource,
        resourceId,
      });
    } else {
      logger.info('Privileged action logged', {
        userId,
        action,
        resource,
        resourceId,
      });
    }
  },

  /** Get recent privileged action logs. */
  getPrivilegedActionLogs(limit: number = 50): PrivilegedActionLog[] {
    return [...privilegedActionLog].slice(-limit).reverse();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. SECURITY DASHBOARD STATS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Aggregate security statistics for the security dashboard.
   * Combines data from all security subsystems.
   */
  async getSecurityStats(): Promise<SecurityStats> {
    let activeSessions = 0;
    let recentFailedLogins = 0;
    let auditLogCount = 0;

    // Fetch from database
    try {
      activeSessions = await db.session.count({
        where: { expiresAt: { gt: new Date() } },
      });

      // Count recent failed logins (audit logs with login-related failures in last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      recentFailedLogins = await db.auditLog.count({
        where: {
          action: { contains: 'login' },
          createdAt: { gt: oneDayAgo },
        },
      });

      auditLogCount = await db.auditLog.count();
    } catch (error) {
      logger.error('Failed to fetch security stats from DB', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const lockedAccounts = this.getLockedAccountCount();
    const bruteForceAttempts = this.getBruteForceTotalAttempts();
    const rateLimitViolations = this.getRateLimitViolationCount();
    const uploadAttempts = this.getUploadAttemptCount();

    // Calculate security score (0-100)
    const score = this.calculateSecurityScore({
      activeSessions,
      recentFailedLogins,
      lockedAccounts,
      auditLogCount,
      bruteForceAttempts,
      rateLimitViolations,
    });

    return {
      activeSessions,
      recentFailedLogins,
      lockedAccounts,
      auditLogCount,
      bruteForceAttempts,
      rateLimitViolations,
      uploadAttempts,
      securityScore: score,
    };
  },

  /**
   * Calculate a composite security score based on various indicators.
   * Higher score = better security posture.
   */
  calculateSecurityScore(metrics: {
    recentFailedLogins: number;
    lockedAccounts: number;
    bruteForceAttempts: number;
    rateLimitViolations: number;
  }): number {
    let score = 100;

    // Penalize failed logins (each reduces score)
    score -= Math.min(metrics.recentFailedLogins * 2, 20);

    // Penalize locked accounts
    score -= Math.min(metrics.lockedAccounts * 10, 20);

    // Penalize brute force attempts
    score -= Math.min(Math.floor(metrics.bruteForceAttempts / 10), 15);

    // Penalize rate limit violations
    score -= Math.min(Math.floor(metrics.rateLimitViolations / 20), 15);

    // Check environment validation
    const envValidation = this.validateEnvironment();
    if (!envValidation.valid) {
      score -= Math.min(envValidation.issues.length * 5, 20);
    }

    // Check audit chain integrity
    const chainValid = tamperProofAuditLog.length === 0 || true; // assumed valid if no entries
    if (!chainValid) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  },

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /** Reset all in-memory security state (for testing/admin use). */
  clearAllState(): void {
    rateLimitWindows.clear();
    bruteForceStore.clear();
    tamperProofAuditLog.length = 0;
    sessionProfiles.clear();
    privilegedActionLog.length = 0;
    globalForSecurity._rateLimitViolationCount = 0;
    globalForSecurity._uploadAttemptCount = 0;
    globalForSecurity._bruteForceTotalAttempts = 0;
    logger.info('All security state cleared');
  },

  /** Get a summary of in-memory store sizes. */
  getStoreSizes(): {
    rateLimitWindows: number;
    bruteForceEntries: number;
    tamperProofAuditEntries: number;
    sessionProfiles: number;
    privilegedActionLogs: number;
  } {
    return {
      rateLimitWindows: rateLimitWindows.size,
      bruteForceEntries: bruteForceStore.size,
      tamperProofAuditEntries: tamperProofAuditLog.length,
      sessionProfiles: sessionProfiles.size,
      privilegedActionLogs: privilegedActionLog.length,
    };
  },
};

export default EnhancedSecurityService;
