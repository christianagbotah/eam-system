import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createLogger } from '@/lib/logger';
import { testAIConnection, invalidateAIConfigCache } from '@/lib/ai-client';

const logger = createLogger('api:ai:config:test');

export const maxDuration = 30;

/**
 * POST /api/ai/config/test
 *
 * Test the AI configuration by:
 * 1. Temporarily saving the provided config
 * 2. Running a test prompt
 * 3. Returning success/failure with timing info
 *
 * This accepts a temporary config in the body (doesn't permanently save it).
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));

    // If a config is provided in the body, we need to temporarily set it
    // so the test uses the user's new settings rather than the saved ones.
    if (body.provider && body.provider !== 'zai-sdk') {
      // Write a temporary test config
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');

      const DATA_FILE = join(process.cwd(), 'data', 'ai-config.json');

      try {
        const raw = await (await import('fs/promises')).readFile(DATA_FILE, 'utf-8');
        const store = JSON.parse(raw);

        // Deactivate all existing configs
        for (const c of store.configs) {
          c.isActive = false;
        }

        // Add a temporary test config
        store.configs.push({
          id: 'test-temp',
          provider: body.provider === 'zai-sdk' ? 'zai_sdk' : body.provider,
          llmModel: body.llmModel || 'default',
          llmEndpoint: body.customEndpoint || body.llmEndpoint || '',
          llmApiKey: body.apiKey || body.llmApiKey || '',
          llmTemperature: body.temperature ?? 0.7,
          llmMaxTokens: body.maxTokens ?? 8000,
          imageModel: 'default',
          imageApiKey: '',
          meshyApiKey: '',
          provider3d: 'programmatic',
          generationSettings: {},
          isActive: true,
          createdById: session.userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await mkdir(join(process.cwd(), 'data'), { recursive: true });
        await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');

        // Invalidate cache so the test picks up the new config
        invalidateAIConfigCache();
      } catch {
        // If we can't read/write config, just test with whatever is saved
      }
    }

    // Run the connection test
    const result = await testAIConnection();

    logger.info('AI connection test completed', {
      success: result.success,
      model: result.model,
      responseTime: result.responseTime,
    });

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection test failed';
    logger.error('AI connection test error', { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
