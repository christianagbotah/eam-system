import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const attachment = await db.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return NextResponse.json({ success: false, error: 'Attachment not found' }, { status: 404 });
    }

    const absolutePath = path.join(process.cwd(), 'public', attachment.filePath);

    if (!existsSync(absolutePath)) {
      return NextResponse.json({ success: false, error: 'File not found on disk' }, { status: 404 });
    }

    const fileBuffer = await readFile(absolutePath);

    // Determine if file should be displayed inline or downloaded
    const isInline = attachment.fileType.startsWith('image/') || attachment.fileType === 'application/pdf';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.fileType,
        'Content-Disposition': isInline
          ? `inline; filename="${attachment.fileName}"`
          : `attachment; filename="${attachment.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to download file';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Check permission: either admin or has attachments.delete permission
    if (!isAdmin(session) && !hasPermission(session, 'attachments.delete')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to delete attachments' },
        { status: 403 }
      );
    }

    const attachment = await db.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return NextResponse.json({ success: false, error: 'Attachment not found' }, { status: 404 });
    }

    // Try to delete file from disk (don't fail if file doesn't exist)
    const absolutePath = path.join(process.cwd(), 'public', attachment.filePath);
    try {
      if (existsSync(absolutePath)) {
        await unlink(absolutePath);
      }
    } catch {
      // File might already be deleted — continue with DB cleanup
    }

    // Delete DB record
    await db.attachment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete attachment';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
