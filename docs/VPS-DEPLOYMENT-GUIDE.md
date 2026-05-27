# EAM System - VPS Deployment & Troubleshooting Knowledge Base

> **Last updated**: 2026-05-28
> **Environment**: Webuzo VPS, MariaDB remote @ 163.245.212.15, PM2 process management
> **Maintainer**: Z.ai Code

---

## TABLE OF CONTENTS

1. [Panic Checklist — What to Do First](#1-panic-checklist--what-to-do-first)
2. [Critical VPS Information](#2-critical-vps-information)
3. [Complete Deployment Procedure](#3-complete-deployment-procedure)
4. [Every Error We Hit & How We Fixed It (Chronological)](#4-every-error-we-hit--how-we-fixed-it-chronological)
5. [Prisma Client in Standalone Build — The Full Story](#5-prisma-client-in-standalone-build--the-full-story)
6. [Status Transitions Table — Seeding Guide](#6-status-transitions-table--seeding-guide)
7. [Nginx Reverse Proxy Configuration](#7-nginx-reverse-proxy-configuration)
8. [Database Column Names — CRITICAL](#8-database-column-names--critical)
9. [Troubleshooting Quick Reference Tables](#9-troubleshooting-quick-reference-tables)
10. [Diagnostic Commands Cheat Sheet](#10-diagnostic-commands-cheat-sheet)
11. [Common Mistakes to Avoid (DO NOT DO THESE)](#11-common-mistakes-to-avoid-do-not-do-these)
12. [Environment Variables Reference](#12-environment-variables-reference)

---

## 1. Panic Checklist — What to Do First

When the site is down, follow this order:

```
STEP 1: Check if PM2 process is running
  pm2 list
  → If "errored" or "stopped": pm2 logs eam-system --err --lines 20

STEP 2: Check what's listening on port 3001
  ss -tlnp | grep 3001
  → If nothing: process crashed. Check pm2 logs.
  → If bound to 163.245.212.15 (NOT 0.0.0.0): Wrong binding! See Error #7 below.

STEP 3: Check if nginx can reach the app
  curl -s http://127.0.0.1:3001/api/health
  → If connection refused: server not listening on 127.0.0.1. Need HOSTNAME=0.0.0.0.
  → If PrismaClient error: symlinks broken. Recreate them (see Section 5).
  → If "Authentication required": app is working correctly!

STEP 4: Check symlinks
  readlink -f .next/standalone/node_modules/.prisma
  → Should end in: /home/ifleetpro/git/eam-system/node_modules/.prisma
  → If broken or not a symlink: recreate (see Section 5).

STEP 5: Quick fix — full redeploy
  cd /home/ifleetpro/git/eam-system && bash scripts/deploy-vps.sh
```

---

## 2. Critical VPS Information

### Server Details
- **Provider**: Webuzo VPS
- **IP**: 163.245.212.15
- **Domain**: iassetspro.lightworldtech.com
- **Web Server**: Nginx (managed by Webuzo at `/usr/local/apps/nginx/`)
- **Process Manager**: PM2 (`pm2`)
- **OS User for project**: `ifleetpro` (NOT root)
- **Root access**: Available via sudo

### Port Allocation — MEMORIZE THIS
| Port | Application | Notes |
|------|-------------|-------|
| **3000** | ifleetpro app | **DO NOT TOUCH. EVER.** This kills the main site. |
| **3001** | **EAM System** | PM2 process name: `eam-system` |
| 443/80 | Nginx reverse proxy | Webuzo-managed |

### Key Paths
| Item | Path |
|------|------|
| EAM Project | `/home/ifleetpro/git/eam-system` |
| Deploy Script | `scripts/deploy-vps.sh` |
| Seed Script | `scripts/seed-transitions.js` |
| PM2 Config | `/root/.pm2/dump.pm2` |
| PM2 Logs | `/root/.pm2/logs/eam-system-{out,err}.log` |
| Nginx Config (EAM) | `/usr/local/apps/nginx/etc/conf.d/00-iassetspro.conf` |
| Nginx Main Config | `/usr/local/apps/nginx/etc/nginx.conf` |
| Nginx Binary | `/usr/local/apps/nginx/sbin/nginx` |

### Database
- **Type**: MariaDB (remote)
- **URL**: `mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system`
- **Credentials in**: `/home/ifleetpro/git/eam-system/.env` as `DATABASE_URL`
- **Schema uses**: **camelCase column names** (e.g., `entityType`, NOT `entity_type`)
- **NO `updatedAt` column** in `status_transitions` table

### PM2 Startup Command — MEMORIZE THIS
```bash
cd /home/ifleetpro/git/eam-system
PORT=3001 HOSTNAME=0.0.0.0 pm2 start .next/standalone/server.js --name eam-system
pm2 save
```

**CRITICAL**: `HOSTNAME=0.0.0.0` is **MANDATORY**. Without it, Next.js binds to the external IP only (`163.245.212.15`), and nginx's `proxy_pass http://127.0.0.1:3001` fails with 502 because nginx tries to reach `127.0.0.1:3001` but the app only listens on `163.245.212.15:3001`.

---

## 3. Complete Deployment Procedure

### Quick Deploy (Use This 99% of the Time)
```bash
cd /home/ifleetpro/git/eam-system && bash scripts/deploy-vps.sh
```

### Manual Deploy Step-by-Step
```bash
# 1. Pull latest code
cd /home/ifleetpro/git/eam-system
git pull

# 2. Install deps
bun install

# 3. Generate Prisma client
npx prisma generate

# 4. Build Next.js (memory-limited for low-RAM VPS)
NODE_OPTIONS="--max-old-space-size=1024" bun run build

# 5. Create SYMLINKS for Prisma + mariadb (NEVER cp -r!)
rm -rf .next/standalone/node_modules/.prisma .next/standalone/node_modules/@prisma .next/standalone/node_modules/mariadb
ln -s ../../../node_modules/.prisma .next/standalone/node_modules/.prisma
ln -s ../../../node_modules/@prisma .next/standalone/node_modules/@prisma
ln -s ../../../node_modules/mariadb .next/standalone/node_modules/mariadb

# 6. Copy static assets
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# 7. Restart PM2 (MUST include PORT and HOSTNAME)
pm2 delete eam-system
PORT=3001 HOSTNAME=0.0.0.0 pm2 start .next/standalone/server.js --name eam-system
pm2 save

# 8. Verify
sleep 10
curl -s http://127.0.0.1:3001/api/health

# 9. Seed transitions (if needed, safe to run multiple times)
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node scripts/seed-transitions.js
```

### Deploy Script Flags
```bash
bash scripts/deploy-vps.sh              # Full deploy (pull, build, symlink, restart, seed)
bash scripts/deploy-vps.sh --fast       # Skip dependency install (faster if deps unchanged)
bash scripts/deploy-vps.sh --swap       # Only setup 2GB swap file, then exit
bash scripts/deploy-vps.sh --seed       # Only seed status_transitions, then exit
bash scripts/deploy-vps.sh --mem=512    # Limit Node.js heap to 512MB
```

---

## 4. Every Error We Hit & How We Fixed It (Chronological)

This section documents every error encountered during VPS deployment, in the order they happened, with the exact symptoms, root cause, and fix. **Use this as a lookup table — if you see the same error, go straight to the fix.**

---

### Error #1: `cd: /root/git/eam-system: No such file or directory`

**Symptom**:
```
[root@vps ~]# cd ~/git/eam-system && bash scripts/deploy-vps.sh
-bash: cd: /root/git/eam-system: No such file or directory
```

**Root Cause**: Running as `root` user. The `~` for root is `/root`, but the project lives at `/home/ifleetpro/git/eam-system`.

**Fix**: Always use the full path:
```bash
cd /home/ifleetpro/git/eam-system
```

**Lesson**: Never use `~` on this VPS. Always use `/home/ifleetpro/git/eam-system`.

---

### Error #2: `bash: scripts/deploy-vps.sh: No such file or directory`

**Symptom**:
```
[root@vps eam-system]# bash scripts/deploy-vps.sh
bash: scripts/deploy-vps.sh: No such file or directory
```

**Root Cause**: The deploy script was created locally but never pushed to GitHub. The VPS had an older commit that didn't include it.

**Fix**:
```bash
git pull origin main
```

**Lesson**: Always `git pull` before running scripts. If a file is missing, it likely wasn't pushed.

---

### Error #3: `cp: cannot stat 'node_modules/.prisma/client/*': No such file or directory`

**Symptom**:
```
server.js patched successfully...
✓ Build successful!
...
cp: cannot stat 'node_modules/.prisma/client/*': No such file or directory
```

**Root Cause**: The deploy script tried to copy Prisma client files before running `npx prisma generate`. The standalone build doesn't include `.prisma` in its output.

**Fix**: Always run `npx prisma generate` before any Prisma-related file operations:
```bash
npx prisma generate
# THEN do symlinks/copy
```

**Lesson**: `bun run build` does NOT generate the Prisma client. You must run `npx prisma generate` separately.

---

### Error #4: `502 Bad Gateway` — PrismaClient "then" is not available

**Symptom**: After PM2 restart, the site shows `502 Bad Gateway`. PM2 logs show:
```
PrismaClient property "then" is not available. Run: npx prisma generate
```

This error appeared **repeatedly** across multiple fix attempts because the underlying issue (missing Prisma client in standalone) kept manifesting in different ways.

**Root Cause**: Next.js standalone output at `.next/standalone/` does NOT include `node_modules/.prisma` or `node_modules/@prisma`. The server.js needs these to make database queries. Without them, every Prisma call throws this error.

**Fix**: Use symlinks (see Section 5 for full details). The `cp -r` approach was attempted multiple times and failed catastrophically (see Error #5).

---

### Error #5: Infinite Nesting — `.prisma/.prisma/.prisma/.prisma/...`

**Symptom**: When using `cp -r node_modules/.prisma .next/standalone/node_modules/.prisma`, the directory creates infinite nesting:
```
find .next/standalone/node_modules/.prisma -name "*.js" | head -5
.next/standalone/node_modules/.prisma/client/index.js
.next/standalone/node_modules/.prisma/.prisma/client/index.js
.next/standalone/node_modules/.prisma/.prisma/.prisma/client/index.js
.next/standalone/node_modules/.prisma/.prisma/.prisma/.prisma/client/index.js
... (continues forever)
```

**Root Cause**: When you `cp -r node_modules/.prisma/standalone/node_modules/.prisma`, the copy includes itself in a loop. The `.prisma` directory contains references that point back to itself, causing recursive nesting.

**Fix**: **NEVER use `cp -r` for Prisma.** ALWAYS use symlinks:
```bash
rm -rf .next/standalone/node_modules/.prisma
ln -s ../../../node_modules/.prisma .next/standalone/node_modules/.prisma
```

**Lesson**: This wasted over an hour of trial and error. The symlink approach is the ONLY reliable method.

---

### Error #6: Symlink Path Wrong — `../../` vs `../../../`

**Symptom**: Symlinks created successfully but Prisma still can't find the client:
```
readlink .next/standalone/node_modules/.prisma
../../node_modules/.prisma
# Points to: .next/node_modules/.prisma (WRONG - doesn't exist)
```

**Root Cause**: The path from `.next/standalone/node_modules/` back to the project root requires going up **3 levels**:
- `.next/standalone/node_modules/` -> `..` = `.next/standalone/`
- `../..` = `.next/`
- `../../..` = project root

Using `../../` only goes to `.next/`, which doesn't have `node_modules/`.

**Fix**: Use `../../../` (three levels up):
```bash
ln -s ../../../node_modules/.prisma .next/standalone/node_modules/.prisma
```

**Lesson**: Count the directory levels carefully. From `standalone/node_modules/` to project root = 3 `..` segments.

---

### Error #7: 502 — Server Not Listening on 127.0.0.1:3001

**Symptom**: 502 persists even after Prisma fix. Server appears to be running:
```
pm2 list
┌──────────────┬────┬─────────┬───────┐
│ eam-system   │ 1  │ online  │ 289   │
└──────────────┴────┴─────────┴───────┘
```

But health check fails:
```
curl -s http://127.0.0.1:3001/api/health
curl: (7) Failed to connect to 127.0.0.1 port 3001: Connection refused
```

Checking what's listening:
```
ss -tlnp | grep 3001
LISTEN  0  511  163.245.212.15:3001  0.0.0.0:*  users:(("node",pid=1234,...))
```

**Root Cause**: Next.js standalone server by default binds to the machine's **external IP** (`163.245.212.15`), NOT to `0.0.0.0` (all interfaces). Nginx's config has `proxy_pass http://127.0.0.1:3001`, so it tries to reach localhost — but the app isn't listening on localhost.

**Fix**: Set `HOSTNAME=0.0.0.0` when starting:
```bash
pm2 delete eam-system
PORT=3001 HOSTNAME=0.0.0.0 pm2 start .next/standalone/server.js --name eam-system
pm2 save
```

After fix:
```
ss -tlnp | grep 3001
LISTEN  0  511  0.0.0.0:3001  *:*  users:(("node",pid=1234,...))
```

Now nginx can reach it on `127.0.0.1:3001`.

**Lesson**: This is a Next.js standalone gotcha. Always set `HOSTNAME=0.0.0.0`.

---

### Error #8: Port 3000 Conflict — Almost Killed ifleetpro

**Symptom**: When EAM was accidentally configured with `PORT=3000`, it either failed to start (port in use) or displaced the ifleetpro app.

**Root Cause**: Port 3000 is used by the ifleetpro application. Both apps were trying to use the same port.

**Fix**: EAM MUST use port 3001. This is hardcoded in the deploy script and in the nginx config.

**Lesson**: **NEVER use port 3000 for EAM.** Check with `ss -tlnp | grep -E '3000|3001'` if unsure.

---

### Error #9: Nginx Config Not Found at Standard Path

**Symptom**:
```
sudo nginx -t
bash: nginx: command not found

ls /etc/nginx/
ls: cannot access '/etc/nginx/': No such file or directory
```

**Root Cause**: Webuzo installs nginx at a **non-standard path** (`/usr/local/apps/nginx/`), not the typical `/etc/nginx/`.

**Fix**: Use Webuzo's nginx binary:
```bash
# Test config
sudo /usr/local/apps/nginx/sbin/nginx -t

# Reload
sudo /usr/local/apps/nginx/sbin/nginx -s reload

# EAM config location
cat /usr/local/apps/nginx/etc/conf.d/00-iassetspro.conf
```

**Lesson**: Webuzo doesn't follow standard Linux paths. Always use the full path.

---

### Error #10: Seed Script — PrismaClient Constructor Error

**Symptom**: When trying to seed `status_transitions`, the seed script crashed with:
```
Error: PrismaClient requires a driver adapter for your database.
```

**Root Cause**: PrismaClient with MariaDB requires the `@prisma/adapter-mariadb` driver adapter to be configured. The seed script was trying to use PrismaClient directly without the adapter.

**Fix**: Don't use PrismaClient in the seed script. Use the raw `mariadb` driver instead:
```javascript
const mariadb = require('mariadb');
const conn = await mariadb.createConnection({ host, port, user, password, database });
const rows = await conn.query('SELECT * FROM status_transitions');
```

---

### Error #11: Seed Script — Bun ESM Error with mariadb

**Symptom**: When running the seed script with `bun`:
```
TypeError: Cannot read properties of undefined (reading 'default')
  at <anonymous> (node_modules/mariadb/index.js:1:1)
```

**Root Cause**: The `mariadb` npm package is a **CommonJS** module. Bun tries to import it as ESM, which fails.

**Fix**: Run the seed script with **Node.js** (not Bun), and use `require()` syntax:
```bash
# Correct:
node scripts/seed-transitions.js

# Wrong:
bun run scripts/seed-transitions.js
bun scripts/seed-transitions.js
```

The script must be a `.js` file with `require('mariadb')`, NOT a `.ts` file with `import`.

---

### Error #12: Seed Script — `source .env` Doesn't Export Variables

**Symptom**:
```bash
source .env
DATABASE_URL="..." node scripts/seed-transitions.js
# Script says: ERROR: No database credentials found.
```

**Root Cause**: `source .env` in bash only sets variables in the current shell, but doesn't export them to child processes. The `DATABASE_URL="..."` prefix on the `node` command should work, but if the `.env` file has quotes, `grep` + `export` fails.

**Fix**: Pass the DATABASE_URL directly as an inline environment variable:
```bash
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node scripts/seed-transitions.js
```

---

### Error #13: Seed Script — Wrong Column Names (snake_case vs camelCase)

**Symptom**: Seed script fails with SQL error:
```
Error: Unknown column 'entity_type' in 'field list'
```

**Root Cause**: The seed script used snake_case column names (`entity_type`, `from_status`, `to_status`) but the database uses **camelCase** (`entityType`, `fromStatus`, `toStatus`) because Prisma maps models to camelCase by default.

Additionally, the script tried to insert an `updatedAt` column which doesn't exist in the table.

**Fix**: Use the correct camelCase column names:
```sql
-- WRONG:
INSERT INTO status_transitions (entity_type, from_status, to_status, ...) VALUES (...)

-- CORRECT:
INSERT INTO status_transitions (entityType, fromStatus, toStatus, ...) VALUES (...)
```

See Section 8 for the complete column name mapping.

---

### Error #14: Approve/Reject Returns 400 Bad Request

**Symptom**: When trying to approve or reject a maintenance request:
```
POST /api/maintenance-requests/[id]/approve
→ 400 Bad Request
→ "No valid transition rule found"
```

**Root Cause**: The `status_transitions` table is empty. The state machine that controls which roles can change which statuses depends on rows in this table. If the table has no rows, ALL status changes fail.

**Fix**: Seed the transitions table:
```bash
cd /home/ifleetpro/git/eam-system
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node scripts/seed-transitions.js
```

---

### Error #15: Runtime Error `searchText is not defined`

**Symptom**: When clicking "Convert to Work Order" on a maintenance request, the browser shows:
```
Runtime Error: searchText is not defined
```

**Root Cause**: In `src/components/shared/WorkerAssignmentSelector.tsx`, the `MobileWorkerList` component used `searchText` and `hideDepartmentFilter` variables but they were NOT passed as props. They were only available in the parent component's scope.

**Fix**: Pass `searchText` and `hideDepartmentFilter` as props to `MobileWorkerList`:
```tsx
// In the JSX:
<MobileWorkerList
  ...
  searchText={searchText}
  hideDepartmentFilter={hideDepartmentFilter}
/>

// In the function signature:
function MobileWorkerList({
  ..., searchText, hideDepartmentFilter,
}: {
  ...;
  searchText: string;
  hideDepartmentFilter?: boolean;
}) {
```

---

## 5. Prisma Client in Standalone Build — The Full Story

### Why This Is the #1 Deployment Issue

Next.js standalone mode (set in `next.config.ts` with `output: 'standalone'`) traces all `require()` calls and copies the needed `node_modules` into `.next/standalone/node_modules/`. However, it does NOT handle:

1. **`.prisma` directory** — The generated Prisma client lives at `node_modules/.prisma/client/` but is not traced because it's generated post-install
2. **`@prisma/client`** — The runtime package that loads the generated client
3. **`mariadb` driver** — The native database driver package

Without these, every API route that uses Prisma fails with:
```
PrismaClient property "then" is not available. Run: npx prisma generate
```

### The ONLY Reliable Fix: Symlinks

```bash
cd /home/ifleetpro/git/eam-system

# Step 1: Clean up any broken copies/symlinks
rm -rf .next/standalone/node_modules/.prisma
rm -rf .next/standalone/node_modules/@prisma
rm -rf .next/standalone/node_modules/mariadb

# Step 2: Create symlinks
# Path: .next/standalone/node_modules/ -> 3 levels up -> project root/node_modules/
ln -s ../../../node_modules/.prisma .next/standalone/node_modules/.prisma
ln -s ../../../node_modules/@prisma .next/standalone/node_modules/@prisma
ln -s ../../../node_modules/mariadb .next/standalone/node_modules/mariadb

# Step 3: Verify
readlink .next/standalone/node_modules/.prisma
# Should output: ../../../node_modules/.prisma

readlink -f .next/standalone/node_modules/.prisma/client/index.js
# Should output: /home/ifleetpro/git/eam-system/node_modules/.prisma/client/index.js
```

### Why NOT cp -r?

Using `cp -r` was attempted **4 times** with different approaches. Every attempt failed:

1. **`cp -r node_modules/.prisma/client/* .next/standalone/node_modules/.prisma/client/`** — "No such file or directory" (directory doesn't exist yet)
2. **`cp -r node_modules/.prisma .next/standalone/node_modules/.prisma`** — Created infinite nesting `.prisma/.prisma/.prisma/...`
3. **Delete + re-copy** — Same infinite nesting
4. **Copy `@prisma/client/*` as well** — Still failed with missing files

**Symlinks work because**:
- They point to the actual files (no duplication)
- They're always up-to-date after `npx prisma generate`
- They don't create recursive copies
- They take zero disk space
- `git pull` doesn't break them (relative paths)

### After Git Pull

Git pull does NOT break symlinks because symlinks store relative paths. However, if someone accidentally runs `cp -r` and replaces symlinks with real directories, recreate them:

```bash
# Check if symlinks are intact
readlink .next/standalone/node_modules/.prisma
# If output is "not a symbolic link" or empty, recreate:
rm -rf .next/standalone/node_modules/.prisma .next/standalone/node_modules/@prisma .next/standalone/node_modules/mariadb
ln -s ../../../node_modules/.prisma .next/standalone/node_modules/.prisma
ln -s ../../../node_modules/@prisma .next/standalone/node_modules/@prisma
ln -s ../../../node_modules/mariadb .next/standalone/node_modules/mariadb
```

---

## 6. Status Transitions Table — Seeding Guide

### What This Table Does

The `status_transitions` table defines the **state machine** for maintenance requests and work orders. Each row says:

> "Entity of type X, currently in status Y, can be moved to status Z by users with roles R"

Without rows in this table, **NO status transitions work** — not approve, not reject, not convert to work order.

### Check Current State
```bash
cd /home/ifleetpro/git/eam-system
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node -e "
const mariadb = require('mariadb');
(async () => {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mariadb.createConnection({
    host: url.hostname,
    port: +url.port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1)
  });
  const rows = await conn.query('SELECT COUNT(*) as cnt FROM status_transitions');
  console.log('Transitions count:', rows[0].cnt);
  if (rows[0].cnt === 0) console.log('WARNING: Table is empty! Run seed.');
  await conn.end();
})().catch(e => console.error(e.message));
"
```

### Seed the Table
```bash
cd /home/ifleetpro/git/eam-system
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node scripts/seed-transitions.js
```

Or using the deploy script:
```bash
cd /home/ifleetpro/git/eam-system && bash scripts/deploy-vps.sh --seed
```

### What Gets Seeded

**Maintenance Request transitions** (5 rules):
| From | To | Allowed Roles |
|------|----|---------------|
| (new) | pending | operator, supervisor, planner, admin, production_operator, plant_manager, maintenance_manager |
| pending | in_progress | supervisor, admin, maintenance_supervisor, maintenance_manager, plant_manager |
| pending | approved | admin, maintenance_supervisor, maintenance_manager, plant_manager |
| pending | rejected | admin, maintenance_supervisor, maintenance_manager, plant_manager (requires reason) |
| approved | converted | planner, admin, maintenance_planner, maintenance_manager |

**Work Order transitions** (20 rules):
Draft -> Requested -> Approved -> Planned -> Assigned -> In Progress -> Completed -> Closed, plus cancellations and holds.

### Why the Seed Script Uses Raw SQL (Not PrismaClient)

The seed script (`scripts/seed-transitions.js`) uses `require('mariadb')` directly instead of PrismaClient for three reasons:

1. **PrismaClient needs adapter**: MariaDB requires `@prisma/adapter-mariadb` which needs complex setup
2. **Bun ESM incompatibility**: `mariadb` package is CommonJS, Bun can't import it properly
3. **Simplicity**: Raw SQL is the most reliable approach for a one-time seed script

**IMPORTANT**: The script must be run with `node` (NOT `bun`):
```bash
node scripts/seed-transitions.js  # Correct
bun scripts/seed-transitions.js    # WRONG - will fail
```

---

## 7. Nginx Reverse Proxy Configuration

### EAM Nginx Config Location
```
/usr/local/apps/nginx/etc/conf.d/00-iassetspro.conf
```

**This is NOT at `/etc/nginx/`!** Webuzo installs nginx at `/usr/local/apps/nginx/`.

### Current Config (Do NOT modify proxy_pass port)
```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name iassetspro.lightworldtech.com;

    # SSL certificates managed by Webuzo

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Nginx Commands (Webuzo Paths)
```bash
# Test config syntax
sudo /usr/local/apps/nginx/sbin/nginx -t

# Reload config (no downtime)
sudo /usr/local/apps/nginx/sbin/nginx -s reload

# Full restart
sudo /usr/local/apps/nginx/sbin/nginx -s stop
sudo /usr/local/apps/nginx/sbin/nginx

# View config
cat /usr/local/apps/nginx/etc/conf.d/00-iassetspro.conf
```

---

## 8. Database Column Names — CRITICAL

### The Rule
This Prisma setup uses **camelCase column names** in the database, NOT snake_case. This is because Prisma's `@@map` directive maps model field names directly to database column names without transformation.

### status_transitions Table Columns

| CORRECT (camelCase) | WRONG (snake_case) | Type |
|---------------------|---------------------|------|
| `id` | | VARCHAR(36), UUID |
| `entityType` | ~~entity_type~~ | VARCHAR(50) |
| `fromStatus` | ~~from_status~~ | VARCHAR(50), nullable |
| `toStatus` | ~~to_status~~ | VARCHAR(50) |
| `allowedRoleSlugs` | ~~allowed_role_slugs~~ | JSON |
| `requiresReason` | ~~requires_reason~~ | BOOLEAN |
| `requiresApproval` | ~~requires_approval~~ | BOOLEAN |
| `sortOrder` | ~~sort_order~~ | INT |
| `createdAt` | ~~created_at~~ | DATETIME |

**NO `updatedAt` column exists** — do NOT try to insert it.

### How to Check Column Names for Any Table
```bash
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node -e "
const mariadb = require('mariadb');
(async () => {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mariadb.createConnection({
    host: url.hostname, port: +url.port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1)
  });
  const cols = await conn.query('DESCRIBE status_transitions');
  cols.forEach(c => console.log(c.Field, '-', c.Type, c.Null === 'YES' ? '(nullable)' : ''));
  await conn.end();
})().catch(e => console.error(e.message));
"
```

---

## 9. Troubleshooting Quick Reference Tables

### 502 Bad Gateway
| Symptom | Cause | Fix |
|---------|-------|-----|
| 502 on all pages | App not listening on 127.0.0.1:3001 | `ss -tlnp \| grep 3001` — if bound to external IP only, restart with `HOSTNAME=0.0.0.0` |
| 502 after PM2 restart | Prisma client missing | Recreate symlinks (see Section 5) |
| 502 after git pull | Symlinks broken by cp | Recreate symlinks |
| 502 only on some routes | App partially working | Check PM2 error logs |
| 502 after VPS reboot | PM2 not auto-starting | `pm2 save && pm2 startup` |

### Approve/Reject/Convert Returns 400
| Symptom | Cause | Fix |
|---------|-------|-----|
| "No transition rule found" | `status_transitions` table empty | Run seed script (Section 6) |
| "Your role does not allow this" | User role not in `allowedRoleSlugs` | Check user roles in DB |
| PrismaClient error | Prisma client missing | Recreate symlinks (Section 5) |

### OOM Kill (exit code 137)
| Symptom | Cause | Fix |
|---------|-------|-----|
| Build killed during compilation | Not enough RAM | Add swap: `bash scripts/deploy-vps.sh --swap` |
| Build still OOM with swap | Very low RAM | `NODE_OPTIONS="--max-old-space-size=512"` |
| PM2 process OOM | Runtime memory leak | Check `pm2 logs`, restart process |

### PM2 Process Issues
| Symptom | Cause | Fix |
|---------|-------|-----|
| Process in "errored" state | Startup error | `pm2 logs eam-system --err --lines 20` |
| High restart count (100+) | Crashing on startup | Fix the error, then `pm2 delete eam-system` and recreate |
| Wrong port | PORT env var not set | `pm2 delete eam-system && PORT=3001 HOSTNAME=0.0.0.0 pm2 start ...` |
| Wrong host binding | HOSTNAME not 0.0.0.0 | Recreate with `HOSTNAME=0.0.0.0` |

---

## 10. Diagnostic Commands Cheat Sheet

```bash
# ═══════════════════════════════════════════════════════════════
# PORT & NETWORK
# ═══════════════════════════════════════════════════════════════
ss -tlnp | grep 3001              # Check what's listening on port 3001
ss -tlnp | grep -E '3000|3001'    # Check both ports
curl -s http://127.0.0.1:3001/api/health  # Test EAM health endpoint
curl -I https://iassetspro.lightworldtech.com  # Test external access

# ═══════════════════════════════════════════════════════════════
# PM2
# ═══════════════════════════════════════════════════════════════
pm2 list                            # Show all processes
pm2 logs eam-system --lines 30      # Show recent logs
pm2 logs eam-system --err --lines 10 # Error logs only
pm2 restart eam-system               # Restart
pm2 delete eam-system                # Delete process
pm2 describe eam-system              # Full process details
pm2 env 0                            # Show env vars for process ID
pm2 save                             # Save current process list
pm2 startup                          # Auto-start on reboot

# ═══════════════════════════════════════════════════════════════
# NGINX (Webuzo paths!)
# ═══════════════════════════════════════════════════════════════
sudo /usr/local/apps/nginx/sbin/nginx -t           # Test config
sudo /usr/local/apps/nginx/sbin/nginx -s reload    # Reload
cat /usr/local/apps/nginx/etc/conf.d/00-iassetspro.conf  # View EAM config

# ═══════════════════════════════════════════════════════════════
# PRISMA & SYMLINKS
# ═══════════════════════════════════════════════════════════════
readlink .next/standalone/node_modules/.prisma                          # Check symlink
readlink -f .next/standalone/node_modules/.prisma/client/index.js      # Verify target exists
ls -la .next/standalone/node_modules/.prisma                           # Check if it's a link

# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════
# Check transitions count
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node -e "
const mariadb = require('mariadb');
(async () => {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mariadb.createConnection({
    host: url.hostname, port: +url.port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1)
  });
  const r = await conn.query('SELECT COUNT(*) as cnt FROM status_transitions');
  console.log('Transitions:', r[0].cnt);
  await conn.end();
})().catch(e => console.error(e.message));
"

# Describe any table (check column names)
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node -e "
const mariadb = require('mariadb');
(async () => {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mariadb.createConnection({
    host: url.hostname, port: +url.port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1)
  });
  const cols = await conn.query('DESCRIBE <TABLE_NAME>');
  cols.forEach(c => console.log(c.Field, c.Type, c.Null === 'YES' ? '(nullable)' : ''));
  await conn.end();
})().catch(e => console.error(e.message));
"

# ═══════════════════════════════════════════════════════════════
# SYSTEM
# ═══════════════════════════════════════════════════════════════
free -h                              # Check memory & swap
df -h                                # Check disk space
uptime                               # Check load
```

---

## 11. Common Mistakes to Avoid (DO NOT DO THESE)

| # | NEVER | WHY | DO THIS INSTEAD |
|---|-------|-----|-----------------|
| 1 | `cp -r node_modules/.prisma .next/standalone/node_modules/.prisma` | Creates infinite nesting `.prisma/.prisma/.prisma/...` | Use symlinks: `ln -s ../../../node_modules/.prisma` |
| 2 | Start PM2 without `HOSTNAME=0.0.0.0` | Server binds to external IP, nginx can't reach it → 502 | `PORT=3001 HOSTNAME=0.0.0.0 pm2 start ...` |
| 3 | Use port 3000 for EAM | Kills ifleetpro app | Always use port 3001 |
| 4 | `bun scripts/seed-transitions.js` | mariadb is CommonJS, Bun can't import it | `node scripts/seed-transitions.js` |
| 5 | `source .env` for DB credentials | Doesn't reliably export vars in all shells | `DATABASE_URL="..." node scripts/seed-transitions.js` |
| 6 | Use snake_case DB column names | DB uses camelCase (Prisma default) | `entityType`, `fromStatus`, `toStatus`, etc. |
| 7 | Forget `npx prisma generate` | Build succeeds but Prisma client not generated → runtime errors | Run `npx prisma generate` after `bun install` |
| 8 | Use `~` for project path | Root's `~` = `/root`, project is at `/home/ifleetpro/` | Always use `/home/ifleetpro/git/eam-system` |
| 9 | Use `/etc/nginx/` for nginx config | Webuzo installs at `/usr/local/apps/nginx/` | `/usr/local/apps/nginx/etc/conf.d/00-iassetspro.conf` |
| 10 | Forget `pm2 save` after creating process | Process lost on reboot | Always run `pm2 save` after `pm2 start` |
| 11 | Use 2-level `../../` for symlink | Wrong — only goes to `.next/`, need project root | Use 3-level `../../../` for symlink path |
| 12 | Add `updatedAt` to status_transitions INSERT | Column doesn't exist in the table | Only insert: id, entityType, fromStatus, toStatus, allowedRoleSlugs, requiresReason, sortOrder, createdAt |

---

## 12. Environment Variables Reference

### In `/home/ifleetpro/git/eam-system/.env`
```env
DATABASE_URL=mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system
```

### PM2 Environment (set at process start)
```env
PORT=3001
HOSTNAME=0.0.0.0
NODE_ENV=production
```

### Build Environment
```env
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS="--max-old-space-size=1024"
```

---

*This document is a living reference. Update it whenever new issues are discovered and resolved.*
