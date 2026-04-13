import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPlantScope } from '@/lib/plant-scope';

// Helper: generate asset tag AST-YYYYMM-NNNN
async function generateAssetTag(): Promise<string> {
  const now = new Date();
  const prefix = `AST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const latest = await db.asset.findFirst({
    where: { assetTag: { startsWith: prefix } },
    orderBy: { assetTag: 'desc' },
    select: { assetTag: true },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.assetTag.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const condition = searchParams.get('condition');
    const criticality = searchParams.get('criticality');
    const categoryId = searchParams.get('categoryId');
    const searchPlantId = searchParams.get('plantId');
    const departmentId = searchParams.get('departmentId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Resolve plant scope (validates X-Plant-ID against user's plant access)
    const plantScope = await getPlantScope(request, session);

    const where: Record<string, unknown> = { isActive: true };

    if (status) where.status = status;
    if (condition) where.condition = condition;
    if (criticality) where.criticality = criticality;
    if (categoryId) where.categoryId = categoryId;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { assetTag: { contains: search } },
        { serialNumber: { contains: search } },
        { manufacturer: { contains: search } },
        { model: { contains: search } },
      ];
    }

    // Apply plant scoping: scope takes precedence over search param plantId
    if (plantScope.isScoped && plantScope.plantId) {
      where.plantId = plantScope.plantId;
    } else if (searchPlantId) {
      where.plantId = searchPlantId;
    }

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where: Object.keys(where).length > 1 || where.OR ? where : undefined,
        include: {
          category: { select: { id: true, name: true, code: true } },
          plant: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.asset.count({
        where: Object.keys(where).length > 1 || where.OR ? where : { isActive: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load assets';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      categoryId,
      serialNumber,
      manufacturer,
      model,
      yearManufactured,
      condition,
      status,
      criticality,
      location,
      building,
      floor,
      area,
      plantId,
      departmentId,
      purchaseDate,
      purchaseCost,
      warrantyExpiry,
      installedDate,
      expectedLifeYears,
      currentValue,
      depreciationRate,
      imageUrl,
      drawingsUrl,
      manualUrl,
      specification,
      parentId,
      assignedToId,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Asset name is required' }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 });
    }

    if (!plantId) {
      return NextResponse.json({ success: false, error: 'Plant is required' }, { status: 400 });
    }

    // Validate category exists
    const categoryExists = await db.assetCategory.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 400 });
    }

    // Validate plant exists
    const plantExists = await db.plant.findUnique({ where: { id: plantId } });
    if (!plantExists) {
      return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 400 });
    }

    const assetTag = await generateAssetTag();

    const asset = await db.asset.create({
      data: {
        assetTag,
        name,
        description: description || null,
        categoryId,
        serialNumber: serialNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        yearManufactured: yearManufactured || null,
        condition: condition || 'new',
        status: status || 'operational',
        criticality: criticality || 'medium',
        location: location || null,
        building: building || null,
        floor: floor || null,
        area: area || null,
        plantId,
        departmentId: departmentId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost || null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        installedDate: installedDate ? new Date(installedDate) : null,
        expectedLifeYears: expectedLifeYears || null,
        currentValue: currentValue || null,
        depreciationRate: depreciationRate || null,
        imageUrl: imageUrl || null,
        drawingsUrl: drawingsUrl || null,
        manualUrl: manualUrl || null,
        specification: specification || null,
        parentId: parentId || null,
        createdById: session.userId,
        assignedToId: assignedToId || null,
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
        plant: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, fullName: true, username: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'asset',
        entityId: asset.id,
        newValues: JSON.stringify({ assetTag, name, categoryId, plantId }),
      },
    });

    return NextResponse.json({ success: true, data: asset }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create asset';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
