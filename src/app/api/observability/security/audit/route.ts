// ============================================================================
// API ROUTE — GET /api/observability/security/audit — Security audit trail
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { CentralizedLoggingService } from '@/services/observability/centralizedLogging.service';
import { SecurityHardeningService } from '@/services/observability/securityHardening.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'audit';

    // Application audit trail (from centralized logging)
    if (view === 'audit') {
      const action = searchParams.get('action') || undefined;
      const userId = searchParams.get('userId') || undefined;
      const resourceType = searchParams.get('resourceType') || undefined;
      const resourceId = searchParams.get('resourceId') || undefined;
      const result = searchParams.get('result') as 'success' | 'failure' | undefined;
      const since = searchParams.get('since') || undefined;
      const until = searchParams.get('until') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      const auditResult = CentralizedLoggingService.queryAudit({
        action, userId, resourceType, resourceId, result, since, until, limit, offset,
      });

      return NextResponse.json({ success: true, data: auditResult });
    }

    // Security audit log (from security hardening)
    if (view === 'security') {
      const eventType = searchParams.get('eventType') || undefined;
      const severity = searchParams.get('severity') as 'info' | 'warning' | 'critical' | undefined;
      const since = searchParams.get('since') || undefined;
      const until = searchParams.get('until') || undefined;
      const limit = parseInt(searchParams.get('limit') || '100', 10);

      const entries = SecurityHardeningService.queryAuditLog({
        eventType, severity, since, until, limit,
      });

      return NextResponse.json({ success: true, data: { entries, total: entries.length } });
    }

    // Compliance checklist
    if (view === 'compliance') {
      const checklist = SecurityHardeningService.getComplianceChecklist();
      const score = SecurityHardeningService.getComplianceScore();
      return NextResponse.json({ success: true, data: { checklist, score } });
    }

    // Penetration test records
    if (view === 'pentests') {
      const penTests = SecurityHardeningService.listPenTests();
      return NextResponse.json({ success: true, data: { penTests, total: penTests.length } });
    }

    // Rate limit rules
    if (view === 'rate-limits') {
      const rules = SecurityHardeningService.listRateLimitRules();
      return NextResponse.json({ success: true, data: { rules, total: rules.length } });
    }

    // Security headers config
    if (view === 'headers') {
      const headers = SecurityHardeningService.getHeadersConfig();
      const validation = SecurityHardeningService.validateHeaders();
      return NextResponse.json({ success: true, data: { headers, validation } });
    }

    return NextResponse.json({ success: false, error: `Unknown view: ${view}` }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to retrieve audit data' }, { status: 500 });
  }
}
