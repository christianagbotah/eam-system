import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { modelPipelineService } from '@/services/modelPipeline.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const jobs = await modelPipelineService.getModelJobs(id);
    return NextResponse.json(jobs);
  } catch (error: any) {
    console.error('[GET /api/model-library/:id/jobs]', error);
    return NextResponse.json({ error: error.message || 'Failed to get jobs' }, { status: 500 });
  }
}
