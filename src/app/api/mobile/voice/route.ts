// ============================================================================
// POST /api/mobile/voice — Process voice commands from mobile AI assistant
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:mobile:voice');

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { transcript, context } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ success: false, error: 'Transcript text is required' }, { status: 400 });
    }

    if (transcript.length > 2000) {
      return NextResponse.json({ success: false, error: 'Transcript too long (max 2000 chars)' }, { status: 400 });
    }

    // Dynamic import to avoid SSR issues
    const { MobileAIService } = await import('@/services/mobile/mobileAI.service');

    const response = await MobileAIService.processVoiceCommand(transcript, context || {});

    logger.info('Voice command processed', {
      userId: session.userId,
      intent: response.intent,
      confidence: response.confidence,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Voice processing failed';
    logger.error('Voice POST error', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Return available voice commands and help
    const commands = [
      { command: 'Troubleshoot [problem]', description: 'Get troubleshooting guidance for an issue', example: 'Troubleshoot pump vibration' },
      { command: 'Find work order [WO-#]', description: 'Search for a specific work order', example: 'Find work order WO-202401-0001' },
      { command: 'Find asset [name/tag]', description: 'Search for an asset', example: 'Find asset pump-001' },
      { command: 'How to [procedure]', description: 'Get step-by-step repair instructions', example: 'How to replace a bearing' },
      { command: 'Check safety', description: 'Get safety checklist and requirements', example: 'Check safety requirements' },
      { command: 'Record measurement [value]', description: 'Log a measurement', example: 'Record temperature 45 degrees' },
      { command: 'Recommend', description: 'Get context-aware recommendations', example: 'What do you recommend?' },
    ];

    return NextResponse.json({
      success: true,
      data: { commands, version: '1.0' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get voice commands';
    logger.error('Voice GET error', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
