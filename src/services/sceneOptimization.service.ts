// ============================================================================
// SCENE OPTIMIZATION — Performance optimization for 3D digital twin scenes
// ============================================================================

import { createLogger } from '@/lib/logger';

const logger = createLogger('sceneOptimization');

export interface SceneOptimizationResult {
  totalPolygons: number;
  optimizedPolygons: number;
  reduction: number;
  appliedTechniques: string[];
  lodLevels: LodConfig[];
}

export interface LodConfig {
  distance: number;  // max distance in scene units
  polygonBudget: number;
  simplification: number; // 0-1
  textureSize: number; // max texture size in pixels
}

export interface SceneMetrics {
  nodeCount: number;
  meshCount: number;
  totalTriangles: number;
  totalVertices: number;
  textureMemoryMB: number;
  drawCalls: number;
  fps: number;
  memoryUsageMB: number;
}

// Pre-configured LOD levels
const DEFAULT_LOD_LEVELS: LodConfig[] = [
  { distance: 10, polygonBudget: 50000, simplification: 0, textureSize: 2048 },
  { distance: 30, polygonBudget: 20000, simplification: 0.3, textureSize: 1024 },
  { distance: 60, polygonBudget: 5000, simplification: 0.6, textureSize: 512 },
  { distance: 100, polygonBudget: 1000, simplification: 0.85, textureSize: 256 },
  { distance: 200, polygonBudget: 200, simplification: 0.95, textureSize: 128 },
];

export class SceneOptimizationService {
  /**
   * Generate LOD configuration for a scene
   */
  static generateLodConfig(customLevels?: Partial<LodConfig>[]): LodConfig[] {
    if (customLevels && customLevels.length > 0) {
      return customLevels.map(level => ({
        ...DEFAULT_LOD_LEVELS[0],
        ...level,
      }));
    }
    return DEFAULT_LOD_LEVELS;
  }

  /**
   * Calculate scene metrics from scene data
   */
  static calculateMetrics(sceneData: {
    nodes: Array<{ id: string; type: string; meshUrl?: string; geometry?: string }>;
  }): SceneMetrics {
    const { nodes } = sceneData;
    const meshNodes = nodes.filter(n => n.meshUrl || n.type === 'mesh3d' || n.type === 'model3d');

    // Estimate metrics based on node count (actual GPU metrics require runtime)
    const totalTriangles = meshNodes.length * 5000; // Avg 5k triangles per mesh
    const totalVertices = meshNodes.length * 3000;
    const textureMemoryMB = meshNodes.length * 2; // ~2MB per texture
    const drawCalls = meshNodes.length * 3; // ~3 draw calls per mesh

    return {
      nodeCount: nodes.length,
      meshCount: meshNodes.length,
      totalTriangles,
      totalVertices,
      textureMemoryMB,
      drawCalls,
      fps: meshNodes.length > 50 ? 15 : meshNodes.length > 20 ? 30 : 60,
      memoryUsageMB: textureMemoryMB + (totalVertices * 32) / (1024 * 1024), // ~32 bytes per vertex
    };
  }

  /**
   * Generate optimization recommendations
   */
  static getOptimizationRecommendations(metrics: SceneMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.meshCount > 50) {
      recommendations.push('Consider enabling LOD (Level of Detail) for distant objects');
      recommendations.push('Implement frustum culling to skip off-screen meshes');
    }

    if (metrics.totalTriangles > 500000) {
      recommendations.push('High polygon count — consider mesh simplification for background objects');
      recommendations.push('Use geometry instancing for repeated elements (pipes, bolts, valves)');
    }

    if (metrics.textureMemoryMB > 100) {
      recommendations.push('High texture memory — consider texture atlasing and compression');
      recommendations.push('Use lower resolution textures for distant objects');
    }

    if (metrics.drawCalls > 150) {
      recommendations.push('High draw call count — batch similar meshes together');
      recommendations.push('Consider merge geometry for static objects');
    }

    if (metrics.fps < 30) {
      recommendations.push('Low FPS detected — enable adaptive quality settings');
      recommendations.push('Consider reducing shadow map resolution and post-processing');
    }

    if (metrics.meshCount > 20) {
      recommendations.push('Implement progressive loading — load visible meshes first');
      recommendations.push('Use worker threads for mesh parsing to avoid UI blocking');
    }

    if (recommendations.length === 0) {
      recommendations.push('Scene is well-optimized. No immediate changes needed.');
    }

    return recommendations;
  }

  /**
   * Create adaptive quality configuration based on device capabilities
   */
  static getAdaptiveQuality(gpuTier: 'high' | 'medium' | 'low' | 'unknown'): {
    shadowMapSize: number;
    pixelRatio: number;
    maxTextureSize: number;
    antialiasing: boolean;
    postProcessing: boolean;
    enableShadows: boolean;
    enableFog: boolean;
    lodEnabled: boolean;
    maxLights: number;
  } {
    const configs = {
      high: {
        shadowMapSize: 2048, pixelRatio: 2, maxTextureSize: 2048,
        antialiasing: true, postProcessing: true, enableShadows: true,
        enableFog: true, lodEnabled: true, maxLights: 8,
      },
      medium: {
        shadowMapSize: 1024, pixelRatio: 1.5, maxTextureSize: 1024,
        antialiasing: true, postProcessing: false, enableShadows: true,
        enableFog: true, lodEnabled: true, maxLights: 4,
      },
      low: {
        shadowMapSize: 512, pixelRatio: 1, maxTextureSize: 512,
        antialiasing: false, postProcessing: false, enableShadows: false,
        enableFog: false, lodEnabled: true, maxLights: 2,
      },
      unknown: {
        shadowMapSize: 1024, pixelRatio: 1, maxTextureSize: 1024,
        antialiasing: false, postProcessing: false, enableShadows: true,
        enableFog: true, lodEnabled: true, maxLights: 4,
      },
    };

    return configs[gpuTier] || configs.unknown;
  }
}
