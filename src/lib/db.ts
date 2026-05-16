import { PrismaClient } from '@prisma/client'

let _db: PrismaClient | null = null

function getDb(): PrismaClient {
  if (_db) return _db

  try {
    // Use relative path to avoid @/ alias resolution issues with require()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAdapter } = require('./create-mariadb-adapter')

    const host = process.env.DB_HOST
    const port = process.env.DB_PORT || '3306'
    const user = process.env.DB_USER
    const password = process.env.DB_PASSWORD
    const database = process.env.DB_NAME

    if (host && user && password && database) {
      const adapter = createAdapter({ host, port: parseInt(port), user, password, database })
      _db = new PrismaClient({ adapter })
      console.log('[db] Connected to MariaDB:', host, '/', database)
      return _db
    }
  } catch (e) {
    console.warn('[db] MariaDB adapter not available, falling back to default:', (e as Error).message)
  }

  _db = new PrismaClient()
  return _db
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
