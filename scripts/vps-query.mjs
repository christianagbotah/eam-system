import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const adapter = new PrismaMariaDb({
  host: 'vps.lightworldtech.com',
  port: 3306,
  user: 'ifleetpro_user',
  password: 'myjesus4mE2018',
  database: 'ifleetpro_eam_system',
});

const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient({ adapter });

async function main() {
  // Check tables
  const tables = await db.$queryRawUnsafe("SHOW TABLES");
  console.log("=== TABLES ===");
  tables.forEach(t => console.log(Object.values(t)[0]));
  console.log(`Total: ${tables.length} tables\n`);

  // Plants
  const plants = await db.plant.findMany();
  console.log("=== PLANTS ===");
  plants.forEach(p => console.log(`  ${p.code}: ${p.name} (id: ${p.id})`));

  // Departments
  const depts = await db.department.findMany();
  console.log("\n=== DEPARTMENTS ===");
  depts.forEach(d => console.log(`  ${d.code}: ${d.name} (id: ${d.id}, plant: ${d.plantId})`));

  // Users
  const users = await db.user.findMany({ select: { id: true, username: true, fullName: true, department: true, status: true } });
  console.log("\n=== USERS ===");
  users.forEach(u => console.log(`  ${u.username}: ${u.fullName} (${u.department}) [${u.status}] (id: ${u.id})`));

  // Asset Categories
  const cats = await db.assetCategory.findMany();
  console.log("\n=== ASSET CATEGORIES ===");
  cats.forEach(c => console.log(`  ${c.code}: ${c.name} (id: ${c.id}, parent: ${c.parentId})`));

  // Assets
  const assets = await db.asset.findMany({ select: { id: true, name: true, assetTag: true, status: true } });
  console.log("\n=== ASSETS ===");
  assets.forEach(a => console.log(`  ${a.assetTag}: ${a.name} [${a.status}] (id: ${a.id})`));

  // Permissions count
  const perms = await db.permission.count();
  console.log(`\n=== PERMISSIONS: ${perms} ===`);

  // Roles
  const roles = await db.role.findMany();
  console.log("\n=== ROLES ===");
  roles.forEach(r => console.log(`  ${r.slug}: ${r.name} (level: ${r.level})`));

  // Inventory items count
  const inv = await db.inventoryItem.count();
  console.log(`\n=== INVENTORY ITEMS: ${inv} ===`);

  // PM Schedules
  const pm = await db.pmSchedule.count();
  console.log(`=== PM SCHEDULES: ${pm} ===`);

  // Work Orders
  const wo = await db.workOrder.count();
  console.log(`=== WORK ORDERS: ${wo} ===`);

  // Maintenance Requests
  const mr = await db.maintenanceRequest.count();
  console.log(`=== MAINTENANCE REQUESTS: ${mr} ===`);

  await db.$disconnect();
}
main().catch(e => { console.error(e); db.$disconnect(); });
