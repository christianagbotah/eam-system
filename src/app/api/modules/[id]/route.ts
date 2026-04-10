import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isEnabled } = body;

    const module = await db.module.findUnique({ where: { id } });
    if (!module) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 });
    }

    if (module.isCore && !isEnabled) {
      return NextResponse.json({ success: false, error: 'Core modules cannot be deactivated' }, { status: 400 });
    }

    const companyModule = await db.companyModule.upsert({
      where: { moduleId: id },
      create: {
        moduleId: id,
        isEnabled,
        activatedAt: isEnabled ? new Date() : null,
      },
      update: {
        isEnabled,
        activatedAt: isEnabled ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, data: { ...companyModule, moduleId: id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
