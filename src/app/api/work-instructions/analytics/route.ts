import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/work-instructions/analytics — WI execution analytics
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Total instructions
    const totalInstructions = await db.workInstruction.count({
      where: { isActive: true },
    });

    // Execution stats
    const totalExecutions = await db.workInstructionExecution.count({
      where: { startedAt: { gte: since } },
    });

    const completedExecutions = await db.workInstructionExecution.count({
      where: {
        startedAt: { gte: since },
        status: 'completed',
      },
    });

    const abandonedExecutions = await db.workInstructionExecution.count({
      where: {
        startedAt: { gte: since },
        status: 'abandoned',
      },
    });

    const inProgressExecutions = await db.workInstructionExecution.count({
      where: { status: 'in_progress' },
    });

    const pausedExecutions = await db.workInstructionExecution.count({
      where: { status: 'paused' },
    });

    // Average completion time (in minutes)
    const completedWithTimes = await db.workInstructionExecution.findMany({
      where: {
        status: 'completed',
        startedAt: { gte: since },
        totalDuration: { gt: 0 },
      },
      select: { totalDuration: true },
    });

    const avgCompletionTime = completedWithTimes.length > 0
      ? Math.round(completedWithTimes.reduce((sum, e) => sum + (e.totalDuration || 0), 0) / completedWithTimes.length)
      : 0;

    // By maintenance type
    const byType = await db.workInstruction.groupBy({
      by: ['maintenanceType'],
      where: { isActive: true },
      _count: { id: true },
    });

    // By difficulty
    const byDifficulty = await db.workInstruction.groupBy({
      by: ['difficulty'],
      where: { isActive: true },
      _count: { id: true },
    });

    // Completion rate
    const completionRate = totalExecutions > 0
      ? Math.round((completedExecutions / totalExecutions) * 100)
      : 0;

    // Top technicians
    const topTechnicians = await db.workInstructionExecution.groupBy({
      by: ['technicianId'],
      where: {
        status: 'completed',
        startedAt: { gte: since },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        period: { days, since: since.toISOString() },
        instructions: {
          total: totalInstructions,
          byType: byType.map((t) => ({ type: t.maintenanceType, count: t._count.id })),
          byDifficulty: byDifficulty.map((d) => ({ difficulty: d.difficulty, count: d._count.id })),
        },
        executions: {
          total: totalExecutions,
          completed: completedExecutions,
          abandoned: abandonedExecutions,
          inProgress: inProgressExecutions,
          paused: pausedExecutions,
          completionRate,
          avgCompletionMinutes: avgCompletionTime,
        },
        topTechnicians: topTechnicians.map((t) => ({
          technicianId: t.technicianId,
          completedCount: t._count.id,
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
