import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { modelPipelineService } from '@/services/modelPipeline.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const model = await modelPipelineService.getModelById(id);
    return NextResponse.json(model);
  } catch (error: any) {
    console.error('[GET /api/model-library/:id]', error);
    if (error.message?.includes('not found')) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: error.message || 'Failed to get model' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const model = await modelPipelineService.updateModelStatus(id, body.status, body);
    return NextResponse.json(model);
  } catch (error: any) {
    console.error('[PATCH /api/model-library/:id]', error);
    if (error.message?.includes('not found')) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: error.message || 'Failed to update model' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await modelPipelineService.deleteModel(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/model-library/:id]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete model' }, { status: 500 });
  }
}
