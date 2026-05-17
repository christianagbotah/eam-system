import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AiCopilotService } from '@/services/aiCopilot.service';

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { query, context } = body;

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    const response = await AiCopilotService.troubleshoot(context || {}, query);

    return NextResponse.json({ success: true, data: response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Troubleshooting failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
