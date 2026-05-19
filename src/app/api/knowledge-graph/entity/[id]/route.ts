import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { KnowledgeGraphService } from '@/services/knowledgeGraph.service';

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
    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId') || undefined;
    const depth = parseInt(searchParams.get('depth') || '1', 10);

    const details = await KnowledgeGraphService.getEntityDetails(id, plantId);

    return NextResponse.json({ success: true, data: details });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Entity lookup failed' }, { status: 500 });
  }
}
