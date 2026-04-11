import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const record = await db.riskAssessment.findUnique({ where: { id } });

    if (!record) {
      return NextResponse.json({ success: false, error: 'Risk assessment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load risk assessment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.riskAssessment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Risk assessment not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'description', 'assetId', 'departmentId',
      'assessmentDate', 'nextReview', 'status', 'likelihood',
      'consequence', 'riskLevel', 'hazards', 'controls',
      'residualRisk', 'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'assessmentDate' || field === 'nextReview') {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else if (field === 'likelihood' || field === 'consequence') {
          updateData[field] = body[field] !== null ? parseInt(String(body[field]), 10) : null;
        } else if (field === 'hazards' || field === 'controls') {
          updateData[field] = typeof body[field] === 'string' ? body[field] : JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Recalculate risk level if likelihood or consequence changed
    const newLikelihood = updateData.likelihood !== undefined ? updateData.likelihood as number : existing.likelihood;
    const newConsequence = updateData.consequence !== undefined ? updateData.consequence as number : existing.consequence;
    if ((updateData.likelihood !== undefined || updateData.consequence !== undefined) && newLikelihood && newConsequence) {
      const score = newLikelihood * newConsequence;
      if (score >= 20) updateData.riskLevel = 'extreme';
      else if (score >= 15) updateData.riskLevel = 'high';
      else if (score >= 9) updateData.riskLevel = 'medium';
      else updateData.riskLevel = 'low';
    }

    const updated = await db.riskAssessment.update({ where: { id }, data: updateData });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'risk_assessment',
        entityId: id,
        oldValues: JSON.stringify({ assessmentNumber: existing.assessmentNumber, status: existing.status }),
        newValues: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update risk assessment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.riskAssessment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Risk assessment not found' }, { status: 404 });
    }

    await db.riskAssessment.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'delete',
        entityType: 'risk_assessment',
        entityId: id,
        oldValues: JSON.stringify({ assessmentNumber: existing.assessmentNumber }),
        newValues: JSON.stringify({ deleted: true }),
      },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete risk assessment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
