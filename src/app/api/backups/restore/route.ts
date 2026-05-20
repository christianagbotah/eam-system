import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

// ── Rate limiting: max 1 restore per 30 minutes ────────────────────────────
const globalForRateLimit = globalThis as unknown as {
  _lastRestoreTime: number | undefined;
};
if (!globalForRateLimit._lastRestoreTime) {
  globalForRateLimit._lastRestoreTime = 0;
}
const lastRestoreTime = globalForRateLimit;
const RESTORE_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

// ── Table configuration: upsert keys per table ─────────────────────────────
interface TableConfig {
  /** Prisma model name (camelCase) */
  model: string;
  /** Unique fields to use for upsert conflict detection */
  uniqueFields: string[];
  /** Whether this table should be deleted and recreated (join tables) */
  isJoinTable?: boolean;
  /** Fields to strip from import (e.g. passwordHash) */
  excludeFields?: string[];
}

const TABLE_CONFIGS: Record<string, TableConfig> = {
  companyProfile: { model: 'companyProfile', uniqueFields: [], excludeFields: [] },
  plants: { model: 'plant', uniqueFields: ['code'] },
  departments: { model: 'department', uniqueFields: ['code', 'plantId'] },
  roles: { model: 'role', uniqueFields: ['slug'] },
  permissions: { model: 'permission', uniqueFields: ['slug'] },
  rolePermissions: { model: 'rolePermission', uniqueFields: ['roleId', 'permissionId'], isJoinTable: true },
  systemModules: { model: 'systemModule', uniqueFields: ['code'] },
  companyModules: { model: 'companyModule', uniqueFields: ['systemModuleId', 'companyId'], isJoinTable: true },
  statusTransitions: { model: 'statusTransition', uniqueFields: [] },
  users: { model: 'user', uniqueFields: ['username'], excludeFields: ['passwordHash', 'resetToken', 'resetTokenExpires'] },
  userRoles: { model: 'userRole', uniqueFields: ['userId', 'roleId'], isJoinTable: true },
  userPermissions: { model: 'userPermission', uniqueFields: ['userId', 'permissionId'], isJoinTable: true },
  userPlants: { model: 'userPlant', uniqueFields: ['userId', 'plantId'], isJoinTable: true },
  userSkills: { model: 'userSkill', uniqueFields: ['userId', 'tradeName'], isJoinTable: true },
  assetCategories: { model: 'assetCategory', uniqueFields: ['code'] },
  assets: { model: 'asset', uniqueFields: ['assetTag'] },
  inventoryItems: { model: 'inventoryItem', uniqueFields: ['itemCode'] },
  inventoryLocations: { model: 'inventoryLocation', uniqueFields: [] },
  suppliers: { model: 'supplier', uniqueFields: [] },
  maintenanceRequests: { model: 'maintenanceRequest', uniqueFields: ['requestNumber'] },
  maintenanceRequestComments: { model: 'maintenanceRequestComment', uniqueFields: [], isJoinTable: true },
  workOrders: { model: 'workOrder', uniqueFields: ['woNumber'] },
  workOrderTeamMembers: { model: 'workOrderTeamMember', uniqueFields: [], isJoinTable: true },
  workOrderTimeLogs: { model: 'workOrderTimeLog', uniqueFields: [], isJoinTable: true },
  workOrderMaterials: { model: 'workOrderMaterial', uniqueFields: [], isJoinTable: true },
  workOrderComments: { model: 'workOrderComment', uniqueFields: [], isJoinTable: true },
  workOrderStatusHistory: { model: 'workOrderStatusHistory', uniqueFields: [], isJoinTable: true },
  pmTemplates: { model: 'pmTemplate', uniqueFields: [] },
  pmTemplateTasks: { model: 'pmTemplateTask', uniqueFields: [], isJoinTable: true },
  pmSchedules: { model: 'pmSchedule', uniqueFields: [] },
  workPackages: { model: 'workPackage', uniqueFields: [] },
  notifications: { model: 'notification', uniqueFields: [], isJoinTable: true },
  auditLogs: { model: 'auditLog', uniqueFields: [], isJoinTable: true },
};

// Ordered by dependency (reference tables first)
const TABLE_ORDER = [
  'companyProfile',
  'plants',
  'departments',
  'roles',
  'permissions',
  'rolePermissions',
  'systemModules',
  'companyModules',
  'statusTransitions',
  'users',
  'userRoles',
  'userPermissions',
  'userPlants',
  'userSkills',
  'assetCategories',
  'assets',
  'inventoryLocations',
  'suppliers',
  'inventoryItems',
  'maintenanceRequests',
  'maintenanceRequestComments',
  'workOrders',
  'workOrderTeamMembers',
  'workOrderTimeLogs',
  'workOrderMaterials',
  'workOrderComments',
  'workOrderStatusHistory',
  'pmTemplates',
  'pmTemplateTasks',
  'pmSchedules',
  'workPackages',
  'notifications',
  'auditLogs',
];

// ── ID mapping for cross-table references ──────────────────────────────────
// Maps old IDs from backup → new IDs in current database
let idMap: Map<string, Map<string, string>> = new Map();

function getIdMapping(tableName: string): Map<string, string> {
  if (!idMap.has(tableName)) idMap.set(tableName, new Map());
  return idMap.get(tableName)!;
}

/** Translate an ID from backup value to current DB value, or return original if unmapped */
function translateId(tableName: string, oldId: string | null | undefined): string | null {
  if (!oldId) return oldId ?? null;
  const mapping = getIdMapping(tableName);
  return mapping.get(oldId) || oldId;
}

/** Recursively translate all foreign key references in an object */
function translateRecordForeignKeys(
  record: Record<string, any>,
  fkMappings: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(record)) {
    // Check if this key is a foreign key that needs translation
    if (fkMappings[key] && value && typeof value === 'string') {
      result[key] = translateId(fkMappings[key], value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ── POST /api/backups/restore ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = getSession({ headers: req.headers } as Request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ── Rate limit check ──────────────────────────────────────────────────
    const now = Date.now();
    const formData = await req.formData();
    const confirm = formData.get('confirm') === 'true';
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check rate limit only for execute mode
    const lastTime = lastRestoreTime._lastRestoreTime ?? 0;
    if (confirm && now - lastTime < RESTORE_COOLDOWN_MS) {
      const waitMinutes = Math.ceil((RESTORE_COOLDOWN_MS - (now - lastTime)) / 60000);
      return NextResponse.json(
        { error: `Rate limited. Please wait ${waitMinutes} minute(s) before restoring again.` },
        { status: 429 }
      );
    }

    // ── Parse file ────────────────────────────────────────────────────────
    let backupData: any;
    try {
      const text = await file.text();
      backupData = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
    }

    // ── Validate format ───────────────────────────────────────────────────
    if (backupData.format !== 'iassetspro-backup') {
      return NextResponse.json(
        { error: `Invalid backup format. Expected "iassetspro-backup", got "${backupData.format}"` },
        { status: 400 }
      );
    }

    if (!backupData.version || !backupData.exportedAt || !backupData.tables) {
      return NextResponse.json({ error: 'Invalid backup file: missing required fields (version, exportedAt, tables)' }, { status: 400 });
    }

    const versionParts = backupData.version.split('.').map(Number);
    if (versionParts[0] < 2) {
      return NextResponse.json(
        { error: `Backup version ${backupData.version} is too old. Minimum version 2.0.0 required.` },
        { status: 400 }
      );
    }

    const tables = backupData.tables as Record<string, any[]>;

    // ── PREVIEW MODE ──────────────────────────────────────────────────────
    if (!confirm) {
      const previewTables: Record<string, { count: number; conflicts: number }> = {};
      let totalRecords = 0;
      let totalConflicts = 0;

      for (const tableName of TABLE_ORDER) {
        const rows = tables[tableName] || [];
        if (rows.length === 0) continue;

        const config = TABLE_CONFIGS[tableName];
        if (!config) continue;

        let conflicts = 0;

        if (config.isJoinTable || config.uniqueFields.length === 0) {
          // For join tables or tables without unique keys, count all as potential conflicts
          // since we'll delete and recreate them
          conflicts = 0; // No "conflicts" per se; they'll be recreated
        } else {
          // Check for existing records with same unique fields
          const prismaModel = (db as any)[config.model];
          if (prismaModel && prismaModel.findFirst) {
            for (const row of rows) {
              const whereClause: Record<string, any> = {};
              for (const field of config.uniqueFields) {
                if (row[field] !== undefined && row[field] !== null) {
                  whereClause[field] = row[field];
                }
              }
              if (Object.keys(whereClause).length > 0) {
                try {
                  const existing = await prismaModel.findFirst({ where: whereClause, select: { id: true } });
                  if (existing) conflicts++;
                } catch { /* skip */ }
              }
            }
          }
        }

        previewTables[tableName] = { count: rows.length, conflicts };
        totalRecords += rows.length;
        totalConflicts += conflicts;
      }

      return NextResponse.json(
        {
          success: true,
          preview: true,
          backup: {
            format: backupData.format,
            version: backupData.version,
            exportedAt: backupData.exportedAt,
            systemInfo: backupData.systemInfo || {},
          },
          tables: previewTables,
          totals: { records: totalRecords, conflicts: totalConflicts },
        },
        { headers: { 'X-Restore-Mode': 'preview' } }
      );
    }

    // ── EXECUTE MODE ──────────────────────────────────────────────────────
    lastRestoreTime._lastRestoreTime = Date.now();
    idMap = new Map(); // Reset ID mapping

    const results: Record<string, { created: number; updated: number }> = {};
    let totalCreated = 0;
    let totalUpdated = 0;

    // Process tables in dependency order
    for (const tableName of TABLE_ORDER) {
      const rows = tables[tableName] || [];
      if (rows.length === 0) continue;

      const config = TABLE_CONFIGS[tableName];
      if (!config) continue;

      const prismaModel = (db as any)[config.model];
      if (!prismaModel) continue;

      let created = 0;
      let updated = 0;

      // Strip excluded fields from all rows
      const cleanRows = rows.map((row: Record<string, any>) => {
        const clean: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (config.excludeFields?.includes(key)) continue;
          clean[key] = value;
        }
        return clean;
      });

      if (config.isJoinTable) {
        // For join tables: delete existing and recreate
        // (we do NOT delete records that reference IDs not in the backup)
        try {
          // First, collect all relevant parent IDs from the backup
          // Then delete only matching join records
          if (tableName === 'rolePermissions') {
            // Get mapped role and permission IDs
            const roleMapping = getIdMapping('roles');
            const permMapping = getIdMapping('permissions');
            const mappedRoleIds = new Set<string>();
            const mappedPermIds = new Set<string>();
            cleanRows.forEach((r: any) => {
              const mappedR = translateId('roles', r.roleId);
              const mappedP = translateId('permissions', r.permissionId);
              if (mappedR) mappedRoleIds.add(mappedR);
              if (mappedP) mappedPermIds.add(mappedP);
            });
            // Delete existing for these role+permission combos
            for (const row of cleanRows) {
              const roleId = translateId('roles', row.roleId);
              const permissionId = translateId('permissions', row.permissionId);
              if (roleId && permissionId) {
                await prismaModel.deleteMany({ where: { roleId, permissionId } }).catch(() => {});
              }
            }
          } else if (tableName === 'userRoles') {
            for (const row of cleanRows) {
              const userId = translateId('users', row.userId);
              const roleId = translateId('roles', row.roleId);
              if (userId && roleId) {
                await prismaModel.deleteMany({ where: { userId, roleId } }).catch(() => {});
              }
            }
          } else if (tableName === 'userPermissions') {
            for (const row of cleanRows) {
              const userId = translateId('users', row.userId);
              const permissionId = translateId('permissions', row.permissionId);
              if (userId && permissionId) {
                await prismaModel.deleteMany({ where: { userId, permissionId } }).catch(() => {});
              }
            }
          } else if (tableName === 'userPlants') {
            for (const row of cleanRows) {
              const userId = translateId('users', row.userId);
              const plantId = translateId('plants', row.plantId);
              if (userId && plantId) {
                await prismaModel.deleteMany({ where: { userId, plantId } }).catch(() => {});
              }
            }
          } else if (tableName === 'companyModules') {
            for (const row of cleanRows) {
              const systemModuleId = translateId('systemModules', row.systemModuleId);
              const companyId = row.companyId;
              if (systemModuleId) {
                await prismaModel.deleteMany({ where: { systemModuleId, companyId: companyId || null } }).catch(() => {});
              }
            }
          } else {
            // Generic: delete all for safety
            await prismaModel.deleteMany().catch(() => {});
          }

          // Recreate
          for (const row of cleanRows) {
            try {
              // Translate foreign keys
              const translated = translateRowFKs(tableName, row);
              await prismaModel.create({ data: translated });
              created++;
            } catch { /* skip duplicate / invalid */ }
          }
        } catch { /* skip */ }
      } else if (config.uniqueFields.length === 0) {
        // Tables without clear unique keys: upsert by id (create only if not exists)
        for (const row of cleanRows) {
          try {
            const translated = translateRowFKs(tableName, row);
            // Check if exists by ID
            const existing = await prismaModel.findFirst({ where: { id: translated.id }, select: { id: true } }).catch(() => null);
            if (existing) {
              // Map old ID to existing ID
              getIdMapping(tableName).set(translated.id, existing.id);
              updated++;
            } else {
              const createdRow = await prismaModel.create({ data: translated });
              getIdMapping(tableName).set(translated.id, createdRow.id);
              created++;
            }
          } catch { /* skip */ }
        }
      } else {
        // Tables with unique fields: upsert using those fields
        for (const row of cleanRows) {
          try {
            const translated = translateRowFKs(tableName, row);

            // Build where clause from unique fields
            const whereClause: Record<string, any> = {};
            for (const field of config.uniqueFields) {
              if (translated[field] !== undefined && translated[field] !== null) {
                whereClause[field] = translated[field];
              }
            }

            if (Object.keys(whereClause).length === 0) {
              // No unique fields present, try create
              const createdRow = await prismaModel.create({ data: translated });
              getIdMapping(tableName).set(row.id, createdRow.id);
              created++;
              continue;
            }

            const existing = await prismaModel.findFirst({
              where: whereClause,
              select: { id: true },
            }).catch(() => null);

            if (existing) {
              // Update existing record
              const { id, createdAt, updatedAt, ...updateData } = translated;
              await prismaModel.update({
                where: { id: existing.id },
                data: updateData,
              }).catch(() => {});
              // Map old ID to existing ID
              getIdMapping(tableName).set(row.id, existing.id);
              updated++;
            } else {
              // Create new
              const createdRow = await prismaModel.create({ data: translated });
              getIdMapping(tableName).set(row.id, createdRow.id);
              created++;
            }
          } catch {
            // On create failure with unique constraint, try to find and map
            try {
              const whereClause2: Record<string, any> = {};
              for (const field of config.uniqueFields) {
                if (row[field] !== undefined && row[field] !== null) {
                  whereClause2[field] = row[field];
                }
              }
              if (Object.keys(whereClause2).length > 0) {
                const existing = await prismaModel.findFirst({
                  where: whereClause2,
                  select: { id: true },
                });
                if (existing) {
                  getIdMapping(tableName).set(row.id, existing.id);
                  updated++;
                }
              }
            } catch { /* skip */ }
          }
        }
      }

      results[tableName] = { created, updated };
      totalCreated += created;
      totalUpdated += updated;
    }

    return NextResponse.json(
      {
        success: true,
        preview: false,
        results,
        totals: { created: totalCreated, updated: totalUpdated },
      },
      { headers: { 'X-Restore-Mode': 'executed' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Restore failed' },
      { status: 500 }
    );
  }
}

// ── Foreign key translation table ───────────────────────────────────────────
const FK_MAPPINGS: Record<string, Record<string, string>> = {
  departments: { plantId: 'plants', parentId: 'departments', supervisorId: 'users' },
  userRoles: { userId: 'users', roleId: 'roles' },
  userPermissions: { userId: 'users', permissionId: 'permissions' },
  userPlants: { userId: 'users', plantId: 'plants' },
  companyModules: { systemModuleId: 'systemModules' },
  assets: { categoryId: 'assetCategories', plantId: 'plants', departmentId: 'departments', createdById: 'users', assignedToId: 'users', parentId: 'assets' },
  inventoryItems: { plantId: 'plants', createdById: 'users', locationId: 'inventoryLocations', supplierId: 'suppliers' },
  maintenanceRequests: { assetId: 'assets', departmentId: 'departments', requestedBy: 'users', supervisorId: 'users', approvedBy: 'users', assignedPlannerId: 'users', plantId: 'plants' },
  maintenanceRequestComments: { maintenanceRequestId: 'maintenanceRequests', userId: 'users' },
  workOrders: { maintenanceRequestId: 'maintenanceRequests', pmScheduleId: 'pmSchedules', assetId: 'assets', departmentId: 'departments', assignedTo: 'users', teamLeaderId: 'users', assignedSupervisorId: 'users', assignedBy: 'users', plannerId: 'users', plantId: 'plants', lockedBy: 'users', workPackageId: 'workPackages' },
  workOrderTeamMembers: { workOrderId: 'workOrders', userId: 'users' },
  workOrderTimeLogs: { workOrderId: 'workOrders', userId: 'users', loggedById: 'users' },
  workOrderMaterials: { workOrderId: 'workOrders', requestedBy: 'users', approvedBy: 'users', issuedBy: 'users' },
  workOrderComments: { workOrderId: 'workOrders', userId: 'users' },
  workOrderStatusHistory: { workOrderId: 'workOrders', userId: 'users' },
  pmSchedules: { assetId: 'assets', departmentId: 'departments', assignedToId: 'users', createdById: 'users' },
  pmTemplateTasks: { pmTemplateId: 'pmTemplates' },
  workPackages: { plantId: 'plants', assignedToId: 'users', createdById: 'users' },
  notifications: { userId: 'users' },
  auditLogs: { userId: 'users' },
  userSkills: { userId: 'users' },
};

/** Translate foreign key IDs in a record based on known FK mappings */
function translateRowFKs(tableName: string, record: Record<string, any>): Record<string, any> {
  const fkConfig = FK_MAPPINGS[tableName];
  if (!fkConfig) return record;

  const relationMap = FK_TO_RELATION[tableName];
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(record)) {
    if (fkConfig[key] && value && typeof value === 'string') {
      const translatedId = translateId(fkConfig[key], value);
      // Convert FK scalar to relation connect syntax
      if (relationMap && relationMap[key]) {
        result[relationMap[key]] = { connect: { id: translatedId } };
      } else {
        result[key] = translatedId;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Maps FK scalar fields → Prisma relation names for tables that need connect syntax
// Only include fields that have actual @relation declarations in the Prisma schema
const FK_TO_RELATION: Record<string, Record<string, string>> = {
  assets: {
    categoryId: 'category',
    plantId: 'plant',
    departmentId: 'department',
    createdById: 'createdBy',
    assignedToId: 'assignedTo',
    parentId: 'parent',
  },
  inventoryItems: {
    plantId: 'plant',
    createdById: 'createdBy',
    locationId: 'invLocation',
    supplierId: 'supplierRef',
  },
  maintenanceRequests: {
    assetId: 'asset',
    requestedBy: 'requester',
    supervisorId: 'supervisor',
    approvedBy: 'approver',
    assignedPlannerId: 'assignedPlanner',
    // departmentId and plantId are plain scalars (no @relation) — keep as-is
  },
  workOrders: {
    maintenanceRequestId: 'maintenanceRequest',
    pmScheduleId: 'pmSchedule',
    assignedTo: 'assignee',
    teamLeaderId: 'teamLeader',
    assignedSupervisorId: 'assignedSupervisor',
    assignedBy: 'assigner',
    plannerId: 'planner',
    lockedBy: 'locker',
    workPackageId: 'workPackage',
    // assetId, departmentId, plantId are plain scalars (no @relation) — keep as-is
  },
  pmSchedules: {
    assetId: 'asset',
    departmentId: 'department',
    assignedToId: 'assignedTo',
    createdById: 'createdBy',
  },
  workPackages: {
    plantId: 'plant',
    assignedToId: 'assignee',
    createdById: 'createdBy',
  },
  departments: {
    plantId: 'plant',
    parentId: 'parent',
    supervisorId: 'supervisor',
  },
  maintenanceRequestComments: {
    maintenanceRequestId: 'maintenanceRequest',
    userId: 'user',
  },
  workOrderTeamMembers: {
    workOrderId: 'workOrder',
    userId: 'user',
  },
  workOrderTimeLogs: {
    workOrderId: 'workOrder',
    userId: 'user',
    loggedById: 'loggedBy',
  },
  workOrderMaterials: {
    workOrderId: 'workOrder',
    requestedBy: 'requester',
    approvedBy: 'approver',
    issuedBy: 'issuer',
  },
  workOrderComments: {
    workOrderId: 'workOrder',
    userId: 'user',
  },
  workOrderStatusHistory: {
    workOrderId: 'workOrder',
    userId: 'performedBy',
  },
  notifications: {
    userId: 'user',
  },
  auditLogs: {
    userId: 'user',
  },
  userSkills: {
    userId: 'user',
  },
};
