# EAM System - VPS Deployment Guide & Troubleshooting

> **Last updated**: 2026-05-27
> **Environment**: Webuzo VPS, MariaDB remote @ 163.245.212.15, PM2 process management
> **Maintainer**: Z.ai Code

---

## 1. CRITICAL VPS INFORMATION

### Server Details
- **Provider**: Webuzo VPS
- **IP**: 163.245.212.15
- **Domain**: iassetspro.lightworldtech.com
- **Web Server**: Nginx (managed by Webuzo at `/usr/local/apps/nginx/`)
- **Process Manager**: PM2 (`pm2`)

### Port Allocation
| Port | Application | Notes |
|------|-------------|-------|
| 3000 | ifleetpro app | DO NOT TOUCH |
| 3001 | **EAM System** | `pm2` process name: `eam-system` |
| 443/80 | Nginx reverse proxy | Webuzo-managed |

### Key Paths
| Item | Path |
|------|------|
| EAM Project | `/home/ifleetpro/git/eam-system` |
| PM2 Config | `/root/.pm2/dump.pm2` |
| Nginx Config (EAM) | `/usr/local/apps/nginx/etc/conf.d/00-iassetspro.conf` |
| Nginx Main Config | `/usr/local/apps/nginx/etc/nginx.conf` |
| PM2 Logs | `/root/.pm2/logs/eam-system-{out,err}.log` |
| Deploy Script | `scripts/deploy-vps.sh` |

### Database
- **Type**: MariaDB (remote)
- **URL**: `mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system`
- **Credentials in**: `/home/ifleetpro/git/eam-system/.env` as `DATABASE_URL`
- **Schema uses**: camelCase column names (e.g., `entityType`, NOT `entity_type`)

### PM2 Startup Command (MUST match this exactly)
```bash
cd /home/ifleetpro/git/eam-system
PORT=3001 HOSTNAME=0.0.0.0 pm2 start .next/standalone/server.js --name eam-system
pm2 save
```

**CRITICAL**: `HOSTNAME=0.0.0.0` is required. Without it, Next.js binds to the external IP only, and nginx's `proxy_pass http://127.0.0.1:3001` fails with 502.

---

## 2. Nginx Reverse Proxy Configuration

The EAM nginx config is at:
```
/usr/local/apps/nginx/etc/conf.d/00-iassetspro.conf
```

It proxies `iassetspro.lightworldtech.com` -> `http://127.0.0.1:3001`

**DO NOT**:
- Change the proxy_pass port (must stay 3001)
- Run EAM on port 3000 (ifleetpro uses it)

**To reload nginx after config changes**:
```bash
sudo /usr/local/apps/nginx/sbin/nginx -t && sudo /usr/local/apps/nginx/sbin/nginx -s reload
```

---

## 3. Prisma Client in Standalone Build

### The Problem
Next.js standalone output does NOT include `node_modules/.prisma` or `node_modules/@prisma`. The server.js needs these to run Prisma queries. Without them, every API call returns:
```
PrismaClient property "then" is not available. Run: npx prisma generate
```

### The Solution: Symlinks
**NEVER use `cp -r`** -- it causes:
- Infinite nesting (`.prisma/.prisma/.prisma/...`)
- Missing files (wrong source path)
- Hangs on large directories

**ALWAYS use symlinks** from `.next/standalone/node_modules/` -> project `node_modules/`:
```bash
cd /home/ifleetpro/git/eam-system

# After prisma generate, create symlinks
rm -rf .next/standalone/node_modules/.prisma .next/standalone/node_modules/@prisma .next/standalone/node_modules/mariadb

# ../../../ because: standalone/node_modules -> 3 levels up to project root
ln -s ../../../node_modules/.prisma .next/standalone/node_modules/.prisma
ln -s ../../../node_modules/@prisma .next/standalone/node_modules/@prisma
ln -s ../../../node_modules/mariadb .next/standalone/node_modules/mariadb
```

### After git pull
`git pull` does NOT break symlinks (they point relatively). But if you accidentally copy instead:
```bash
# If symlinks got replaced with real dirs, recreate them:
rm -rf .next/standalone/node_modules/.prisma .next/standalone/node_modules/@prisma .next/standalone/node_modules/mariadb
ln -s ../../../node_modules/.prisma .next/standalone/node_modules/.prisma
ln -s ../../../node_modules/@prisma .next/standalone/node_modules/@prisma
ln -s ../../../node_modules/mariadb .next/standalone/node_modules/mariadb
```

---

## 4. Status Transitions Table

### The Problem
The `status_transitions` table drives the maintenance request/work order state machine. If empty, ALL status transitions fail with 400 Bad Request (approve, reject, convert, etc.).

### Check if transitions exist
```bash
cd /home/ifleetpro/git/eam-system
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node -e "
const mariadb = require('mariadb');
(async () => {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mariadb.createConnection({host:url.hostname,port:+url.port,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1)});
  const rows = await conn.query('SELECT COUNT(*) as cnt FROM status_transitions');
  console.log('Transitions count:', rows[0].cnt);
  if (rows[0].cnt === 0) console.log('WARNING: Table is empty! Run seed.');
  await conn.end();
})().catch(e => console.error(e.message));
"
```

### Seed transitions
```bash
cd /home/ifleetpro/git/eam-system
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node scripts/seed-transitions.js
```

### Important: Column Names
The database uses **camelCase** columns (Prisma default), NOT snake_case:
- `entityType` (NOT `entity_type`)
- `fromStatus` (NOT `from_status`)
- `toStatus` (NOT `to_status`)
- `allowedRoleSlugs` (NOT `allowed_role_slugs`)
- `requiresReason` (NOT `requires_reason`)
- `sortOrder` (NOT `sort_order`)
- `createdAt` (NOT `created_at`)
- NO `updatedAt` column exists

The seed script (`scripts/seed-transitions.js`) uses raw SQL with correct column names.

### Why Not Use PrismaClient in Seed Script
The seed script uses `require('mariadb')` directly (CommonJS `.js` file) instead of PrismaClient because:
1. PrismaClient needs the MariaDB adapter (`@prisma/adapter-mariadb`) configured
2. Bun can't import `mariadb` as ESM (SyntaxError: Missing 'default' export)
3. Node.js with `require()` works reliably for standalone scripts

---

## 5. Deployment Procedure (Full)

### Step-by-step deploy from scratch:
```bash
# 1. Pull code
cd /home/ifleetpro/git/eam-system
git pull

# 2. Install deps (if needed)
bun install

# 3. Generate Prisma client
npx prisma generate

# 4. Build Next.js (with memory limit for low-RAM VPS)
NODE_OPTIONS="--max-old-space-size=1024" bun run build

# 5. Create symlinks for Prisma + mariadb
rm -rf .next/standalone/node_modules/.prisma .next/standalone/node_modules/@prisma .next/standalone/node_modules/mariadb
ln -s ../../../node_modules/.prisma .next/standalone/node_modules/.prisma
ln -s ../../../node_modules/@prisma .next/standalone/node_modules/@prisma
ln -s ../../../node_modules/mariadb .next/standalone/node_modules/mariadb

# 6. Copy static assets
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# 7. Restart PM2
pm2 delete eam-system
PORT=3001 HOSTNAME=0.0.0.0 pm2 start .next/standalone/server.js --name eam-system
pm2 save

# 8. Wait and verify
sleep 10
curl -s http://127.0.0.1:3001/api/health

# 9. Seed transitions (if needed)
DATABASE_URL="mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system" \
node scripts/seed-transitions.js
```

### Quick deploy script:
```bash
cd /home/ifleetpro/git/eam-system
bash scripts/deploy-vps.sh
```

---

## 6. Troubleshooting Quick Reference

### 502 Bad Gateway
| Symptom | Cause | Fix |
|---------|-------|-----|
| 502 on all pages | EAM not listening on 127.0.0.1:3001 | `ss -tlnp \| grep 3001` -- if bound to external IP only, restart with `HOSTNAME=0.0.0.0` |
| 502 after PM2 restart | Prisma client missing | Recreate symlinks (see Section 3) |
| 502 after git pull | Symlinks broken | Recreate symlinks |

### Approve/Reject returns 400
| Symptom | Cause | Fix |
|---------|-------|-----|
| "No transition rule found" | `status_transitions` table empty | Run seed script |
| "Your role does not allow this" | User role not in allowedRoleSlugs | Check user roles in DB |
| PrismaClient error | Prisma client missing | Recreate symlinks |

### OOM Kill (exit code 137)
| Symptom | Cause | Fix |
|---------|-------|-----|
| Build killed | Not enough RAM | Add swap: `bash scripts/deploy-vps.sh --swap` |
| Build still OOM | Very low RAM | `NODE_OPTIONS="--max-old-space-size=512"` |

### PM2 commands
```bash
pm2 list                              # Show all processes
pm2 logs eam-system --lines 30        # Show logs
pm2 logs eam-system --err --lines 10   # Error logs only
pm2 restart eam-system                 # Restart
pm2 delete eam-system                  # Delete (need to recreate)
pm2 env 14                            # Show env vars for process ID 14
pm2 save                              # Save current process list
pm2 describe eam-system               # Full process details
```

### Useful diagnostic commands
```bash
# Check what's listening on a port
ss -tlnp | grep <port>

# Check nginx config syntax
sudo /usr/local/apps/nginx/sbin/nginx -t

# Test EAM health
curl -s http://127.0.0.1:3001/api/health

# Check Prisma client exists
ls -la .next/standalone/node_modules/.prisma/client/index.js

# Check symlink targets
readlink .next/standalone/node_modules/.prisma

# Check DB column names
DATABASE_URL="mysql://..." node -e "
const mariadb = require('mariadb');
(async () => {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mariadb.createConnection({host:url.hostname,port:+url.port,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1)});
  const cols = await conn.query('DESCRIBE <table_name>');
  cols.forEach(c => console.log(c.Field, c.Type));
  await conn.end();
})().catch(e => console.error(e.message));
"
```

---

## 7. Common Mistakes to Avoid

1. **NEVER run `cp -r` for Prisma** -- always use symlinks. Copying causes infinite nesting.
2. **NEVER forget `HOSTNAME=0.0.0.0`** -- without it, server binds to external IP only, nginx can't reach it on 127.0.0.1.
3. **NEVER use port 3000 for EAM** -- ifleetpro uses it.
4. **NEVER use `bun run` for seed-transitions** -- mariadb is CommonJS, use `node scripts/seed-transitions.js`.
5. **NEVER use `source .env` for exporting vars** -- it doesn't work in all shells. Use `DATABASE_URL="..."` prefix.
6. **NEVER assume snake_case DB columns** -- this Prisma setup uses camelCase.
7. **NEVER use `npx prisma generate` with `bun`** -- use `npx` or `bunx` consistently.
8. **NEVER run deploy-vps.sh from `~` as root** -- project is at `/home/ifleetpro/git/eam-system`, `~` is `/root`.
9. **ALWAYS verify symlinks after git pull** -- `readlink .next/standalone/node_modules/.prisma` should show `../../../node_modules/.prisma`.
10. **ALWAYS run `pm2 save`** after creating/recreating the process.

---

## 8. Environment Variables Required

In `/home/ifleetpro/git/eam-system/.env`:
```
DATABASE_URL=mysql://ifleetpro_user:myjesus4mE2018@163.245.212.15:3306/ifleetpro_eam_system
```

PM2 environment (set at start):
```
PORT=3001
HOSTNAME=0.0.0.0
NODE_ENV=production
```
