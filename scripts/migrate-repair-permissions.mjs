#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════
// MIGRATION: Add missing repair module permissions for technicians/storekeepers
// ══════════════════════════════════════════════════════════════════════════
//
// Adds the following permission modules that may be missing:
//   - repair_tool_requests: view, view_all, view_own, create, update
//   - repair_tool_transfers: view, view_all, view_own, create, update
//   - spare_part_returns: view, view_all, view_own, create, update
//   - damaged_tool_reports: view, view_all, view_own, create, update
//   - repair_material_requests: view, view_all, view_own, create, update
//
// Assigns to roles:
//   - maintenance_technician: view_own + create for each module
//   - tools_shop_attendant: view_all + create + update for each module
//   - store_keeper: view_all + update for each module
//   - inventory_manager: view_all + update for each module
//
// USAGE:
//   DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=... node scripts/migrate-repair-permissions.mjs
//   -- OR if DATABASE_URL is set:
//   node scripts/migrate-repair-permissions.mjs
// ══════════════════════════════════════════════════════════════════════════

import mariadb from 'mariadb/promise';

function getDbConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 3306,
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ifleetpro_eam_system',
  };
}

// ── Permission definitions ──
const PERMISSION_MODULES = {
  repair_tool_requests: {
    permissions: ['view', 'view_all', 'view_own', 'create', 'update'],
    description: 'Repair Tool Requests',
  },
  repair_tool_transfers: {
    permissions: ['view', 'view_all', 'view_own', 'create', 'update'],
    description: 'Repair Tool Transfers',
  },
  repair_material_requests: {
    permissions: ['view', 'view_all', 'view_own', 'create', 'update'],
    description: 'Repair Material Requests',
  },
  spare_part_returns: {
    permissions: ['view', 'view_all', 'view_own', 'create', 'update'],
    description: 'Spare Part Returns',
  },
  damaged_tool_reports: {
    permissions: ['view', 'view_all', 'view_own', 'create', 'update'],
    description: 'Damaged Tool Reports',
  },
};

// ── Role → Permission assignments ──
const ROLE_PERMISSIONS = {
  maintenance_technician: {
    repair_tool_requests: ['view_own', 'create'],
    repair_tool_transfers: ['view_own', 'create'],
    repair_material_requests: ['view_own', 'create'],
    spare_part_returns: ['view_own', 'create'],
    damaged_tool_reports: ['create'],
  },
  tools_shop_attendant: {
    repair_tool_requests: ['view_all', 'create', 'update'],
    repair_tool_transfers: ['view_all', 'create', 'update'],
    repair_material_requests: ['view_all', 'create', 'update'],
    spare_part_returns: ['view_all', 'create', 'update'],
    damaged_tool_reports: ['view_all', 'create', 'update'],
  },
  store_keeper: {
    repair_tool_requests: ['view_all', 'update'],
    repair_tool_transfers: ['view_all', 'update'],
    repair_material_requests: ['view_all', 'update'],
    spare_part_returns: ['view_all', 'update'],
    damaged_tool_reports: ['view_all', 'update'],
  },
  inventory_manager: {
    repair_tool_requests: ['view_all', 'update'],
    repair_tool_transfers: ['view_all', 'update'],
    repair_material_requests: ['view_all', 'update'],
    spare_part_returns: ['view_all', 'update'],
    damaged_tool_reports: ['view_all', 'update'],
  },
  maintenance_supervisor: {
    repair_tool_requests: ['view_all', 'create', 'update'],
    repair_tool_transfers: ['view_all', 'create', 'update'],
    repair_material_requests: ['view_all', 'create', 'update'],
    spare_part_returns: ['view_all', 'create', 'update'],
    damaged_tool_reports: ['view_all', 'create', 'update'],
  },
  maintenance_manager: {
    repair_tool_requests: ['view_all', 'create', 'update'],
    repair_tool_transfers: ['view_all', 'create', 'update'],
    repair_material_requests: ['view_all', 'create', 'update'],
    spare_part_returns: ['view_all', 'create', 'update'],
    damaged_tool_reports: ['view_all', 'create', 'update'],
  },
  plant_manager: {
    repair_tool_requests: ['view_all'],
    repair_tool_transfers: ['view_all'],
    repair_material_requests: ['view_all'],
    spare_part_returns: ['view_all'],
    damaged_tool_reports: ['view_all'],
  },
};

async function main() {
  const config = getDbConfig();
  console.log(`🔧 Connecting to ${config.host}:${config.port}/${config.database} as ${config.user}...`);

  const pool = mariadb.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Step 1: Check what tables/columns exist
    console.log('\n📋 Checking table structure...');
    const tables = await conn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`  Found ${tableNames.length} tables`);

    const hasPermissionTable = tableNames.includes('Permission') || tableNames.includes('permissions');
    const hasRoleTable = tableNames.includes('Role') || tableNames.includes('roles');
    const hasRolePermTable = tableNames.includes('RolePermission') || tableNames.includes('role_permissions');

    if (!hasPermissionTable || !hasRoleTable || !hasRolePermTable) {
      console.error('❌ Required tables not found. Make sure the database has Permission, Role, RolePermission tables.');
      console.log(`  Permission: ${hasPermissionTable}, Role: ${hasRoleTable}, RolePermission: ${hasRolePermTable}`);
      process.exit(1);
    }

    // Determine actual table names
    const permTable = tableNames.includes('Permission') ? 'Permission' : 'permissions';
    const roleTable = tableNames.includes('Role') ? 'Role' : 'roles';
    const rpTable = tableNames.includes('RolePermission') ? 'RolePermission' : 'role_permissions';

    // Check column names (camelCase vs snake_case)
    const permCols = await conn.query(`DESCRIBE ${permTable}`);
    const roleCols = await conn.query(`DESCRIBE ${roleTable}`);
    const rpCols = await conn.query(`DESCRIBE ${rpTable}`);

    const permColNames = permCols.map(c => c.Field);
    const roleColNames = roleCols.map(c => c.Field);
    const rpColNames = rpCols.map(c => c.Field);

    // Determine column naming convention
    const permIdCol = permColNames.includes('id') ? 'id' : (permColNames.includes('Id') ? 'Id' : 'id');
    const permSlugCol = permColNames.includes('slug') ? 'slug' : (permColNames.includes('Slug') ? 'Slug' : 'slug');
    const permNameCol = permColNames.includes('name') ? 'name' : (permColNames.includes('Name') ? 'Name' : 'name');
    const permModuleCol = permColNames.includes('module') ? 'module' : (permColNames.includes('Module') ? 'Module' : 'module');
    const permDescCol = permColNames.includes('description') ? 'description' : (permColNames.includes('Description') ? 'Description' : 'description');

    const roleIdCol = roleColNames.includes('id') ? 'id' : 'Id';
    const roleSlugCol = roleColNames.includes('slug') ? 'slug' : 'Slug';

    const rpRoleIdCol = rpColNames.includes('roleId') ? 'roleId' : (rpColNames.includes('role_id') ? 'role_id' : 'roleId');
    const rpPermIdCol = rpColNames.includes('permissionId') ? 'permissionId' : (rpColNames.includes('permission_id') ? 'permission_id' : 'permissionId');

    console.log(`  Tables: ${permTable}, ${roleTable}, ${rpTable}`);
    console.log(`  Permission columns: ${permSlugCol}, ${permModuleCol}`);
    console.log(`  RolePermission columns: ${rpRoleIdCol}, ${rpPermIdCol}`);

    // Step 2: Insert missing permissions
    console.log('\n➕ Adding missing permissions...');
    let permAdded = 0;
    let permExisted = 0;

    for (const [module, def] of Object.entries(PERMISSION_MODULES)) {
      for (const action of def.permissions) {
        const slug = `${module}.${action}`;
        const name = `${def.description}: ${action.replace('_', ' ')}`;

        // Check if exists
        const existing = await conn.query(
          `SELECT ${permIdCol} FROM ${permTable} WHERE ${permSlugCol} = ? LIMIT 1`,
          [slug]
        );

        if (existing.length === 0) {
          // Check which columns the table has
          const cols = [];
          const vals = [];
          if (permColNames.includes('id')) { cols.push('id'); vals.push(`'${Date.now()}-${Math.random().toString(36).slice(2)}'`); }
          if (permColNames.includes('slug') || permColNames.includes('Slug')) { cols.push(permSlugCol); vals.push(`'${slug}'`); }
          if (permColNames.includes('name') || permColNames.includes('Name')) { cols.push(permNameCol); vals.push(`'${name}'`); }
          if (permColNames.includes('module') || permColNames.includes('Module')) { cols.push(permModuleCol); vals.push(`'${module}'`); }
          if (permColNames.includes('description') || permColNames.includes('Description')) { cols.push(permDescCol); vals.push(`'${name}'`); }
          if (permColNames.includes('createdAt') || permColNames.includes('created_at')) { cols.push(permColNames.includes('createdAt') ? 'createdAt' : 'created_at'); vals.push('NOW()'); }
          if (permColNames.includes('updatedAt') || permColNames.includes('updated_at')) { cols.push(permColNames.includes('updatedAt') ? 'updatedAt' : 'updated_at'); vals.push('NOW()'); }

          await conn.query(`INSERT INTO ${permTable} (${cols.join(', ')}) VALUES (${vals.join(', ')})`);
          console.log(`  ✅ Added: ${slug}`);
          permAdded++;
        } else {
          permExisted++;
        }
      }
    }
    console.log(`  Result: ${permAdded} added, ${permExisted} already existed`);

    // Step 3: Add role-permission mappings
    console.log('\n🔗 Adding role-permission mappings...');
    let rpAdded = 0;
    let rpExisted = 0;

    for (const [roleSlug, modules] of Object.entries(ROLE_PERMISSIONS)) {
      // Find role ID
      const roleResult = await conn.query(
        `SELECT ${roleIdCol} FROM ${roleTable} WHERE ${roleSlugCol} = ? LIMIT 1`,
        [roleSlug]
      );
      if (roleResult.length === 0) {
        console.log(`  ⚠️  Role "${roleSlug}" not found, skipping`);
        continue;
      }
      const roleId = roleResult[0][roleIdCol];

      for (const [module, actions] of Object.entries(modules)) {
        for (const action of actions) {
          const slug = `${module}.${action}`;

          // Find permission ID
          const permResult = await conn.query(
            `SELECT ${permIdCol} FROM ${permTable} WHERE ${permSlugCol} = ? LIMIT 1`,
            [slug]
          );
          if (permResult.length === 0) {
            console.log(`  ⚠️  Permission "${slug}" not found, skipping`);
            continue;
          }
          const permId = permResult[0][permIdCol];

          // Check if mapping exists
          const existing = await conn.query(
            `SELECT 1 FROM ${rpTable} WHERE ${rpRoleIdCol} = ? AND ${rpPermIdCol} = ? LIMIT 1`,
            [roleId, permId]
          );

          if (existing.length === 0) {
            // Add mapping
            const cols = [];
            const vals = [];
            if (rpColNames.includes('id')) { cols.push('id'); vals.push(`'${Date.now()}-${Math.random().toString(36).slice(2)}'`); }
            cols.push(rpRoleIdCol);
            vals.push(`'${roleId}'`);
            cols.push(rpPermIdCol);
            vals.push(`'${permId}'`);
            if (rpColNames.includes('createdAt') || rpColNames.includes('created_at')) { cols.push(rpColNames.includes('createdAt') ? 'createdAt' : 'created_at'); vals.push('NOW()'); }
            if (rpColNames.includes('updatedAt') || rpColNames.includes('updated_at')) { cols.push(rpColNames.includes('updatedAt') ? 'updatedAt' : 'updated_at'); vals.push('NOW()'); }

            await conn.query(`INSERT INTO ${rpTable} (${cols.join(', ')}) VALUES (${vals.join(', ')})`);
            rpAdded++;
          } else {
            rpExisted++;
          }
        }
      }
    }
    console.log(`  Result: ${rpAdded} added, ${rpExisted} already existed`);

    await conn.commit();
    console.log('\n✅ Migration committed successfully!');

    // Also add the schema fields if missing (suggestedParts, suggestedTools on WorkOrder, source on RepairMaterialRequest/RepairToolRequest)
    console.log('\n📋 Checking schema fields...');
    const woTable = tableNames.includes('WorkOrder') ? 'WorkOrder' : 'work_orders';
    const matReqTable = tableNames.includes('RepairMaterialRequest') ? 'RepairMaterialRequest' : (tableNames.includes('repair_material_requests') ? 'repair_material_requests' : null);
    const toolReqTable = tableNames.includes('RepairToolRequest') ? 'RepairToolRequest' : (tableNames.includes('repair_tool_requests') ? 'repair_tool_requests' : null);

    if (woTable) {
      const woCols = await conn.query(`DESCRIBE ${woTable}`);
      const woColNames = woCols.map(c => c.Field);

      if (!woColNames.includes('suggestedParts') && !woColNames.includes('suggested_parts')) {
        console.log(`  Adding suggestedParts JSON column to ${woTable}...`);
        await conn.query(`ALTER TABLE ${woTable} ADD COLUMN suggestedParts TEXT`);
        console.log('  ✅ suggestedParts added');
      } else {
        console.log(`  ⏭️  suggestedParts already exists on ${woTable}`);
      }

      if (!woColNames.includes('suggestedTools') && !woColNames.includes('suggested_tools')) {
        console.log(`  Adding suggestedTools JSON column to ${woTable}...`);
        await conn.query(`ALTER TABLE ${woTable} ADD COLUMN suggestedTools TEXT`);
        console.log('  ✅ suggestedTools added');
      } else {
        console.log(`  ⏭️  suggestedTools already exists on ${woTable}`);
      }
    }

    if (matReqTable) {
      const matCols = await conn.query(`DESCRIBE ${matReqTable}`);
      const matColNames = matCols.map(c => c.Field);

      if (!matColNames.includes('source')) {
        console.log(`  Adding source column to ${matReqTable}...`);
        await conn.query(`ALTER TABLE ${matReqTable} ADD COLUMN source VARCHAR(50) DEFAULT 'technician'`);
        console.log('  ✅ source column added');
      } else {
        console.log(`  ⏭️  source column already exists on ${matReqTable}`);
      }
    }

    if (toolReqTable) {
      const toolCols = await conn.query(`DESCRIBE ${toolReqTable}`);
      const toolColNames = toolCols.map(c => c.Field);

      if (!toolColNames.includes('source')) {
        console.log(`  Adding source column to ${toolReqTable}...`);
        await conn.query(`ALTER TABLE ${toolReqTable} ADD COLUMN source VARCHAR(50) DEFAULT 'technician'`);
        console.log('  ✅ source column added');
      } else {
        console.log(`  ⏭️  source column already exists on ${toolReqTable}`);
      }
    }

  } catch (err) {
    if (conn) await conn.rollback();
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
