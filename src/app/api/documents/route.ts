import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { EdmsService } from '@/services/documents/edms.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'documents.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const discipline = searchParams.get('discipline') || undefined;
    const plantId = searchParams.get('plantId') || undefined;
    const area = searchParams.get('area') || undefined;
    const folderPath = searchParams.get('folderPath') || undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const result = await EdmsService.listDocuments({
      page, limit, search, category, status, discipline,
      plantId, area, folderPath, sortBy, sortOrder,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list documents';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'documents.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, category, subcategory, discipline, plantId, area, folderPath, fileSize, fileMimeType, fileUrl, thumbnailUrl } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 });
    }

    const document = await EdmsService.createDocument({
      title,
      description,
      category,
      subcategory,
      discipline,
      plantId,
      area,
      folderPath,
      fileSize,
      fileMimeType,
      fileUrl,
      thumbnailUrl,
      createdById: session.userId,
    });

    return NextResponse.json({ success: true, data: document }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
