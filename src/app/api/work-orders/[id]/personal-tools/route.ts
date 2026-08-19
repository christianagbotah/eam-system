import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasAnyPermission, hasRole } from '@/lib/auth';
import { authorizeWorkOrderPlant } from '@/lib/plant-auth-helpers';

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

    // Plant authorization
    const plantAuth = await authorizeWorkOrderPlant(request, session, id);
    if (!plantAuth.ok) return plantAuth.response;

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
    } catch (err) {
      console.warn('[personal-tools] Failed to parse personalTools JSON:', err);
    }

    return NextResponse.json({ success: true, data: tools });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch personal tools';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/work-orders/[id]/personal-tools
 *
 * Add a single personal tool to the work order.
 * Any team member or the assignee can add their own personal tools.
 */
export async function POST(
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
    const { toolName, toolCode, condition, notes } = body;

    if (!toolName) {
      return NextResponse.json({ success: false, error: 'toolName is required' }, { status: 400 });
    }

    const wo = await db.workOrder.findUnique({
      where: { id },
      select: { id: true, isLocked: true, status: true, assignedTo: true, teamMembers: { select: { userId: true } } },
    });

    if (!wo) {
      return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });
    }

    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked.' }, { status: 400 });
    }

    // Don't allow adding personal tools once WO has been verified
    if (wo.status === 'verified' || wo.status === 'closed') {
      return NextResponse.json({ success: false, error: 'Work order has been reviewed. Changes are no longer allowed. Status: ' + wo.status }, { status: 400 });
    }

    // Any team member, assignee, or user with permission can add personal tools
    const isTeamMember = wo.teamMembers.some((m) => m.userId === session.userId);
    const isAssignee = wo.assignedTo === session.userId;
    const hasPerm = hasAnyPermission(session, ['work_orders.update']);

    if (!isTeamMember && !isAssignee && !hasPerm) {
      return NextResponse.json(
        { success: false, error: 'Only team members or the assigned technician can add personal tools.' },
        { status: 403 }
      );
    }

    // Parse existing tools
    let existingTools: any[] = [];
    try {
      const raw = wo.personalTools;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existingTools = parsed;
      }
    } catch (err) {
      console.warn('[personal-tools] Failed to parse existing personalTools JSON:', err);
    }

    // Add the new tool
    const newTool = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      toolName,
      toolCode: toolCode || null,
      condition: condition || 'good',
      notes: notes || '',
      addedBy: session.userId,
      addedAt: new Date().toISOString(),
    };
    existingTools.push(newTool);

    await db.workOrder.update({
      where: { id },
      data: { personalTools: JSON.stringify(existingTools) },
    });

    return NextResponse.json({ success: true, data: newTool }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add personal tool';
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

    if (wo.isLocked) {
      return NextResponse.json({ success: false, error: 'Work order is permanently locked. No modifications are allowed after planner closure.' }, { status: 400 });
    }

    // Don't allow updating personal tools once WO has been verified
    if (wo.status === 'verified' || wo.status === 'closed') {
      return NextResponse.json({ success: false, error: 'Work order has been reviewed. Changes are no longer allowed. Status: ' + wo.status }, { status: 400 });
    }

    // Check permissions: requires work_orders.update permission OR team_leader role on the WO
    const hasPermission = hasAnyPermission(session, ['work_orders.update']);
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
    } catch (err) {
      console.warn('[personal-tools] Failed to parse personalTools after update:', err);
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
