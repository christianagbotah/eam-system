/*
 * seed-repairs-uat-costing.ts — Deterministic labor costing fixture for Repairs UAT.
 *
 * Scenario D records real labor against the electrical assistant. The base seed
 * historically configured only the primary mechanical technician's rate, which
 * made otherwise valid team labor uncosted and correctly blocked closure.
 * This fixture supplies the missing authoritative user+plant+trade rate without
 * weakening closure readiness or fabricating labor on another technician.
 */

import { PrismaClient } from '@prisma/client';

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

const EFFECTIVE_FROM = new Date('2024-01-01T00:00:00.000Z');

async function main() {
  console.log('💰 Seeding Repairs UAT team labor costing...');

  const [assistant, plant, electricalTrade] = await Promise.all([
    db.user.findUnique({ where: { username: 'uat_tech_assistant' }, select: { id: true } }),
    db.plant.findUnique({ where: { code: 'PLANT-A' }, select: { id: true } }),
    db.trade.findUnique({ where: { name: 'Electrical' }, select: { id: true } }),
  ]);

  if (!assistant || !plant || !electricalTrade) {
    throw new Error('Repairs UAT costing prerequisites are missing (assistant, PLANT-A, or Electrical trade)');
  }

  const existing = await db.laborRate.findFirst({
    where: {
      userId: assistant.id,
      plantId: plant.id,
      tradeId: electricalTrade.id,
      effectiveFrom: EFFECTIVE_FROM,
    },
    select: { id: true },
  });

  if (existing) {
    await db.laborRate.update({
      where: { id: existing.id },
      data: {
        normalHourlyRate: 55,
        overtimeHourlyRate: 82.5,
        currency: 'GHS',
        effectiveTo: null,
      },
    });
  } else {
    await db.laborRate.create({
      data: {
        userId: assistant.id,
        plantId: plant.id,
        tradeId: electricalTrade.id,
        normalHourlyRate: 55,
        overtimeHourlyRate: 82.5,
        effectiveFrom: EFFECTIVE_FROM,
        currency: 'GHS',
      },
    });
  }

  const verified = await db.laborRate.findFirst({
    where: {
      userId: assistant.id,
      plantId: plant.id,
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
    },
    select: { normalHourlyRate: true, overtimeHourlyRate: true, currency: true },
    orderBy: { effectiveFrom: 'desc' },
  });

  if (!verified || verified.normalHourlyRate <= 0) {
    throw new Error('Repairs UAT electrical assistant labor rate could not be verified');
  }

  console.log(
    `✅ UAT Tech Assistant labor rate: ${verified.currency} ${verified.normalHourlyRate}/hr ` +
      `(OT ${verified.overtimeHourlyRate}/hr)`,
  );
}

main()
  .catch((error) => {
    console.error('❌ Repairs UAT costing seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
