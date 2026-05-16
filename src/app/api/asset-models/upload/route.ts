import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Allowed 3D model file extensions
const ALLOWED_EXTENSIONS = ['.glb', '.gltf', '.fbx', '.obj', '.step', '.stp'];

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ──────────────────────────────────────────────────────────
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'digital_twin.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // ── Parse FormData ─────────────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const assetId = formData.get('assetId') as string | null;
    const name = formData.get('name') as string | null;
    // ── Validation ──────────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
    }

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Asset ID is required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Model name is required' }, { status: 400 });
    }

    // Validate file extension
    const originalFilename = file.name || 'model.glb';
    const ext = path.extname(originalFilename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file extension "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 100MB limit`,
        },
        { status: 400 },
      );
    }

    // ── Verify asset exists ────────────────────────────────────────────────
    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    // ── Save file to disk ──────────────────────────────────────────────────
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'asset-models');
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const safeFilename = `${timestamp}-${originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePathRelative = `/uploads/asset-models/${safeFilename}`;
    const filePathAbsolute = path.join(uploadDir, safeFilename);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePathAbsolute, fileBuffer);

    // ── Derive format field ────────────────────────────────────────────────
    const fileType = ext.replace('.', ''); // e.g. "glb", "gltf", "fbx", etc.
    const format = fileType === 'gltf' ? 'gltf' : 'glb'; // normalize to glb for non-gltf formats

    // ── Create AssetModel record ────────────────────────────────────────────
    const model = await db.assetModel.create({
      data: {
        assetId,
        name,
        fileName: originalFilename,
        filePath: filePathRelative,
        fileType,
        fileSize: file.size,
        format,
        uploadedById: session.userId,
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true, condition: true } },
        uploadedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    // ── Audit log ──────────────────────────────────────────────────────────
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'create',
        entityType: 'asset_model',
        entityId: model.id,
        newValues: JSON.stringify({
          name,
          assetId,
          fileName: originalFilename,
          fileType,
          fileSize: file.size,
          format,
        }),
      },
    });

    return NextResponse.json({ success: true, data: model }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload asset model';
    console.error('[AssetModel Upload]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
