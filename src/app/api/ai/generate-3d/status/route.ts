import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { getSession, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:ai:generate-3d:status');

// ============================================================================
// CONSTANTS
// ============================================================================

const MESHY_API_BASE = 'https://api.meshy.ai/v2/text-to-3d';
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'models');
const AI_CONFIG_PATH = join(process.cwd(), 'data', 'ai-config.json');

// ============================================================================
// TYPES
// ============================================================================

interface MeshyTaskResponse {
  id: string;
  status: string;
  progress?: number;
  result?: string;
  task?: {
    id: string;
    status: string;
    progress?: number;
    model_urls?: {
      thumbnail?: string;
      obj?: string;
      glb?: string;
      gltf?: string;
      fbx?: string;
    };
    error?: string;
  };
}

type GenerationStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

// ============================================================================
// HELPERS — Resolve Meshy API key
// ============================================================================

async function resolveMeshyApiKey(): Promise<string | null> {
  // 1. AI config file
  try {
    const raw = await readFile(AI_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const configs = Array.isArray(parsed) ? parsed : parsed.configs ?? [];
    const activeConfig = configs.find((c: Record<string, unknown>) => c.isActive === true);
    if (activeConfig?.meshyApiKey && typeof activeConfig.meshyApiKey === 'string') {
      return activeConfig.meshyApiKey.trim();
    }
  } catch {
    // fall through
  }

  // 2. Environment variable
  const envKey = process.env.MESHY_API_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }

  return null;
}

// ============================================================================
// HELPERS — File utilities
// ============================================================================

async function fileExistsOnDisk(relativePath: string): Promise<boolean> {
  try {
    const filePath = join(process.cwd(), 'public', relativePath);
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// HELPERS — Map Meshy status to our canonical status
// ============================================================================

function mapStatus(meshyStatus?: string): GenerationStatus {
  switch (meshyStatus) {
    case 'SUCCEEDED':
      return 'succeeded';
    case 'FAILED':
      return 'failed';
    case 'IN_PROGRESS':
      return 'processing';
    case 'PENDING':
    default:
      return 'pending';
  }
}

// ============================================================================
// GET — Check generation status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // --- Auth ---
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    // --- Parse query params ---
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const assetId = searchParams.get('assetId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId query parameter is required' },
        { status: 400 },
      );
    }

    // --- Fast path: check if model already exists in DB for this asset ---
    if (assetId) {
      try {
        const existingModel = await db.assetModel.findFirst({
          where: {
            assetId,
            isActive: true,
            filePath: { startsWith: '/uploads/models/' },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (existingModel) {
          // Verify the file actually exists on disk
          const onDisk = await fileExistsOnDisk(existingModel.filePath);
          if (onDisk) {
            logger.info('Model already exists, returning completed status', {
              assetId,
              modelId: existingModel.id,
            });

            // Check if there's a twin scene too
            const scenes = await db.digitalTwinScene.findMany({
              where: { modelId: existingModel.id, isActive: true },
              take: 1,
            });

            return NextResponse.json({
              success: true,
              data: {
                taskId,
                status: 'succeeded' as GenerationStatus,
                progress: 100,
                model: {
                  id: existingModel.id,
                  name: existingModel.name,
                  format: existingModel.format,
                  filePath: existingModel.filePath,
                  fileSize: existingModel.fileSize,
                  thumbnailUrl: existingModel.thumbnailUrl,
                },
                sceneCreated: scenes.length > 0,
                sceneId: scenes[0]?.id ?? null,
                message: '3D model has already been generated and is available.',
              },
            });
          }
        }
      } catch (dbErr) {
        logger.warn('DB check for existing model failed (falling through to Meshy poll)', {
          message: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
      }
    }

    // --- Poll Meshy API for current task status ---
    const apiKey = await resolveMeshyApiKey();

    if (!apiKey) {
      // Cannot poll without a key — return a generic response
      return NextResponse.json({
        success: true,
        data: {
          taskId,
          status: 'pending' as GenerationStatus,
          progress: 0,
          message: 'Meshy API key not configured — cannot check status. The model may still be generating in the background.',
        },
      });
    }

    try {
      const res = await fetch(`${MESHY_API_BASE}/${taskId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        logger.error('Meshy status check returned error', { status: res.status, body: errorText });
        return NextResponse.json(
          {
            success: false,
            error: `Failed to check Meshy task status (${res.status}): ${errorText}`,
          },
          { status: 502 },
        );
      }

      const taskData: MeshyTaskResponse = await res.json();
      const meshyStatus = taskData.status ?? taskData.task?.status;
      const progress = taskData.progress ?? taskData.task?.progress ?? 0;
      const canonicalStatus = mapStatus(meshyStatus);

      logger.info('Meshy task status', { taskId, meshyStatus, progress, canonicalStatus });

      // If succeeded, attempt to return model info even if DB record not yet created
      if (canonicalStatus === 'succeeded') {
        const urls = taskData.task?.model_urls;
        const modelUrl = urls?.glb || urls?.gltf || urls?.obj || urls?.fbx;

        return NextResponse.json({
          success: true,
          data: {
            taskId,
            status: canonicalStatus,
            progress: 100,
            model: modelUrl
              ? {
                  thumbnailUrl: urls?.thumbnail ?? null,
                  downloadUrl: modelUrl,
                }
              : null,
            message: 'Model generation succeeded. The model is being downloaded and will be available shortly.',
          },
        });
      }

      if (canonicalStatus === 'failed') {
        return NextResponse.json({
          success: true,
          data: {
            taskId,
            status: canonicalStatus,
            progress: 0,
            error: taskData.task?.error || 'Meshy generation failed for an unknown reason.',
            message: '3D model generation failed.',
          },
        });
      }

      // Still in progress
      return NextResponse.json({
        success: true,
        data: {
          taskId,
          status: canonicalStatus,
          progress,
          message: canonicalStatus === 'processing'
            ? `Model is being generated. Progress: ${progress}%`
            : 'Model generation is pending.',
        },
      });
    } catch (meshyErr) {
      const msg = meshyErr instanceof Error ? meshyErr.message : 'Unknown error';
      logger.error('Failed to poll Meshy task', { taskId, message: msg });
      return NextResponse.json(
        { success: false, error: `Failed to check task status: ${msg}` },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check generation status';
    logger.error('GET /api/ai/generate-3d/status failed', { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
