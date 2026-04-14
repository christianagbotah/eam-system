import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const isAdm = isAdmin(session);

    const modules = await db.systemModule.findMany({
      include: {
        companyModules: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Collect all licensedBy user IDs to batch-fetch
    const licensedByUserIds = modules
      .map((m) => m.companyModules[0]?.licensedBy)
      .filter((id): id is string => !!id);

    // Batch fetch all licensed-by users
    let licensedByUsers: Record<string, { id: string; fullName: string }> = {};
    if (licensedByUserIds.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: licensedByUserIds } },
        select: { id: true, fullName: true },
      });
      licensedByUsers = Object.fromEntries(users.map((u) => [u.id, { id: u.id, fullName: u.fullName }]));
    }

    const data = modules.map((m) => {
      const companyModule = m.companyModules[0];
      return {
        id: m.id,
        code: m.code,
        name: m.name,
        description: m.description,
        version: m.version,
        isCore: m.isCore,
        isSystemLicensed: m.isSystemLicensed,
        licenseKey: isAdm ? m.licenseKey : null,
        validFrom: isAdm ? m.validFrom : null,
        validUntil: isAdm ? m.validUntil : null,
        // Company module activation status
        isEnabled: companyModule?.isEnabled ?? false,
        isActive: companyModule?.isActive ?? false,
        activationLocked: companyModule?.activationLocked ?? false,
        activatedAt: companyModule?.activatedAt ?? null,
        // Licensing fields
        licensedAt: companyModule?.licensedAt ?? null,
        licensedBy: companyModule?.licensedBy ?? null,
        licensedByUser: companyModule?.licensedBy
          ? licensedByUsers[companyModule.licensedBy] ?? null
          : null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load modules';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
