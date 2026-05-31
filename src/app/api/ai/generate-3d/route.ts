import { NextRequest, NextResponse } from 'next/server';
import { readFile, mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { generateProgrammatic3DModel } from '@/lib/generate-3d/programmatic-generator';

const logger = createLogger('api:ai:generate-3d');

// ============================================================================
// CONSTANTS
// ============================================================================

const MESHY_API_BASE = 'https://api.meshy.ai/v2/text-to-3d';
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'models');
const AI_CONFIG_PATH = join(process.cwd(), 'data', 'ai-config.json');

/** How often (ms) the background poller checks Meshy task status. */
const POLL_INTERVAL_MS = 15_000;
/** Maximum total time (ms) the poller will keep checking before giving up. */
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// TYPES
// ============================================================================

interface Generate3dRequest {
  machineName: string;
  description?: string;
  assetId: string;
  meshyApiKey?: string;
  /** Override the 3D provider: 'programmatic' or 'meshy'. Default from ai-config.json or 'programmatic'. */
  provider3d?: 'programmatic' | 'meshy';
}

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

// ============================================================================
// HELPERS — Resolve 3D provider from AI config
// ============================================================================

async function resolveProvider3d(override?: string): Promise<'programmatic' | 'meshy'> {
  // 1. Request-level override
  if (override && (override === 'programmatic' || override === 'meshy')) {
    return override;
  }

  // 2. AI config file
  try {
    const raw = await readFile(AI_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const configs = Array.isArray(parsed) ? parsed : parsed.configs ?? [];
    const activeConfig = configs.find((c: Record<string, unknown>) => c.isActive === true);
    if (activeConfig?.provider3d && typeof activeConfig.provider3d === 'string') {
      const val = activeConfig.provider3d.trim().toLowerCase();
      if (val === 'meshy' || val === 'programmatic') {
        return val;
      }
    }
  } catch {
    // Config file not found or unparseable — use default
  }

  // 3. Default: programmatic (free, no API key needed)
  return 'programmatic';
}

// ============================================================================
// HELPERS — Resolve Meshy API key
// ============================================================================

async function resolveMeshyApiKey(overrideKey?: string): Promise<string> {
  // 1. Request-level override
  if (overrideKey && typeof overrideKey === 'string' && overrideKey.trim().length > 0) {
    return overrideKey.trim();
  }

  // 2. AI config file
  try {
    const raw = await readFile(AI_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    // The ai-config.json stores an array of config records; pick the active one
    const configs = Array.isArray(parsed) ? parsed : parsed.configs ?? [];
    const activeConfig = configs.find((c: Record<string, unknown>) => c.isActive === true);
    if (activeConfig?.meshyApiKey && typeof activeConfig.meshyApiKey === 'string') {
      return activeConfig.meshyApiKey.trim();
    }
  } catch {
    // Config file not found or unparseable — continue to env fallback
  }

  // 3. Environment variable
  const envKey = process.env.MESHY_API_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }

  throw new Error(
    'Meshy API key not found. Provide meshyApiKey in the request body, configure it in data/ai-config.json (meshyApiKey field), or set the MESHY_API_KEY environment variable.',
  );
}

// ============================================================================
// HELPERS — Build text-to-3D prompt
// ============================================================================

function buildPrompt(machineName: string, description?: string): string {
  const base = `Professional industrial 3D model of a ${machineName.trim()}. ` +
    'Detailed mechanical components, realistic materials (metal, rubber, plastic), ' +
    'clean topology suitable for real-time rendering. ' +
    'Industrial equipment, photorealistic PBR materials, well-optimized mesh.';

  if (description && description.trim().length > 0) {
    return `${base}\n\nAdditional details: ${description.trim()}`;
  }
  return base;
}

// ============================================================================
// HELPERS — Meshy API calls
// ============================================================================

async function startMeshyTask(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(MESHY_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'preview',
      prompt,
      art_style: 'realistic',
      negative_prompt: 'cartoon, low quality, blurry',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    logger.error('Meshy API returned error', { status: res.status, body: errorText });
    throw new Error(`Meshy API error (${res.status}): ${errorText}`);
  }

  const data: MeshyTaskResponse = await res.json();

  // The response structure can vary; the task ID may be at the top level or nested
  const taskId = data.result || data.id || data.task?.id;
  if (!taskId) {
    logger.error('Meshy API did not return a task ID', { data });
    throw new Error('Meshy API did not return a task ID');
  }

  return String(taskId);
}

async function pollMeshyTask(apiKey: string, taskId: string): Promise<MeshyTaskResponse> {
  const res = await fetch(`${MESHY_API_BASE}/${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    logger.error('Meshy status check failed', { status: res.status, body: errorText });
    throw new Error(`Meshy status check failed (${res.status}): ${errorText}`);
  }

  return res.json() as Promise<MeshyTaskResponse>;
}

// ============================================================================
// HELPERS — File utilities
// ============================================================================

async function ensureUploadDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

async function fileExistsOnDisk(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url: string, destPath: string): Promise<{ bytes: number }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  await writeFile(destPath, buffer);
  return { bytes: buffer.length };
}

// ============================================================================
// BACKGROUND POLLING — Download & persist when model is ready
// ============================================================================

/**
 * Starts a background poller that monitors the Meshy task, downloads the model
 * when complete, and creates the appropriate DB records.  This runs independently
 * of the request lifecycle so the initial POST can return immediately.
 */
function startBackgroundPoller(
  apiKey: string,
  taskId: string,
  assetId: string,
  machineName: string,
  userId: string,
): void {
  const startedAt = Date.now();

  const timer = setInterval(async () => {
    try {
      // Guard: timeout
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(timer);
        logger.warn('Background poller timed out', { taskId, elapsedMs: Date.now() - startedAt });
        return;
      }

      const taskData = await pollMeshyTask(apiKey, taskId);
      const status = taskData.status ?? taskData.task?.status;

      logger.info('Background poll status', { taskId, status, progress: taskData.progress ?? taskData.task?.progress });

      if (status === 'SUCCEEDED') {
        clearInterval(timer);

        // Resolve model URLs — try GLB first, then fall back to OBJ, FBX, etc.
        const urls = taskData.task?.model_urls;
        const thumbnailUrl = urls?.thumbnail;
        const modelUrl =
          urls?.glb ||
          urls?.gltf ||
          urls?.obj ||
          urls?.fbx;

        if (!modelUrl) {
          logger.error('Model succeeded but no downloadable URL found', { taskId, urls });
          return;
        }

        // Determine file extension
        let ext = 'glb';
        if (urls?.gltf) ext = 'gltf';
        else if (urls?.obj) ext = 'obj';
        else if (urls?.fbx) ext = 'fbx';

        const fileName = `${assetId}.${ext}`;
        const filePath = `/uploads/models/${fileName}`;
        const diskPath = join(UPLOAD_DIR, fileName);

        // Ensure directory exists
        await ensureUploadDir();

        // Download model
        logger.info('Downloading generated 3D model', { taskId, url: modelUrl, dest: diskPath });
        const { bytes: fileSize } = await downloadFile(modelUrl, diskPath);
        logger.info('Model downloaded successfully', { taskId, fileSize, diskPath });

        // Download thumbnail (best-effort)
        let thumbUrl: string | null = null;
        if (thumbnailUrl) {
          try {
            const thumbExt = 'png';
            const thumbDiskPath = join(UPLOAD_DIR, `${assetId}_thumb.${thumbExt}`);
            const thumbRelPath = `/uploads/models/${assetId}_thumb.${thumbExt}`;
            await downloadFile(thumbnailUrl, thumbDiskPath);
            thumbUrl = thumbRelPath;
            logger.info('Thumbnail downloaded', { thumbUrl });
          } catch (thumbErr) {
            logger.warn('Thumbnail download failed (non-fatal)', {
              message: thumbErr instanceof Error ? thumbErr.message : String(thumbErr),
            });
          }
        }

        // ── Create AssetModel record ───────────────────────────────────────
        await db.assetModel.create({
          data: {
            name: machineName,
            fileName,
            filePath,
            fileType: ext,
            fileSize,
            format: ext === 'glb' || ext === 'gltf' ? ext : 'glb',
            meshCount: 0,
            vertexCount: 0,
            thumbnailUrl: thumbUrl,
            assetId,
            uploadedById: userId,
            isActive: true,
          },
        });

        logger.info('AssetModel record created', { assetId, fileName });

        // ── Create DigitalTwinScene if a digital twin exists ──────────────
        try {
          const twin = await db.digitalTwin.findFirst({
            where: { assetId },
          });

          if (twin) {
            const model = await db.assetModel.findFirst({
              where: { assetId, isActive: true },
            });

            if (model) {
              await db.digitalTwinScene.create({
                data: {
                  name: `3D Model - ${machineName}`,
                  description: `AI-generated 3D model for ${machineName}, created via Meshy.ai text-to-3D.`,
                  twinId: twin.id,
                  modelId: model.id,
                  isActive: true,
                  createdById: userId,
                },
              });
              logger.info('DigitalTwinScene created', { twinId: twin.id, modelId: model.id });
            }
          } else {
            logger.info('No digital twin found for asset, skipping scene creation', { assetId });
          }
        } catch (sceneErr) {
          logger.warn('Failed to create DigitalTwinScene (non-fatal)', {
            message: sceneErr instanceof Error ? sceneErr.message : String(sceneErr),
          });
        }

        logger.info('3D model generation pipeline completed successfully', { taskId, assetId });
      } else if (status === 'FAILED') {
        clearInterval(timer);
        logger.error('Meshy task failed', {
          taskId,
          error: taskData.task?.error || 'Unknown error',
        });
      }
      // Otherwise (PENDING / IN_PROGRESS) — keep polling
    } catch (pollErr) {
      logger.warn('Background poll error (will retry next interval)', {
        taskId,
        message: pollErr instanceof Error ? pollErr.message : String(pollErr),
      });
    }
  }, POLL_INTERVAL_MS);

  // Allow the Node.js process to exit even if the timer is still running
  if (timer.unref) {
    timer.unref();
  }
}

// ============================================================================
// POST — Start 3D model generation (dual-mode: programmatic or meshy)
// ============================================================================

export async function POST(request: NextRequest) {
  const timer = logger.timer('generate-3d.post');

  try {
    // --- Auth ---
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!hasPermission(session, 'assets.create') && !isAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Required: assets.create' },
        { status: 403 },
      );
    }

    // --- Parse body ---
    let body: Generate3dRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { machineName, description, assetId, meshyApiKey, provider3d: providerOverride } = body;

    // --- Validate required fields ---
    if (!machineName || typeof machineName !== 'string' || machineName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'machineName is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    if (!assetId || typeof assetId !== 'string' || assetId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'assetId is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    // Validate asset exists
    const asset = await db.asset.findUnique({ where: { id: assetId.trim() } });
    if (!asset) {
      return NextResponse.json(
        { success: false, error: `Asset with id "${assetId}" not found` },
        { status: 404 },
      );
    }

    // --- Resolve provider ---
    const provider = await resolveProvider3d(providerOverride);
    logger.info('Resolved 3D provider', { provider, override: providerOverride, assetId });

    // ════════════════════════════════════════════════════════════════════════
    // PROGRAMMATIC PATH — Free, immediate generation via LLM + GLB builder
    // ════════════════════════════════════════════════════════════════════════
    if (provider === 'programmatic') {
      logger.info('Using programmatic 3D generation', { machineName, assetId });

      const result = await generateProgrammatic3DModel(
        machineName.trim(),
        description ? description.trim() : undefined,
        assetId.trim(),
        session.userId,
      );

      if (!result.success) {
        logger.error('Programmatic 3D generation failed', { error: result.error });
        return NextResponse.json(
          { success: false, error: `3D model generation failed: ${result.error}` },
          { status: 502 },
        );
      }

      timer.end();

      // Return immediately with the model — no polling needed
      return NextResponse.json({
        success: true,
        data: {
          status: 'succeeded',
          model: {
            id: result.modelId,
            filePath: result.filePath,
          },
          message: '3D model generated successfully via programmatic geometry.',
        },
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // MESHY PATH — External API with async polling
    // ════════════════════════════════════════════════════════════════════════

    // --- Resolve Meshy API key ---
    let apiKey: string;
    try {
      apiKey = await resolveMeshyApiKey(meshyApiKey);
    } catch (keyErr) {
      return NextResponse.json(
        { success: false, error: keyErr instanceof Error ? keyErr.message : 'Meshy API key not configured' },
        { status: 400 },
      );
    }

    // --- Build prompt ---
    const prompt = buildPrompt(machineName, description);
    logger.info('Starting Meshy text-to-3D generation', { machineName, assetId });

    // --- Call Meshy API ---
    let taskId: string;
    try {
      taskId = await startMeshyTask(apiKey, prompt);
    } catch (meshyErr) {
      const msg = meshyErr instanceof Error ? meshyErr.message : 'Unknown Meshy API error';
      logger.error('Failed to start Meshy task', { message: msg });
      return NextResponse.json(
        { success: false, error: `3D model generation failed to start: ${msg}` },
        { status: 502 },
      );
    }

    logger.info('Meshy task started', { taskId, machineName, assetId });

    // --- Start background polling (fire-and-forget) ---
    startBackgroundPoller(apiKey, taskId, assetId.trim(), machineName.trim(), session.userId);

    timer.end();

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        status: 'pending',
        provider: 'meshy',
        message: '3D model generation started (Meshy.ai). Poll /api/ai/generate-3d/status?taskId=xxx for updates.',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate 3D model';
    logger.error('POST /api/ai/generate-3d failed', { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
