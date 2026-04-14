import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// GET /api/admin/system-health
export async function GET(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();

    // Run all queries in parallel
    const [
      userCount,
      assetCount,
      workOrderCount,
      maintenanceRequestCount,
      inventoryItemCount,
      safetyIncidentCount,
      qualityInspectionCount,
      productionOrderCount,
      activeSessions,
      recentAuditLogs,
      overdueWorkOrders,
      breachedSlaWorkOrders,
      roleCount,
      permissionCount,
      plantCount,
      departmentCount,
      pmScheduleCount,
    ] = await Promise.all([
      // User stats
      db.user.count(),
      // Key model counts
      db.asset.count(),
      db.workOrder.count(),
      db.maintenanceRequest.count(),
      db.inventoryItem.count(),
      db.safetyIncident.count(),
      db.qualityInspection.count(),
      db.productionOrder.count(),
      // Active sessions (not expired)
      db.session.count({ where: { expiresAt: { gt: now } } }),
      // Recent audit logs (last 10)
      db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, fullName: true, username: true } },
        },
      }),
      // Overdue work orders (past plannedEnd, not completed/closed/cancelled)
      db.workOrder.count({
        where: {
          plannedEnd: { lt: now },
          status: { notIn: ['completed', 'closed', 'cancelled', 'draft'] },
        },
      }),
      // Breached SLA work orders
      db.workOrder.count({
        where: { slaBreached: true },
      }),
      // Additional counts
      db.role.count(),
      db.permission.count(),
      db.plant.count(),
      db.department.count(),
      db.pmSchedule.count(),
    ]);

    // Database file size
    let dbSizeBytes = 0;
    try {
      const dbPath = path.join(process.cwd(), 'db', 'custom.db');
      const stats = fs.statSync(dbPath);
      dbSizeBytes = stats.size;
    } catch {
      // DB file not found or inaccessible
    }

    // Process memory and uptime
    const memUsage = process.memoryUsage();
    const uptimeSeconds = process.uptime();

    // Format helpers
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const formatUptime = (seconds: number): string => {
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      if (s > 0 || parts.length === 0) parts.push(`${s}s`);
      return parts.join(' ');
    };

    return NextResponse.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: now.toISOString(),
        // System
        uptime: formatUptime(uptimeSeconds),
        uptimeSeconds,
        memory: {
          rss: formatBytes(memUsage.rss),
          heapUsed: formatBytes(memUsage.heapUsed),
          heapTotal: formatBytes(memUsage.heapTotal),
          external: formatBytes(memUsage.external),
          rssBytes: memUsage.rss,
          heapUsedBytes: memUsage.heapUsed,
          heapTotalBytes: memUsage.heapTotal,
        },
        // Database
        database: {
          totalRecords: userCount + assetCount + workOrderCount + maintenanceRequestCount + inventoryItemCount + safetyIncidentCount + qualityInspectionCount + productionOrderCount,
          dbSize: formatBytes(dbSizeBytes),
          dbSizeBytes,
          tables: 14, // approximate model count
        },
        // Users
        users: {
          total: userCount,
          roles: roleCount,
          permissions: permissionCount,
          activeSessions,
        },
        // Organization
        organization: {
          plants: plantCount,
          departments: departmentCount,
        },
        // Module counts
        modules: {
          assets: assetCount,
          workOrders: workOrderCount,
          maintenanceRequests: maintenanceRequestCount,
          inventoryItems: inventoryItemCount,
          safetyIncidents: safetyIncidentCount,
          qualityInspections: qualityInspectionCount,
          productionOrders: productionOrderCount,
          pmSchedules: pmScheduleCount,
        },
        // Overdue items
        overdue: {
          workOrders: overdueWorkOrders,
          breachedSlas: breachedSlaWorkOrders,
          total: overdueWorkOrders + breachedSlaWorkOrders,
        },
        // Recent activity
        recentActivity: recentAuditLogs.map((log) => ({
          id: log.id,
          action: log.action || 'unknown',
          entity: log.entityType || '',
          entityId: log.entityId || '',
          details: log.details || '',
          user: log.user ? { fullName: log.user.fullName, username: log.user.username } : null,
          createdAt: log.createdAt,
        })),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch system health';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
