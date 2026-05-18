import path from "node:path";
import { defineConfig } from "prisma/config";

// Read DATABASE_URL from .env file
import { readFileSync } from "node:fs";

let dbUrl = process.env.DATABASE_URL || '';

if (!dbUrl) {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^DATABASE_URL=(.+)$/);
      if (match) {
        dbUrl = match[1].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  } catch {}
}

// Detect provider from URL
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
});
