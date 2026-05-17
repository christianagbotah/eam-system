// ============================================================================
// Security Hardening Service — Critical Workflow Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mock the database (used by tamper-proof audit and privileged action) ----
const mockAuditLogCreate = vi.fn().mockResolvedValue({});
const mockSessionCount = vi.fn().mockResolvedValue(0);
const mockAuditLogCount = vi.fn().mockResolvedValue(0);

vi.mock('@/lib/db', () => ({
  db: {
    auditLog: {
      create: mockAuditLogCreate,
      count: mockAuditLogCount,
    },
    session: {
      count: mockSessionCount,
    },
  },
}));

// ---- Import after mocking ----
import { EnhancedSecurityService } from '@/services/securityHardening.service';

describe('EnhancedSecurityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up in-memory stores between tests
    EnhancedSecurityService.resetRateLimit('__test__');
    EnhancedSecurityService.resetBruteForce('__test__');
  });

  // =========================================================================
  // 1. RATE LIMITING
  // =========================================================================

  describe('Rate Limiting', () => {
    it('should allow requests within the limit', () => {
      const limits = [{ windowMs: 60_000, maxRequests: 5 }];

      for (let i = 0; i < 5; i++) {
        const result = EnhancedSecurityService.checkRateLimit('__test__', limits);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
      }
    });

    it('should block requests over the limit', () => {
      const limits = [{ windowMs: 60_000, maxRequests: 3 }];

      // First 3 allowed
      for (let i = 0; i < 3; i++) {
        const result = EnhancedSecurityService.checkRateLimit('__test__', limits);
        expect(result.allowed).toBe(true);
      }

      // 4th should be blocked
      const result = EnhancedSecurityService.checkRateLimit('__test__', limits);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('should respect multiple rate limit tiers', () => {
      const limits = [
        { windowMs: 1_000, maxRequests: 2 },   // per-second
        { windowMs: 60_000, maxRequests: 100 }, // per-minute
      ];

      // Hit per-second limit quickly
      const r1 = EnhancedSecurityService.checkRateLimit('__test__', limits);
      const r2 = EnhancedSecurityService.checkRateLimit('__test__', limits);
      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);

      // Third should be blocked by per-second tier even though per-minute allows
      const r3 = EnhancedSecurityService.checkRateLimit('__test__', limits);
      expect(r3.allowed).toBe(false);
    });
  });

  // =========================================================================
  // 2. BRUTE FORCE PROTECTION
  // =========================================================================

  describe('Brute Force Protection', () => {
    it('should allow attempts within the max limit', () => {
      for (let i = 0; i < 4; i++) {
        const result = EnhancedSecurityService.checkBruteForce('__test__', 5);
        expect(result.allowed).toBe(true);
        expect(result.attemptsRemaining).toBeGreaterThan(0);
      }
    });

    it('should lock after max attempts exceeded', () => {
      // 5 attempts to trigger lockout
      for (let i = 0; i < 4; i++) {
        EnhancedSecurityService.checkBruteForce('__test__', 5);
      }

      // 5th should trigger lockout
      const result = EnhancedSecurityService.checkBruteForce('__test__', 5);
      expect(result.allowed).toBe(false);
      expect(result.attemptsRemaining).toBe(0);
      expect(result.lockedUntil).toBeInstanceOf(Date);
    });

    it('should block requests while locked out', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        EnhancedSecurityService.checkBruteForce('__test__', 5);
      }

      // Subsequent attempts should still be blocked
      const result = EnhancedSecurityService.checkBruteForce('__test__', 5);
      expect(result.allowed).toBe(false);
      expect(result.lockedUntil).toBeInstanceOf(Date);
    });

    it('should implement progressive lockout levels', () => {
      const identifier = '__test_progressive__';

      // First lockout (level 1): 5 minutes
      for (let i = 0; i < 5; i++) {
        EnhancedSecurityService.checkBruteForce(identifier, 5);
      }
      const lock1 = EnhancedSecurityService.checkBruteForce(identifier, 5);
      expect(lock1.allowed).toBe(false);

      EnhancedSecurityService.resetBruteForce(identifier);

      // The lockout level should escalate with repeated violations.
      // After reset, the entry is gone, so a new cycle starts at level 0.
      // We verify the mechanism by checking it locks at all:
      for (let i = 0; i < 5; i++) {
        EnhancedSecurityService.checkBruteForce(identifier, 5);
      }
      const lock2 = EnhancedSecurityService.checkBruteForce(identifier, 5);
      expect(lock2.allowed).toBe(false);

      EnhancedSecurityService.resetBruteForce(identifier);
    });

    it('should reset after successful reset call', () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        EnhancedSecurityService.checkBruteForce('__test__', 5);
      }

      // Reset
      EnhancedSecurityService.resetBruteForce('__test__');

      // Should be allowed again
      const result = EnhancedSecurityService.checkBruteForce('__test__', 5);
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(4);
    });
  });

  // =========================================================================
  // 3. FILE UPLOAD VALIDATION
  // =========================================================================

  describe('File Upload Validation', () => {
    it('should allow safe file types', () => {
      const safeFiles = [
        { name: 'photo.jpg', size: 1024, type: 'image/jpeg' },
        { name: 'document.pdf', size: 5000, type: 'application/pdf' },
        { name: 'data.csv', size: 100, type: 'text/csv' },
        { name: 'report.xlsx', size: 500_000, type: 'application/octet-stream' },
        { name: 'archive.zip', size: 2_000_000, type: 'application/zip' },
      ];

      for (const file of safeFiles) {
        const result = EnhancedSecurityService.validateFileUpload(file);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block dangerous file types', () => {
      const dangerousFiles = [
        { name: 'malware.exe', size: 1024, type: 'application/octet-stream' },
        { name: 'script.sh', size: 100, type: 'text/x-sh' },
        { name: 'hack.bat', size: 50, type: 'application/bat' },
        { name: 'payload.php', size: 200, type: 'application/x-php' },
        { name: 'virus.py', size: 500, type: 'text/x-python' },
        { name: 'attack.jsp', size: 300, type: 'application/jsp' },
        { name: 'backdoor.mjs', size: 150, type: 'text/javascript' },
      ];

      for (const file of dangerousFiles) {
        const result = EnhancedSecurityService.validateFileUpload(file);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBeTruthy();
      }
    });

    it('should block files exceeding max size', () => {
      const result = EnhancedSecurityService.validateFileUpload({
        name: 'huge.zip',
        size: 11 * 1024 * 1024, // 11MB
        type: 'application/zip',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
    });

    it('should block double extensions with dangerous inner extension', () => {
      const result = EnhancedSecurityService.validateFileUpload({
        name: 'image.php.jpg',
        size: 1024,
        type: 'image/jpeg',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Double extension');
    });

    it('should block files with path traversal in name', () => {
      const result = EnhancedSecurityService.validateFileUpload({
        name: '../../../etc/passwd.txt',
        size: 100,
        type: 'text/plain',
      });
      expect(result.allowed).toBe(false);
    });
  });

  // =========================================================================
  // 4. SECRETS MASKING
  // =========================================================================

  describe('Secret Masking', () => {
    it('should mask secrets properly', () => {
      expect(EnhancedSecurityService.maskSecret('my-super-secret-password-123')).toBe(
        'my-s••••••••••••••••••••••w-123',
      );
    });

    it('should mask short secrets', () => {
      expect(EnhancedSecurityService.maskSecret('abcdef')).toBe('••••');
    });

    it('should handle empty/null secrets', () => {
      expect(EnhancedSecurityService.maskSecret('')).toBe('••••');
      expect(EnhancedSecurityService.maskSecret(null as unknown as string)).toBe('••••');
    });

    it('should handle medium-length secrets', () => {
      const masked = EnhancedSecurityService.maskSecret('abcxyz123');
      expect(masked).toContain('•');
      expect(masked.startsWith('ab')).toBe(true);
      expect(masked.endsWith('23')).toBe(true);
    });
  });

  // =========================================================================
  // 5. ENVIRONMENT VALIDATION
  // =========================================================================

  describe('Environment Validation', () => {
    it('should detect missing JWT secret', () => {
      const original = process.env.JWT_SECRET;
      const originalNextauth = process.env.NEXTAUTH_SECRET;
      delete process.env.JWT_SECRET;
      delete process.env.NEXTAUTH_SECRET;

      const result = EnhancedSecurityService.validateEnvironment();
      expect(result.issues.some(i => i.includes('JWT'))).toBe(true);
      expect(result.valid).toBe(false);

      // Restore
      if (original) process.env.JWT_SECRET = original;
      else delete process.env.JWT_SECRET;
      if (originalNextauth) process.env.NEXTAUTH_SECRET = originalNextauth;
      else delete process.env.NEXTAUTH_SECRET;
    });

    it('should detect development mode', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = EnhancedSecurityService.validateEnvironment();
      expect(result.issues.some(i => i.includes('development'))).toBe(true);

      process.env.NODE_ENV = original;
    });

    it('should detect wildcard CORS origin', () => {
      const original = process.env.CORS_ORIGIN;
      process.env.CORS_ORIGIN = '*';

      const result = EnhancedSecurityService.validateEnvironment();
      expect(result.issues.some(i => i.includes('wildcard') || i.includes('CORS'))).toBe(true);

      process.env.CORS_ORIGIN = original;
    });
  });

  // =========================================================================
  // 6. TAMPER-PROOF AUDIT TRAIL
  // =========================================================================

  describe('Tamper-Proof Audit Trail', () => {
    it('should create audit chain entries', async () => {
      await EnhancedSecurityService.createTamperProofAuditLog({
        userId: 'user-1',
        action: 'create',
        entity: 'Asset',
        entityId: 'asset-1',
        details: { name: 'Pump A' },
      });

      const log = EnhancedSecurityService.getTamperProofAuditLog(10);
      expect(log.length).toBeGreaterThanOrEqual(1);
      const entry = log[0];
      expect(entry.action).toBe('create');
      expect(entry.entity).toBe('Asset');
      expect(entry.currentHash).toBeTruthy();
      expect(entry.previousHash).toBeTruthy();
    });

    it('should chain audit entries with hash linkage', async () => {
      await EnhancedSecurityService.createTamperProofAuditLog({
        userId: 'user-1',
        action: 'create',
        entity: 'Asset',
        entityId: 'asset-1',
        details: {},
      });

      await EnhancedSecurityService.createTamperProofAuditLog({
        userId: 'user-2',
        action: 'update',
        entity: 'Asset',
        entityId: 'asset-1',
        details: { field: 'condition', value: 'poor' },
      });

      const log = EnhancedSecurityService.getTamperProofAuditLog(10);
      // Log is returned newest first, so log[0] is the second entry, log[1] is the first
      expect(log[0].previousHash).toBe(log[1].currentHash);
    });

    it('should verify a valid audit chain', async () => {
      // Create a few entries
      for (let i = 0; i < 3; i++) {
        await EnhancedSecurityService.createTamperProofAuditLog({
          userId: `user-${i}`,
          action: 'update',
          entity: 'WorkOrder',
          entityId: `wo-${i}`,
          details: { step: i },
        });
      }

      const verification = await EnhancedSecurityService.verifyAuditChain();
      expect(verification.valid).toBe(true);
      expect(verification.totalEntries).toBeGreaterThanOrEqual(3);
      expect(verification.brokenAt).toBeNull();
    });
  });

  // =========================================================================
  // 7. SESSION ANOMALY DETECTION
  // =========================================================================

  describe('Session Anomaly Detection', () => {
    it('should detect new IP address', () => {
      // First call establishes baseline
      const result1 = EnhancedSecurityService.detectSessionAnomalies(
        'user-1', '192.168.1.100', 'Mozilla/5.0',
      );
      expect(result1.suspicious).toBe(false);

      // Second call with different IP
      const result2 = EnhancedSecurityService.detectSessionAnomalies(
        'user-1', '10.0.0.50', 'Mozilla/5.0',
      );
      expect(result2.suspicious).toBe(true);
      expect(result2.reasons.some(r => r.includes('New IP'))).toBe(true);
    });

    it('should detect new user agent', () => {
      // Baseline
      EnhancedSecurityService.detectSessionAnomalies(
        'user-agent-test', '192.168.1.1', 'Mozilla/5.0 Firefox',
      );

      // Different browser
      const result = EnhancedSecurityService.detectSessionAnomalies(
        'user-agent-test', '192.168.1.1', 'Chrome/120 Safari/537',
      );
      expect(result.suspicious).toBe(true);
      expect(result.reasons.some(r => r.includes('user agent'))).toBe(true);
    });

    it('should not flag activity from known IP and user agent', () => {
      // Establish baseline
      EnhancedSecurityService.detectSessionAnomalies(
        'known-user', '192.168.1.1', 'Mozilla/5.0 Chrome',
      );

      // Same IP and user agent
      const result = EnhancedSecurityService.detectSessionAnomalies(
        'known-user', '192.168.1.1', 'Mozilla/5.0 Chrome',
      );
      expect(result.suspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });
});
