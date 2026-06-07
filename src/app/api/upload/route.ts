import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: ${file.type}. Allowed: PNG, JPEG, GIF, WebP, SVG` },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 5MB' }, { status: 400 });
    }

    // Generate unique file path
    const ext = file.name.split('.').pop() || 'png';
    const sanitizedExt = ext.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${randomUUID()}.${sanitizedExt}`;
    const relativePath = `uploads/general/${filename}`;
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    // Ensure directory exists
    await mkdir(path.dirname(absolutePath), { recursive: true });

    // Write file to disk
    const bytes = await file.arrayBuffer();
    await writeFile(absolutePath, Buffer.from(bytes));

    // Return the public URL
    const url = `/${relativePath}`;

    return NextResponse.json({ success: true, data: { url, fileName: file.name, fileSize: file.size } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
