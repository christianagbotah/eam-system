import path from "node:path";
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config();

// Override DATABASE_URL if it points to local SQLite (sandbox injects this)
let dbUrl = process.env.DATABASE_URL || '';

if (dbUrl.startsWith('file:') || !dbUrl.includes('mysql://')) {
  // Build from individual env vars as fallback
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  if (host && user && password && database) {
    dbUrl = `mysql://${user}:${password}@${host}:${port || '3306'}/${database}`;
  }
}

if (!dbUrl.includes('mysql://')) {
  throw new Error(
    'DATABASE_URL must be a valid mysql:// connection string. ' +
    'Current value starts with: ' + dbUrl.substring(0, 20)
  );
}

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: dbUrl,
  },
});
