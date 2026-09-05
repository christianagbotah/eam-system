/**
 * Deterministic seed for module-licensing UAT only.
 *
 * SAFETY: refuses to run unless MODULE_LICENSING_UAT=1. It resets only the
 * RWOP licensing state and two dedicated UAT users; it never touches plant or
 * operational EAM data.
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

if (process.env.MODULE_LICENSING_UAT !== '1') {
  console.error('Refusing to run: set MODULE_LICENSING_UAT=1 for licensing UAT databases only.');
  process.exit(2);
}

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

async function upsertUatAdmin(username: string, isVendorAdmin: boolean) {
  const adminRole = await db.role.findUnique({ where: { slug: 'admin' }, select: { id: true } });
  if (!adminRole) throw new Error('Admin role not found. Run the normal permission/base seed first.');

  const passwordHash = await hash(PASSWORD, 10);
  const user = await db.user.upsert({
    where: { username },
    update: {
      email: `${username}@test.local`,
      passwordHash,
      fullName: isVendorAdmin ? 'UAT Super Admin' : 'UAT System Admin',
      status: 'active',
      isVendorAdmin,
    },
    create: {
      username,
      email: `${username}@test.local`,
      passwordHash,
      fullName: isVendorAdmin ? 'UAT Super Admin' : 'UAT System Admin',
      status: 'active',
      isVendorAdmin,
    },
  });

  await db.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });

  return user;
}

async function main() {
  const superAdmin = await upsertUatAdmin('uat_super_admin', true);
  const systemAdmin = await upsertUatAdmin('uat_system_admin', false);

  await db.systemModule.upsert({
    where: { code: 'rwop' },
    update: {
      name: 'Repairs & Work Orders',
      isCore: false,
      isSystemLicensed: false,
      licenseKey: null,
      validFrom: null,
      validUntil: null,
    },
    create: {
      code: 'rwop',
      name: 'Repairs & Work Orders',
      description: 'Maintenance requests, repair work orders, execution and closure.',
      version: '1.0.0',
      isCore: false,
      isSystemLicensed: false,
    },
  });

  await db.systemConfig.deleteMany({
    where: { key: { in: ['module_activation:rwop', 'module_license_meta:rwop'] } },
  });

  console.log('Module licensing UAT prepared:');
  console.log(`  super admin: ${superAdmin.username} (${superAdmin.id})`);
  console.log(`  system admin: ${systemAdmin.username} (${systemAdmin.id})`);
  console.log('  target module: rwop => unlicensed + disabled');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
