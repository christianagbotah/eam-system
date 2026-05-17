import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { modelPipelineService } from '@/services/modelPipeline.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const plantId = searchParams.get('plantId') || undefined;
    const format = searchParams.get('format') || undefined;
    const status = searchParams.get('status') || undefined;
    const assetId = searchParams.get('assetId') || undefined;

    const result = await modelPipelineService.listModels({ page, limit, search, plantId, format, status, assetId });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[GET /api/model-library]', error);
    return NextResponse.json({ error: error.message || 'Failed to list models' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const model = await modelPipelineService.createModelRecord({
      ...body,
      uploadedById: user.id,
    });
    return NextResponse.json(model, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/model-library]', error);
    const status = error.message?.includes('Invalid') ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to create model' }, { status });
  }
}
