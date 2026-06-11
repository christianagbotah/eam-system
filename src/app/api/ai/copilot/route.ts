import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { MaintenanceCopilotService } from '@/services/ai/maintenanceCopilot.service';

/**
 * POST /api/ai/copilot — Chat with the AI Maintenance Copilot
 *
 * Accepts a chat message from a technician and returns an intelligent
 * troubleshooting response with diagnostic steps, parts/tools, and
 * escalation recommendations.
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.view') && !isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { message, sessionId, assetId, workOrderId, language, context } = body;

    if (!message || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'message and sessionId are required' },
        { status: 400 },
      );
    }

    const response = await MaintenanceCopilotService.chat({
      message,
      sessionId,
      technicianId: session.userId,
      assetId,
      workOrderId,
      language,
      context,
    });

    return NextResponse.json({ success: true, data: response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Copilot chat failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
