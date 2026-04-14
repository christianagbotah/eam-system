import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, hasRole } from '@/lib/auth';

/**
 * GET /api/work-orders/[id]/personal-tools
 *
 * Returns the work order's personalTools JSON parsed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const wo = await db.workOrder.findUnique({
      where: { id },
      select: { id: true, personalTools: true },
    });

    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    // Parse the JSON personalTools field
    let tools: unknown[] = [];
    try {
      const parsed = JSON.parse(wo.personalTools);
      if (Array.isArray(parsed)) {
        tools = parsed;
      }
    } catch {
      // If parsing fails, return empty array
    }

    return NextResponse.json({ success: true, data: tools });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch personal tools';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/work-orders/[id]/personal-tools
 *
 * Accepts { tools: [{ toolName, toolCode, condition, notes }] }
 * Saves as JSON to personalTools field.
 * Requires work_orders.update permission or team_leader role on the WO.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tools } = body;

    if (!tools || !Array.isArray(tools)) {
      return NextResponse.json(
        { success: false, error: 'tools array is required' },
        { status: 400 }
      );
    }

    // Validate tool items
    for (const tool of tools) {
      if (!tool.toolName) {
        return NextResponse.json(
          { success: false, error: 'Each tool must have a toolName' },
          { status: 400 }
        );
      }
    }

    const wo = await db.workOrder.findUnique({ where: { id } });
    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked && !session.roles.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Work order is locked' }, { status: 400 });
    }

    // Check permissions: requires work_orders.update permission OR team_leader role on the WO
    const hasPermission = hasAnyPermission(session, ['work_orders.update', 'work_orders.*']);
    const isTeamLeader = await db.workOrderTeamMember.findFirst({
      where: {
        workOrderId: id,
        userId: session.userId,
        role: 'team_leader',
      },
    });

    if (!hasPermission && !isTeamLeader) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Requires work_orders.update permission or team_leader role on this work order.' },
        { status: 403 }
      );
    }

    const oldValues = wo.personalTools;
    const newValues = JSON.stringify(tools);

    const updated = await db.workOrder.update({
      where: { id },
      data: {
        personalTools: newValues,
      },
      include: {
        assignee: { select: { id: true, fullName: true, username: true } },
        teamLeader: { select: { id: true, fullName: true, username: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'update',
        entityType: 'work_order',
        entityId: id,
        oldValues: JSON.stringify({ personalTools: oldValues }),
        newValues: JSON.stringify({ personalTools: newValues }),
      },
    });

    // Parse and return the tools
    let parsedTools: unknown[] = [];
    try {
      const parsed = JSON.parse(newValues);
      if (Array.isArray(parsed)) {
        parsedTools = parsed;
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      data: parsedTools,
      workOrder: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update personal tools';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
