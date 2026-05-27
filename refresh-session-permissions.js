// refresh-session-permissions.js
// Refreshes permissions for all active sessions after role-permission changes.
// Run this after activate-role-permissions.js to avoid requiring users to re-login.
const mariadb = require('mariadb');

async function main() {
  const conn = await mariadb.createConnection({
    host: 'vps.lightworldtech.com', port: 3306,
    user: 'ifleetpro_user', password: 'myjesus4mE2018',
    database: 'ifleetpro_eam_system',
  });

  console.log('=== Refreshing Session Permissions ===\n');

  // 1. Get all active (non-expired) sessions
  const sessions = await conn.query(
    `SELECT id, token, userId, roles, permissions, expiresAt FROM sessions WHERE expiresAt > NOW()`
  );
  console.log(`Found ${sessions.length} active sessions\n`);

  if (sessions.length === 0) {
    console.log('No active sessions to update.');
    await conn.end();
    return;
  }

  // 2. Load all role-permission mappings into memory
  const rolePerms = await conn.query(`
    SELECT r.slug as roleSlug, p.slug as permSlug
    FROM roles r
    JOIN role_permissions rp ON rp.roleId = r.id
    JOIN permissions p ON p.id = rp.permissionId
  `);

  // Build map: roleSlug → Set of permSlugs
  const rolePermMap = {};
  for (const row of rolePerms) {
    if (!rolePermMap[row.roleSlug]) rolePermMap[row.roleSlug] = new Set();
    rolePermMap[row.roleSlug].add(row.permSlug);
  }

  // 3. Load all permissions (for admin role which gets everything)
  const allPerms = await conn.query('SELECT slug FROM permissions');
  const allPermSlugs = allPerms.map(p => p.slug);

  // 4. Load direct permission overrides per user
  const directPerms = await conn.query(`
    SELECT up.userId, p.slug as permSlug, up.isGranted,
           CASE WHEN up.expiresAt IS NOT NULL AND up.expiresAt < NOW() THEN 1 ELSE 0 END as isExpired
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permissionId
  `);

  const userDirectPerms = {};
  for (const row of directPerms) {
    if (!userDirectPerms[row.userId]) userDirectPerms[row.userId] = [];
    userDirectPerms[row.userId].push({
      slug: row.permSlug,
      granted: row.isGranted === 1,
      expired: row.isExpired === 1,
    });
  }

  // 5. Process each session
  let updated = 0;
  let unchanged = 0;

  for (const session of sessions) {
    let roles = [];
    let oldPerms = [];
    try {
      roles = JSON.parse(session.roles);
      oldPerms = JSON.parse(session.permissions);
    } catch {
      continue;
    }

    // Build new permissions from roles
    const newPermSet = new Set();

    for (const roleSlug of roles) {
      if (roleSlug === 'admin') {
        // Admin gets ALL permissions
        for (const p of allPermSlugs) newPermSet.add(p);
      } else if (rolePermMap[roleSlug]) {
        for (const p of rolePermMap[roleSlug]) newPermSet.add(p);
      }
    }

    // Apply direct permission overrides
    const overrides = userDirectPerms[session.userId] || [];
    for (const override of overrides) {
      if (override.expired) {
        newPermSet.delete(override.slug);
      } else if (override.granted) {
        newPermSet.add(override.slug);
      } else {
        newPermSet.delete(override.slug);
      }
    }

    const newPerms = [...newPermSet].sort();

    // Check if permissions changed
    const oldSorted = [...oldPerms].sort();
    const hasChanges = JSON.stringify(oldSorted) !== JSON.stringify(newPerms);

    if (hasChanges) {
      const addedCount = newPerms.filter(p => !oldPerms.includes(p)).length;
      const removedCount = oldPerms.filter(p => !newPerms.includes(p)).length;

      await conn.query(
        'UPDATE sessions SET permissions = ? WHERE id = ?',
        [JSON.stringify(newPerms), session.id]
      );

      console.log(`  🔄 Session ${session.token.slice(0, 8)}... (user: ${session.userId.slice(0, 8)}...) → +${addedCount} added, -${removedCount} removed (${newPerms.length} total)`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Updated: ${updated} sessions`);
  console.log(`  Unchanged: ${unchanged} sessions`);
  console.log(`\n⚠️  IMPORTANT: Restart the PM2 process to clear in-memory cache:`);
  console.log(`     pm2 restart eam-system`);
  console.log(`\nDone! ✅`);

  await conn.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
