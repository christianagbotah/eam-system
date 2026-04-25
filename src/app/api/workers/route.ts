import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentIds = searchParams.get('departmentIds');
    const plantId = searchParams.get('plantId');
    const search = searchParams.get('search');
    const role = searchParams.get('role'); // technician | supervisor | all

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'active',
    };

    // Filter by department names if departmentIds are provided
    if (departmentIds) {
      const deptIds = departmentIds.split(',').filter(Boolean);
      if (deptIds.length > 0) {
        const departments = await db.department.findMany({
          where: { id: { in: deptIds } },
          select: { name: true },
        });
        const deptNames = departments.map(d => d.name);
        if (deptNames.length > 0) {
          where.department = { in: deptNames };
        }
      }
    }

    // Search by name, staffId, or username
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { staffId: { contains: search } },
        { username: { contains: search } },
      ];
    }

    // Filter by role
    if (role && role !== 'all') {
      const roleSlugMap: Record<string, string[]> = {
        technician: ['maintenance_technician'],
        supervisor: ['maintenance_supervisor', 'maintenance_manager', 'plant_manager'],
      };
      const targetSlugs = roleSlugMap[role];
      if (targetSlugs) {
        where.userRoles = {
          some: {
            role: {
              slug: { in: targetSlugs },
            },
          },
        };
      }
    }

    // Filter by plant access if plantId provided
    if (plantId) {
      where.plantAccess = {
        some: {
          plantId,
        },
      };
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        staffId: true,
        username: true,
        department: true,
        primaryTrade: true,
        status: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
      take: 100,
    });

    // Transform response
    const data = users.map(user => {
      const roles = user.userRoles.map(ur => ({
        name: ur.role.name,
        slug: ur.role.slug,
      }));
      const primaryRole = roles.length > 0 ? roles[0].name : null;
      const primaryRoleSlug = roles.length > 0 ? roles[0].slug : null;
      const isTechnician = roles.some(r => r.slug === 'maintenance_technician');

      return {
        id: user.id,
        fullName: user.fullName,
        staffId: user.staffId,
        username: user.username,
        department: user.department,
        trade: user.primaryTrade,
        status: user.status,
        primaryRole,
        primaryRoleSlug,
        isTechnician,
        roles,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[GET /api/workers] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}
