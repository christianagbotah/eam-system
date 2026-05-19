import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { EnterpriseSearchService } from '@/services/enterpriseSearch.service';

// GET /api/search/suggest — autocomplete suggestions
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const suggestions = await EnterpriseSearchService.suggest(query, limit);

    return NextResponse.json({ success: true, data: suggestions });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Search suggestions failed' }, { status: 500 });
  }
}
