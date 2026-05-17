import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { MaintenanceCopilotService } from '@/services/ai/maintenanceCopilot.service';

/**
 * GET /api/ai/copilot/history — Retrieve conversation history for a session
 *
 * Query params:
 * - sessionId (required): The conversation session ID
 */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 },
      );
    }

    const history = await MaintenanceCopilotService.getConversationHistory(sessionId);

    return NextResponse.json({ success: true, data: history });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load conversation history';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
