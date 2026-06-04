import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createLogger } from '@/lib/logger';
import { invalidateAIConfigCache } from '@/lib/ai-client';
import { createAuditLog } from '@/lib/audit';
import { getDataFilePath, resolveDataDir, ensureDataDir } from '@/lib/data-dir';

const logger = createLogger('api:ai:config');

const DATA_FILE = getDataFilePath('ai-config.json');

// ============================================================================
// STARTUP CLEANUP — Remove any masked keys that leaked into the data file
// ============================================================================

async function cleanupMaskedKeysInFile(): Promise<void> {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const configs = Array.isArray(parsed) ? parsed : (parsed?.configs || []);
    let dirty = false;

    for (const config of configs) {
      for (const keyField of ['llmApiKey', 'imageApiKey', 'meshyApiKey'] as const) {
        const val = config[keyField];
        if (val && typeof val === 'string' && val.startsWith('****')) {
          logger.warn(`Cleaning corrupted masked key from config ${config.id}.${keyField}`, { masked: val });
          config[keyField] = '';
          dirty = true;
        }
      }
    }

    if (dirty) {
      await writeFile(DATA_FILE, JSON.stringify({ configs }, null, 2), 'utf-8');
      logger.info('Cleaned masked keys from ai-config.json');
    }
  } catch {
    // file doesn't exist or can't be read — that's fine
  }
}

// Run cleanup on module load (one-time when the route is first imported)
cleanupMaskedKeysInFile();

// ============================================================================
// TYPES
// ============================================================================

type AIProvider = 'zai_sdk' | 'zai-sdk' | 'openai' | 'anthropic' | 'custom' | 'gemini' | 'groq' | 'openrouter' | 'cerebras';

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
    const parsed = JSON.parse(raw);
    // Handle both formats: { configs: [...] } (correct) and [...] (legacy flat array)
    if (Array.isArray(parsed)) {
      return { configs: parsed };
    }
    if (parsed && Array.isArray(parsed.configs)) {
      return parsed as AiConfigStore;
    }
    return { configs: [] };
  } catch {
    return { configs: [] };
  }
}

async function writeConfigStore(store: AiConfigStore): Promise<void> {
  ensureDataDir();
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
 * Check if a key value looks masked (starts with ****)
 */
function isMasked(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith('****');
}

// ============================================================================
// DENORMALIZE FOR FRONTEND
// ============================================================================

/**
 * Convert backend field names to frontend field names so the frontend
 * can use them directly. Also adds hasApiKey booleans.
 */
function denormalizeForFrontend(config: AiConfigRecord): Record<string, unknown> {
  return {
    id: config.id,
    provider: config.provider === 'zai_sdk' ? 'zai-sdk' : config.provider,
    llmModel: config.llmModel,
    apiKey: maskApiKey(config.llmApiKey),
    customEndpoint: config.llmEndpoint || '',
    temperature: config.llmTemperature ?? DEFAULT_CONFIG.llmTemperature,
    maxTokens: config.llmMaxTokens ?? DEFAULT_CONFIG.llmMaxTokens,
    imageModel: config.imageModel || DEFAULT_CONFIG.imageModel,
    imageApiKey: maskApiKey(config.imageApiKey),
    meshyApiKey: maskApiKey(config.meshyApiKey),
    provider3d: config.provider3d || 'programmatic',
    generationSettings: config.generationSettings || DEFAULT_GENERATION_SETTINGS,
    // Flatten generationSettings for frontend
    generateSystemDiagram: config.generationSettings?.includeSystemDiagram ?? true,
    generateDigitalTwin: config.generationSettings?.includeDigitalTwin ?? true,
    generateMachineImage: config.generationSettings?.includeMachineImage ?? true,
    generateSpareParts: config.generationSettings?.includeSpareParts ?? true,
    generateBom: config.generationSettings?.includeBOM ?? true,
    // Boolean flags so frontend knows keys are set
    hasApiKey: !!(config.llmApiKey && config.llmApiKey.length > 0),
    hasImageApiKey: !!(config.imageApiKey && config.imageApiKey.length > 0),
    hasMeshyApiKey: !!(config.meshyApiKey && config.meshyApiKey.length > 0),
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

const VALID_PROVIDERS: AIProvider[] = ['zai_sdk', 'zai-sdk', 'openai', 'anthropic', 'custom', 'gemini', 'groq', 'openrouter', 'cerebras'];

/**
 * Normalize the request body — accept both frontend field names (apiKey, temperature, etc.)
 * and backend field names (llmApiKey, llmTemperature, etc.). Returns a normalized body
 * that always uses the backend field names.
 */
function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...body };
  // Normalize provider: frontend sends 'zai-sdk', backend uses 'zai_sdk'
  if (normalized.provider === 'zai-sdk') {
    normalized.provider = 'zai_sdk';
  }
  // Map frontend field names → backend field names
  if (normalized.apiKey !== undefined && normalized.llmApiKey === undefined) {
    normalized.llmApiKey = normalized.apiKey;
    delete normalized.apiKey;
  }
  if (normalized.customEndpoint !== undefined && normalized.llmEndpoint === undefined) {
    normalized.llmEndpoint = normalized.customEndpoint;
    delete normalized.customEndpoint;
  }
  if (normalized.temperature !== undefined && normalized.llmTemperature === undefined) {
    normalized.llmTemperature = normalized.temperature;
    delete normalized.temperature;
  }
  if (normalized.maxTokens !== undefined && normalized.llmMaxTokens === undefined) {
    normalized.llmMaxTokens = normalized.maxTokens;
    delete normalized.maxTokens;
  }
  return normalized;
}

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
    const activeConfig = store.configs.find((c) => c.isActive);

    if (!activeConfig) {
      logger.info('No active AI config found, returning defaults');
      const defaultRecord: AiConfigRecord = {
        id: '',
        ...DEFAULT_CONFIG,
        createdById: '',
        createdAt: '',
        updatedAt: '',
      };
      return NextResponse.json({
        success: true,
        data: denormalizeForFrontend(defaultRecord),
        isDefault: true,
      });
    }

    logger.info('Active AI config retrieved', { configId: activeConfig.id, provider: activeConfig.provider });
    return NextResponse.json({
      success: true,
      data: denormalizeForFrontend(activeConfig),
      isDefault: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read AI configuration';
    logger.error('GET /api/ai/config failed', { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// POST — Save / Update AI configuration
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

    const rawBody = await request.json();
    const body = normalizeBody(rawBody);

    logger.info('POST /api/ai/config — incoming body after normalize', {
      hasLlmApiKey: !!body.llmApiKey,
      llmApiKeyLength: String(body.llmApiKey || '').length,
      llmApiKeyStartsWith: String(body.llmApiKey || '').substring(0, 6),
      provider: body.provider,
      llmModel: body.llmModel,
      dataFilePath: DATA_FILE,
    });

    const validation = validateConfigBody(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const store = await readConfigStore();
    const now = new Date().toISOString();

    // Find existing active config to preserve its API keys if needed
    const existingActive = store.configs.find((c) => c.isActive);

    /**
     * API KEY PRESERVATION LOGIC:
     * 1. If incoming key is a real (non-masked) value → use it
     * 2. If incoming key is empty/masked/missing → preserve existing key
     * 3. If existing key is also masked (corrupted from old bug) → discard it
     * 4. If no real key anywhere → keep empty string
     */
    const incomingLlmApiKey = (body.llmApiKey as string) || '';
    const incomingImageApiKey = (body.imageApiKey as string) || '';
    const incomingMeshyApiKey = (body.meshyApiKey as string) || '';

    // Helper: get a safe (non-masked) existing key
    const getExistingKey = (key: string | undefined): string => {
      if (key && !isMasked(key)) return key;
      return '';
    };

    const finalLlmApiKey = (incomingLlmApiKey && !isMasked(incomingLlmApiKey))
      ? incomingLlmApiKey
      : getExistingKey(existingActive?.llmApiKey);

    const finalImageApiKey = (incomingImageApiKey && !isMasked(incomingImageApiKey))
      ? incomingImageApiKey
      : getExistingKey(existingActive?.imageApiKey);

    const finalMeshyApiKey = (incomingMeshyApiKey && !isMasked(incomingMeshyApiKey))
      ? incomingMeshyApiKey
      : getExistingKey(existingActive?.meshyApiKey);

    // Deactivate any existing active config
    if (existingActive) {
      existingActive.isActive = false;
      logger.info('Deactivated previous AI config', { configId: existingActive.id });
    }

    // Build the config record
    const configRecord: AiConfigRecord = {
      id: `aicfg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: body.provider as AIProvider,
      llmModel: body.llmModel as string,
      llmEndpoint: (body.llmEndpoint as string) || '',
      llmApiKey: finalLlmApiKey,
      llmTemperature: body.llmTemperature !== undefined ? Number(body.llmTemperature) : (existingActive?.llmTemperature ?? DEFAULT_CONFIG.llmTemperature),
      llmMaxTokens: body.llmMaxTokens !== undefined ? Number(body.llmMaxTokens) : (existingActive?.llmMaxTokens ?? DEFAULT_CONFIG.llmMaxTokens),
      imageModel: (body.imageModel as string) || (existingActive?.imageModel || DEFAULT_CONFIG.imageModel),
      imageApiKey: finalImageApiKey,
      meshyApiKey: finalMeshyApiKey,
      provider3d: (body.provider3d as string) || (existingActive?.provider3d || 'programmatic'),
      generationSettings: {
        ...(existingActive?.generationSettings || DEFAULT_GENERATION_SETTINGS),
        ...(body.generationSettings || {}),
      },
      isActive: true,
      createdById: session.userId,
      createdAt: existingActive?.createdAt || now,
      updatedAt: now,
    };

    // Add to store and persist
    store.configs.push(configRecord);

    // Cleanup: keep only the last 5 configs to prevent the file from growing indefinitely
    if (store.configs.length > 5) {
      const inactiveConfigs = store.configs.filter(c => !c.isActive);
      store.configs = [
        configRecord,
        ...inactiveConfigs.slice(-3),
      ];
    }

    await writeConfigStore(store);

    logger.info('AI config written to disk', {
      filePath: DATA_FILE,
      totalConfigs: store.configs.length,
      savedHasLlmKey: !!configRecord.llmApiKey,
      savedKeyLength: configRecord.llmApiKey.length,
    });

    // Invalidate client-side cache so next AI call picks up the new config
    invalidateAIConfigCache();

    // Audit log
    await createAuditLog(session.userId, 'AiConfig', 'create', configRecord.id, {
      newValues: {
        provider: configRecord.provider,
        llmModel: configRecord.llmModel,
        llmTemperature: configRecord.llmTemperature,
        llmMaxTokens: configRecord.llmMaxTokens,
        imageModel: configRecord.imageModel,
        provider3d: configRecord.provider3d,
      },
    });

    logger.info('AI config saved successfully', {
      configId: configRecord.id,
      provider: configRecord.provider,
      llmModel: configRecord.llmModel,
      hasLlmKey: !!configRecord.llmApiKey,
      hasImageKey: !!configRecord.imageApiKey,
    });

    return NextResponse.json({
      success: true,
      data: denormalizeForFrontend(configRecord),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save AI configuration';
    logger.error('POST /api/ai/config failed', { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/ai/config — Diagnostic endpoint (shows resolved paths + key status)
// ============================================================================

export async function PATCH() {
  try {
    const debugInfo: Record<string, unknown> = {
      processCwd: process.cwd(),
      resolvedDataDir: resolveDataDir(),
      dataFilePath: DATA_FILE,
      fileExists: existsSync(DATA_FILE),
    };

    if (existsSync(DATA_FILE)) {
      try {
        const raw = await readFile(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const configs = Array.isArray(parsed) ? parsed : (parsed?.configs || []);
        const active = configs.find((c: Record<string, unknown>) => c.isActive);

        const rawKey = (active?.llmApiKey as string) || '';

        debugInfo.fileContent = {
          totalConfigs: configs.length,
          activeConfigId: active?.id || 'none',
          activeProvider: active?.provider || 'none',
          activeLlmKey: rawKey
            ? (rawKey.startsWith('****')
                ? `MASKED_LEAK (${rawKey.length} chars) BUG!`
                : `REAL_KEY (${rawKey.length} chars, starts: ${rawKey.substring(0, 6)}...)`)
            : 'EMPTY',
          activeLlmModel: active?.llmModel || 'none',
          activeLlmTemperature: active?.llmTemperature,
        };

        // Check other possible locations
        const altPaths = [
          join(process.cwd(), 'data', 'ai-config.json'),
          join(process.cwd(), '.next', 'standalone', 'data', 'ai-config.json'),
        ];
        debugInfo.pathCheck = altPaths.map(p => ({
          path: p,
          exists: existsSync(p),
          isResolved: p === DATA_FILE,
        }));
      } catch (e) {
        debugInfo.fileReadError = e instanceof Error ? e.message : String(e);
      }
    }

    logger.info('[DEBUG] AI config diagnostic', debugInfo);
    return NextResponse.json({ success: true, debug: debugInfo });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Debug failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
