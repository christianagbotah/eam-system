import { NextResponse } from 'next/server';
import { checkDbHealth } from '@/lib/db';

/**
 * GET /api/debug/db-health
 * Returns detailed diagnostics about the Prisma client state.
 * Useful for diagnosing "prisma generate" issues on VPS.
 */
export async function GET() {
  try {
    const health = await checkDbHealth();

    return NextResponse.json({
      success: health.connected,
      ...health,
      fixInstructions: !health.modelCheckPassed
        ? 'Run: cd /path/to/project && rm -rf node_modules/.prisma && npx prisma generate && pm2 restart APP_NAME'
        : undefined,
    }, {
      status: health.connected ? 200 : 503,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
