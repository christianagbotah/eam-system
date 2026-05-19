import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { KnowledgeGraphService } from '@/services/knowledgeGraph.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromId = searchParams.get('from');
    const toId = searchParams.get('to');
    const plantId = searchParams.get('plantId') || undefined;

    if (!fromId || !toId) {
      return NextResponse.json({ success: false, error: 'from and to are required' }, { status: 400 });
    }

    const path = await KnowledgeGraphService.findPath(fromId, toId, plantId);

    if (!path) {
      return NextResponse.json({ success: false, error: 'No path found between entities' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: path });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Path finding failed' }, { status: 500 });
  }
}
