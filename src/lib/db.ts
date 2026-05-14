import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseConfig() {
  // Parse DATABASE_URL: mysql://user:password@host:port/database
  let dbUrl = process.env.DATABASE_URL || ''

  // If DATABASE_URL points to SQLite (sandbox override), ignore it and build from individual vars
  if (dbUrl.startsWith('file:') || !dbUrl.includes('mysql://')) {
    const host = process.env.DB_HOST
    const port = process.env.DB_PORT || '3306'
    const user = process.env.DB_USER
    const password = process.env.DB_PASSWORD
    const database = process.env.DB_NAME
    if (host && user && password && database) {
      dbUrl = `mysql://${user}:${password}@${host}:${port}/${database}`
    }
  }

  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!match) {
    throw new Error(
      'Invalid DATABASE_URL: must be mysql://user:password@host:port/database. ' +
      'Got: ' + dbUrl.substring(0, 30) + '...'
    )
  }

  return {
    host: match[3],
    port: parseInt(match[4]),
    user: match[1],
    password: match[2],
    database: match[5],
  }
}

function createPrismaClient() {
  const config = getDatabaseConfig()

  const adapter = new PrismaMariaDb(config)

  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
