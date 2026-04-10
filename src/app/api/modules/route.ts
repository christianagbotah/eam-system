import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const modules = await db.module.findMany({
      include: {
        companyModules: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const data = modules.map(m => ({
      ...m,
      isEnabled: m.companyModules[0]?.isEnabled ?? false,
      activatedAt: m.companyModules[0]?.activatedAt ?? null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
