import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/work-instructions/executions — list execution history
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instructionId = searchParams.get('instructionId');
    const technicianId = searchParams.get('technicianId');
    const status = searchParams.get('status');
    const workOrderId = searchParams.get('workOrderId');
    let page = parseInt(searchParams.get('page') || '1', 10);
    let limit = parseInt(searchParams.get('limit') || '20', 10);
    page = Math.max(1, isNaN(page) ? 1 : page);
    limit = Math.min(100, Math.max(1, isNaN(limit) ? 20 : limit));

    const where: Record<string, unknown> = {};

    if (instructionId) where.workInstructionId = instructionId;
    if (technicianId) where.technicianId = technicianId;
    if (workOrderId) where.workOrderId = workOrderId;
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      db.workInstructionExecution.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          workInstruction: {
            select: {
              id: true,
              title: true,
              maintenanceType: true,
              difficulty: true,
              safetyLevel: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workInstructionExecution.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: executions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load execution history';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
