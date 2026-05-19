import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SceneOptimizationService } from '@/services/sceneOptimization.service';

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { nodes, gpuTier } = body;

    const metrics = SceneOptimizationService.calculateMetrics(nodes || { nodes: [] });
    const recommendations = SceneOptimizationService.getOptimizationRecommendations(metrics);
    const adaptiveQuality = SceneOptimizationService.getAdaptiveQuality(gpuTier || 'unknown');
    const lodConfig = SceneOptimizationService.generateLodConfig();

    return NextResponse.json({
      success: true,
      data: { metrics, recommendations, adaptiveQuality, lodConfig },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Optimization analysis failed' }, { status: 500 });
  }
}
