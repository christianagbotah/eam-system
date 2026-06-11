import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { IndustrialKpiService } from '@/services/industrialKpi.service';
import { ReportExportService, type ExportFormat, type ReportConfig } from '@/services/reportExport.service';

// POST /api/reporting/generate — generate and download a report
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'reports.generate') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { reportType, format: requestedFormat, plantId, days } = body;

    const format: ExportFormat = requestedFormat || 'csv';
    const plant = plantId || undefined;
    const periodDays = days || 30;

    let report: ReportConfig;

    switch (reportType) {
      case 'oee': {
        const oee = await IndustrialKpiService.calculateOEE(plant, periodDays);
        report = {
          title: 'OEE Report',
          period: {
            start: new Date(Date.now() - periodDays * 86400000).toISOString(),
            end: new Date().toISOString(),
          },
          generatedBy: session.username || 'System',
          plantId: plant,
          sections: [
            {
              title: 'Summary',
              type: 'summary',
              rows: [],
              summary: {
                'OEE (%)': oee.oee,
                'Availability (%)': oee.availability,
                'Performance (%)': oee.performance,
                'Quality (%)': oee.quality,
                'Period': oee.period,
              },
            },
          ],
        };
        break;
      }

      case 'reliability': {
        const rel = await IndustrialKpiService.calculateReliability(plant, periodDays);
        report = {
          title: 'Reliability Report',
          period: {
            start: new Date(Date.now() - periodDays * 86400000).toISOString(),
            end: new Date().toISOString(),
          },
          generatedBy: session.username || 'System',
          plantId: plant,
          sections: [
            {
              title: 'Reliability Metrics',
              type: 'summary',
              rows: [],
              summary: {
                'MTBF (hours)': rel.mtbf,
                'MTTR (hours)': rel.mttr,
                'MTTF (hours)': rel.mttf,
                'Availability (%)': rel.availability,
                'Failure Rate (per 1000 hrs)': rel.failureRate,
                'PM Compliance (%)': rel.plannedMaintenanceCompliance,
                'Analysis Period (days)': periodDays,
              },
            },
          ],
        };
        break;
      }

      case 'backlog': {
        const backlog = await IndustrialKpiService.calculateBacklog(plant);
        report = {
          title: 'Maintenance Backlog Report',
          period: {
            start: new Date(Date.now() - 90 * 86400000).toISOString(),
            end: new Date().toISOString(),
          },
          generatedBy: session.username || 'System',
          plantId: plant,
          sections: [
            {
              title: 'Backlog Summary',
              type: 'summary',
              rows: [],
              summary: {
                'Total Open WOs': backlog.totalOpen,
                'Overdue': backlog.overdueCount,
                'Estimated Hours': backlog.estimatedHours,
                'Avg Resolution Hours': backlog.averageResolutionHours,
                'Oldest Unassigned': backlog.oldestUnassigned || 'None',
              },
            },
            {
              title: 'By Priority',
              type: 'table',
              headers: ['Priority', 'Count'],
              rows: Object.entries(backlog.byPriority).map(([k, v]) => [k, String(v)]),
            },
            {
              title: 'By Age',
              type: 'table',
              headers: ['Age Range', 'Count'],
              rows: Object.entries(backlog.byAge).map(([k, v]) => [k, String(v)]),
            },
          ],
        };
        break;
      }

      case 'dashboard': {
        const dashboard = await IndustrialKpiService.getKpiDashboard(plant);
        report = {
          title: 'Executive Dashboard Report',
          period: {
            start: new Date(Date.now() - 30 * 86400000).toISOString(),
            end: new Date().toISOString(),
          },
          generatedBy: session.username || 'System',
          plantId: plant,
          sections: [
            {
              title: 'OEE',
              type: 'summary',
              rows: [],
              summary: {
                'OEE (%)': dashboard.oee.oee,
                'Availability (%)': dashboard.oee.availability,
                'Performance (%)': dashboard.oee.performance,
                'Quality (%)': dashboard.oee.quality,
              },
            },
            {
              title: 'Reliability',
              type: 'summary',
              rows: [],
              summary: {
                'MTBF (hours)': dashboard.reliability.mtbf,
                'MTTR (hours)': dashboard.reliability.mttr,
                'Availability (%)': dashboard.reliability.availability,
                'Failure Rate (per 1000 hrs)': dashboard.reliability.failureRate,
                'PM Compliance (%)': dashboard.reliability.plannedMaintenanceCompliance,
              },
            },
            {
              title: 'Backlog',
              type: 'summary',
              rows: [],
              summary: {
                'Total Open': dashboard.backlog.totalOpen,
                'Overdue': dashboard.backlog.overdueCount,
                'Estimated Hours': dashboard.backlog.estimatedHours,
              },
            },
            {
              title: 'Production Impact',
              type: 'summary',
              rows: [],
              summary: dashboard.productionImpact as unknown as Record<string, unknown>,
            },
            {
              title: 'OEE Trend (6 periods)',
              type: 'table',
              headers: ['Period', 'OEE (%)', 'MTBF (hrs)', 'Backlog'],
              rows: dashboard.trends.map(t => [t.period, String(t.oee), String(t.mtbf), String(t.backlog)]),
            },
          ],
        };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown report type: ${reportType}` },
          { status: 400 },
        );
    }

    const download = ReportExportService.generateDownload(format, report);

    return new NextResponse(download.content, {
      headers: {
        'Content-Type': download.contentType,
        'Content-Disposition': `attachment; filename="${download.filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Report generation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
