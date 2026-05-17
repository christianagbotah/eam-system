import { PrismaClient } from '@prisma/client'

let _db: PrismaClient | null = null
let _dbInitFailed = false

/**
 * Detect database mode from environment.
 * - 'sqlite': DATABASE_URL starts with 'file:' (sandbox/dev)
 * - 'mysql': DATABASE_URL starts with 'mysql://' or individual DB_* vars are set (VPS/production)
 */
function getDbMode(): 'sqlite' | 'mysql' {
  const dbUrl = process.env.DATABASE_URL || ''
  if (dbUrl.startsWith('file:') || dbUrl.includes('sqlite')) {
    return 'sqlite'
  }
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    return 'mysql'
  }
  if (dbUrl.startsWith('mysql://')) {
    return 'mysql'
  }
  return 'mysql' // default — always MySQL since schema is mysql
}

function initDb(): PrismaClient {
  if (_dbInitFailed) {
    throw new Error('[db] Database not available — previous initialization failed. Check DB_* env vars.')
  }

  const mode = getDbMode()

  if (mode === 'mysql') {
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

  // SQLite fallback
  _db = new PrismaClient()
  console.log('[db] Using default PrismaClient (SQLite or env-based)')
  return _db
}

function getDb(): PrismaClient {
  if (_db) return _db
  return initDb()
}

/**
 * Lazy-initialized Prisma client proxy.
 * Defers actual connection until first query.
 * On VPS: connects to MariaDB using adapter.
 * In sandbox: connects to SQLite or shows clear error.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    try {
      const client = getDb()
      const value = (client as any)[prop]
      if (typeof value === 'function') {
        return value.bind(client)
      }
      return value
    } catch (e) {
      // Return no-op functions for build-time / when DB is unavailable
      if (typeof prop === 'string') {
        return (..._args: any[]) => {
          console.warn(`[db] Query "${prop}" skipped — database not initialized:`, (e as Error).message)
          return Promise.resolve(null)
        }
      }
      return undefined
    }
  },
})
