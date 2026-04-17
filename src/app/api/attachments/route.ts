import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Allowed file MIME types
const ALLOWED_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  // PDFs
  'application/pdf',
  // Documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain', 'text/csv',
  // Spreadsheets (OpenDocument)
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.text',
  // Archives
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/gzip',
  'application/x-7z-compressed',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const description = formData.get('description') as string | null;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate allowed entity types
    const allowedEntityTypes = ['work_order', 'maintenance_request', 'asset', 'safety_incident'];
    if (!allowedEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { success: false, error: `Invalid entityType. Allowed: ${allowedEntityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const createdAttachments: any[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push(`"${file.name}" has unsupported type: ${file.type}`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" exceeds maximum size of 10MB`);
        continue;
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const relativePath = `uploads/${entityType}/${entityId}/${timestamp}-${sanitizedName}`;
      const absolutePath = path.join(process.cwd(), 'public', relativePath);

      // Ensure directory exists
      await mkdir(path.dirname(absolutePath), { recursive: true });

      // Write file to disk
      const bytes = await file.arrayBuffer();
      await writeFile(absolutePath, Buffer.from(bytes));

      // Create DB record
      const attachment = await db.attachment.create({
        data: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          filePath: relativePath,
          entityType,
          entityId,
          uploadedById: session.userId,
          description: description || undefined,
        },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, username: true },
          },
        },
      });

      createdAttachments.push(attachment);
    }

    if (createdAttachments.length === 0) {
      return NextResponse.json(
        { success: false, error: `No files uploaded. ${errors.join('; ')}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: createdAttachments,
        ...(errors.length > 0 ? { warnings: errors } : {}),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload files';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entityType and entityId query params are required' },
        { status: 400 }
      );
    }

    const attachments = await db.attachment.findMany({
      where: { entityType, entityId },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: attachments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch attachments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
