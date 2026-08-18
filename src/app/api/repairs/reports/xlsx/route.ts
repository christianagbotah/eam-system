import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, hasAnyPermission } from '@/lib/auth';
import { getPlantScope, getPlantFilterWhere, canAccessPlant } from '@/lib/plant-scope';
import {
  generateReport,
  SUPPORTED_REPORT_TYPES,
  type ReportType,
  type ReportFilters,
} from '@/services/repairsReportXlsx.service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:repairs:reports:xlsx');

// ============================================================================
// POST /api/repairs/reports/xlsx
//
// Body: { reportType: string, filters?: Record<string, string> }
//
// Returns XLSX binary file as application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    // ── 2. RBAC — requires reports.view permission ───────────────────────────
    if (
      !hasAnyPermission(session, ['reports.view', 'reports.export', 'analytics.view']) &&
      !isAdmin(session)
    ) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions: reports.view required' },
        { status: 403 },
      );
    }

    // ── 3. Parse request body ────────────────────────────────────────────────
    let body: { reportType?: string; filters?: Record<string, string | undefined> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { reportType, filters: rawFilters } = body;

    if (!reportType || typeof reportType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'reportType is required' },
        { status: 400 },
      );
    }

    // ── 4. Validate report type ─────────────────────────────────────────────
    if (!SUPPORTED_REPORT_TYPES.includes(reportType as ReportType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid report type. Supported: ${SUPPORTED_REPORT_TYPES.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // ── 5. Plant scope enforcement ────────────────────────────────────────
    const plantScope = await getPlantScope(request, session);

    // If user explicitly requested a plant they have no access to, deny
    if (plantScope.denyAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: no access to the requested plant' },
        { status: 403 },
      );
    }

    // Build filters — merge plant scope into the filters
    const filters: ReportFilters = {
      ...(rawFilters ?? {}),
    };

    // If plant scope is active, enforce the plant ID filter on the server side
    if (plantScope.isScoped && plantScope.plantId) {
      filters.plantId = plantScope.plantId;
    }

    // ── 6. Generate XLSX ────────────────────────────────────────────────────
    logger.info('Generating XLSX report', {
      reportType,
      plantId: filters.plantId || 'all',
      userId: session.userId,
    });

    const { buffer, filename } = await generateReport(
      reportType as ReportType,
      filters,
      session,
    );

    // ── 7. Return file response ─────────────────────────────────────────────
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    logger.error('XLSX report generation failed', { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
