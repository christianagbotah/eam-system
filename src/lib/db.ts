import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Parse DATABASE_URL: mysql://user:password@host:port/database
  const dbUrl = process.env.DATABASE_URL || ''
  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)

  const adapter = new PrismaMariaDb({
    host: match ? match[3] : 'localhost',
    port: match ? parseInt(match[4]) : 3306,
    user: match ? match[1] : 'root',
    password: match ? match[2] : '',
    database: match ? match[5] : 'eam_system',
  })

  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
