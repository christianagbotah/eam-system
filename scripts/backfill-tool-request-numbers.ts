/**
 * Backfill request numbers for existing RepairToolRequest rows that have null requestNumber.
 *
 * Run on VPS:
 *   cd /home/ifleetpro/git/eam-system && bun run scripts/backfill-tool-request-numbers.ts
 *
 * This script:
 * 1. Finds all repair_tool_requests with NULL requestNumber
 * 2. Groups them by creation month
 * 3. Generates sequential TR-YYYYMM-NNNN numbers respecting existing numbers
 * 4. Updates each row
 *
 * Safe to run multiple times — skips rows that already have a requestNumber.
 */

import mariadb from 'mariadb';

// Read DB credentials from environment or DATABASE_URL
function getDbConfig() {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST;
  const port = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.DB_USER || process.env.MYSQL_USER;
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD;
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE;

  if (host && user && password && database) {
    return { host, port, user, password, database };
  }

  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('mysql://')) {
    const url = new URL(dbUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || '3306', 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
    };
  }

  console.error('❌ No database credentials found. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME or DATABASE_URL.');
  process.exit(1);
}

async function backfillRequestNumbers() {
  const config = getDbConfig();
  console.log(`🔄 Connecting to MariaDB: ${config.host}/${config.database}...`);

  const conn = await mariadb.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true,
  });

  console.log('✅ Connected! Checking for legacy tool requests...\n');

  try {
    // Step 1: Check if repair_tool_requests table exists
    const tables = await conn.query("SHOW TABLES LIKE 'repair_tool_requests'") as any[];
    if (tables.length === 0) {
      console.log('ℹ️  Table repair_tool_requests does not exist yet. Nothing to backfill.');
      console.log('   Run `npx prisma db push` first to create the table.');
      return;
    }

    // Step 2: Check if requestNumber column exists
    const columns = await conn.query("SHOW COLUMNS FROM repair_tool_requests LIKE 'requestNumber'") as any[];
    if (columns.length === 0) {
      console.log('ℹ️  Column requestNumber does not exist yet. Nothing to backfill.');
      console.log('   Run `npx prisma db push` first to add the column.');
      return;
    }

    // Step 3: Find rows with NULL requestNumber
    const legacyRows = await conn.query(
      'SELECT id, createdAt FROM repair_tool_requests WHERE requestNumber IS NULL ORDER BY createdAt ASC'
    ) as any[];

    if (legacyRows.length === 0) {
      console.log('✅ All requests already have request numbers. Nothing to backfill.');
      return;
    }

    console.log(`📋 Found ${legacyRows.length} legacy request(s) without request numbers.`);

    // Step 4: Build a map of existing request numbers by month prefix
    const existingNumbers = await conn.query(
      'SELECT requestNumber FROM repair_tool_requests WHERE requestNumber IS NOT NULL'
    ) as any[];

    const existingByPrefix = new Map<string, Set<number>>();
    for (const row of existingNumbers) {
      const parts = (row.requestNumber as string).split('-');
      if (parts.length >= 3) {
        const prefix = `${parts[0]}-${parts[1]}`;
        const num = parseInt(parts[2], 10);
        if (!existingByPrefix.has(prefix)) {
          existingByPrefix.set(prefix, new Set());
        }
        existingByPrefix.get(prefix)!.add(num);
      }
    }

    // Step 5: Generate and assign numbers
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
      await conn.query(
        'UPDATE repair_tool_requests SET requestNumber = ? WHERE id = ?',
        [requestNumber, row.id]
      );

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
    const remaining = await conn.query(
      'SELECT COUNT(*) as cnt FROM repair_tool_requests WHERE requestNumber IS NULL'
    ) as any[];
    if (remaining[0].cnt === 0) {
      console.log('✅ Verification PASSED: All requests now have request numbers.');
    } else {
      console.error(`❌ Verification FAILED: ${remaining[0].cnt} requests still have NULL requestNumber.`);
    }
  } finally {
    await conn.end();
  }
}

backfillRequestNumbers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backfill failed:', err.message);
    process.exit(1);
  });
