/**
 * Seed ONLY the status_transitions table without touching any other data.
 *
 * Run on VPS:
 *   cd /home/ifleetpro/git/eam-system && node scripts/seed-transitions.js
 *
 * Safe to run multiple times — deletes and re-inserts.
 */

const mariadb = require('mariadb');

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

  console.error('ERROR: No database credentials found. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME or DATABASE_URL.');
  process.exit(1);
}

const MR_TRANSITIONS = [
  { entityType: 'maintenance_request', fromStatus: null, toStatus: 'pending', allowedRoleSlugs: JSON.stringify(['operator','supervisor','planner','admin','production_operator','plant_manager','maintenance_manager']), requiresReason: false },
  { entityType: 'maintenance_request', fromStatus: 'pending', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['supervisor','admin','maintenance_supervisor','maintenance_manager','plant_manager']), requiresReason: false },
  { entityType: 'maintenance_request', fromStatus: 'pending', toStatus: 'approved', allowedRoleSlugs: JSON.stringify(['admin','maintenance_supervisor','maintenance_manager','plant_manager']), requiresReason: false },
  { entityType: 'maintenance_request', fromStatus: 'pending', toStatus: 'rejected', allowedRoleSlugs: JSON.stringify(['admin','maintenance_supervisor','maintenance_manager','plant_manager']), requiresReason: true },
  { entityType: 'maintenance_request', fromStatus: 'approved', toStatus: 'converted', allowedRoleSlugs: JSON.stringify(['planner','admin','maintenance_planner','maintenance_manager']), requiresReason: false },
];

const WO_TRANSITIONS = [
  { fromStatus: null, toStatus: 'draft', allowedRoleSlugs: JSON.stringify(['planner','admin','maintenance_planner','maintenance_manager','plant_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'requested', allowedRoleSlugs: JSON.stringify(['planner','admin','maintenance_planner','maintenance_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'approved', allowedRoleSlugs: JSON.stringify(['planner','admin','maintenance_planner','maintenance_manager']), requiresReason: false },
  { fromStatus: 'approved', toStatus: 'planned', allowedRoleSlugs: JSON.stringify(['planner','admin','maintenance_planner','maintenance_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner','supervisor','admin','maintenance_planner','maintenance_supervisor','maintenance_manager','plant_manager']), requiresReason: false },
  { fromStatus: 'requested', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner','supervisor','admin','maintenance_planner','maintenance_supervisor','maintenance_manager','plant_manager']), requiresReason: false },
  { fromStatus: 'approved', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner','supervisor','admin','maintenance_planner','maintenance_supervisor','maintenance_manager','plant_manager']), requiresReason: false },
  { fromStatus: 'planned', toStatus: 'assigned', allowedRoleSlugs: JSON.stringify(['planner','supervisor','admin','maintenance_planner','maintenance_supervisor','maintenance_manager','plant_manager']), requiresReason: false },
  { fromStatus: 'assigned', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['technician','admin','maintenance_technician','maintenance_supervisor','maintenance_manager']), requiresReason: false },
  { fromStatus: 'in_progress', toStatus: 'waiting_parts', allowedRoleSlugs: JSON.stringify(['technician','planner','admin','maintenance_technician','maintenance_planner','maintenance_manager']), requiresReason: false },
  { fromStatus: 'in_progress', toStatus: 'completed', allowedRoleSlugs: JSON.stringify(['technician','admin','maintenance_technician','maintenance_supervisor','maintenance_manager']), requiresReason: false },
  { fromStatus: 'waiting_parts', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['technician','planner','admin','maintenance_technician','maintenance_planner','maintenance_manager']), requiresReason: false },
  { fromStatus: 'completed', toStatus: 'closed', allowedRoleSlugs: JSON.stringify(['supervisor','planner','admin','maintenance_supervisor','maintenance_planner','maintenance_manager','plant_manager']), requiresReason: false },
  { fromStatus: 'draft', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner','admin','maintenance_planner','maintenance_manager']), requiresReason: true },
  { fromStatus: 'requested', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner','admin','maintenance_planner','maintenance_manager']), requiresReason: true },
  { fromStatus: 'assigned', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['planner','supervisor','admin','maintenance_planner','maintenance_supervisor','maintenance_manager']), requiresReason: true },
  { fromStatus: 'in_progress', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['supervisor','admin','maintenance_supervisor','maintenance_manager']), requiresReason: true },
  { fromStatus: 'waiting_parts', toStatus: 'cancelled', allowedRoleSlugs: JSON.stringify(['supervisor','admin','maintenance_supervisor','maintenance_manager']), requiresReason: true },
  { fromStatus: 'closed', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['supervisor','planner','admin','maintenance_supervisor','maintenance_planner','maintenance_manager']), requiresReason: true },
  { fromStatus: 'in_progress', toStatus: 'on_hold', allowedRoleSlugs: JSON.stringify(['supervisor','admin','maintenance_supervisor','maintenance_manager']), requiresReason: false },
  { fromStatus: 'on_hold', toStatus: 'in_progress', allowedRoleSlugs: JSON.stringify(['supervisor','admin','maintenance_supervisor','maintenance_manager']), requiresReason: false },
];

async function seedTransitions() {
  const config = getDbConfig();
  console.log(`Connecting to MariaDB: ${config.host}/${config.database}...`);

  const conn = await mariadb.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true,
  });

  console.log('Connected! Seeding status_transitions...');

  try {
    await conn.query('DELETE FROM status_transitions');
    console.log('  Cleared existing status_transitions');

    for (let i = 0; i < MR_TRANSITIONS.length; i++) {
      const t = MR_TRANSITIONS[i];
      await conn.query(
        `INSERT INTO status_transitions (id, entity_type, from_status, to_status, allowed_role_slugs, requires_reason, sort_order, created_at, updated_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [t.entityType, t.fromStatus, t.toStatus, t.allowedRoleSlugs, t.requiresReason ? 1 : 0, i]
      );
    }
    console.log(`  Inserted ${MR_TRANSITIONS.length} MR transitions`);

    for (let i = 0; i < WO_TRANSITIONS.length; i++) {
      const t = WO_TRANSITIONS[i];
      await conn.query(
        `INSERT INTO status_transitions (id, entity_type, from_status, to_status, allowed_role_slugs, requires_reason, sort_order, created_at, updated_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        ['work_order', t.fromStatus, t.toStatus, t.allowedRoleSlugs, t.requiresReason ? 1 : 0, i]
      );
    }
    console.log(`  Inserted ${WO_TRANSITIONS.length} WO transitions`);

    const rows = await conn.query('SELECT COUNT(*) as total FROM status_transitions');
    console.log(`\n  Total status transitions in DB: ${rows[0].total}`);

    const check = await conn.query(
      "SELECT COUNT(*) as cnt FROM status_transitions WHERE entity_type='maintenance_request' AND from_status='pending' AND to_status='approved'"
    );
    if (check[0].cnt > 0) {
      console.log('  Critical check PASSED: pending->approved MR transition exists');
    } else {
      console.error('  CRITICAL CHECK FAILED: pending->approved MR transition NOT found!');
    }
  } finally {
    await conn.end();
  }
}

seedTransitions()
  .then(() => {
    console.log('\nDone! You can now approve/reject/convert maintenance requests.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
