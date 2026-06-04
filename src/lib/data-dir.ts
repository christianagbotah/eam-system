// ============================================================================
// DATA DIRECTORY RESOLVER
// ============================================================================
// In Next.js standalone mode, process.cwd() depends on where the server
// process was started. This utility reliably finds the correct data/
// directory by checking multiple possible locations.
// ============================================================================

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Resolve the data/ directory path.
 * Checks multiple locations in order:
 * 1. process.cwd()/data/ (most common — PM2 starts from project root)
 * 2. process.cwd()/.next/standalone/data/ (standalone mode)
 * 3. __dirname based resolution as fallback
 *
 * Returns the first path that either exists or can be created.
 */
export function resolveDataDir(): string {
  const candidates = [
    join(process.cwd(), 'data'),
    join(process.cwd(), '.next', 'standalone', 'data'),
  ];

  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }

  // If none exist, use the project root and create it
  const fallback = join(process.cwd(), 'data');
  try {
    mkdirSync(fallback, { recursive: true });
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Get the full path to a data file.
 * @param filename - The filename (e.g., 'ai-config.json')
 */
export function getDataFilePath(filename: string): string {
  return join(resolveDataDir(), filename);
}

/**
 * Ensure the data directory exists.
 */
export function ensureDataDir(): string {
  const dir = resolveDataDir();
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // directory already exists
  }
  return dir;
}
