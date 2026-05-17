import { NextResponse } from 'next/server';
import { EnhancedSecurityService } from '@/services/securityHardening.service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('security-audit-api');

// GET /api/admin/security-audit
// Returns a comprehensive security audit report
export async function GET() {
  try {
    // ── 1. Audit Chain Integrity ──────────────────────────────────────────
    const auditChain = await EnhancedSecurityService.verifyAuditChain();

    // ── 2. Recent Privileged Actions ───────────────────────────────────────
    const recentPrivilegedActions = EnhancedSecurityService.getPrivilegedActionLogs(20);

    // ── 3. Brute Force / Failed Login Info ─────────────────────────────────
    const lockedAccounts = EnhancedSecurityService.getLockedAccountCount();
    const bruteForceTotalAttempts = EnhancedSecurityService.getBruteForceTotalAttempts();

    // ── 4. Rate Limit Violations ───────────────────────────────────────────
    const rateLimitViolations = EnhancedSecurityService.getRateLimitViolationCount();

    // ── 5. Session Anomaly Detections ─────────────────────────────────────
    const storeSizes = EnhancedSecurityService.getStoreSizes();
    const monitoredUsers = storeSizes.sessionProfiles;

    // ── 6. Upload Security Events ─────────────────────────────────────────
    const uploadAttempts = EnhancedSecurityService.getUploadAttemptCount();

    // ── 7. Environment Validation ─────────────────────────────────────────
    const envValidation = EnhancedSecurityService.validateEnvironment();

    // ── 8. Overall Security Stats (includes score) ────────────────────────
    const securityStats = await EnhancedSecurityService.getSecurityStats();

    // ── 9. Tamper-proof audit log sample ──────────────────────────────────
    const recentAuditEntries = EnhancedSecurityService.getTamperProofAuditLog(20);

    // ── Compose Response ───────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        // Timestamp of this report
        generatedAt: new Date().toISOString(),

        // 1. Audit chain
        auditChain: {
          valid: auditChain.valid,
          brokenAt: auditChain.brokenAt,
          totalEntries: auditChain.totalEntries,
          recentEntries: recentAuditEntries.map(entry => ({
            id: entry.id,
            timestamp: entry.timestamp,
            userId: entry.userId,
            action: entry.action,
            entity: entry.entity,
            entityId: entry.entityId,
            previousHash: entry.previousHash,
            currentHash: entry.currentHash,
          })),
        },

        // 2. Privileged actions
        privilegedActions: {
          totalInMemory: storeSizes.privilegedActionLogs,
          recent: recentPrivilegedActions.map(log => ({
            id: log.id,
            timestamp: log.timestamp,
            userId: log.userId,
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId,
            success: log.success,
            metadata: log.metadata,
          })),
        },

        // 3. Failed login / brute force
        failedLogins: {
          lockedAccounts,
          totalBruteForceAttempts: bruteForceTotalAttempts,
          activeBruteForceTrackers: storeSizes.bruteForceEntries,
        },

        // 4. Rate limit
        rateLimits: {
          totalViolations: rateLimitViolations,
          activeWindows: storeSizes.rateLimitWindows,
        },

        // 5. Session anomaly detection
        sessionAnomalies: {
          monitoredUsers,
          activeSessionProfiles: storeSizes.sessionProfiles,
        },

        // 6. Upload security
        uploadSecurity: {
          totalAttempts: uploadAttempts,
        },

        // 7. Environment validation
        environment: envValidation,

        // 8. Security score & overall stats
        securityStats: {
          activeSessions: securityStats.activeSessions,
          recentFailedLogins: securityStats.recentFailedLogins,
          lockedAccounts: securityStats.lockedAccounts,
          auditLogCount: securityStats.auditLogCount,
          bruteForceAttempts: securityStats.bruteForceAttempts,
          rateLimitViolations: securityStats.rateLimitViolations,
          uploadAttempts: securityStats.uploadAttempts,
          securityScore: securityStats.securityScore,
        },

        // In-memory store health
        storeHealth: storeSizes,
      },
    });
  } catch (error) {
    logger.error('Security audit API failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate security audit report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
