import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { retentionService } from '@/services/historian/retention.service';

// GET /api/historian/retention — get retention policies and summary
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    if (view === 'summary') {
      const summary = await retentionService.getSummary();
      return NextResponse.json({ success: true, data: summary });
    }

    if (view === 'templates') {
      const templates = retentionService.getTemplates();
      return NextResponse.json({ success: true, data: templates });
    }

    // Default: list all policies
    const policies = await retentionService.listPolicies();
    return NextResponse.json({ success: true, data: policies });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch retention policies';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/historian/retention — execute cleanup or create policy
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // Execute cleanup for a specific policy
    if (action === 'execute') {
      const { policyId } = body;
      if (!policyId) {
        return NextResponse.json({ success: false, error: 'policyId is required' }, { status: 400 });
      }

      const result = await retentionService.executeCleanup(policyId);
      return NextResponse.json({ success: true, data: result });
    }

    // Execute cleanup for all active policies
    if (action === 'execute-all') {
      const result = await retentionService.executeAllCleanup();
      return NextResponse.json({ success: true, data: result });
    }

    // Apply a retention template
    if (action === 'apply-template') {
      const { templateName, sourceId } = body;
      if (!templateName) {
        return NextResponse.json({ success: false, error: 'templateName is required' }, { status: 400 });
      }

      const policies = await retentionService.applyTemplate(templateName, sourceId, session.userId);
      return NextResponse.json({ success: true, data: policies });
    }

    // Create a new retention policy
    if (action === 'create') {
      const { name, description, sourceId, keepDays, aggregationKeepDays } = body;
      if (!name || !keepDays) {
        return NextResponse.json({ success: false, error: 'name and keepDays are required' }, { status: 400 });
      }

      const policy = await retentionService.createPolicy({
        name,
        description,
        sourceId: sourceId || undefined,
        keepDays: parseInt(keepDays, 10),
        aggregationKeepDays: aggregationKeepDays ? parseInt(aggregationKeepDays, 10) : undefined,
        createdById: session.userId,
      });
      return NextResponse.json({ success: true, data: policy });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use: execute, execute-all, apply-template, or create' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process retention request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
