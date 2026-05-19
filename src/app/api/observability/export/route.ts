// ============================================================================
// API ROUTE — GET /api/observability/export — Export observability data
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { exportData } from '@/services/observability/persistence.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'logs';
    const format = searchParams.get('format') || 'json';
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10000', 10);

    // Validate type
    if (!['logs', 'traces', 'metrics'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid type "${type}". Must be one of: logs, traces, metrics`,
      }, { status: 400 });
    }

    // Validate format (only json supported for now)
    if (format !== 'json') {
      return NextResponse.json({
        success: false,
        error: `Unsupported format "${format}". Only "json" is currently supported`,
      }, { status: 400 });
    }

    // Validate limit
    if (limit > 100000) {
      return NextResponse.json({
        success: false,
        error: 'Limit cannot exceed 100,000 records per export',
      }, { status: 400 });
    }

    // Validate date range
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid "from" date format' }, { status: 400 });
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid "to" date format' }, { status: 400 });
      }
    }

    const result = await exportData({
      type: type as 'logs' | 'traces' | 'metrics',
      from,
      to,
      format: 'json',
      limit,
    });

    if (!result) {
      return NextResponse.json({
        success: true,
        data: {
          type,
          format,
          records: [],
          total: 0,
          exportedAt: new Date().toISOString(),
          message: 'Database not available. No persisted data to export.',
        },
      });
    }

    // Build export envelope with metadata for log shipping
    const envelope = {
      _export: {
        type,
        format,
        source: 'iassetspro',
        version: process.env.npm_package_version || '1.0.0',
        exportedAt: result.exportedAt,
        recordCount: result.total,
        dateRange: { from: from || null, to: to || null },
      },
      records: result.data,
    };

    // Set appropriate headers for download
    const filename = `iassetspro-${type}-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(envelope, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store',
        'X-Observability-Export-Type': type,
        'X-Observability-Export-Count': String(result.total),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to export observability data' }, { status: 500 });
  }
}
