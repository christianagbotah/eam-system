/**
 * seed-repairs-uat.ts — Idempotent UAT test data for Repairs/RWOP Playwright suite (Step 12)
 *
 * Creates:
 *   - 2 Plants (Plant A, Plant B)
 *   - 1 Asset in Plant A
 *   - 2 Trades (mechanical, electrical)
 *   - 9 UAT users with roles + plant access
 *   - WO status transitions for the full lifecycle
 *   - 2 pre-seeded Work Orders in various states
 *
 * Usage:
 *   DATABASE_URL="mysql://..." npx tsx scripts/seed-repairs-uat.ts
 *   DB_HOST=x DB_USER=y DB_PASSWORD=z DB_NAME=d npx tsx scripts/seed-repairs-uat.ts
 *
 * Idempotent: safe to run multiple times — uses upsert / findFirst patterns.
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

// ══════════════════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ══════════════════════════════════════════════════════════════════════════
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('mysql://')) {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'ifleetpro_eam_system';
  process.env.DATABASE_URL = `mysql://${user}:${password}@${host}:${port}/${database}`;
}

let db: PrismaClient;
try {
  const url = new URL(process.env.DATABASE_URL!);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createAdapter } = require('../src/lib/create-mariadb-adapter');
  const adapter = createAdapter({
    host: url.hostname,
    port: parseInt(url.port || '3306', 10),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  });
  db = new PrismaClient({ adapter });
} catch {
  db = new PrismaClient();
}

const PASSWORD = 'TestPass123!';

// ══════════════════════════════════════════════════════════════════════════
// USER DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════

interface UatUserDef {
  username: string;
  fullName: string;
  email: string;
  roleSlugs: string[];
  plantCodes: string[];        // which plants they can access
  isPrimaryPlant: string;     // code of their primary plant
  primaryTrade?: string;      // for technicians
}

const UAT_USERS: UatUserDef[] = [
  {
    username: 'uat_requester',
    fullName: 'UAT Requester',
    email: 'uat_requester@test.com',
    roleSlugs: ['requester'],
    plantCodes: ['PLANT-A', 'PLANT-B'],
    isPrimaryPlant: 'PLANT-A',
  },
  {
    username: 'uat_supervisor',
    fullName: 'UAT Supervisor',
    email: 'uat_supervisor@test.com',
    roleSlugs: ['maintenance_supervisor'],
    plantCodes: ['PLANT-A', 'PLANT-B'],
    isPrimaryPlant: 'PLANT-A',
  },
  {
    username: 'uat_planner',
    fullName: 'UAT Planner',
    email: 'uat_planner@test.com',
    roleSlugs: ['planner'],
    plantCodes: ['PLANT-A', 'PLANT-B'],
    isPrimaryPlant: 'PLANT-A',
  },
  {
    username: 'uat_tech_single',
    fullName: 'UAT Tech Single',
    email: 'uat_tech_single@test.com',
    roleSlugs: ['maintenance_technician'],
    plantCodes: ['PLANT-A', 'PLANT-B'],
    isPrimaryPlant: 'PLANT-A',
    primaryTrade: 'Mechanical',
  },
  {
    username: 'uat_tech_leader',
    fullName: 'UAT Tech Leader',
    email: 'uat_tech_leader@test.com',
    roleSlugs: ['team_leader', 'maintenance_technician'],
    plantCodes: ['PLANT-A', 'PLANT-B'],
    isPrimaryPlant: 'PLANT-A',
    primaryTrade: 'Mechanical',
  },
  {
    username: 'uat_tech_assistant',
    fullName: 'UAT Tech Assistant',
    email: 'uat_tech_assistant@test.com',
    roleSlugs: ['maintenance_technician'],
    plantCodes: ['PLANT-A', 'PLANT-B'],
    isPrimaryPlant: 'PLANT-A',
    primaryTrade: 'Electrical',
  },
  {
    username: 'uat_storekeeper',
    fullName: 'UAT Storekeeper',
    email: 'uat_storekeeper@test.com',
    roleSlugs: ['storekeeper'],
    plantCodes: ['PLANT-A', 'PLANT-B'],
    isPrimaryPlant: 'PLANT-A',
  },
  {
    username: 'uat_plant_a_user',
    fullName: 'UAT Plant A User',
    email: 'uat_plant_a_user@test.com',
    roleSlugs: ['maintenance_technician'],
    plantCodes: ['PLANT-A'],
    isPrimaryPlant: 'PLANT-A',
    primaryTrade: 'Mechanical',
  },
  {
    username: 'uat_plant_b_user',
    fullName: 'UAT Plant B User',
    email: 'uat_plant_b_user@test.com',
    roleSlugs: ['maintenance_technician'],
    plantCodes: ['PLANT-B'],
    isPrimaryPlant: 'PLANT-B',
    primaryTrade: 'Mechanical',
  },
];

// ══════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🌱 Starting Repairs UAT seed script...');
  const passwordHash = await hash(PASSWORD, 12);

  // ── 1. Plants ──────────────────────────────────────────────────────────
  console.log('  📍 Creating plants...');
  const plantA = await db.plant.upsert({
    where: { code: 'PLANT-A' },
    update: {},
    create: { name: 'Plant A', code: 'PLANT-A', location: 'Building A', city: 'Accra', country: 'Ghana' },
  });
  const plantB = await db.plant.upsert({
    where: { code: 'PLANT-B' },
    update: {},
    create: { name: 'Plant B', code: 'PLANT-B', location: 'Building B', city: 'Tema', country: 'Ghana' },
  });
  const plants: Record<string, string> = { 'PLANT-A': plantA.id, 'PLANT-B': plantB.id };

  // ── 2. Trades ─────────────────────────────────────────────────────────
  console.log('  🔧 Creating trades...');
  const tradeMech = await db.trade.upsert({
    where: { name: 'Mechanical' },
    update: {},
    create: { name: 'Mechanical', code: 'MECH', category: 'mechanical', description: 'Mechanical maintenance trade' },
  });
  const tradeElec = await db.trade.upsert({
    where: { name: 'Electrical' },
    update: {},
    create: { name: 'Electrical', code: 'ELEC', category: 'electrical', description: 'Electrical maintenance trade' },
  });
  const trades: Record<string, string> = { Mechanical: tradeMech.id, Electrical: tradeElec.id };

  // ── 3. Asset Category (if needed) ─────────────────────────────────────
  console.log('  📦 Creating asset category...');
  const assetCategory = await db.assetCategory.upsert({
    where: { code: 'UAT-EQUIP' },
    update: {},
    create: { name: 'UAT Test Equipment', code: 'UAT-EQUIP', description: 'Test equipment for UAT' },
  });

  // ── 4. Users, Roles, Plant Access, Skills ──────────────────────────────
  console.log('  👥 Creating UAT users...');
  const userIds: Record<string, string> = {};

  for (const u of UAT_USERS) {
    // Create / update user
    const user = await db.user.upsert({
      where: { username: u.username },
      update: { fullName: u.fullName, email: u.email, passwordHash, status: 'active', primaryTrade: u.primaryTrade || null },
      create: { username: u.username, fullName: u.fullName, email: u.email, passwordHash, status: 'active', primaryTrade: u.primaryTrade || null },
    });
    userIds[u.username] = user.id;

    // Create / find roles and assign
    for (const slug of u.roleSlugs) {
      const role = await db.role.upsert({
        where: { slug },
        update: {},
        create: { name: slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), slug, level: 10, isSystem: true },
      });
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    // Plant access
    for (const code of u.plantCodes) {
      const plantId = plants[code];
      if (!plantId) continue;
      await db.userPlant.upsert({
        where: { userId_plantId: { userId: user.id, plantId } },
        update: {},
        create: { userId: user.id, plantId, accessLevel: 'write', isPrimary: code === u.isPrimaryPlant },
      });
    }

    // UserSkill for technicians with a primary trade
    if (u.primaryTrade && trades[u.primaryTrade]) {
      await db.userSkill.upsert({
        where: { userId_tradeId: { userId: user.id, tradeId: trades[u.primaryTrade] } },
        update: {},
        create: { userId: user.id, tradeId: trades[u.primaryTrade], proficiencyLevel: 'advanced', certified: true, yearsExperience: 5 },
      });
    }
  }

  // ── 5. Asset in Plant A ────────────────────────────────────────────────
  console.log('  🏗️  Creating asset...');
  const asset = await db.asset.upsert({
    where: { assetTag: 'UAT-PUMP-001' },
    update: {},
    create: {
      name: 'UAT Test Pump',
      assetTag: 'UAT-PUMP-001',
      description: 'Centrifugal pump for UAT testing',
      categoryId: assetCategory.id,
      plantId: plantA.id,
      condition: 'fair',
      status: 'operational',
      criticality: 'high',
      location: 'Workshop Bay 1',
      building: 'Building A',
    },
  });

  // ── 6. WO Status Transitions ───────────────────────────────────────────
  console.log('  🔄 Creating WO status transitions...');
  const woTransitions = [
    // From null (initial) to draft
    { from: null, to: 'draft', roles: ['admin', 'planner'], entity: 'work_order' as const },
    // Full lifecycle
    { from: 'draft', to: 'requested', roles: ['requester', 'admin'], entity: 'work_order' as const },
    { from: 'requested', to: 'approved', roles: ['maintenance_supervisor', 'admin'], entity: 'work_order' as const },
    { from: 'approved', to: 'planned', roles: ['planner', 'admin'], entity: 'work_order' as const },
    { from: 'planned', to: 'assigned', roles: ['planner', 'admin', 'maintenance_supervisor'], entity: 'work_order' as const },
    { from: 'assigned', to: 'in_progress', roles: ['maintenance_technician', 'team_leader', 'admin'], entity: 'work_order' as const },
    { from: 'in_progress', to: 'completed', roles: ['maintenance_technician', 'team_leader', 'admin'], entity: 'work_order' as const },
    { from: 'completed', to: 'verified', roles: ['maintenance_supervisor', 'admin'], entity: 'work_order' as const },
    { from: 'verified', to: 'closed', roles: ['planner', 'admin'], entity: 'work_order' as const },
    // Holds and resumes
    { from: 'in_progress', to: 'on_hold', roles: ['maintenance_technician', 'admin'], entity: 'work_order' as const },
    { from: 'on_hold', to: 'in_progress', roles: ['maintenance_technician', 'admin'], entity: 'work_order' as const },
    // Rework
    { from: 'verified', to: 'in_progress', roles: ['maintenance_supervisor', 'admin'], entity: 'work_order' as const },
    // Cancellation
    { from: 'draft', to: 'cancelled', roles: ['planner', 'admin'], entity: 'work_order' as const },
    { from: 'assigned', to: 'cancelled', roles: ['planner', 'admin'], entity: 'work_order' as const },
  ];

  for (const t of woTransitions) {
    await db.statusTransition.upsert({
      where: { entityType_fromStatus_toStatus: { entityType: t.entity, fromStatus: t.from, toStatus: t.to } },
      update: {},
      create: {
        entityType: t.entity,
        fromStatus: t.from,
        toStatus: t.to,
        allowedRoleSlugs: JSON.stringify(t.roles),
        requiresApproval: false,
        requiresReason: false,
      },
    });
  }

  // MR status transitions
  const mrTransitions = [
    { from: null, to: 'pending', roles: ['requester', 'admin'], entity: 'maintenance_request' as const },
    { from: 'pending', to: 'approved', roles: ['maintenance_supervisor', 'admin'], entity: 'maintenance_request' as const },
    { from: 'pending', to: 'rejected', roles: ['maintenance_supervisor', 'admin'], entity: 'maintenance_request' as const },
    { from: 'approved', to: 'converted', roles: ['planner', 'admin'], entity: 'maintenance_request' as const },
  ];

  for (const t of mrTransitions) {
    await db.statusTransition.upsert({
      where: { entityType_fromStatus_toStatus: { entityType: t.entity, fromStatus: t.from, toStatus: t.to } },
      update: {},
      create: {
        entityType: t.entity,
        fromStatus: t.from,
        toStatus: t.to,
        allowedRoleSlugs: JSON.stringify(t.roles),
        requiresApproval: false,
        requiresReason: false,
      },
    });
  }

  // ── 7. Pre-seeded Work Orders ──────────────────────────────────────────
  console.log('  📋 Creating pre-seeded work orders...');

  // WO-A1: Single-tech, assigned status
  const woA1 = await db.workOrder.upsert({
    where: { woNumber: 'WO-UAT-A1' },
    update: {},
    create: {
      woNumber: 'WO-UAT-A1',
      title: 'UAT Single-Tech Pump Repair',
      description: 'UAT test WO for single technician flow',
      type: 'corrective',
      priority: 'high',
      status: 'assigned',
      assetId: asset.id,
      assetName: asset.name,
      plantId: plantA.id,
      assignedTo: userIds['uat_tech_single'],
      assignedSupervisorId: userIds['uat_supervisor'],
      assignedBy: userIds['uat_planner'],
      plannerId: userIds['uat_planner'],
      tradeActivity: 'mechanical',
      estimatedHours: 4,
      failureDescription: 'Abnormal vibration detected',
      safetyNotes: 'LOTO required before opening casing',
      suggestedParts: JSON.stringify([{ itemName: 'Bearing 6205', quantity: 2, unit: 'each', status: 'suggested' }]),
      suggestedTools: JSON.stringify([{ toolName: 'Dial Indicator', quantity: 1, status: 'suggested' }]),
    },
  });

  // WO-A2: Multi-tech, assigned status with team
  const woA2 = await db.workOrder.upsert({
    where: { woNumber: 'WO-UAT-A2' },
    update: {},
    create: {
      woNumber: 'WO-UAT-A2',
      title: 'UAT Multi-Tech Motor Overhaul',
      description: 'UAT test WO for multi-technician flow',
      type: 'corrective',
      priority: 'medium',
      status: 'assigned',
      assetId: asset.id,
      assetName: asset.name,
      plantId: plantA.id,
      assignedTo: userIds['uat_tech_leader'],
      teamLeaderId: userIds['uat_tech_leader'],
      assignedSupervisorId: userIds['uat_supervisor'],
      assignedBy: userIds['uat_planner'],
      plannerId: userIds['uat_planner'],
      tradeActivity: 'mechanical',
      estimatedHours: 8,
      failureDescription: 'Motor running hot, high current draw',
      safetyNotes: 'Electrical isolation required',
    },
  });

  // Add team member for WO-A2
  await db.workOrderTeamMember.upsert({
    where: { workOrderId_userId: { workOrderId: woA2.id, userId: userIds['uat_tech_assistant'] } },
    update: {},
    create: {
      workOrderId: woA2.id,
      userId: userIds['uat_tech_assistant'],
      role: 'assistant',
      accessLevel: 'read_only',
      addedById: userIds['uat_planner'],
    },
  });

  // ── 8. Pre-seeded MR (for scenarios that start from MR) ────────────────
  console.log('  📝 Creating pre-seeded maintenance request...');
  const now = new Date();
  const mrUat = await db.maintenanceRequest.upsert({
    where: { requestNumber: 'MR-UAT-001' },
    update: {},
    create: {
      requestNumber: 'MR-UAT-001',
      title: 'UAT Pump Vibration Complaint',
      description: 'Pump UAT-PUMP-001 has abnormal vibration at 3000 RPM. Needs inspection.',
      priority: 'high',
      category: 'mechanical',
      status: 'pending',
      workflowStatus: 'pending',
      machineDownStatus: false,
      assetId: asset.id,
      assetName: asset.name,
      plantId: plantA.id,
      requestedBy: userIds['uat_requester'],
      supervisorId: userIds['uat_supervisor'],
      plannedStart: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      estimatedHours: 4,
    },
  });

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n✅ Repairs UAT seed completed successfully!');
  console.log(`   Plants: ${plantA.name} (${plantA.id.slice(0, 6)}), ${plantB.name} (${plantB.id.slice(0, 6)})`);
  console.log(`   Trades: Mechanical (${tradeMech.id.slice(0, 6)}), Electrical (${tradeElec.id.slice(0, 6)})`);
  console.log(`   Users: ${Object.keys(userIds).length} created/updated`);
  console.log(`   Asset: ${asset.assetTag}`);
  console.log(`   WOs: ${woA1.woNumber} (single-tech), ${woA2.woNumber} (multi-tech)`);
  console.log(`   MR: ${mrUat.requestNumber}`);
  console.log(`   All passwords: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
