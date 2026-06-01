import path from "node:path";
import { defineConfig } from "prisma/config";
import { readFileSync, existsSync } from "node:fs";

// 1. Try environment variable first (CI/CD, systemd, docker)
let dbUrl = process.env.DATABASE_URL || '';

// 2. Fallback: read from .env file (handles dotenv not loaded by Prisma CLI)
if (!dbUrl) {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '..', '.env'),
    '/home/z/my-project/.env',
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key === 'DATABASE_URL' && val) {
            dbUrl = val;
            break;
          }
        }
        if (dbUrl) break;
      } catch {}
    }
  }
}

// 3. Fallback: build from individual env vars
if (!dbUrl) {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME;
  if (host && user && pass && name) {
    dbUrl = `mysql://${user}:${pass}@${port ? `${host}:${port}` : host}/${name}`;
  }
}

if (!dbUrl) {
  throw new Error(
    'DATABASE_URL is not set. Set it in your environment or .env file.\n' +
    'Examples:\n' +
    '  MySQL/MariaDB: mysql://user:password@host:3306/dbname\n' +
    '  SQLite (dev):  file:/path/to/db.sqlite\n' +
    'Or set individual vars: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME'
  );
}

// Detect provider from URL scheme
const provider = (dbUrl.startsWith('file:') || dbUrl.includes('sqlite'))
  ? 'sqlite' as const
  : 'mysql' as const;

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    provider,
    url: dbUrl,
  },
  migrations: {
    seed: 'bun ./prisma/seed.ts',
  },
});
