import path from "node:path";
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config();

// Determine database URL - support both MySQL (VPS) and SQLite (sandbox)
let dbUrl = process.env.DATABASE_URL || '';
let provider: 'mysql' | 'sqlite' = 'mysql'; // default

if (dbUrl.startsWith('file:') || dbUrl.includes('sqlite')) {
  // Sandbox/local SQLite
  provider = 'sqlite';
} else if (!dbUrl.includes('mysql://')) {
  // Try building from individual env vars
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  if (host && user && password && database) {
    dbUrl = `mysql://${user}:${password}@${host}:${port || '3306'}/${database}`;
  }
}

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    provider: provider as 'mysql' | 'sqlite',
    url: dbUrl,
  },
});
