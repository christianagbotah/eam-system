import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createLogger } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

const logger = createLogger('api:ai:config');

const DATA_FILE = join(process.cwd(), 'data', 'ai-config.json');

// ============================================================================
// TYPES
// ============================================================================

type AIProvider = 'zai_sdk' | 'openai' | 'anthropic' | 'custom';

interface GenerationSettings {
  subsystemCount: string;
  componentsPerSubsystem: string;
  pmTemplates: string;
  includeSystemDiagram: boolean;
  includeDigitalTwin: boolean;
  includeMachineImage: boolean;
  includeSpareParts: boolean;
  includeBOM: boolean;
}

interface AiConfigRecord {
  id: string;
  provider: AIProvider;
  llmModel: string;
  llmEndpoint: string;
  llmApiKey: string;
  llmTemperature: number;
  llmMaxTokens: number;
  imageModel: string;
  imageApiKey: string;
  meshyApiKey: string;
  provider3d?: string;
  generationSettings: GenerationSettings;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface AiConfigStore {
  configs: AiConfigRecord[];
}

const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  subsystemCount: 'auto',
  componentsPerSubsystem: 'auto',
  pmTemplates: 'auto',
  includeSystemDiagram: true,
  includeDigitalTwin: true,
  includeMachineImage: true,
  includeSpareParts: true,
  includeBOM: true,
};

const DEFAULT_CONFIG: Omit<AiConfigRecord, 'id' | 'createdById' | 'createdAt' | 'updatedAt'> = {
  provider: 'zai_sdk',
  llmModel: 'default',
  llmEndpoint: '',
  llmApiKey: '',
  llmTemperature: 0.7,
  llmMaxTokens: 8000,
  imageModel: 'default',
  imageApiKey: '',
  meshyApiKey: '',
  provider3d: 'programmatic',
  generationSettings: DEFAULT_GENERATION_SETTINGS,
  isActive: true,
};

// ============================================================================
// FILE I/O HELPERS
// ============================================================================

async function readConfigStore(): Promise<AiConfigStore> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as AiConfigStore;
  } catch {
    return { configs: [] };
  }
}

async function writeConfigStore(store: AiConfigStore): Promise<void> {
  try {
    await mkdir(join(process.cwd(), 'data'), { recursive: true });
  } catch {
    // directory already exists
  }
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

// ============================================================================
// MASKING HELPERS
// ============================================================================

/**
 * Mask an API key, showing only the last 4 characters.
 * Returns '****' if key is too short to mask meaningfully.
 */
function maskApiKey(key: string | undefined | null): string {
  if (!key || key.length <= 4) return key ? '****' : '';
  return `****${key.slice(-4)}`;
}

/**
 * Return a sanitized copy of the config with API keys masked.
 */
function maskConfigSecrets(config: AiConfigRecord): AiConfigRecord {
  return {
    ...config,
    llmApiKey: maskApiKey(config.llmApiKey),
    imageApiKey: maskApiKey(config.imageApiKey),
    meshyApiKey: maskApiKey(config.meshyApiKey),
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

const VALID_PROVIDERS: AIProvider[] = ['zai_sdk', 'openai', 'anthropic', 'custom'];

function validateConfigBody(body: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!body.provider || typeof body.provider !== 'string') {
    return { valid: false, error: 'provider is required and must be a string' };
  }
  if (!VALID_PROVIDERS.includes(body.provider as AIProvider)) {
    return { valid: false, error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` };
  }

  if (!body.llmModel || typeof body.llmModel !== 'string') {
    return { valid: false, error: 'llmModel is required and must be a string' };
  }

  if (body.llmEndpoint !== undefined && typeof body.llmEndpoint !== 'string') {
    return { valid: false, error: 'llmEndpoint must be a string' };
  }

  if (body.llmApiKey !== undefined && typeof body.llmApiKey !== 'string') {
    return { valid: false, error: 'llmApiKey must be a string' };
  }

  if (body.llmTemperature !== undefined) {
    const temp = Number(body.llmTemperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      return { valid: false, error: 'llmTemperature must be a number between 0 and 2' };
    }
  }

  if (body.llmMaxTokens !== undefined) {
    const tokens = Number(body.llmMaxTokens);
    if (isNaN(tokens) || tokens < 1 || tokens > 128000) {
      return { valid: false, error: 'llmMaxTokens must be a number between 1 and 128000' };
    }
  }

  if (body.imageModel !== undefined && typeof body.imageModel !== 'string') {
    return { valid: false, error: 'imageModel must be a string' };
  }

  if (body.imageApiKey !== undefined && typeof body.imageApiKey !== 'string') {
    return { valid: false, error: 'imageApiKey must be a string' };
  }

  if (body.meshyApiKey !== undefined && typeof body.meshyApiKey !== 'string') {
    return { valid: false, error: 'meshyApiKey must be a string' };
  }

  if (body.provider3d !== undefined) {
    const valid3dProviders = ['programmatic', 'meshy', 'tripo3d'];
    if (typeof body.provider3d !== 'string' || !valid3dProviders.includes(body.provider3d)) {
      return { valid: false, error: `provider3d must be one of: ${valid3dProviders.join(', ')}` };
    }
  }

  return { valid: true };
}

// ============================================================================
// GET — Retrieve active AI config (or defaults)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!hasPermission(session, 'settings.view') && !hasPermission(session, 'assets.view') && !isAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Required: settings.view or assets.view' },
        { status: 403 },
      );
    }

    const store = await readConfigStore();

    // Find active config
    const activeConfig = store.configs.find((c) => c.isActive);

    if (!activeConfig) {
      // Return defaults when no config exists
      logger.info('No active AI config found, returning defaults');

      const defaultResponse: AiConfigRecord = {
        id: '',
        ...DEFAULT_CONFIG,
        createdById: '',
        createdAt: '',
        updatedAt: '',
      };

      return NextResponse.json({
        success: true,
        data: maskConfigSecrets(defaultResponse),
        isDefault: true,
      });
    }

    logger.info('Active AI config retrieved', { configId: activeConfig.id, provider: activeConfig.provider });

    return NextResponse.json({
      success: true,
      data: maskConfigSecrets(activeConfig),
      isDefault: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read AI configuration';
    logger.error('GET /api/ai/config failed', { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// POST — Save AI configuration
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!hasPermission(session, 'settings.update') && !isAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Required: settings.update' },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate body
    const validation = validateConfigBody(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    const store = await readConfigStore();
    const now = new Date().toISOString();

    // If there's an existing active config, deactivate it
    const existingActive = store.configs.find((c) => c.isActive);
    if (existingActive) {
      existingActive.isActive = false;
      logger.info('Deactivated previous AI config', { configId: existingActive.id });
    }

    // Build the new config record
    const newConfig: AiConfigRecord = {
      id: `aicfg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: body.provider as AIProvider,
      llmModel: body.llmModel as string,
      llmEndpoint: body.llmEndpoint as string || '',
      llmApiKey: body.llmApiKey as string || '',
      llmTemperature: body.llmTemperature !== undefined ? Number(body.llmTemperature) : DEFAULT_CONFIG.llmTemperature,
      llmMaxTokens: body.llmMaxTokens !== undefined ? Number(body.llmMaxTokens) : DEFAULT_CONFIG.llmMaxTokens,
      imageModel: body.imageModel as string || DEFAULT_CONFIG.imageModel,
      imageApiKey: body.imageApiKey as string || '',
      meshyApiKey: body.meshyApiKey as string || '',
      provider3d: (body.provider3d as string) || 'programmatic',
      generationSettings: {
        ...DEFAULT_GENERATION_SETTINGS,
        ...(body.generationSettings || {}),
      },
      isActive: true,
      createdById: session.userId,
      createdAt: now,
      updatedAt: now,
    };

    // Add to store and persist
    store.configs.push(newConfig);
    await writeConfigStore(store);

    // Audit log
    await createAuditLog(session.userId, 'AiConfig', 'create', newConfig.id, {
      newValues: {
        provider: newConfig.provider,
        llmModel: newConfig.llmModel,
        llmTemperature: newConfig.llmTemperature,
        llmMaxTokens: newConfig.llmMaxTokens,
        imageModel: newConfig.imageModel,
        provider3d: newConfig.provider3d,
      },
    });

    logger.info('AI config saved successfully', {
      configId: newConfig.id,
      provider: newConfig.provider,
      llmModel: newConfig.llmModel,
    });

    return NextResponse.json({
      success: true,
      data: maskConfigSecrets(newConfig),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save AI configuration';
    logger.error('POST /api/ai/config failed', { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
