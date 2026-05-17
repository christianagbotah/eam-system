import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const componentId = searchParams.get('componentId');
    const assetId = searchParams.get('assetId');

    if (!componentId && !assetId) {
      return NextResponse.json(
        { success: false, error: 'Either componentId or assetId is required' },
        { status: 400 },
      );
    }

    // Build the where clause for failure records
    const failureWhere: Record<string, unknown> = {};
    if (componentId) {
      failureWhere.componentId = componentId;
    } else if (assetId) {
      failureWhere.assetId = assetId;
    }

    // Get all failures
    const failures = await db.failureRecord.findMany({
      where: failureWhere,
      include: {
        component: { select: { id: true, componentCode: true, name: true } },
      },
      orderBy: { detectedAt: 'asc' },
    });

    const totalDowntimeMinutes = failures.reduce((sum, f) => sum + f.downtimeMinutes, 0);
    const totalRepairCost = failures.reduce((sum, f) => sum + (f.repairCost ?? 0), 0);

    // MTBF: Mean Time Between Failures (hours)
    // Based on resolved failures only
    const resolvedFailures = failures.filter((f) => f.resolvedAt);
    let mtbf = 0;
    if (resolvedFailures.length >= 2) {
      const sorted = resolvedFailures
        .map((f) => f.detectedAt.getTime())
        .sort((a, b) => a - b);
      let totalHoursBetween = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalHoursBetween += (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60);
      }
      mtbf = totalHoursBetween / (sorted.length - 1);
    }

    // MTTR: Mean Time To Repair (hours)
    let mttr = 0;
    const failuresWithResolution = resolvedFailures.filter((f) => f.downtimeMinutes > 0);
    if (failuresWithResolution.length > 0) {
      mttr = failuresWithResolution.reduce((sum, f) => sum + f.downtimeMinutes, 0) / failuresWithResolution.length / 60;
    }

    // Breakdown by failure mode
    const modeCounts: Record<string, number> = {};
    for (const f of failures) {
      modeCounts[f.failureMode] = (modeCounts[f.failureMode] || 0) + 1;
    }
    const byMode = Object.entries(modeCounts)
      .map(([mode, count]) => ({
        mode,
        count,
        percentage: failures.length > 0 ? Math.round((count / failures.length) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Breakdown by severity
    const severityCounts: Record<string, number> = {};
    for (const f of failures) {
      severityCounts[f.failureSeverity] = (severityCounts[f.failureSeverity] || 0) + 1;
    }
    const bySeverity = Object.entries(severityCounts)
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => b.count - a.count);

    // Monthly trend (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthlyData: Record<string, { failures: number; downtimeMinutes: number; cost: number }> = {};

    for (const f of failures) {
      if (f.detectedAt >= twelveMonthsAgo) {
        const monthKey = `${f.detectedAt.getFullYear()}-${String(f.detectedAt.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { failures: 0, downtimeMinutes: 0, cost: 0 };
        }
        monthlyData[monthKey].failures += 1;
        monthlyData[monthKey].downtimeMinutes += f.downtimeMinutes;
        monthlyData[monthKey].cost += f.repairCost ?? 0;
      }
    }
    const byMonth = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Top failing components (if filtering by asset, show top components)
    let topFailingComponents: Array<{ componentId: string; componentCode: string; componentName: string; failureCount: number }> = [];
    if (assetId) {
      const componentFailures: Record<string, { code: string; name: string; count: number }> = {};
      for (const f of failures) {
        if (f.component) {
          const key = f.component.id;
          if (!componentFailures[key]) {
            componentFailures[key] = { code: f.component.componentCode, name: f.component.name, count: 0 };
          }
          componentFailures[key].count += 1;
        }
      }
      topFailingComponents = Object.entries(componentFailures)
        .map(([componentId, data]) => ({
          componentId,
          componentCode: data.code,
          componentName: data.name,
          failureCount: data.count,
        }))
        .sort((a, b) => b.failureCount - a.failureCount)
        .slice(0, 5);
    } else {
      topFailingComponents = [
        { componentId: componentId!, componentCode: '', componentName: '', failureCount: failures.length },
      ];
    }

    // Reliability score: 0-100
    // Based on MTBF, failure frequency, downtime, and recent trend
    let reliabilityScore = 100;

    // Deduct for failure frequency (more failures = lower score)
    if (failures.length > 0) {
      reliabilityScore -= Math.min(30, failures.length * 3);
    }

    // Deduct for low MTBF
    if (mtbf > 0 && mtbf < 168) { // less than 1 week
      reliabilityScore -= 20;
    } else if (mtbf > 0 && mtbf < 720) { // less than 1 month
      reliabilityScore -= 10;
    }

    // Deduct for high MTTR
    if (mttr > 8) {
      reliabilityScore -= 15;
    } else if (mttr > 4) {
      reliabilityScore -= 8;
    }

    // Deduct for high severity failures
    const criticalFailures = failures.filter((f) => f.failureSeverity === 'critical').length;
    if (criticalFailures > 0) {
      reliabilityScore -= Math.min(15, criticalFailures * 5);
    }

    // Recent trend (last 3 months vs previous)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const recentFailures = failures.filter((f) => f.detectedAt >= threeMonthsAgo).length;
    const previousFailures = failures.filter((f) => f.detectedAt >= sixMonthsAgo && f.detectedAt < threeMonthsAgo).length;
    if (recentFailures > previousFailures * 1.5 && previousFailures > 0) {
      reliabilityScore -= 10;
    }

    reliabilityScore = Math.max(0, Math.min(100, reliabilityScore));

    return NextResponse.json({
      success: true,
      data: {
        failureCount: failures.length,
        mtbf: Math.round(mtbf * 100) / 100,
        mttr: Math.round(mttr * 100) / 100,
        totalDowntimeMinutes,
        totalRepairCost: Math.round(totalRepairCost * 100) / 100,
        byMode,
        bySeverity,
        byMonth,
        topFailingComponents,
        reliabilityScore,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to compute failure analysis';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
