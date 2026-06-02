/**
 * Sync role-permission mappings from seed definitions to the database.
 *
 * This script:
 * 1. Reads the role-permission matrix from seed.ts
 * 2. Clears ALL existing role-permission mappings
 * 3. Re-inserts them fresh from the seed definitions
 * 4. Clears the session cache so new permissions take effect immediately
 *
 * Run on VPS:
 *   cd /home/ifleetpro/git/eam-system && bun run scripts/sync-role-permissions.ts
 *
 * Run locally:
 *   bun run scripts/sync-role-permissions.ts
 *
 * This is safe to run multiple times — it replaces all mappings.
 * It will NOT delete existing roles, users, or permissions.
 * After running, all active sessions will be refreshed on next request.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ══════════════════════════════════════════════════════════════════════════
// Role → Permission Matrix (must match prisma/seed.ts)
// ══════════════════════════════════════════════════════════════════════════

const ROLE_PERMISSIONS: Record<string, string[]> = {
  // ── 1. ADMIN: all permissions (handled programmatically — skip) ──
  admin: [],

  // ── 2. PLANT MANAGER: broad view + limited create/update ──
  plant_manager: [
    'dashboard.view', 'dashboard.stats', 'chat.view',
    'documents.view', 'documents.upload', 'documents.download',
    'notifications.view', 'notifications.manage',
    'assets.view', 'assets.view_all', 'assets.health', 'assets.criticality',
    'equipment.view',
    'facilities.view',
    'departments.view', 'departments.create', 'departments.update',
    'plants.view', 'plants.create', 'plants.update',
    'company.view', 'company.update',
    'work_orders.view', 'work_orders.view_all',
    'work_orders.assign_supervisor', 'work_orders.assign_technician',
    'work_orders.complete', 'work_orders.verify', 'work_orders.reopen',
    'work_orders.close', 'work_orders.cancel',
    'work_orders.dashboard',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'maintenance_requests.approve', 'maintenance_requests.reject',
    'maintenance_requests.triage',
    'pm_schedules.view', 'pm_schedules.activate', 'pm_schedules.run',
    'pm_templates.view', 'pm_triggers.view',
    'calibration.view',
    'inventory.view', 'inventory.view_all',
    'parts.view',
    'vendors.view',
    'purchase_orders.view',
    'production.view',
    'production_surveys.view',
    'oee.view',
    'downtime.view',
    'quality_checks.view',
    'energy.view',
    'safety_incidents.view', 'safety_inspections.view', 'safety_equipment.view', 'safety_permits.view',
    'iot_devices.view',
    'digital_twin.view',
    'reports.view', 'reports.export', 'reports.generate', 'reports.create',
    'analytics.view', 'operations.view', 'quality.view', 'safety.view',
    'users.view', 'employees.view', 'shifts.view', 'training.view',
    'tools.view',
    'audit_logs.view',
  ],

  // ── 3. MAINTENANCE MANAGER: full WO, MR, PM, assets ──
  maintenance_manager: [
    'dashboard.view', 'dashboard.stats', 'chat.view',
    'documents.view', 'documents.upload', 'documents.download',
    'notifications.view', 'notifications.manage',
    'assets.view', 'assets.view_all', 'assets.create', 'assets.update', 'assets.delete',
    'assets.export', 'assets.manage',
    'equipment.view', 'equipment.create', 'equipment.update', 'equipment.delete',
    'facilities.view', 'facilities.create', 'facilities.update',
    'meters.view', 'meters.create', 'meters.update', 'meters.read',
    'work_orders.view', 'work_orders.view_all',
    'work_orders.create', 'work_orders.update', 'work_orders.delete',
    'work_orders.assign_supervisor', 'work_orders.assign_technician',
    'work_orders.start', 'work_orders.complete', 'work_orders.verify',
    'work_orders.reopen', 'work_orders.close', 'work_orders.cancel',
    'work_orders.adjust_cost', 'work_orders.dashboard', 'work_orders.bulk_update',
    'work_orders.failure_analysis',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'maintenance_requests.create', 'maintenance_requests.update', 'maintenance_requests.delete',
    'maintenance_requests.approve', 'maintenance_requests.reject',
    'maintenance_requests.triage', 'maintenance_requests.assign_planner',
    'maintenance_requests.convert_to_wo',
    'pm_schedules.view', 'pm_schedules.create', 'pm_schedules.update', 'pm_schedules.delete',
    'pm_schedules.activate', 'pm_schedules.run',
    'pm_templates.view', 'pm_templates.create', 'pm_templates.update', 'pm_templates.delete',
    'pm_triggers.view', 'pm_triggers.create', 'pm_triggers.update',
    'pm_checklists.view',
    'pm_notifications.view',
    'calibration.view', 'calibration.create', 'calibration.update', 'calibration.delete',
    'calibration.manage',
    'tools.view', 'tools.checkout', 'tools.return',
    'inventory.view', 'inventory.view_all',
    'parts.view',
    'time_logs.view', 'time_logs.create', 'time_logs.update',
    'sla.view', 'sla.manage',
    'rca.view', 'rca.create', 'rca.update',
    'failure_analysis.view', 'failure_analysis.create',
    'assistance_requests.view', 'assistance_requests.create',
    'reports.view', 'reports.export', 'reports.generate', 'reports.create',
    'analytics.view', 'operations.view',
    'employees.view',
  ],

  // ── 4. PRODUCTION MANAGER: full MPMP ──
  production_manager: [
    'dashboard.view', 'dashboard.stats', 'chat.view',
    'documents.view', 'documents.upload', 'documents.download',
    'notifications.view', 'notifications.manage',
    'assets.view', 'assets.view_all', 'assets.health', 'assets.criticality',
    'equipment.view',
    'facilities.view',
    'work_centers.view', 'work_centers.create', 'work_centers.update',
    'production.view', 'production.create', 'production.update', 'production.manage',
    'production_surveys.view', 'production_surveys.create', 'production_surveys.update', 'production_surveys.manage',
    'oee.view', 'oee.manage',
    'downtime.view', 'downtime.create', 'downtime.manage',
    'quality_checks.view', 'quality_checks.create', 'quality_checks.update',
    'energy.view', 'energy.manage',
    'production_targets.view', 'production_targets.create', 'production_targets.update',
    'production_batches.view', 'production_batches.create', 'production_batches.update',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'maintenance_requests.create',
    'work_orders.view', 'work_orders.view_all',
    'inventory.view', 'inventory.view_all',
    'employees.view', 'shifts.view', 'assignments.view',
    'reports.view', 'reports.export', 'reports.generate', 'reports.create',
    'analytics.view', 'operations.view',
  ],

  // ── 5. INVENTORY MANAGER: full IMS ──
  inventory_manager: [
    'dashboard.view', 'dashboard.stats', 'chat.view',
    'documents.view', 'documents.upload', 'documents.download',
    'notifications.view', 'notifications.manage',
    'inventory.view', 'inventory.view_all', 'inventory.create', 'inventory.update',
    'inventory.delete', 'inventory.stock_in', 'inventory.stock_out', 'inventory.reserve',
    'inventory.consume', 'inventory.export', 'inventory.manage', 'inventory.forecast',
    'parts.view', 'parts.create', 'parts.update', 'parts.delete',
    'categories.view', 'categories.create', 'categories.update',
    'material_requisitions.view', 'material_requisitions.create', 'material_requisitions.update',
    'vendors.view', 'vendors.create', 'vendors.update', 'vendors.delete', 'vendors.manage',
    'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.update',
    'purchase_orders.approve', 'purchase_orders.receive', 'purchase_orders.manage',
    'stock_transactions.view', 'stock_transactions.create',
    'inventory_locations.view', 'inventory_locations.create', 'inventory_locations.update',
    'inventory_adjustments.view', 'inventory_adjustments.create',
    'inventory_transfers.view', 'inventory_transfers.create', 'inventory_transfers.update',
    'assets.view', 'assets.view_all',
    'work_orders.view', 'work_orders.view_all',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'reports.view', 'reports.export', 'reports.generate',
    'tools.view',
    'employees.view',
  ],

  // ── 6. MAINTENANCE PLANNER: RWOP + MRMP manage ──
  maintenance_planner: [
    'dashboard.view', 'dashboard.stats', 'chat.view',
    'documents.view', 'documents.upload', 'documents.download',
    'notifications.view', 'notifications.manage',
    'assets.view', 'assets.view_all', 'assets.create', 'assets.update',
    'assets.export',
    'equipment.view',
    'facilities.view', 'facilities.create', 'facilities.update',
    'meters.view', 'meters.create', 'meters.update', 'meters.read',
    'work_orders.view', 'work_orders.view_all',
    'work_orders.create', 'work_orders.update', 'work_orders.delete',
    'work_orders.assign_supervisor', 'work_orders.assign_technician',
    'work_orders.dashboard', 'work_orders.bulk_update',
    'work_orders.close', 'work_orders.cancel',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'maintenance_requests.update',
    'maintenance_requests.triage', 'maintenance_requests.assign_planner',
    'maintenance_requests.convert_to_wo',
    'maintenance_requests.my_queue', 'maintenance_requests.archive',
    'pm_schedules.view', 'pm_schedules.create', 'pm_schedules.update', 'pm_schedules.delete',
    'pm_schedules.activate', 'pm_schedules.run',
    'pm_templates.view', 'pm_templates.create', 'pm_templates.update', 'pm_templates.delete',
    'pm_triggers.view', 'pm_triggers.create', 'pm_triggers.update',
    'pm_checklists.view',
    'pm_notifications.view',
    'calibration.view', 'calibration.create', 'calibration.update', 'calibration.delete',
    'tools.view', 'tools.checkout', 'tools.return',
    'inventory.view', 'inventory.view_all',
    'parts.view',
    'time_logs.view', 'time_logs.create',
    'sla.view', 'sla.manage',
    'rca.view', 'rca.create', 'rca.update',
    'failure_analysis.view', 'failure_analysis.create',
    'assistance_requests.view', 'assistance_requests.create',
    'reports.view', 'reports.export', 'reports.generate', 'reports.create',
    'analytics.view', 'operations.view',
    'employees.view',
  ],

  // ── 7. MAINTENANCE SUPERVISOR: WO manage + execute, approve/reject ──
  maintenance_supervisor: [
    'dashboard.view', 'dashboard.stats', 'chat.view',
    'documents.view', 'documents.upload', 'documents.download',
    'notifications.view', 'notifications.manage',
    'assets.view', 'assets.view_all', 'assets.health', 'assets.criticality',
    'equipment.view',
    'work_orders.view', 'work_orders.view_all',
    'work_orders.create', 'work_orders.update',
    'work_orders.assign_technician',
    'work_orders.complete', 'work_orders.verify', 'work_orders.reopen',
    'work_orders.dashboard',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'maintenance_requests.approve', 'maintenance_requests.reject',
    'maintenance_requests.update',
    'pm_schedules.view', 'pm_schedules.run',
    'pm_checklists.view',
    'calibration.view',
    'tools.view', 'tools.checkout', 'tools.return',
    'inventory.view',
    'parts.view',
    'time_logs.view', 'time_logs.create', 'time_logs.update',
    'assistance_requests.view', 'assistance_requests.create',
    'reports.view', 'reports.export', 'reports.generate',
    'analytics.view', 'operations.view',
    'employees.view', 'shifts.view',
    'downtime.view',
    'quality_checks.view',
  ],

  // ── 8. SAFETY OFFICER: full safety management ──
  safety_officer: [
    'dashboard.view', 'chat.view',
    'documents.view', 'documents.upload', 'documents.download',
    'notifications.view',
    'safety_incidents.view', 'safety_incidents.create', 'safety_incidents.update', 'safety_incidents.manage',
    'safety_inspections.view', 'safety_inspections.create', 'safety_inspections.update', 'safety_inspections.manage',
    'safety_equipment.view', 'safety_equipment.create', 'safety_equipment.update',
    'safety_permits.view', 'safety_permits.create', 'safety_permits.approve', 'safety_permits.close',
    'risk_assessment.view', 'risk_assessment.create', 'risk_assessment.update',
    'assets.view', 'assets.view_all',
    'equipment.view',
    'employees.view',
    'work_orders.view', 'work_orders.view_all',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'reports.view', 'reports.export',
  ],

  // ── 9. QUALITY MANAGER: full quality + calibration ──
  quality_manager: [
    'dashboard.view', 'dashboard.stats', 'chat.view',
    'documents.view', 'documents.upload', 'documents.download',
    'notifications.view', 'notifications.manage',
    'quality_inspections.view', 'quality_inspections.create', 'quality_inspections.update', 'quality_inspections.delete',
    'quality_ncr.view', 'quality_ncr.create', 'quality_ncr.update', 'quality_ncr.delete',
    'quality_audits.view', 'quality_audits.create', 'quality_audits.update', 'quality_audits.delete',
    'quality_control_plans.view', 'quality_control_plans.create', 'quality_control_plans.update',
    'spc.view', 'spc.manage',
    'calibration.view', 'calibration.create', 'calibration.update', 'calibration.delete', 'calibration.manage',
    'assets.view', 'assets.view_all',
    'equipment.view',
    'meters.view',
    'work_orders.view', 'work_orders.view_all',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'reports.view', 'reports.export', 'reports.generate',
    'analytics.view', 'quality.view',
  ],

  // ── 10. HR MANAGER: full HRMS ──
  hr_manager: [
    'dashboard.view', 'dashboard.stats', 'chat.view',
    'documents.view', 'documents.upload', 'documents.download',
    'notifications.view', 'notifications.manage',
    'employees.view', 'employees.create', 'employees.update', 'employees.delete', 'employees.manage',
    'shifts.view', 'shifts.create', 'shifts.update', 'shifts.manage',
    'shift_handovers.view', 'shift_handovers.create', 'shift_handovers.update',
    'training.view', 'training.create', 'training.update', 'training.manage',
    'skills.view', 'skills.create', 'skills.update', 'skills.manage',
    'skill_categories.view', 'skill_categories.create', 'skill_categories.update',
    'technician_groups.view', 'technician_groups.create', 'technician_groups.update',
    'assignments.view',
    'departments.view',
    'plants.view',
    'operations.view',
    'system_settings.view',
    'time_logs.view', 'time_logs.manage',
  ],

  // ── 11. IOT ENGINEER: full IoT + predictive ──
  iot_engineer: [
    'dashboard.view', 'chat.view',
    'documents.view', 'documents.download',
    'notifications.view',
    'iot_devices.view', 'iot_devices.create', 'iot_devices.update', 'iot_devices.delete',
    'iot_rules.view', 'iot_rules.create', 'iot_rules.update', 'iot_rules.delete',
    'iot.view',
    'predictive.view', 'predictive.analyze',
    'condition_monitoring.view', 'condition_monitoring.manage',
    'meters.view', 'meters.create', 'meters.update',
    'assets.view', 'assets.view_all',
    'equipment.view',
    'reports.view', 'reports.export',
    'analytics.view',
  ],

  // ── 12. TOOLS SHOP ATTENDANT: tool checkout/returns/transfers ──
  tools_shop_attendant: [
    'dashboard.view', 'chat.view',
    'documents.view', 'documents.download',
    'notifications.view',
    'tools.view', 'tools.create', 'tools.update', 'tools.delete',
    'tools.manage', 'tools.checkout', 'tools.return', 'tools.transfer',
    'assets.view',
    'equipment.view',
    'work_orders.view', 'work_orders.view_all',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'inventory.view',
    'parts.view',
    'reports.view', 'reports.export',
    'employees.view',
  ],

  // ── 13. STORE KEEPER: day-to-day store operations ──
  store_keeper: [
    'dashboard.view', 'chat.view',
    'documents.view', 'documents.download',
    'notifications.view',
    'inventory.view', 'inventory.stock_in', 'inventory.stock_out',
    'inventory.reserve', 'inventory.export',
    'parts.view', 'parts.update',
    'material_requisitions.view', 'material_requisitions.update',
    'stock_transactions.view', 'stock_transactions.create',
    'purchase_orders.view', 'purchase_orders.receive',
    'inventory_locations.view', 'inventory_locations.update',
    'inventory_adjustments.view', 'inventory_adjustments.create',
    'inventory_transfers.view', 'inventory_transfers.update',
    'assets.view',
    'work_orders.view', 'work_orders.view_all',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'tools.view', 'tools.checkout', 'tools.return',
    'employees.view',
    'reports.view', 'reports.export',
  ],

  // ── 14. MAINTENANCE TECHNICIAN: own WOs, execute, PM execute ──
  maintenance_technician: [
    'dashboard.view', 'chat.view',
    'documents.view', 'documents.download',
    'notifications.view',
    'assets.view', 'assets.view_own',
    'equipment.view',
    'meters.view', 'meters.read',
    'tools.view', 'tools.checkout', 'tools.return',
    'maintenance_requests.view_own',
    'maintenance_requests.create', 'maintenance_requests.update',
    'work_orders.view_own', 'work_orders.update',
    'work_orders.start', 'work_orders.complete',
    'assistance_requests.view', 'assistance_requests.create',
    'time_logs.view', 'time_logs.create', 'time_logs.update',
    'pm_schedules.view', 'pm_schedules.run',
    'pm_checklists.view',
    'pm_notifications.view',
    'inventory.view',
    'parts.view',
  ],

  // ── 15. PRODUCTION OPERATOR: own data entry, surveys, own requests only ──
  production_operator: [
    'dashboard.view', 'chat.view',
    'documents.view', 'documents.download',
    'notifications.view',
    'assets.view', 'assets.view_own',
    'equipment.view',
    'production.view',
    'production_surveys.view', 'production_surveys.create', 'production_surveys.update',
    'downtime.view', 'downtime.create',
    'quality_checks.view',
    'maintenance_requests.view_own',
    'maintenance_requests.create',
    'work_orders.view_own',
    'time_logs.view', 'time_logs.create',
  ],

  // ── 16. VIEWER: read-only across all modules ──
  viewer: [
    'dashboard.view', 'chat.view',
    'documents.view', 'documents.download',
    'notifications.view',
    'assets.view', 'assets.view_all',
    'equipment.view',
    'assemblies.view',
    'bom.view',
    'facilities.view',
    'meters.view',
    'tools.view',
    'maintenance_requests.view', 'maintenance_requests.view_all',
    'work_orders.view', 'work_orders.view_all',
    'pm_schedules.view', 'pm_templates.view', 'pm_checklists.view',
    'calibration.view',
    'inventory.view', 'inventory.view_all',
    'parts.view',
    'vendors.view',
    'purchase_orders.view',
    'employees.view',
    'shifts.view',
    'training.view',
    'skills.view',
    'production.view',
    'oee.view',
    'downtime.view',
    'quality_checks.view',
    'quality_inspections.view',
    'quality_ncr.view',
    'quality_audits.view',
    'spc.view',
    'energy.view',
    'work_centers.view',
    'production_targets.view',
    'production_batches.view',
    'safety_incidents.view',
    'safety_inspections.view',
    'safety_equipment.view',
    'safety_permits.view',
    'iot_devices.view',
    'iot_rules.view',
    'iot.view',
    'digital_twin.view',
    'reports.view', 'reports.export',
    'analytics.view', 'operations.view', 'quality.view', 'safety.view',
    'system_settings.view',
    'company.view',
    'departments.view',
    'plants.view',
  ],
};

async function syncPermissions() {
  console.log('🔄 Connecting to database via Prisma...\n');

  try {
    // Step 1: Get all roles from DB
    const roles = await db.role.findMany({ select: { id: true, slug: true, name: true }, orderBy: { level: 'desc' } });
    console.log(`📋 Found ${roles.length} roles in database:`);
    for (const r of roles) {
      console.log(`   • ${r.slug} (${r.name})`);
    }
    console.log('');

    // Step 2: Get all permissions from DB
    const permissions = await db.permission.findMany({ select: { id: true, slug: true } });
    console.log(`📋 Found ${permissions.length} permissions in database\n`);

    // Build lookup maps
    const roleMap = new Map(roles.map(r => [r.slug, r.id]));
    const permMap = new Map(permissions.map(p => [p.slug, p.id]));

    // Step 3: Clear all existing role-permission mappings
    await db.$executeRawUnsafe(`DELETE FROM role_permissions`);
    console.log('🗑️  Cleared all existing role-permission mappings');

    // Step 4: Insert new mappings from ROLE_PERMISSIONS
    let totalMappings = 0;
    const notFoundPerms: string[] = [];
    const notFoundRoles: string[] = [];

    for (const [roleSlug, permSlugs] of Object.entries(ROLE_PERMISSIONS)) {
      const roleId = roleMap.get(roleSlug);
      if (!roleId) {
        notFoundRoles.push(roleSlug);
        continue;
      }

      // Skip admin — gets ALL permissions programmatically
      if (roleSlug === 'admin') {
        console.log('   ⏭️  admin: skipped (gets ALL permissions programmatically)');
        continue;
      }

      let count = 0;
      const mappings: { roleId: string; permissionId: string }[] = [];

      for (const permSlug of permSlugs) {
        const permId = permMap.get(permSlug);
        if (!permId) {
          if (!notFoundPerms.includes(permSlug)) notFoundPerms.push(permSlug);
          continue;
        }
        mappings.push({ roleId, permissionId: permId });
        count++;
      }

      // Bulk insert using raw SQL for speed
      if (mappings.length > 0) {
        for (const m of mappings) {
          await db.$executeRawUnsafe(
            'INSERT INTO role_permissions (id, role_id, permission_id, created_at) VALUES (UUID(), ?, ?, NOW())',
            m.roleId, m.permissionId
          );
        }
      }

      console.log(`   ✅ ${roleSlug}: ${count} permissions mapped`);
      totalMappings += count;
    }

    console.log(`\n📊 Total role-permission mappings: ${totalMappings}`);

    if (notFoundRoles.length > 0) {
      console.warn(`\n⚠️  Roles in matrix not found in DB: ${notFoundRoles.join(', ')}`);
    }
    if (notFoundPerms.length > 0) {
      console.warn(`\n⚠️  Permissions in matrix not found in DB (${notFoundPerms.length}):`);
      for (const p of notFoundPerms) {
        console.warn(`   • ${p}`);
      }
    }

    // Step 5: Clear session table to force re-auth
    try {
      await db.$executeRawUnsafe(`DELETE FROM sessions`);
      console.log('\n🔄 Cleared all sessions — users will need to re-login for new permissions to take effect');
    } catch {
      console.log('\n⚠️  Could not clear sessions (table may not exist). Users should log out and back in.');
    }

    // Verification
    const counts = await db.$queryRawUnsafe<Array<{ slug: string; perm_count: bigint }>>(
      `SELECT r.slug, COUNT(rp.permission_id) as perm_count
       FROM roles r
       LEFT JOIN role_permissions rp ON r.id = rp.role_id
       WHERE r.slug != 'admin'
       GROUP BY r.id, r.slug
       ORDER BY r.level DESC`
    );

    console.log('\n📋 Verification — permission counts per role:');
    for (const c of counts) {
      console.log(`   • ${c.slug}: ${c.perm_count} permissions`);
    }

  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

syncPermissions()
  .then(() => {
    console.log('\n✅ Done! Role-permission mappings synced successfully.');
    console.log('⚠️  All users must re-login for new permissions to take effect.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  });
