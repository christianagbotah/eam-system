import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { SchedulingOptimizerService } from '@/services/ai/schedulingOptimizer.service';

/**
 * POST /api/ai/schedule/optimize — Optimize maintenance schedule
 *
 * Accepts scheduling parameters and returns an optimized schedule with:
 * - Constraint-based technician/assignment matching
 * - Predictive maintenance additions
 * - Resource utilization metrics
 * - Conflict detection
 * - Weather alerts
 * - Adherence prediction
 * - Rescheduling recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      plantId,
      departmentId,
      startDate,
      endDate,
      maxTechniciansPerDay,
      workingHoursPerDay,
      includePredictiveMaintenance,
      weatherConsiderations,
      contractorAvailability,
    } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 },
      );
    }

    // Validate date range (max 90 days)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = (end.getTime() - start.getTime()) / 86400000;
    if (daysDiff < 1 || daysDiff > 90) {
      return NextResponse.json(
        { success: false, error: 'Date range must be between 1 and 90 days' },
        { status: 400 },
      );
    }

    const result = await SchedulingOptimizerService.optimizeSchedule({
      plantId,
      departmentId,
      startDate,
      endDate,
      maxTechniciansPerDay,
      workingHoursPerDay,
      includePredictiveMaintenance,
      weatherConsiderations,
      contractorAvailability,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Schedule optimization failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
