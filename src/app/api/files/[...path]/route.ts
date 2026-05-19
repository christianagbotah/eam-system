import { NextRequest, NextResponse } from 'next/server';
import { ObjectStorageService } from '@/services/objectStorage.service';

// GET /api/files/[...path] — download a file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const key = path.join('/');

    const result = await ObjectStorageService.download(key);
    if (!result) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Length': String(result.buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Download failed' }, { status: 500 });
  }
}

// DELETE /api/files/[...path] — delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const key = path.join('/');

    const deleted = await ObjectStorageService.delete(key);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}
