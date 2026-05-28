import { PrismaClient } from '@prisma/client'

let _db: PrismaClient | null = null
let _dbInitFailed = false

/**
 * Detect database mode from environment.
 * Since the schema is always MySQL, we always use the MariaDB adapter.
 * If no MySQL credentials are found, a placeholder client is created
 * that will fail on actual queries (but keeps the app buildable).
 */
function getDbMode(): 'mysql' {
  return 'mysql'
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
        // or table doesn't exist in the schema. Log a clear error.
        const errMsg = `[db] Model or property "${prop}" is undefined on PrismaClient. ` +
          `This usually means prisma generate was not run after schema changes. ` +
          `Run: npx prisma generate`
        console.error(errMsg)
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
