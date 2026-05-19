import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

const DATA_FILE = join(process.cwd(), 'data', 'backups.json');

interface BackupEntry {
  id: string;
  date: string;
  type: 'Automatic' | 'Manual';
  size: string;
  status: 'completed' | 'failed';
  recordCount?: number;
  createdBy?: string;
  version?: string;
}

async function readBackups(): Promise<BackupEntry[]> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeBackups(backups: BackupEntry[]): Promise<void> {
  try {
    await mkdir(join(process.cwd(), 'data'), { recursive: true });
  } catch {
    // directory already exists
  }
  await writeFile(DATA_FILE, JSON.stringify(backups, null, 2), 'utf-8');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// GET /api/backups — list backup history
export async function GET(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const backups = await readBackups();
    return NextResponse.json({ success: true, data: backups });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read backups' }, { status: 500 });
  }
}

// POST /api/backups — create a server-side backup and return downloadable JSON
export async function POST(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session, 'system_settings.update') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const backupStart = Date.now();

    // ── Export all tables in dependency order ──────────────────────────────
    const tables: Record<string, any[]> = {};

    // 1. CompanyProfile
    const companyProfiles = await db.companyProfile.findMany();
    tables['companyProfile'] = companyProfiles;

    // 2. Plant
    const plants = await db.plant.findMany();
    tables['plants'] = plants;

    // 3. Department
    const departments = await db.department.findMany();
    tables['departments'] = departments;

    // 4. Role, Permission, RolePermission
    const roles = await db.role.findMany();
    tables['roles'] = roles;
    const permissions = await db.permission.findMany();
    tables['permissions'] = permissions;
    const rolePermissions = await db.rolePermission.findMany();
    tables['rolePermissions'] = rolePermissions;

    // 5. SystemModule, CompanyModule
    const systemModules = await db.systemModule.findMany();
    tables['systemModules'] = systemModules;
    const companyModules = await db.companyModule.findMany();
    tables['companyModules'] = companyModules;

    // 6. StatusTransition
    const statusTransitions = await db.statusTransition.findMany();
    tables['statusTransitions'] = statusTransitions;

    // 7. User, UserRole, UserPermission, UserPlant, UserSkill
    const users = await db.user.findMany({
      select: {
        id: true, username: true, email: true, fullName: true, staffId: true,
        phone: true, avatar: true, department: true, status: true,
        isVendorAdmin: true, notificationPreferences: true, preferences: true,
        primaryTrade: true, createdAt: true, updatedAt: true,
        // Explicitly exclude passwordHash, resetToken, resetTokenExpires
      },
    });
    tables['users'] = users;

    const userRoles = await db.userRole.findMany();
    tables['userRoles'] = userRoles;
    const userPermissions = await db.userPermission.findMany();
    tables['userPermissions'] = userPermissions;
    const userPlants = await db.userPlant.findMany();
    tables['userPlants'] = userPlants;
    const userSkills = await db.userSkill.findMany();
    tables['userSkills'] = userSkills;

    // 8. AssetCategory, Asset
    const assetCategories = await db.assetCategory.findMany();
    tables['assetCategories'] = assetCategories;
    const assets = await db.asset.findMany();
    tables['assets'] = assets;

    // 9. InventoryItem, InventoryLocation, Supplier
    const inventoryItems = await db.inventoryItem.findMany();
    tables['inventoryItems'] = inventoryItems;
    const inventoryLocations = await db.inventoryLocation.findMany();
    tables['inventoryLocations'] = inventoryLocations;
    const suppliers = await db.supplier.findMany();
    tables['suppliers'] = suppliers;

    // 10. MaintenanceRequest, MaintenanceRequestComment
    const maintenanceRequests = await db.maintenanceRequest.findMany();
    tables['maintenanceRequests'] = maintenanceRequests;
    const maintenanceRequestComments = await db.maintenanceRequestComment.findMany();
    tables['maintenanceRequestComments'] = maintenanceRequestComments;

    // 11. WorkOrder and sub-tables
    const workOrders = await db.workOrder.findMany();
    tables['workOrders'] = workOrders;
    const woTeamMembers = await db.workOrderTeamMember.findMany();
    tables['workOrderTeamMembers'] = woTeamMembers;
    const woTimeLogs = await db.workOrderTimeLog.findMany();
    tables['workOrderTimeLogs'] = woTimeLogs;
    const woMaterials = await db.workOrderMaterial.findMany();
    tables['workOrderMaterials'] = woMaterials;
    const woComments = await db.workOrderComment.findMany();
    tables['workOrderComments'] = woComments;
    const woStatusHistory = await db.workOrderStatusHistory.findMany();
    tables['workOrderStatusHistory'] = woStatusHistory;

    // 12. PmTemplate, PmTemplateTask, PmSchedule
    const pmTemplates = await db.pmTemplate.findMany();
    tables['pmTemplates'] = pmTemplates;
    const pmTemplateTasks = await db.pmTemplateTask.findMany();
    tables['pmTemplateTasks'] = pmTemplateTasks;
    const pmSchedules = await db.pmSchedule.findMany();
    tables['pmSchedules'] = pmSchedules;

    // 13. WorkPackage
    const workPackages = await db.workPackage.findMany();
    tables['workPackages'] = workPackages;

    // 14. Notification
    const notifications = await db.notification.findMany();
    tables['notifications'] = notifications;

    // 15. AuditLog (last 1000 by date desc)
    const auditLogs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    tables['auditLogs'] = auditLogs;

    // ── Build backup object ───────────────────────────────────────────────
    const totalRecords = Object.values(tables).reduce((sum, rows) => sum + rows.length, 0);

    const backup = {
      format: 'iassetspro-backup',
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      systemInfo: {
        companyName: companyProfiles[0]?.companyName || 'N/A',
        plantCount: plants.length,
        userCount: users.length,
        assetCount: assets.length,
        workOrderCount: workOrders.length,
      },
      tables,
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const jsonBytes = Buffer.byteLength(jsonStr, 'utf-8');
    const sizeStr = formatBytes(jsonBytes);
    const exportDuration = Date.now() - backupStart;

    // ── Record in history ─────────────────────────────────────────────────
    const backups = await readBackups();
    const entry: BackupEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date: new Date().toISOString(),
      type: 'Manual',
      size: sizeStr,
      status: 'completed',
      recordCount: totalRecords,
      createdBy: session.userId || undefined,
      version: '3.0.0',
    };
    backups.unshift(entry);
    if (backups.length > 50) backups.length = 50;
    await writeBackups(backups);

    // ── Return downloadable file ──────────────────────────────────────────
    const filename = `iassetspro-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Records': totalRecords.toString(),
        'X-Export-Duration-Ms': exportDuration.toString(),
      },
    });
  } catch (err: any) {
    // Record failed backup attempt
    try {
      const session = getSession({ headers: req.headers } as Request);
      const backups = await readBackups();
      backups.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        date: new Date().toISOString(),
        type: 'Manual',
        size: '0 KB',
        status: 'failed',
        createdBy: session?.userId || undefined,
        version: '3.0.0',
      });
      if (backups.length > 50) backups.length = 50;
      await writeBackups(backups);
    } catch { /* ignore history write failure */ }

    return NextResponse.json(
      { success: false, error: err.message || 'Backup failed' },
      { status: 500 }
    );
  }
}
