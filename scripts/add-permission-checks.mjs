#!/usr/bin/env node
/**
 * Batch-add permission checks (hasPermission + isAdmin) to API route handlers.
 *
 * For each file:
 *   1. Update the import from '@/lib/auth' to include hasPermission and isAdmin
 *   2. After the session check in POST/PUT/DELETE handlers, insert:
 *        if (!hasPermission(session, '<slug>') && !isAdmin(session)) {
 *          return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
 *        }
 *
 * Skips:
 *   - Files that already have the specific permission check
 *   - DELETE handlers that already have an admin role check
 *   - Non-existent files
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE = '/home/z/my-project/src/app/api';

// ─── File → handler/permission mappings ─────────────────────────────────────

const fileMappings = [
  // Assets
  { file: 'assets/route.ts', checks: [{ method: 'POST', permission: 'assets.create' }] },
  { file: 'assets/[id]/route.ts', checks: [{ method: 'PUT', permission: 'assets.update' }, { method: 'DELETE', permission: 'assets.delete' }] },

  // Inventory
  { file: 'inventory/route.ts', checks: [{ method: 'POST', permission: 'inventory.create' }] },
  { file: 'inventory/[id]/route.ts', checks: [{ method: 'PUT', permission: 'inventory.update' }, { method: 'DELETE', permission: 'inventory.delete' }] },
  { file: 'inventory/[id]/stock-movements/route.ts', checks: [{ method: 'POST', permission: 'inventory.stock_movements' }] },
  { file: 'inventory/locations/route.ts', checks: [{ method: 'POST', permission: 'inventory_locations.create' }] },
  { file: 'inventory/locations/[id]/route.ts', checks: [{ method: 'PUT', permission: 'inventory_locations.update' }, { method: 'DELETE', permission: 'inventory_locations.delete' }] },
  { file: 'inventory/adjustments/route.ts', checks: [{ method: 'POST', permission: 'inventory_adjustments.create' }] },
  { file: 'inventory/adjustments/[id]/route.ts', checks: [{ method: 'PUT', permission: 'inventory_adjustments.update' }] },
  { file: 'inventory/transfers/route.ts', checks: [{ method: 'POST', permission: 'inventory_transfers.create' }] },
  { file: 'inventory/transfers/[id]/route.ts', checks: [{ method: 'PUT', permission: 'inventory_transfers.update' }] },
  { file: 'inventory/requests/route.ts', checks: [{ method: 'POST', permission: 'inventory_requests.create' }] },
  { file: 'inventory/requests/[id]/route.ts', checks: [{ method: 'PUT', permission: 'inventory_requests.update' }] },
  { file: 'inventory/requests/[id]/approve/route.ts', checks: [{ method: 'POST', permission: 'inventory_requests.approve' }] },
  { file: 'inventory/requests/[id]/reject/route.ts', checks: [{ method: 'POST', permission: 'inventory_requests.reject' }] },

  // Safety
  { file: 'safety-incidents/route.ts', checks: [{ method: 'POST', permission: 'safety_incidents.create' }] },
  { file: 'safety-incidents/[id]/route.ts', checks: [{ method: 'PUT', permission: 'safety_incidents.update' }, { method: 'DELETE', permission: 'safety_incidents.delete' }] },
  { file: 'safety-inspections/route.ts', checks: [{ method: 'POST', permission: 'safety_inspections.create' }] },
  { file: 'safety-inspections/[id]/route.ts', checks: [{ method: 'PUT', permission: 'safety_inspections.update' }, { method: 'DELETE', permission: 'safety_inspections.delete' }] },
  { file: 'safety-training/route.ts', checks: [{ method: 'POST', permission: 'safety_training.create' }] },
  { file: 'safety-training/[id]/route.ts', checks: [{ method: 'PUT', permission: 'safety_training.update' }, { method: 'DELETE', permission: 'safety_training.delete' }] },
  { file: 'safety-equipment/route.ts', checks: [{ method: 'POST', permission: 'safety_equipment.create' }] },
  { file: 'safety-equipment/[id]/route.ts', checks: [{ method: 'PUT', permission: 'safety_equipment.update' }, { method: 'DELETE', permission: 'safety_equipment.delete' }] },
  { file: 'safety-permits/route.ts', checks: [{ method: 'POST', permission: 'safety_permits.create' }] },
  { file: 'safety-permits/[id]/route.ts', checks: [{ method: 'PUT', permission: 'safety_permits.update' }, { method: 'DELETE', permission: 'safety_permits.delete' }] },

  // Production
  { file: 'production-orders/route.ts', checks: [{ method: 'POST', permission: 'production_orders.create' }] },
  { file: 'production-orders/[id]/route.ts', checks: [{ method: 'PUT', permission: 'production_orders.update' }, { method: 'DELETE', permission: 'production_orders.delete' }] },
  { file: 'production-orders/[id]/start/route.ts', checks: [{ method: 'POST', permission: 'production_orders.start' }] },
  { file: 'production-orders/[id]/complete/route.ts', checks: [{ method: 'POST', permission: 'production_orders.complete' }] },
  { file: 'production-orders/[id]/release/route.ts', checks: [{ method: 'POST', permission: 'production_orders.release' }] },
  { file: 'production-batches/route.ts', checks: [{ method: 'POST', permission: 'production_batches.create' }] },
  { file: 'production-batches/[id]/route.ts', checks: [{ method: 'PUT', permission: 'production_batches.update' }, { method: 'DELETE', permission: 'production_batches.delete' }] },
  { file: 'work-centers/route.ts', checks: [{ method: 'POST', permission: 'work_centers.create' }] },
  { file: 'work-centers/[id]/route.ts', checks: [{ method: 'PUT', permission: 'work_centers.update' }, { method: 'DELETE', permission: 'work_centers.delete' }] },

  // IoT
  { file: 'iot/devices/route.ts', checks: [{ method: 'POST', permission: 'iot.create' }] },
  { file: 'iot/devices/[id]/route.ts', checks: [{ method: 'PUT', permission: 'iot.update' }, { method: 'DELETE', permission: 'iot.delete' }] },
  { file: 'iot/devices/[id]/readings/route.ts', checks: [{ method: 'POST', permission: 'iot.create' }] },

  // Quality
  { file: 'quality-inspections/route.ts', checks: [{ method: 'POST', permission: 'quality.create' }] },
  { file: 'quality-inspections/[id]/route.ts', checks: [{ method: 'PUT', permission: 'quality.update' }, { method: 'DELETE', permission: 'quality.delete' }] },
  { file: 'quality-ncr/route.ts', checks: [{ method: 'POST', permission: 'quality.create' }] },
  { file: 'quality-ncr/[id]/route.ts', checks: [{ method: 'PUT', permission: 'quality.update' }, { method: 'DELETE', permission: 'quality.delete' }] },
  { file: 'quality-audits/route.ts', checks: [{ method: 'POST', permission: 'quality.create' }] },
  { file: 'quality-audits/[id]/route.ts', checks: [{ method: 'PUT', permission: 'quality.update' }, { method: 'DELETE', permission: 'quality.delete' }] },
  { file: 'quality-control-plans/route.ts', checks: [{ method: 'POST', permission: 'quality.create' }] },
  { file: 'quality-control-plans/[id]/route.ts', checks: [{ method: 'PUT', permission: 'quality.update' }, { method: 'DELETE', permission: 'quality.delete' }] },
  { file: 'corrective-actions/route.ts', checks: [{ method: 'POST', permission: 'quality.create' }] },
  { file: 'corrective-actions/[id]/route.ts', checks: [{ method: 'PUT', permission: 'quality.update' }, { method: 'DELETE', permission: 'quality.delete' }] },

  // Operations
  { file: 'meter-readings/route.ts', checks: [{ method: 'POST', permission: 'operations.create' }] },
  { file: 'meter-readings/[id]/route.ts', checks: [{ method: 'PUT', permission: 'operations.update' }, { method: 'DELETE', permission: 'operations.delete' }] },
  { file: 'training-courses/route.ts', checks: [{ method: 'POST', permission: 'operations.create' }] },
  { file: 'training-courses/[id]/route.ts', checks: [{ method: 'PUT', permission: 'operations.update' }, { method: 'DELETE', permission: 'operations.delete' }] },
  { file: 'surveys/route.ts', checks: [{ method: 'POST', permission: 'operations.create' }] },
  { file: 'surveys/[id]/route.ts', checks: [{ method: 'PUT', permission: 'operations.update' }, { method: 'DELETE', permission: 'operations.delete' }] },
  { file: 'shift-handovers/route.ts', checks: [{ method: 'POST', permission: 'operations.create' }] },
  { file: 'shift-handovers/[id]/route.ts', checks: [{ method: 'PUT', permission: 'operations.update' }, { method: 'DELETE', permission: 'operations.delete' }] },
  { file: 'checklists/route.ts', checks: [{ method: 'POST', permission: 'operations.create' }] },
  { file: 'checklists/[id]/route.ts', checks: [{ method: 'PUT', permission: 'operations.update' }, { method: 'DELETE', permission: 'operations.delete' }] },

  // Tools
  { file: 'tools/route.ts', checks: [{ method: 'POST', permission: 'tools.create' }] },
  { file: 'tools/[id]/route.ts', checks: [{ method: 'PUT', permission: 'tools.update' }, { method: 'DELETE', permission: 'tools.delete' }] },
  { file: 'tools/[id]/checkout/route.ts', checks: [{ method: 'POST', permission: 'tools.checkout' }] },
  { file: 'tools/[id]/return/route.ts', checks: [{ method: 'POST', permission: 'tools.return' }] },
  { file: 'tools/[id]/repair/route.ts', checks: [{ method: 'POST', permission: 'tools.repair' }] },
  { file: 'tools/[id]/transfer/route.ts', checks: [{ method: 'POST', permission: 'tools.transfer' }] },

  // PM Schedules
  { file: 'pm-schedules/route.ts', checks: [{ method: 'POST', permission: 'work_orders.create' }] },
  { file: 'pm-schedules/[id]/route.ts', checks: [{ method: 'PUT', permission: 'work_orders.update' }, { method: 'DELETE', permission: 'work_orders.delete' }] },

  // Suppliers & Procurement
  { file: 'suppliers/route.ts', checks: [{ method: 'POST', permission: 'inventory.create' }] },
  { file: 'suppliers/[id]/route.ts', checks: [{ method: 'PUT', permission: 'inventory.update' }, { method: 'DELETE', permission: 'inventory.delete' }] },
  { file: 'purchase-orders/route.ts', checks: [{ method: 'POST', permission: 'inventory.create' }] },
  { file: 'purchase-orders/[id]/route.ts', checks: [{ method: 'PUT', permission: 'inventory.update' }] },
  { file: 'purchase-orders/[id]/approve/route.ts', checks: [{ method: 'POST', permission: 'inventory.update' }] },
  { file: 'purchase-orders/[id]/receive/route.ts', checks: [{ method: 'POST', permission: 'inventory.update' }] },

  // Backups
  { file: 'backups/route.ts', checks: [{ method: 'POST', permission: 'system_settings.update' }] },
];

// ─── Results tracking ────────────────────────────────────────────────────────

const results = { modified: [], skippedAlready: [], skippedAdminCheck: [], skippedNoHandler: [], skippedNoSessionCheck: [], warnings: [], errors: [] };

// ─── Helper: update import line ──────────────────────────────────────────────

function updateImport(content) {
  const importRegex = /import\s*\{([^}]*)\}\s*from\s*'@\/lib\/auth'\s*;/;
  const match = importRegex.exec(content);
  if (!match) {
    results.warnings.push('No import from @/lib/auth found — cannot update import');
    return content;
  }

  const imports = match[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const needsHasPermission = !imports.includes('hasPermission');
  const needsIsAdmin = !imports.includes('isAdmin');

  if (!needsHasPermission && !needsIsAdmin) return content;

  // Preserve original ordering: getSession first, then alphabetical for the rest
  const existing = new Set(imports);
  if (needsHasPermission) existing.add('hasPermission');
  if (needsIsAdmin) existing.add('isAdmin');

  // Rebuild: keep getSession first if present, then sort the rest
  const sorted = [...existing];
  const getSessionIdx = sorted.indexOf('getSession');
  if (getSessionIdx > -1) {
    sorted.splice(getSessionIdx, 1);
    sorted.sort();
    sorted.unshift('getSession');
  } else {
    sorted.sort();
  }

  const newImport = `import { ${sorted.join(', ')} } from '@/lib/auth';`;
  return content.replace(match[0], newImport);
}

// ─── Helper: add permission check to a specific handler ─────────────────────

function addPermissionCheck(content, method, permission) {
  // 1. Find the handler function
  const handlerRegex = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`);
  const handlerMatch = handlerRegex.exec(content);
  if (!handlerMatch) {
    results.skippedNoHandler.push(`${method} handler not found`);
    return content;
  }

  const handlerStart = handlerMatch.index;

  // 2. Find the handler boundary (up to next export async function or EOF)
  const nextHandlerRegex = /export\s+async\s+function\s+\w+\s*\(/g;
  nextHandlerRegex.lastIndex = handlerStart + 1;
  const nextHandlerMatch = nextHandlerRegex.exec(content);
  const handlerEnd = nextHandlerMatch ? nextHandlerMatch.index : content.length;

  const handlerText = content.substring(handlerStart, handlerEnd);

  // 3. Check if already has this permission check
  if (handlerText.includes(`hasPermission(session, '${permission}')`)) {
    return content; // silently skip
  }

  // 4. Check if DELETE handler already has an admin check
  if (method === 'DELETE') {
    const hasAdminRoleCheck = /session\.roles\.includes\s*\(\s*['"]admin['"]\s*\)/.test(handlerText);
    const hasIsAdminCheck = /isAdmin\s*\(\s*session\s*\)/.test(handlerText);
    if (hasAdminRoleCheck || hasIsAdminCheck) {
      results.skippedAdminCheck.push(`${method} already has admin check`);
      return content;
    }
  }

  // 5. Find the session check within the handler
  const sessionCheckRegex = /if\s*\(\s*!session\s*\)/;
  const sessionCheckMatch = sessionCheckRegex.exec(handlerText);
  if (!sessionCheckMatch) {
    results.skippedNoSessionCheck.push(`${method} handler has no session check`);
    return content;
  }

  // 6. Find the line containing the session check
  const lineStart = handlerText.lastIndexOf('\n', sessionCheckMatch.index) + 1;
  const lineEnd = handlerText.indexOf('\n', sessionCheckMatch.index);
  const sessionCheckLine = handlerText.substring(lineStart, lineEnd !== -1 ? lineEnd : handlerText.length);

  // 7. Get indentation
  const indent = sessionCheckLine.match(/^(\s*)/)[1];

  // 8. Determine if single-line or multiline session check
  const trimmedLine = sessionCheckLine.trim();

  const checkBlock = `\n${indent}if (!hasPermission(session, '${permission}') && !isAdmin(session)) {\n${indent}  return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });\n${indent}}`;

  if (trimmedLine.startsWith('if (!session) return') || trimmedLine.startsWith('if (!session)return')) {
    // Single-line session check: insert after the line
    const insertPos = handlerStart + (lineEnd !== -1 ? lineEnd : handlerText.length);
    content = content.substring(0, insertPos) + checkBlock + content.substring(insertPos);
  } else {
    // Multiline session check: find the matching closing brace
    let braceCount = 0;
    let closingBracePos = -1;

    for (let i = sessionCheckMatch.index; i < handlerText.length; i++) {
      if (handlerText[i] === '{') braceCount++;
      if (handlerText[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          closingBracePos = i;
          break;
        }
      }
    }

    if (closingBracePos === -1) {
      results.warnings.push(`Could not find closing brace for session check in ${method} handler`);
      return content;
    }

    // Insert after the closing brace of the session check
    const insertPos = handlerStart + closingBracePos + 1;
    content = content.substring(0, insertPos) + checkBlock + content.substring(insertPos);
  }

  return content;
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('=== Permission Check Batch Adder ===\n');
console.log(`Processing ${fileMappings.length} file mappings...\n`);

for (const mapping of fileMappings) {
  const fullPath = `${BASE}/${mapping.file}`;

  if (!existsSync(fullPath)) {
    results.errors.push(`File not found: ${mapping.file}`);
    console.log(`❌ NOT FOUND: ${mapping.file}`);
    continue;
  }

  let content = readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // Check if ALL permission checks already present → skip entire file
  const allPresent = mapping.checks.every(
    c => content.includes(`hasPermission(session, '${c.permission}')`)
  );
  if (allPresent) {
    results.skippedAlready.push(mapping.file);
    console.log(`⏭️  SKIP (already has checks): ${mapping.file}`);
    continue;
  }

  // Update the import line
  content = updateImport(content);

  // Add permission checks for each handler
  let handlersModified = 0;
  for (const check of mapping.checks) {
    const before = content;
    content = addPermissionCheck(content, check.method, check.permission);
    if (content !== before) {
      handlersModified++;
    }
  }

  if (content !== originalContent) {
    writeFileSync(fullPath, content, 'utf-8');
    results.modified.push({ file: mapping.file, handlers: handlersModified });
    console.log(`✅ Modified: ${mapping.file} (${handlersModified} handler(s))`);
  } else {
    // No changes — file was skipped for some sub-reason
    console.log(`⏭️  No changes: ${mapping.file}`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n=== Summary ===');
console.log(`Modified files:      ${results.modified.length}`);
console.log(`Skipped (existing):  ${results.skippedAlready.length}`);
console.log(`Skipped (admin chk): ${results.skippedAdminCheck.length}`);
console.log(`Skipped (no handler): ${results.skippedNoHandler.length}`);
console.log(`Skipped (no session): ${results.skippedNoSessionCheck.length}`);
console.log(`Errors:              ${results.errors.length}`);
console.log(`Warnings:            ${results.warnings.length}`);

if (results.modified.length > 0) {
  console.log('\n--- Modified files ---');
  for (const r of results.modified) {
    console.log(`  ${r.file} (${r.handlers} handler(s))`);
  }
}

if (results.errors.length > 0) {
  console.log('\n--- Errors ---');
  for (const e of results.errors) {
    console.log(`  ${e}`);
  }
}

if (results.warnings.length > 0) {
  console.log('\n--- Warnings ---');
  for (const w of results.warnings) {
    console.log(`  ${w}`);
  }
}

if (results.skippedAdminCheck.length > 0) {
  console.log('\n--- Skipped (already has admin check) ---');
  for (const s of results.skippedAdminCheck) {
    console.log(`  ${s}`);
  }
}

if (results.skippedNoHandler.length > 0) {
  console.log('\n--- Skipped (handler not found) ---');
  for (const s of results.skippedNoHandler) {
    console.log(`  ${s}`);
  }
}

if (results.skippedNoSessionCheck.length > 0) {
  console.log('\n--- Skipped (no session check found) ---');
  for (const s of results.skippedNoSessionCheck) {
    console.log(`  ${s}`);
  }
}
