// ============================================================================
// POST /api/mobile/scanner — Process QR/barcode scan results
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:mobile:scanner');

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { rawValue } = body;

    if (!rawValue || typeof rawValue !== 'string') {
      return NextResponse.json({ success: false, error: 'rawValue (scan data) is required' }, { status: 400 });
    }

    if (rawValue.length > 500) {
      return NextResponse.json({ success: false, error: 'Scan value too long (max 500 chars)' }, { status: 400 });
    }

    // Dynamic import
    const { FieldExecutionService } = await import('@/services/mobile/fieldExecution.service');

    const result = await FieldExecutionService.processScanResult(rawValue);

    logger.info('Scan result processed', {
      userId: session.userId,
      rawValue: rawValue.substring(0, 50),
      entityType: result.processedEntity,
      entityId: result.entityId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Scan processing failed';
    logger.error('Scanner POST error', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
