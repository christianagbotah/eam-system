import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getDataFilePath, resolveDataDir } from '@/lib/data-dir';

// Bump with every deploy to verify VPS is running latest code.
const CODE_VERSION = 'v3-diag';

export async function GET() {
  const DATA_FILE = getDataFilePath('ai-config.json');
  const dataDir = resolveDataDir();

  const info: Record<string, unknown> = {
    codeVersion: CODE_VERSION,
    processCwd: process.cwd(),
    resolvedDataDir: dataDir,
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

      info.activeConfig = {
        exists: !!active,
        id: active?.id || 'none',
        provider: active?.provider || 'none',
        llmModel: active?.llmModel || 'none',
        llmApiKey: rawKey
          ? (rawKey.startsWith('****')
              ? `MASKED_LEAK (${rawKey.length} chars) — BUG!`
              : `REAL_KEY (${rawKey.length} chars, starts: ${rawKey.substring(0, 6)}...)`)
          : 'EMPTY',
        imageApiKey: (active?.imageApiKey as string) || 'EMPTY',
        meshyApiKey: (active?.meshyApiKey as string) || 'EMPTY',
      };

      info.totalConfigs = configs.length;
      info.allConfigs = configs.map((c: Record<string, unknown>, i: number) => ({
        index: i,
        id: c.id,
        provider: c.provider,
        isActive: c.isActive,
        hasLlmKey: !!(c.llmApiKey && !(c.llmApiKey as string).startsWith('****')),
        llmKeyLength: ((c.llmApiKey as string) || '').length,
        llmKeyStartsWithAsterisk: ((c.llmApiKey as string) || '').startsWith('****'),
      }));
    } catch (e) {
      info.fileReadError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(info);
}
