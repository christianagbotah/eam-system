import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin, hasPermission, hasAnyPermission } from '@/lib/auth';
import { getPlantScope, applyPlantScope } from '@/lib/plant-scope';
import { notifyUser } from '@/lib/notifications';

const URGENCY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
const VALID_URGENCIES = ['low', 'normal', 'high', 'critical'];

// One-time flag to prevent repeated backfills
let backfillDone = false;

// Auto-backfill: generate request numbers for legacy rows that have null requestNumber
async function ensureLegacyRequestNumbers() {
  if (backfillDone) return;
  backfillDone = true;
  try {
    const legacy = await db.repairToolRequest.findMany({
      where: { requestNumber: null },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    if (legacy.length === 0) return;

    console.log(`[backfill] Generating request numbers for ${legacy.length} legacy tool request(s)...`);

    // Get all existing request numbers grouped by prefix
    const existing = await db.repairToolRequest.findMany({
      where: { requestNumber: { not: null } },
      select: { requestNumber: true },
    });
    const usedByPrefix = new Map<string, Set<number>>();
    for (const r of existing) {
      if (!r.requestNumber) continue;
      const parts = r.requestNumber.split('-');
      if (parts.length >= 3) {
        const prefix = `${parts[0]}-${parts[1]}`;
        if (!usedByPrefix.has(prefix)) usedByPrefix.set(prefix, new Set());
        usedByPrefix.get(prefix)!.add(parseInt(parts[2], 10));
      }
    }

    // Assign numbers sequentially per month
    const counterByPrefix = new Map<string, number>();
    for (const row of legacy) {
      const ym = `${row.createdAt.getFullYear()}${String(row.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const prefix = `TR-${ym}`;
      let counter = counterByPrefix.get(prefix) || 1;
      const used = usedByPrefix.get(prefix);
      while (used && used.has(counter)) counter++;
      counterByPrefix.set(prefix, counter);
      const num = `${prefix}${String(counter).padStart(4, '0')}`;
      if (!usedByPrefix.has(prefix)) usedByPrefix.set(prefix, new Set());
      usedByPrefix.get(prefix)!.add(counter);
      await db.repairToolRequest.update({ where: { id: row.id }, data: { requestNumber: num } });
      console.log(`[backfill] ${row.id.slice(0, 8)}... → ${num}`);
    }
    console.log(`[backfill] Done. ${legacy.length} request number(s) generated.`);
  } catch (err) {
    // Don't let backfill failure block the API
    console.warn('[backfill] Failed:', err instanceof Error ? err.message : err);
    backfillDone = false; // Allow retry
  }
}

// GET /api/repairs/tool-requests
export async function GET(request: NextRequest) {
  try {
    // Auto-backfill legacy rows on first access
    await ensureLegacyRequestNumbers();

    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (!hasAnyPermission(session, ['repair_tool_requests.view', 'repair_tool_requests.view_all', 'repair_tool_requests.view_own']) && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);

    const workOrderId = searchParams.get('workOrderId');
    const status = searchParams.get('status');
    const requestedById = searchParams.get('requestedById');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const stats = searchParams.get('stats') === 'true';

    const where: Record<string, unknown> = {};

    // Apply plant scope filter
    if (session) {
      const plantScope = await getPlantScope(request, session);
      if (plantScope) {
        applyPlantScope(where, plantScope);
      }
    }

    if (workOrderId) where.workOrderId = workOrderId;
    if (status) where.status = status;
    if (requestedById) where.requestedById = requestedById;

    // Users with only view_own are scoped to their own requests
    const canViewAll = hasAnyPermission(session, ['repair_tool_requests.view', 'repair_tool_requests.view_all']) || isAdmin(session);
    if (!canViewAll) {
      where.requestedById = session.userId;
    }

    // Stats endpoint
    if (stats) {
      const statsWhere = Object.keys(where).length > 0 ? where : undefined;
      const [
        total, pending, supervisorApproved, storekeeperApproved, issued, returned, rejected,
        overdueCount,
      ] = await Promise.all([
        db.repairToolRequest.count({ where: statsWhere }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'pending' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'supervisor_approved' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'storekeeper_approved' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'issued' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'returned' } }),
        db.repairToolRequest.count({ where: { ...statsWhere, status: 'rejected' } }),
        db.repairToolRequest.count({
          where: {
            ...statsWhere,
            status: 'pending',
            createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      const byUrgency = await db.repairToolRequest.groupBy({
        by: ['urgency'],
        where: statsWhere,
        _count: true,
      });

      return NextResponse.json({
        success: true,
        data: {
          total, pending, supervisorApproved, storekeeperApproved, issued, returned, rejected, overdueCount,
          byUrgency: byUrgency.map(u => ({ urgency: u.urgency, count: u._count })),
        },
      });
    }

    const [requests, total] = await Promise.all([
      db.repairToolRequest.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          requestedBy: { select: { id: true, fullName: true, username: true } },
          supervisorApprovedBy: { select: { id: true, fullName: true } },
          storekeeperApprovedBy: { select: { id: true, fullName: true } },
          issuedByUser: { select: { id: true, fullName: true } },
          returnedByUser: { select: { id: true, fullName: true } },
          workOrder: { select: { id: true, woNumber: true, title: true, status: true } },
          tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, condition: true, quantity: true } },
          items: {
            include: {
              tool: { select: { id: true, toolCode: true, name: true, status: true, category: true, condition: true, quantity: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.repairToolRequest.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    // Sort: urgency (critical first), then createdAt desc
    const sorted = requests.sort((a, b) => {
      const aUrgency = URGENCY_ORDER[a.urgency] ?? 2;
      const bUrgency = URGENCY_ORDER[b.urgency] ?? 2;
      if (aUrgency !== bUrgency) return aUrgency - bUrgency;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Add isOverdue flag for pending requests older than 24h
    // Also create virtual items for old single-tool requests (backward compat)
    const overdueThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const enriched = sorted.map(r => {
      const base: any = {
        ...r,
        isOverdue: r.status === 'pending' && r.createdAt < overdueThreshold,
      };

      // For old requests with no line items, create a virtual item from flat fields
      if (r.items.length === 0 && r.toolId) {
        base._virtualItem = {
          toolId: r.toolId,
          toolName: r.toolName,
          quantityRequested: 1,
          quantityApproved: undefined,
          quantityIssued: r.status === 'issued' ? 1 : 0,
          quantityReturned: r.status === 'returned' ? 1 : 0,
          tool: r.tool,
        };
      }

      return base;
    });

    return NextResponse.json({ success: true, data: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load tool requests';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Helper: Generate sequential request number
async function generateRequestNumber(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `TR-${ym}-`;

  // Find the highest existing number for this month
  const last = await db.repairToolRequest.findFirst({
    where: { requestNumber: { startsWith: prefix } },
    orderBy: { requestNumber: 'desc' },
    select: { requestNumber: true },
  });

  let nextNum = 1;
  if (last) {
    const parts = last.requestNumber.split('-');
    nextNum = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// POST /api/repairs/tool-requests
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    if (!hasPermission(session, 'repair_tool_requests.create') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { workOrderId, items, reason, notes, urgency } = body;

    // Validate at least one item exists
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one tool item is required' }, { status: 400 });
    }

    if (!workOrderId || !reason) {
      return NextResponse.json({ success: false, error: 'workOrderId and reason are required' }, { status: 400 });
    }

    const resolvedUrgency = VALID_URGENCIES.includes(urgency) ? urgency : 'normal';

    const wo = await db.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) return NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 });

    // Validate requester is on the WO's execution team
    if (workOrderId) {
      const woTeam = await db.workOrderTeamMember.findFirst({
        where: { workOrderId, userId: session.userId },
      });
      const isAssignee = wo.assignedTo === session.userId;
      if (!woTeam && !isAssignee && !isAdmin(session)) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this work order\'s execution team' },
          { status: 403 },
        );
      }
    }

    // Validate items and check tool availability
    const warnings: string[] = [];
    const validatedItems: Array<{
      toolId: string | null;
      toolName: string;
      toolCode: string | null;
      category: string | null;
      quantityRequested: number;
      unitCost: number | null;
      availabilityStatus: string;
    }> = [];

    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantityRequested, 10) || 1);
      const toolId = item.toolId || null;
      const toolName = item.toolName?.trim();
      if (!toolName) {
        return NextResponse.json({ success: false, error: 'Each item must have a tool name' }, { status: 400 });
      }

      let toolCode: string | null = item.toolCode || null;
      let category: string | null = item.category || null;
      let unitCost: number | null = null;
      let availabilityStatus = 'available';

      if (toolId) {
        const tool = await db.tool.findUnique({ where: { id: toolId } });
        if (!tool) {
          return NextResponse.json({ success: false, error: `Tool not found: ${toolName}` }, { status: 404 });
        }
        toolCode = tool.toolCode;
        category = tool.category;
        unitCost = tool.currentValue ?? tool.purchaseCost ?? null;

        if (tool.quantity < qty) {
          availabilityStatus = 'limited';
          warnings.push(`Tool "${tool.name}": requested ${qty} but only ${tool.quantity} available`);
        }
        if (tool.quantity <= 0) {
          availabilityStatus = 'unavailable';
          warnings.push(`Tool "${tool.name}" is out of stock (quantity: 0)`);
        }
        if (tool.status !== 'available') {
          warnings.push(`Tool "${tool.name}" is currently ${tool.status}. It may not be available for immediate issue.`);
        }
      }

      validatedItems.push({
        toolId,
        toolName,
        toolCode,
        category,
        quantityRequested: qty,
        unitCost,
        availabilityStatus,
      });
    }

    const requestNumber = await generateRequestNumber();

    // Build the combined tool name (first tool + count)
    const primaryToolName = validatedItems[0]?.toolName || 'Tools';

    // Create the header + all line items in a transaction
    const toolReq = await db.$transaction(async (tx) => {
      const header = await tx.repairToolRequest.create({
        data: {
          requestNumber,
          workOrderId,
          toolName: primaryToolName,
          reason,
          notes: notes || null,
          status: 'pending',
          requestedById: session!.userId,
          urgency: resolvedUrgency,
          items: {
            create: validatedItems.map(item => ({
              toolId: item.toolId,
              toolName: item.toolName,
              toolCode: item.toolCode,
              category: item.category,
              quantityRequested: item.quantityRequested,
              unitCost: item.unitCost,
              availabilityStatus: item.availabilityStatus,
            })),
          },
        },
        include: {
          requestedBy: { select: { id: true, fullName: true } },
          workOrder: { select: { id: true, woNumber: true, title: true } },
          items: {
            include: {
              tool: { select: { id: true, toolCode: true, name: true, status: true, condition: true, quantity: true } },
            },
          },
        },
      });
      return header;
    });

    if (wo.assignedSupervisorId) {
      const itemCount = validatedItems.length;
      await notifyUser(
        wo.assignedSupervisorId, 'repair_tool_request',
        'Tool Request Pending Approval',
        `${toolReq.requestedBy.fullName} requested ${itemCount} tool${itemCount > 1 ? 's' : ''} for WO ${wo.woNumber}${resolvedUrgency !== 'normal' ? ` [${resolvedUrgency.toUpperCase()}]` : ''}`,
        'repair_tool_request', toolReq.id, 'maintenance-work-orders',
      );
    }

    await db.auditLog.create({
      data: { userId: session.userId, action: 'create', entityType: 'repair_tool_request', entityId: toolReq.id, newValues: JSON.stringify({ requestNumber, workOrderId, itemCount: validatedItems.length, reason, urgency: resolvedUrgency }) },
    });

    return NextResponse.json({ success: true, data: toolReq, warnings: warnings.length > 0 ? warnings : undefined }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create tool request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
