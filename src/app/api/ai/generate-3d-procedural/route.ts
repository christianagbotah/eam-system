import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { generateProcedural3D } from '@/services/ai/procedural3DGenerator.service';

const logger = createLogger('api:ai:generate-3d-procedural');

// ============================================================================
// POST — Generate procedural 3D model using LLM + Three.js (FREE, no Meshy.ai)
// ============================================================================

export async function POST(request: NextRequest) {
  const timer = logger.timer('generate-3d-procedural.post');

  try {
    // --- Auth ---
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!hasPermission(session, 'assets.create') && !isAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Required: assets.create' },
        { status: 403 },
      );
    }

    // --- Parse body ---
    let body: {
      machineName?: string;
      description?: string;
      assetId?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { machineName, description, assetId } = body;

    // --- Validate required fields ---
    if (!machineName || typeof machineName !== 'string' || machineName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'machineName is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    if (!assetId || typeof assetId !== 'string' || assetId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'assetId is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    // Validate asset exists
    const asset = await db.asset.findUnique({ where: { id: assetId.trim() } });
    if (!asset) {
      return NextResponse.json(
        { success: false, error: `Asset with id "${assetId}" not found` },
        { status: 404 },
      );
    }

    // --- Generate 3D model ---
    logger.info('Starting procedural 3D model generation', {
      machineName: machineName.trim(),
      assetId: assetId.trim(),
      userId: session.userId,
    });

    const result = await generateProcedural3D({
      machineName: machineName.trim(),
      assetId: assetId.trim(),
      description: description ? String(description).trim() : undefined,
      userId: session.userId,
    });

    timer.end();

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        message: `3D model generated successfully with ${result.partCount} parts in ${(result.generationTimeMs / 1000).toFixed(1)}s`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate procedural 3D model';
    logger.error('POST /api/ai/generate-3d-procedural failed', { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
