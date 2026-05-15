import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || ''

  // Sandbox/local: use SQLite (no adapter needed)
  if (dbUrl.startsWith('file:') || dbUrl.includes('sqlite')) {
    return new PrismaClient()
  }

  // Production: use MariaDB adapter
  // Dynamic import to avoid bundling the adapter in sandbox builds
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaMariaDb } = require('@prisma/adapter-mariadb')

    const host = process.env.DB_HOST
    const port = process.env.DB_PORT || '3306'
    const user = process.env.DB_USER
    const password = process.env.DB_PASSWORD
    const database = process.env.DB_NAME

    if (host && user && password && database) {
      const adapter = new PrismaMariaDb({
        host,
        port: parseInt(port),
        user,
        password,
        database,
      })
      return new PrismaClient({ adapter })
    }

    // Fallback: parse from DATABASE_URL
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
    if (match) {
      const adapter = new PrismaMariaDb({
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: match[2],
        database: match[5],
      })
      return new PrismaClient({ adapter })
    }
  } catch {
    // MariaDB adapter not available (sandbox) — use plain PrismaClient
    console.warn('[db] MariaDB adapter not available, falling back to default PrismaClient')
  }

  return new PrismaClient()
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
