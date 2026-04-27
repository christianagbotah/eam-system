import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission } from '@/lib/auth';
import { hash } from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const departmentIds = searchParams.get('departmentIds');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const includeSkills = searchParams.get('includeSkills') === 'true';

    // Admin-only for unrestricted queries (no role filter)
    // Allow any authenticated user for role-filtered queries (e.g., supervisors fetching planners)
    if (!role && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const where: Record<string, unknown> = {};
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Department-based filtering: look up department names from IDs
    if (departmentIds) {
      const deptIds = departmentIds.split(',').filter(Boolean);
      if (deptIds.length > 0) {
        const depts = await db.department.findMany({
          where: { id: { in: deptIds } },
          select: { name: true },
        });
        const deptNames = depts.map((d) => d.name);
        if (deptNames.length > 0) {
          where.department = { in: deptNames };
        }
      }
    }

    // Role-based filtering: find users with a specific role slug
    if (role) {
      const roleRecord = await db.role.findUnique({
        where: { slug: role },
        select: { id: true },
      });
      if (roleRecord) {
        where.userRoles = {
          some: { roleId: roleRecord.id },
        };
      }
    }

    // Build include clause conditionally
    const include: Record<string, unknown> = {
      userRoles: {
        include: { role: { select: { id: true, name: true, slug: true } } },
      },
      plantAccess: {
        include: { plant: { select: { id: true, name: true, code: true } } },
      },
    };

    if (includeSkills) {
      include.userSkills = {
        include: {
          trade: {
            select: { id: true, name: true, code: true, category: true, color: true },
          },
        },
      };
    }

    const users = await db.user.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include,
      orderBy: { createdAt: 'asc' },
    });

    // Remove passwordHash from each user
    const safeUsers = users.map(({ passwordHash: _, ...user }) => ({
      ...user,
      primaryTrade: user.primaryTrade,
      roles: user.userRoles.map((ur) => ur.role),
      plants: user.plantAccess.map((up) => up.plant),
      ...(includeSkills
        ? {
            skills:
              (user as Record<string, unknown>).userSkills != null
                ? ((user as Record<string, unknown>).userSkills as Array<{ trade: Record<string, unknown>; proficiencyLevel: string; yearsExperience: number | null; certified: boolean }>).map((us) => ({
                    ...us.trade,
                    proficiencyLevel: us.proficiencyLevel,
                    yearsExperience: us.yearsExperience,
                    certified: us.certified,
                  }))
                : [],
          }
        : {}),
    }));

    return NextResponse.json({ success: true, data: safeUsers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load users';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !hasPermission(session, 'users.create')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      username,
      email,
      password,
      fullName,
      staffId,
      phone,
      avatar,
      department,
      roleIds,
      plantIds,
    } = body;

    if (!username || !email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'Username, email, password, and fullName are required' },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existing = await db.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);

    const user = await db.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
        fullName,
        staffId: staffId || null,
        phone: phone || null,
        avatar: avatar || null,
        department: department || null,
        status: 'active',
        userRoles: roleIds?.length
          ? { create: roleIds.map((roleId: string) => ({ roleId })) }
          : undefined,
        plantAccess: plantIds?.length
          ? { create: plantIds.map((plantId: string) => ({ plantId })) }
          : undefined,
      },
      include: {
        userRoles: { include: { role: true } },
        plantAccess: { include: { plant: true } },
      },
    });

    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({ success: true, data: safeUser }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
