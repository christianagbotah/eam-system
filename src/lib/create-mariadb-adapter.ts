import { PrismaMariaDb } from '@prisma/adapter-mariadb'

export interface MariaDbAdapterConfig {
  host: string
  port?: number
  user: string
  password: string
  database: string
  ssl?: boolean
  connectionLimit?: number
}

export function createAdapter(config: MariaDbAdapterConfig) {
  return new PrismaMariaDb({
    host: config.host,
    port: config.port ?? 3306,
    user: config.user,
    password: config.password,
    database: config.database,
    ...(config.ssl ? { ssl: true } : {}),
    ...(config.connectionLimit ? { connectionLimit: config.connectionLimit } : {}),
  })
}
