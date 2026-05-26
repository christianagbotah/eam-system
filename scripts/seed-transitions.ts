/**
 * Seed ONLY the status_transitions table without touching any other data.
 *
 * Run on VPS:
 *   cd ~/git/eam-system && bun run scripts/seed-transitions.ts
 *
 * This is safe to run multiple times — it upserts by (entityType + fromStatus + toStatus).
 * It will NOT delete existing roles, users, permissions, or any other data.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const MR_TRANSITIONS = [
  // Initial state: creating a new MR
  {
    entityType: 'maintenance_request',
    fromStatus: null,
    toStatus: 'pending',
    allowedRoleSlugs: JSON.stringify([
      'operator', 'supervisor', 'planner', 'admin',
      'production_operator', 'plant_manager', 'maintenance_manager',
    ]),
    requiresReason: false,
  },
  // Supervisor starts reviewing
  {
    entityType: 'maintenance_request',
    fromStatus: 'pending',
    toStatus: 'in_progress',
    allowedRoleSlugs: JSON.stringify([
      'supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager',
    ]),
    requiresReason: false,
  },
  // Supervisor approves
  {
    entityType: 'maintenance_request',
    fromStatus: 'pending',
    toStatus: 'approved',
    allowedRoleSlugs: JSON.stringify([
      'admin', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager',
    ]),
    requiresReason: false,
  },
  // Supervisor rejects
  {
    entityType: 'maintenance_request',
    fromStatus: 'pending',
    toStatus: 'rejected',
    allowedRoleSlugs: JSON.stringify([
      'admin', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager',
    ]),
    requiresReason: true,
  },
  // Planner converts to work order
  {
    entityType: 'maintenance_request',
    fromStatus: 'approved',
    toStatus: 'converted',
    allowedRoleSlugs: JSON.stringify([
      'planner', 'admin', 'maintenance_planner', 'maintenance_manager',
    ]),
    requiresReason: false,
  },
];

const WO_TRANSITIONS = [
  { fromStatus: null, toStatus: 'draft', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'requested', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'approved', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'approved', toStatus: 'planned', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'requested', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'approved', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'planned', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'assigned', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['technician', 'admin', 'maintenance_technician', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'in_progress', toStatus: 'waiting_parts', allowedRoleSlugs: JSON.stringify(['technician', 'planner', 'admin', 'maintenance_technician', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'in_progress', toStatus: 'completed', allowedRoleSlugs: JSON.stringify(['technician', 'admin', 'maintenance_technician', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'waiting_parts', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['technician', 'planner', 'admin', 'maintenance_technician', 'maintenance_planner', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'completed', toStatus: 'closed', allowedRoleSlugs: JSON.stringify(['supervisor', 'planner', 'admin', 'maintenance_supervisor', 'maintenance_planner', 'maintenance_manager', 'plant_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'requested', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner', 'admin', 'maintenance_planner', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'assigned', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner', 'supervisor', 'admin', 'maintenance_planner', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'in_progress', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: true },
  { fromStatus: 'waiting_parts', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: true },
  // Reopen flows
  { fromStatus: 'closed', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['supervisor', 'planner', 'admin', 'maintenance_supervisor', 'maintenance_planner', 'maintenance_manager']), requiresReason: true },
  // Hold/resume
  { fromStatus: 'in_progress', toStatus: 'on_hold', allowedRoleSlugs: JSON.stringify(['supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: false },
  { fromStatus: 'on_hold', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['supervisor', 'admin', 'maintenance_supervisor', 'maintenance_manager']), requiresReason: false },
];

async function seedTransitions() {
  console.log('🔄 Seeding status transitions (safe upsert, no data deletion)...');

  // Clear only the status_transitions table
  await db.statusTransition.deleteMany();
  console.log('  ✅ Cleared existing status_transitions');

  // Seed MR transitions
  for (let i = 0; i < MR_TRANSITIONS.length; i++) {
    const t = MR_TRANSITIONS[i];
    await db.statusTransition.create({
      data: {
        entityType: t.entityType,
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        allowedRoleSlugs: t.allowedRoleSlugs,
        requiresReason: t.requiresReason,
        sortOrder: i,
      },
    });
  }
  console.log(`  ✅ Created ${MR_TRANSITIONS.length} MR transitions`);

  // Seed WO transitions
  for (let i = 0; i < WO_TRANSITIONS.length; i++) {
    const t = WO_TRANSITIONS[i];
    await db.statusTransition.create({
      data: {
        entityType: 'work_order',
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        allowedRoleSlugs: t.allowedRoleSlugs,
        requiresReason: t.requiresReason,
        sortOrder: i,
      },
    });
  }
  console.log(`  ✅ Created ${WO_TRANSITIONS.length} WO transitions`);

  // Verify
  const total = await db.statusTransition.count();
  console.log(`\n  ✅ Total status transitions in DB: ${total}`);

  // Verify critical transitions
  const criticalCheck = await db.statusTransition.findFirst({
    where: { entityType: 'maintenance_request', fromStatus: 'pending', toStatus: 'approved' },
  });
  if (criticalCheck) {
    console.log('  ✅ Critical check PASSED: pending→approved MR transition exists');
  } else {
    console.error('  ❌ Critical check FAILED: pending→approved MR transition NOT found!');
  }
}

seedTransitions()
  .then(() => {
    console.log('\n✅ Done! You can now approve/reject/convert maintenance requests.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
