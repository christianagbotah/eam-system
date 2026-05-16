import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Verify asset model exists
    const assetModel = await db.assetModel.findUnique({ where: { id } });
    if (!assetModel) {
      return NextResponse.json({ success: false, error: 'Asset model not found' }, { status: 404 });
    }

    const versions = await db.modelVersion.findMany({
      where: { assetModelId: id },
      include: {
        uploadedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { version: 'desc' },
    });

    return NextResponse.json({ success: true, data: versions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load model versions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { changelog, filePath, fileName, fileSize } = body;

    // Verify asset model exists
    const assetModel = await db.assetModel.findUnique({ where: { id } });
    if (!assetModel) {
      return NextResponse.json({ success: false, error: 'Asset model not found' }, { status: 404 });
    }

    // Auto-increment version number
    const latestVersion = await db.modelVersion.findFirst({
      where: { assetModelId: id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    // Check for unique constraint
    const existingVersion = await db.modelVersion.findUnique({
      where: { assetModelId_version: { assetModelId: id, version: nextVersion } },
    });
    if (existingVersion) {
      return NextResponse.json({ success: false, error: 'Version already exists' }, { status: 409 });
    }

    const version = await db.modelVersion.create({
      data: {
        assetModelId: id,
        version: nextVersion,
        changelog,
        filePath: filePath || assetModel.filePath,
        fileName: fileName || assetModel.fileName,
        fileSize: fileSize ?? assetModel.fileSize,
        uploadedById: session.userId,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    await createAuditLog(
      session.userId,
      'asset_model_version',
      'create',
      version.id,
      { newValues: { assetModelId: id, version: nextVersion } },
    );

    return NextResponse.json({ success: true, data: version }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create model version';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
