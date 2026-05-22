import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  try {
    const client = new PrismaClient();
    const models = Object.keys(client).filter(k => !k.startsWith('_') && !k.startsWith('$') && typeof (client as any)[k] === 'object');

    // Check if models have expected methods
    const checkModel = (name: string) => {
      const model = (client as any)[name];
      if (!model) return { exists: false, methods: [] };
      return {
        exists: true,
        methods: ['findMany', 'findUnique', 'create', 'update', 'delete'].filter(m => typeof model[m] === 'function'),
      };
    };

    await client.$disconnect();

    return NextResponse.json({
      success: true,
      prismaVersion: (PrismaClient as any).version || 'unknown',
      totalModels: models.length,
      criticalModels: {
        componentRegistry: checkModel('componentRegistry'),
        digitalTwin: checkModel('digitalTwin'),
        systemDiagram: checkModel('systemDiagram'),
        asset: checkModel('asset'),
        user: checkModel('user'),
      },
      env: {
        hasDbHost: !!process.env.DB_HOST,
        hasDbUser: !!process.env.DB_USER,
        hasDbName: !!process.env.DB_NAME,
        databaseUrlPrefix: (process.env.DATABASE_URL || '').slice(0, 20) + '...',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
