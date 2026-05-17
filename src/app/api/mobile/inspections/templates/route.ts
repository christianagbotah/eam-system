// ============================================================================
// GET/POST /api/mobile/inspections/templates — Manage inspection templates
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:mobile:inspections:templates');

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const activeOnly = url.searchParams.get('active') !== 'false';

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (activeOnly) where.isActive = true;

    const templates = await db.inspectionTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch templates';
    logger.error('Templates GET error', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session) && !hasPermission(session, 'quality.create')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, category, frequency, estimatedMinutes, sectionsJson, passThreshold } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Template name is required' }, { status: 400 });
    }

    if (!sectionsJson || !Array.isArray(sectionsJson)) {
      return NextResponse.json({ success: false, error: 'sectionsJson array is required' }, { status: 400 });
    }

    const template = await db.inspectionTemplate.create({
      data: {
        name,
        description: description || null,
        category: category || null,
        frequency: frequency || null,
        estimatedMinutes: estimatedMinutes || null,
        sectionsJson: sectionsJson as unknown as Record<string, unknown>[],
        passThreshold: passThreshold ?? 0.8,
        createdById: session.userId,
      },
    });

    logger.info('Inspection template created', { templateId: template.id, name, category });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create template';
    logger.error('Templates POST error', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
