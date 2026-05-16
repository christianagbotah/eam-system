import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { componentMappingService } from '@/services/componentMapping.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get('modelId')!;
    if (!modelId) return NextResponse.json({ error: 'modelId required' }, { status: 400 });

    const mappingType = searchParams.get('mappingType') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await componentMappingService.listMappings({ modelId, mappingType, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[GET /api/mesh-mappings]', error);
    return NextResponse.json({ error: error.message || 'Failed to list mappings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Support bulk creation
    if (body.mappings && Array.isArray(body.mappings)) {
      const result = await componentMappingService.bulkCreateMappings(body.mappings, user.id);
      return NextResponse.json(result, { status: 201 });
    }

    const mapping = await componentMappingService.createMapping({ ...body, createdById: user.id });
    return NextResponse.json(mapping, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/mesh-mappings]', error);
    const status = error.message?.includes('already exists') || error.message?.includes('Conflict') ? 409 : 500;
    return NextResponse.json({ error: error.message || 'Failed to create mapping' }, { status });
  }
}
