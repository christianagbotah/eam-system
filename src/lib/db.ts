import { PrismaClient } from '@prisma/client'

let _db: PrismaClient | null = null
let _dbInitFailed = false
let _healthChecked = false
let _modelCheckPassed = false
// Rate-limit: only log the "model undefined" error once per 60 seconds
let _lastModelErrorLoggedAt = 0
const MODEL_ERROR_LOG_INTERVAL = 60_000

/**
 * Critical models that should always exist in the generated Prisma client.
 * Used to verify that `prisma generate` was run successfully.
 */
const CRITICAL_MODELS = [
  'user', 'role', 'permission', 'rolePermission', 'userRole',
  'asset', 'workOrder', 'maintenanceRequest', 'plant', 'department',
  'notification', 'auditLog',
] as const

/**
 * Check whether the Prisma client has the expected model delegates.
 * Returns { ok: true } if all critical models exist, or { ok: false, missing: [...] } otherwise.
 */
function checkPrismaModels(client: PrismaClient): { ok: boolean; missing?: string[] } {
  const missing: string[] = []
  for (const model of CRITICAL_MODELS) {
    if ((client as any)[model] === undefined || (client as any)[model] === null) {
      missing.push(model)
    }
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing }
}

/**
 * Run a one-time health check on the Prisma client after initialization.
 * Logs a clear, actionable message if models are missing.
 */
function runHealthCheck(client: PrismaClient) {
  if (_healthChecked) return
  _healthChecked = true

  const result = checkPrismaModels(client)
  if (result.ok) {
    _modelCheckPassed = true
    console.log('[db] ✓ Prisma client health check passed — all critical models available')
  } else {
    console.error(
      `[db] ✗ Prisma client health check FAILED — missing models: ${result.missing!.join(', ')}\n` +
      `[db]   This means "prisma generate" was NOT run successfully or the generated client is stale.\n` +
      `[db]   FIX: cd /home/ifleetpro/git/eam-system && rm -rf node_modules/.prisma && npx prisma generate && pm2 restart iassetspro\n` +
      `[db]   If DATABASE_URL is not set in your shell, run:\n` +
      `[db]     export DATABASE_URL="mysql://USER:PASS@HOST:PORT/DB" && npx prisma generate`
    )
  }
}

function initDb(): PrismaClient {
  if (_dbInitFailed) {
    throw new Error('[db] Database not available — previous initialization failed. Check DB_* env vars.')
  }

  // Always use MariaDB adapter (schema is MySQL)
  try {
    // Use require() for dynamic import (avoids bundling issues)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAdapter } = require('./create-mariadb-adapter')

    const host = process.env.DB_HOST
    const port = parseInt(process.env.DB_PORT || '3306', 10)
    const user = process.env.DB_USER
    const password = process.env.DB_PASSWORD
    const database = process.env.DB_NAME

    if (host && user && password && database) {
      const adapter = createAdapter({ host, port, user, password, database })
      _db = new PrismaClient({ adapter })
      console.log('[db] Connected to MariaDB:', host, '/', database)
      runHealthCheck(_db)
      return _db
    }

    // Try parsing DATABASE_URL if individual vars aren't set
    const dbUrl = process.env.DATABASE_URL || ''
    if (dbUrl.startsWith('mysql://')) {
      try {
        const url = new URL(dbUrl)
        const adapter = createAdapter({
          host: url.hostname,
          port: parseInt(url.port || '3306', 10),
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: url.pathname.slice(1),
        })
        _db = new PrismaClient({ adapter })
        console.log('[db] Connected to MariaDB via DATABASE_URL:', url.host)
        runHealthCheck(_db)
        return _db
      } catch (urlErr) {
        console.warn('[db] Failed to parse MySQL DATABASE_URL:', (urlErr as Error).message)
      }
    }

    // No valid MySQL config — create a placeholder client that will fail on actual queries
    // This allows the build to proceed (static analysis) but queries will error at runtime
    console.warn('[db] No MySQL credentials found — creating placeholder client. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.')
    const adapter = createAdapter({ host: '127.0.0.1', port: 3306, user: 'placeholder', password: 'placeholder', database: 'placeholder' })
    _db = new PrismaClient({ adapter })
    runHealthCheck(_db)
    return _db
  } catch (e) {
    console.error('[db] MariaDB adapter initialization failed:', (e as Error).message)
    _dbInitFailed = true
    throw e
  }
}

function getDb(): PrismaClient {
  if (_db) return _db
  return initDb()
}

/**
 * Lazy-initialized Prisma client proxy.
 * Defers actual connection until first query.
 * On VPS: connects to MariaDB using adapter.
 * In sandbox: creates placeholder client (queries will fail gracefully).
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    try {
      const client = getDb()
      const value = (client as any)[prop]
      if (value === undefined && typeof prop === 'string' && /^[a-z]/.test(prop)) {
        // Model delegate is missing — Prisma client may not have been generated
        // Rate-limit the error log to avoid spamming on every request
        const now = Date.now()
        if (now - _lastModelErrorLoggedAt > MODEL_ERROR_LOG_INTERVAL) {
          _lastModelErrorLoggedAt = now
          console.error(
            `[db] Model or property "${prop}" is undefined on PrismaClient. ` +
            `This usually means prisma generate was not run after schema changes. ` +
            `Run: npx prisma generate`
          )
        }
        // Return a nested Proxy so that db.model.findUnique() etc. work
        // (returning a rejected Promise instead of "is not a function")
        return new Proxy({}, {
          get(_inner, method) {
            if (typeof method === 'string' && /^[a-z]/.test(method)) {
              return (..._args: any[]) => {
                return Promise.reject(new Error(
                  `PrismaClient.${prop}.${method}() is not available. Run: npx prisma generate`
                ))
              }
            }
            return undefined
          }
        })
      }
      if (typeof value === 'function') {
        return value.bind(client)
      }
      return value
    } catch (e) {
      // Return nested Proxy for build-time / when DB is unavailable
      if (typeof prop === 'string') {
        return new Proxy({}, {
          get(_inner, method) {
            if (typeof method === 'string' && /^[a-z]/.test(method)) {
              return (..._args: any[]) => {
                console.warn(`[db] ${prop}.${method}() skipped — database not initialized:`, (e as Error).message)
                return Promise.resolve(null)
              }
            }
            return undefined
          }
        })
      }
      return undefined
    }
  },
})

/**
 * Export a health check function for the /api/health and /api/debug/db-health endpoints.
 * Returns detailed info about the Prisma client state.
 */
export async function checkDbHealth() {
  try {
    const client = getDb()
    // Get all model delegates from the raw PrismaClient
    const models = Object.keys(client).filter(
      k => !k.startsWith('_') && !k.startsWith('$') && typeof (client as any)[k] === 'object'
    )
    const modelCheck = checkPrismaModels(client)

    return {
      connected: true,
      modelCheckPassed: modelCheck.ok,
      missingModels: modelCheck.missing || [],
      totalModels: models.length,
      models,
      env: {
        hasDbHost: !!process.env.DB_HOST,
        hasDbUser: !!process.env.DB_USER,
        hasDbName: !!process.env.DB_NAME,
        hasDbPort: !!process.env.DB_PORT,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseUrlPrefix: (process.env.DATABASE_URL || '').slice(0, 20) + '...',
      },
    }
  } catch (e) {
    return {
      connected: false,
      modelCheckPassed: false,
      missingModels: CRITICAL_MODELS,
      totalModels: 0,
      models: [],
      error: e instanceof Error ? e.message : String(e),
      env: {
        hasDbHost: !!process.env.DB_HOST,
        hasDbUser: !!process.env.DB_USER,
        hasDbName: !!process.env.DB_NAME,
        hasDbPort: !!process.env.DB_PORT,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseUrlPrefix: '',
      },
    }
  }
}
