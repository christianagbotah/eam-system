// ============================================================================
// API ROUTE — /api/observability/backups — GET status, POST trigger backup
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { DisasterRecoveryService } from '@/services/observability/disasterRecovery.service';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'dashboard';

    // Dashboard view — comprehensive backup status
    if (view === 'dashboard') {
      const dashboard = DisasterRecoveryService.getDashboard();
      return NextResponse.json({ success: true, data: dashboard });
    }

    // RTO/RPO status
    if (view === 'rto-rpo') {
      const rtoRpo = DisasterRecoveryService.getRTORPOStatus();
      return NextResponse.json({ success: true, data: rtoRpo });
    }

    // List backups
    if (view === 'list') {
      const type = searchParams.get('type') as 'database' | 'configuration' | 'files' | 'full' | undefined;
      const status = searchParams.get('status') as 'pending' | 'running' | 'completed' | 'failed' | 'verifying' | 'deleting' | undefined;
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const backups = DisasterRecoveryService.listBackups({ type, status, limit });
      return NextResponse.json({ success: true, data: { backups, total: backups.length } });
    }

    // Schedules
    if (view === 'schedules') {
      const schedules = DisasterRecoveryService.listSchedules();
      return NextResponse.json({ success: true, data: { schedules, total: schedules.length } });
    }

    // Runbooks
    if (view === 'runbooks') {
      const runbooks = DisasterRecoveryService.listRunbooks();
      return NextResponse.json({ success: true, data: { runbooks, total: runbooks.length } });
    }

    // Drills
    if (view === 'drills') {
      const drillStatus = searchParams.get('status') || undefined;
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const drills = DisasterRecoveryService.listDrills({
        status: drillStatus as 'planned' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | undefined,
        limit,
      });
      return NextResponse.json({ success: true, data: { drills, total: drills.length } });
    }

    // Restore tests
    if (view === 'restore-tests') {
      const backupId = searchParams.get('backupId') || undefined;
      const tests = DisasterRecoveryService.listRestoreTests(backupId);
      return NextResponse.json({ success: true, data: { tests, total: tests.length } });
    }

    return NextResponse.json({ success: false, error: `Unknown view: ${view}` }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Failed to get backup status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action || 'backup';

    // Trigger a backup
    if (action === 'backup') {
      const backup = await DisasterRecoveryService.triggerBackup({
        type: body.type || 'full',
        createdBy: session.userId,
        tags: body.tags,
      });
      return NextResponse.json({ success: true, data: backup });
    }

    // Verify a backup
    if (action === 'verify') {
      const backupId = body.backupId;
      if (!backupId) {
        return NextResponse.json({ success: false, error: 'backupId is required' }, { status: 400 });
      }
      const result = await DisasterRecoveryService.verifyBackup(backupId);
      return NextResponse.json({ success: true, data: result });
    }

    // Delete a backup
    if (action === 'delete') {
      const backupId = body.backupId;
      if (!backupId) {
        return NextResponse.json({ success: false, error: 'backupId is required' }, { status: 400 });
      }
      const deleted = DisasterRecoveryService.deleteBackup(backupId);
      return NextResponse.json({ success: true, data: { deleted } });
    }

    // Enforce retention
    if (action === 'enforce-retention') {
      const result = await DisasterRecoveryService.enforceRetention();
      return NextResponse.json({ success: true, data: result });
    }

    // Create schedule
    if (action === 'create-schedule') {
      const schedule = DisasterRecoveryService.createSchedule({
        name: body.name,
        type: body.type || 'full',
        frequency: body.frequency || 'daily',
        cronExpression: body.cronExpression,
        retentionDays: body.retentionDays,
      });
      return NextResponse.json({ success: true, data: schedule });
    }

    // Create runbook
    if (action === 'create-runbook') {
      const runbook = DisasterRecoveryService.createRunbook({
        name: body.name,
        description: body.description,
        responsibleTeam: body.responsibleTeam,
        estimatedRTO: body.estimatedRTO || 60,
        estimatedRPO: body.estimatedRPO || 1440,
        scenarios: body.scenarios || [],
      });
      return NextResponse.json({ success: true, data: runbook });
    }

    // Create drill
    if (action === 'create-drill') {
      const drill = DisasterRecoveryService.createDrill({
        runbookId: body.runbookId,
        scenarioId: body.scenarioId,
        participants: body.participants || [],
      });
      return NextResponse.json({ success: true, data: drill });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Backup operation failed' }, { status: 500 });
  }
}
