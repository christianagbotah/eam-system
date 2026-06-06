import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

// ============================================================================
// Escalation Summary — GET
//
// Returns:
// - Counts of currently overdue MRs, WOs, Safety Incidents
// - Recent escalation history from escalation_logs table
// - Requires admin authentication
// ============================================================================

interface EscalationConfig {
  enabled: boolean;
  maintenanceRequests?: {
    level1ThresholdHours: number;
  };
  safetyIncidents?: {
    level1ThresholdHours: number;
  };
  lastCheckAt: string | null;
  lastCheckResults: Record<string, unknown> | null;
}

async function readConfig(): Promise<EscalationConfig> {
  try {
    const row = await db.systemConfig.findUnique({ where: { key: 'escalation' } });
    if (row?.config) {
      return JSON.parse(row.config);
    }
  } catch { /* ignore */ }
  return { enabled: true, lastCheckAt: null, lastCheckResults: null };
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const config = await readConfig();

    // ── Currently overdue Maintenance Requests ──
    const mrConfig = config.maintenanceRequests || { level1ThresholdHours: 24 };
    const mrLevel1Cutoff = new Date(now.getTime() - mrConfig.level1ThresholdHours * 60 * 60 * 1000);

    const overdueMrs = await db.maintenanceRequest.findMany({
      where: {
        status: { in: ['pending', 'in_progress'] },
        createdAt: { lte: mrLevel1Cutoff },
      },
      select: {
        id: true,
        requestNumber: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
        escalationLevel: true,
        lastEscalatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // ── Currently overdue Work Orders ──
    const overdueWos = await db.workOrder.findMany({
      where: {
        status: { in: ['assigned', 'in_progress'] },
        plannedEnd: { not: null, lt: now },
      },
      select: {
        id: true,
        woNumber: true,
        title: true,
        priority: true,
        status: true,
        plannedEnd: true,
        escalationLevel: true,
        lastEscalatedAt: true,
      },
      orderBy: { plannedEnd: 'asc' },
      take: 50,
    });

    // ── Currently overdue Safety Incidents ──
    const siConfig = config.safetyIncidents || { level1ThresholdHours: 4 };
    const siLevel1Cutoff = new Date(now.getTime() - siConfig.level1ThresholdHours * 60 * 60 * 1000);

    const overdueIncidents = await db.safetyIncident.findMany({
      where: {
        status: { in: ['open', 'investigating'] },
        createdAt: { lte: siLevel1Cutoff },
      },
      select: {
        id: true,
        incidentNumber: true,
        title: true,
        severity: true,
        status: true,
        createdAt: true,
        escalationLevel: true,
        lastEscalatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // ── Recent escalation logs ──
    const recentLogs = await db.escalationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Count escalation logs by entity type
    const [mrLogCount, woLogCount, siLogCount] = await Promise.all([
      db.escalationLog.count({ where: { entityType: 'maintenance_request' } }),
      db.escalationLog.count({ where: { entityType: 'work_order' } }),
      db.escalationLog.count({ where: { entityType: 'safety_incident' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          overdueMaintenanceRequests: overdueMrs.length,
          overdueWorkOrders: overdueWos.length,
          overdueSafetyIncidents: overdueIncidents.length,
          totalEscalationLogs: mrLogCount + woLogCount + siLogCount,
          escalationLogsByType: {
            maintenanceRequests: mrLogCount,
            workOrders: woLogCount,
            safetyIncidents: siLogCount,
          },
        },
        config: {
          enabled: config.enabled,
          lastCheckAt: config.lastCheckAt,
          lastCheckResults: config.lastCheckResults,
        },
        overdue: {
          maintenanceRequests: overdueMrs,
          workOrders: overdueWos,
          safetyIncidents: overdueIncidents,
        },
        recentLogs,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load escalation summary';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
