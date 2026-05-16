import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

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

    // Try to find the latest version
    const latestVersion = await db.modelVersion.findFirst({
      where: { assetModelId: id, isActive: true },
      include: {
        uploadedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { version: 'desc' },
    });

    // If no version exists, return the base asset model
    if (!latestVersion) {
      const assetModel = await db.assetModel.findUnique({
        where: { id },
        include: {
          uploadedBy: { select: { id: true, fullName: true, username: true } },
          asset: { select: { id: true, name: true, assetTag: true } },
          _count: { select: { bindings: true, scenes: true } },
        },
      });

      if (!assetModel) {
        return NextResponse.json({ success: false, error: 'Asset model not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: assetModel.id,
          version: 0,
          changelog: 'Base model (no versions created)',
          fileName: assetModel.fileName,
          filePath: assetModel.filePath,
          fileSize: assetModel.fileSize,
          isActive: assetModel.isActive,
          createdAt: assetModel.createdAt,
          uploadedBy: assetModel.uploadedBy,
          assetModel,
          isBaseModel: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...latestVersion, isBaseModel: false },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load latest model version';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
