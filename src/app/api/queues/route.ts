import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync, isAdmin } from '@/lib/auth';
import { jobQueue, QUEUES, QUEUE_LABELS } from '@/lib/queue';

export const dynamic = 'force-dynamic';

// GET /api/queues — queue dashboard with status overview and individual queue jobs
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const session = await getSessionAsync(token);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const queueName = searchParams.get('queue');

    // If a specific queue is requested, return its jobs
    if (queueName) {
      const jobs = await jobQueue.getJobs(queueName);
      const status = await jobQueue.getStatus(queueName);
      return NextResponse.json({
        success: true,
        data: {
          queue: queueName,
          label: QUEUE_LABELS[queueName as keyof typeof QUEUES] || queueName,
          status,
          jobs: jobs.map(j => ({
            id: j.id,
            name: j.name,
            status: j.status,
            progress: j.progress,
            attempts: j.attempts,
            maxAttempts: j.maxAttempts,
            error: j.error,
            createdAt: j.createdAt,
            startedAt: j.startedAt,
            completedAt: j.completedAt,
            failedAt: j.failedAt,
          })),
        },
      });
    }

    // Return overview of all queues
    const statuses = await jobQueue.getAllStatus();

    const queues = Object.entries(statuses).map(([name, status]) => ({
      name,
      label: QUEUE_LABELS[name as keyof typeof QUEUES] || name,
      ...status,
    }));

    // Summary stats
    const summary = queues.reduce(
      (acc, q) => {
        acc.total += q.total;
        acc.waiting += q.waiting;
        acc.active += q.active;
        acc.completed += q.completed;
        acc.failed += q.failed;
        acc.delayed += q.delayed;
        return acc;
      },
      { total: 0, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
    );

    return NextResponse.json({
      success: true,
      data: {
        queues,
        summary,
        queueNames: Object.values(QUEUES),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load queue status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/queues?name=xxx — clear a specific queue
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const session = await getSessionAsync(token);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const queueName = searchParams.get('name');

    if (!queueName) {
      return NextResponse.json({ success: false, error: 'Queue name required' }, { status: 400 });
    }

    const count = await jobQueue.clear(queueName);
    return NextResponse.json({ success: true, data: { cleared: count } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clear queue';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/queues — dispatch a test job or retry a failed job
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const session = await getSessionAsync(token);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { action, queueName, jobId, jobData } = body as {
      action: 'test' | 'retry' | 'remove';
      queueName?: string;
      jobId?: string;
      jobData?: Record<string, unknown>;
    };

    if (action === 'retry') {
      if (!queueName || !jobId) {
        return NextResponse.json({ success: false, error: 'queueName and jobId required' }, { status: 400 });
      }
      const success = await jobQueue.retry(queueName, jobId);
      return NextResponse.json({ success: true, data: { retried: success } });
    }

    if (action === 'remove') {
      if (!queueName || !jobId) {
        return NextResponse.json({ success: false, error: 'queueName and jobId required' }, { status: 400 });
      }
      const success = await jobQueue.remove(queueName, jobId);
      return NextResponse.json({ success: true, data: { removed: success } });
    }

    if (action === 'test') {
      if (!queueName) {
        return NextResponse.json({ success: false, error: 'queueName required' }, { status: 400 });
      }
      const jobId = await jobQueue.add(queueName, {
        name: 'test-job',
        data: jobData || { test: true, triggeredBy: session.userId, timestamp: new Date().toISOString() },
        attempts: 1,
      });
      return NextResponse.json({ success: true, data: { jobId, queue: queueName } });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use: test, retry, or remove' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process queue action';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
