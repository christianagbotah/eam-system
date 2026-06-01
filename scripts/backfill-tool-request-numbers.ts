/**
 * Backfill request numbers for existing RepairToolRequest rows that have null requestNumber.
 *
 * Run on VPS:
 *   cd /home/ifleetpro/git/eam-system && bun run backfill:tool-requests
 *   (or: bun scripts/backfill-tool-request-numbers.ts)
 *
 * This script:
 * 1. Finds all repair_tool_requests with NULL requestNumber
 * 2. Groups them by creation month
 * 3. Generates sequential TR-YYYYMM-NNNN numbers respecting existing numbers
 * 4. Updates each row
 *
 * Safe to run multiple times — skips rows that already have a requestNumber.
 *
 * NOTE: The API endpoint also has auto-backfill (ensureLegacyRequestNumbers),
 * so this manual script is optional. Use it if you want to backfill without
 * waiting for the first page access.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// Build Prisma client using the same MariaDB adapter as the app
function createPrismaClient(): PrismaClient {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST;
  const port = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.DB_USER || process.env.MYSQL_USER;
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD;
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE;

  if (host && user && password && database) {
    const adapter = new PrismaMariaDb({ host, port, user, password, database, connectionLimit: 5 });
    console.log(`🔄 Connecting to MariaDB: ${host}:${port}/${database}...`);
    return new PrismaClient({ adapter });
  }

  // Try DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('mysql://')) {
    const url = new URL(dbUrl);
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: parseInt(url.port || '3306', 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      connectionLimit: 5,
    });
    console.log(`🔄 Connecting to MariaDB via DATABASE_URL: ${url.host}/${url.pathname.slice(1)}...`);
    return new PrismaClient({ adapter });
  }

  console.error('❌ No database credentials found. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME or DATABASE_URL.');
  process.exit(1);
}

async function backfillRequestNumbers() {
  const prisma = createPrismaClient();

  try {
    console.log('✅ Connected! Checking for legacy tool requests...\n');

    // Step 1: Find rows with NULL requestNumber
    const legacyRows = await prisma.repairToolRequest.findMany({
      where: { requestNumber: null },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    if (legacyRows.length === 0) {
      console.log('✅ All requests already have request numbers. Nothing to backfill.');
      return;
    }

    console.log(`📋 Found ${legacyRows.length} legacy request(s) without request numbers.`);

    // Step 2: Build a map of existing request numbers by month prefix
    const existingNumbers = await prisma.repairToolRequest.findMany({
      where: { requestNumber: { not: null } },
      select: { requestNumber: true },
    });

    const existingByPrefix = new Map<string, Set<number>>();
    for (const r of existingNumbers) {
      if (!r.requestNumber) continue;
      const parts = r.requestNumber.split('-');
      if (parts.length >= 3) {
        const prefix = `${parts[0]}-${parts[1]}`;
        const num = parseInt(parts[2], 10);
        if (!isNaN(num)) {
          if (!existingByPrefix.has(prefix)) {
            existingByPrefix.set(prefix, new Set());
          }
          existingByPrefix.get(prefix)!.add(num);
        }
      }
    }

    // Step 3: Generate and assign numbers
    const prefixCounter = new Map<string, number>();
    let updated = 0;

    for (const row of legacyRows) {
      const created = new Date(row.createdAt);
      const ym = `${created.getFullYear()}${String(created.getMonth() + 1).padStart(2, '0')}`;
      const prefix = `TR-${ym}`;

      // Get next available number for this prefix
      let counter = prefixCounter.get(prefix) || 1;
      const usedNumbers = existingByPrefix.get(prefix);

      // Find the next unused number
      while (usedNumbers && usedNumbers.has(counter)) {
        counter++;
      }
      prefixCounter.set(prefix, counter);

      const requestNumber = `${prefix}${String(counter).padStart(4, '0')}`;

      // Update the row
      await prisma.repairToolRequest.update({
        where: { id: row.id },
        data: { requestNumber },
      });

      // Track this number as used
      if (!existingByPrefix.has(prefix)) {
        existingByPrefix.set(prefix, new Set());
      }
      existingByPrefix.get(prefix)!.add(counter);

      const dateStr = created.toISOString().slice(0, 10);
      console.log(`  ✅ ${row.id.slice(0, 8)}... → ${requestNumber} (created: ${dateStr})`);
      updated++;
    }

    console.log(`\n🎉 Backfilled ${updated} request number(s) successfully.`);

    // Verify
    const remaining = await prisma.repairToolRequest.count({
      where: { requestNumber: null },
    });
    if (remaining === 0) {
      console.log('✅ Verification PASSED: All requests now have request numbers.');
    } else {
      console.error(`❌ Verification FAILED: ${remaining} requests still have NULL requestNumber.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

backfillRequestNumbers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backfill failed:', err.message);
    process.exit(1);
  });
