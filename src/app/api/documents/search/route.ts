import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { AiDocumentSearchService, type SearchQuery } from '@/services/documents/aiDocumentSearch.service';

/**
 * POST /api/documents/search
 * AI-powered natural language document search with faceted filters
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasPermission(session, 'documents.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { query, filters, page, limit } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: 'query is required' }, { status: 400 });
    }

    const searchInput: SearchQuery = {
      query,
      filters: filters || {},
      page: page || 1,
      limit: limit || 20,
      userId: session.userId,
    };

    const result = await AiDocumentSearchService.search(searchInput);

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search documents';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
