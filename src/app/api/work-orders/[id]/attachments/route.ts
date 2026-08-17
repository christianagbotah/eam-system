import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { getPlantScope } from '@/lib/plant-scope';
import { ObjectStorageService } from '@/services/objectStorage.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: workOrderId } = await params;

    // Verify WO exists
    const wo = await db.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, status: true, isLocked: true, plantId: true },
    });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Plant scope check (IDOR protection)
    if (wo.plantId) {
      const plantScope = await getPlantScope(request, session);
      if (plantScope.isScoped && plantScope.plantId && wo.plantId !== plantScope.plantId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    // Closed/locked WO immutability guard
    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is locked and cannot be modified' }, { status: 409 });
    }
    if (wo.status === 'closed') {
      return NextResponse.json({ success: false, error: 'Work order is closed and cannot be modified' }, { status: 409 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const description = (formData.get('description') as string) || null;
    const category = (formData.get('category') as string) || null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
    }

    // Validate file
    const validation = ObjectStorageService.validateUpload(file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate storage key
    const prefix = `work-orders/${workOrderId}`;
    const key = ObjectStorageService.generateKey(prefix, file.name);

    // Upload to storage
    const uploadResult = await ObjectStorageService.upload(key, buffer, file.type);

    // Build description with category prefix if provided
    const finalDescription = category
      ? `[${category}]${description ? ' ' + description : ''}`
      : description;

    // Create attachment record
    const attachment = await db.attachment.create({
      data: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: uploadResult.key,
        entityType: 'work_order',
        entityId: workOrderId,
        uploadedById: session.userId,
        description: finalDescription,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload attachment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'work_orders.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: workOrderId } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;

    // Build where clause
    const where: any = {
      entityType: 'work_order',
      entityId: workOrderId,
    };

    // If category filter provided, match against description prefix
    if (category) {
      where.description = { startsWith: `[${category}]` };
    }

    const attachments = await db.attachment.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true, username: true } },
      },
      take: 200,
    });

    return NextResponse.json({ success: true, data: attachments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch attachments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
