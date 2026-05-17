import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { EnterpriseSearchService } from '@/services/enterpriseSearch.service';

// GET /api/search — global enterprise search
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    const types = searchParams.get('types')?.split(',').filter(Boolean);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const plantId = searchParams.get('plantId') || undefined;

    const results = await EnterpriseSearchService.search({
      query: query.trim(),
      types,
      limit,
      offset,
      plantId,
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
