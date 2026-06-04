import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { getDataFilePath } from '@/lib/data-dir';
import { db } from '@/lib/db';

// Bump with every deploy to verify VPS is running latest code.
const CODE_VERSION = 'v4-db';

export async function GET() {
  const DATA_FILE = getDataFilePath('ai-config.json');

  const info: Record<string, unknown> = {
    codeVersion: CODE_VERSION,
    configSource: 'database',
    processCwd: process.cwd(),
    legacyJsonPath: DATA_FILE,
    legacyJsonExists: existsSync(DATA_FILE),
  };

  // Query database for all configs and active config
  try {
    const allConfigs = await db.aiConfig.findMany();
    const activeConfig = allConfigs.find((c) => c.isActive) || null;

    if (activeConfig) {
      const rawKey = activeConfig.llmApiKey || '';

      info.activeConfig = {
        exists: true,
        id: activeConfig.id,
        provider: activeConfig.provider || 'none',
        llmModel: activeConfig.llmModel || 'none',
        llmApiKey: rawKey
          ? (rawKey.startsWith('****')
              ? `MASKED_LEAK (${rawKey.length} chars) — BUG!`
              : `REAL_KEY (${rawKey.length} chars, starts: ${rawKey.substring(0, 6)}...)`)
          : 'EMPTY',
        imageApiKey: activeConfig.imageApiKey || 'EMPTY',
        meshyApiKey: activeConfig.meshyApiKey || 'EMPTY',
      };
    } else {
      info.activeConfig = {
        exists: false,
        id: 'none',
        provider: 'none',
        llmModel: 'none',
        llmApiKey: 'EMPTY',
        imageApiKey: 'EMPTY',
        meshyApiKey: 'EMPTY',
      };
    }

    info.totalConfigs = allConfigs.length;
    info.allConfigs = allConfigs.map((c, i) => ({
      index: i,
      id: c.id,
      provider: c.provider,
      isActive: c.isActive,
      hasLlmKey: !!(c.llmApiKey && !c.llmApiKey.startsWith('****')),
      llmKeyLength: (c.llmApiKey || '').length,
      llmKeyStartsWithAsterisk: (c.llmApiKey || '').startsWith('****'),
    }));
  } catch (e) {
    info.dbError = e instanceof Error ? e.message : String(e);
  }

  // Also check if legacy JSON file still exists and report it
  if (existsSync(DATA_FILE)) {
    try {
      const raw = await readFile(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const configs = Array.isArray(parsed) ? parsed : (parsed?.configs || []);
      info.legacyJsonWarning = `Old JSON config file still exists with ${configs.length} config(s). Database is now the source of truth — consider removing this file.`;
      info.legacyJsonConfigs = configs.length;
    } catch (e) {
      info.legacyJsonReadError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(info);
}
