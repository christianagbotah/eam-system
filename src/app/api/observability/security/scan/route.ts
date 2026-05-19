// ============================================================================
// API ROUTE — POST /api/observability/security/scan — Trigger security scan
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { SecurityHardeningService } from '@/services/observability/securityHardening.service';

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action || 'scan';

    // Run a security scan
    if (action === 'scan') {
      const scanType = body.scanType || 'full';
      const scan = await SecurityHardeningService.runSecurityScan(scanType);
      return NextResponse.json({ success: true, data: scan });
    }

    // SQL injection test on provided input
    if (action === 'test-sqli') {
      const input = body.input;
      if (!input) {
        return NextResponse.json({ success: false, error: 'input is required' }, { status: 400 });
      }
      const findings = SecurityHardeningService.detectSQLInjection(input);
      return NextResponse.json({ success: true, data: { input, findings, detected: findings.length > 0 } });
    }

    // XSS test on provided input
    if (action === 'test-xss') {
      const input = body.input;
      if (!input) {
        return NextResponse.json({ success: false, error: 'input is required' }, { status: 400 });
      }
      const findings = SecurityHardeningService.detectXSS(input);
      return NextResponse.json({ success: true, data: { input, findings, detected: findings.length > 0 } });
    }

    // Generate CSRF token
    if (action === 'csrf-token') {
      const token = SecurityHardeningService.generateCSRFToken();
      return NextResponse.json({ success: true, data: { token } });
    }

    // Update security headers
    if (action === 'update-headers') {
      const updated = SecurityHardeningService.setHeadersConfig(body.headers || {});
      return NextResponse.json({ success: true, data: { headers: updated } });
    }

    // Reset headers to defaults
    if (action === 'reset-headers') {
      const headers = SecurityHardeningService.resetHeadersConfig();
      return NextResponse.json({ success: true, data: { headers } });
    }

    // Create penetration test record
    if (action === 'create-pentest') {
      const penTest = SecurityHardeningService.createPenTest({
        title: body.title,
        description: body.description,
        scheduledDate: body.scheduledDate,
        tester: body.tester,
      });
      return NextResponse.json({ success: true, data: penTest });
    }

    // Update penetration test
    if (action === 'update-pentest') {
      const penTestId = body.pentestId;
      if (!penTestId) {
        return NextResponse.json({ success: false, error: 'pentestId is required' }, { status: 400 });
      }
      const { pentestId, ...updateParams } = body;
      const updated = SecurityHardeningService.updatePenTest(penTestId, updateParams);
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Pen test not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Security operation failed' }, { status: 500 });
  }
}
