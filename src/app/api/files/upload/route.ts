import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { ObjectStorageService } from '@/services/objectStorage.service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('file-upload');

// POST /api/files/upload — upload a file
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const prefix = (formData.get('prefix') as string) || 'uploads';
    const key = (formData.get('key') as string) || undefined;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const storageKey = key || ObjectStorageService.generateKey(prefix, file.name);
    const result = await ObjectStorageService.upload(storageKey, buffer, file.type || 'application/octet-stream');

    logger.info('File uploaded', { key: storageKey, size: buffer.length, userId: session.userId });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    logger.error('File upload failed', error instanceof Error ? error : undefined);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
