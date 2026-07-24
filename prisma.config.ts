import path from "node:path";
import { defineConfig } from "prisma/config";
import { readFileSync, existsSync } from "node:fs";

let dbUrl = '';
let provider: 'mysql' | 'sqlite' = 'mysql';

// 1. Prefer individual MySQL/MariaDB env vars (most reliable for db push)
const host = process.env.DB_HOST;
const port = process.env.DB_PORT;
const user = process.env.DB_USER;
const pass = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

if (host && user && pass && dbName) {
  dbUrl = `mysql://${user}:${pass}@${port ? `${host}:${port}` : host}/${dbName}`;
  provider = 'mysql';
}

// 2. Fallback: DATABASE_URL from env or .env file
if (!dbUrl) {
  dbUrl = process.env.DATABASE_URL || '';

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
            if (key === 'DATABASE_URL' && val) { dbUrl = val; break; }
          }
          if (dbUrl) break;
        } catch {}
      }
    }
  }

  // Detect provider from URL scheme
  if (dbUrl.startsWith('file:') || dbUrl.includes('sqlite')) {
    provider = 'sqlite';
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
