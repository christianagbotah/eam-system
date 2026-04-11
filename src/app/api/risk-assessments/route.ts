import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper: generate risk assessment number RA-YYYYMM-NNNN
async function generateRANumber(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `RA-${ym}-`;

  const latest = await db.riskAssessment.findFirst({
    where: { assessmentNumber: { startsWith: prefix } },
    orderBy: { assessmentNumber: 'desc' },
    select: { assessmentNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.assessmentNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const riskLevel = searchParams.get('riskLevel');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (riskLevel) where.riskLevel = riskLevel;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { assessmentNumber: { contains: search } },
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [records, total] = await Promise.all([
      db.riskAssessment.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.riskAssessment.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    const [totalKpi, criticalCount, highCount, mediumCount, lowCount] = await Promise.all([
      db.riskAssessment.count(),
      db.riskAssessment.count({ where: { riskLevel: 'extreme' } }),
      db.riskAssessment.count({ where: { riskLevel: 'high' } }),
      db.riskAssessment.count({ where: { riskLevel: 'medium' } }),
      db.riskAssessment.count({ where: { riskLevel: 'low' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpis: {
        total: totalKpi,
        critical: criticalCount + highCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load risk assessments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      assetId,
      departmentId,
      assessmentDate,
      nextReview,
      status,
      likelihood,
      consequence,
      riskLevel,
      hazards,
      controls,
      residualRisk,
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const likelihoodVal = likelihood ? parseInt(String(likelihood), 10) : null;
    const consequenceVal = consequence ? parseInt(String(consequence), 10) : null;

    // Auto-calculate risk level if not provided
    let calculatedLevel = riskLevel;
    if (!calculatedLevel && likelihoodVal && consequenceVal) {
      const score = likelihoodVal * consequenceVal;
      if (score >= 20) calculatedLevel = 'extreme';
      else if (score >= 15) calculatedLevel = 'high';
      else if (score >= 9) calculatedLevel = 'medium';
      else calculatedLevel = 'low';
    }

    const assessmentNumber = await generateRANumber();

    const record = await db.riskAssessment.create({
      data: {
        assessmentNumber,
        title,
        description,
        assetId,
        departmentId,
        assessmentDate: assessmentDate ? new Date(assessmentDate) : new Date(),
        nextReview: nextReview ? new Date(nextReview) : null,
        status: status || 'open',
        likelihood: likelihoodVal,
        consequence: consequenceVal,
        riskLevel: calculatedLevel,
        hazards: hazards ? JSON.stringify(hazards) : '[]',
        controls: controls ? JSON.stringify(controls) : '[]',
        residualRisk,
        assessorId: session.userId,
        notes,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'risk_assessment',
        entityId: record.id,
        newValues: JSON.stringify({ assessmentNumber, title }),
      },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create risk assessment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
