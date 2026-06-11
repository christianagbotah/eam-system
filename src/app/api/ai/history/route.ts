import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:ai:history');

// ============================================================================
// TYPES
// ============================================================================

interface AiHistoryEntry {
  id: string;
  userId: string;
  username: string;
  entityType: string;
  entityId: string;
  action: string;
  machineName: string;
  assetTag: string;
  subsystems: number;
  components: number;
  inventoryItems: number;
  pmTemplates: number;
  source: string;
  createdAt: string;
}

interface PaginatedResponse {
  entries: AiHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// HELPER — Parse newValues JSON safely
// ============================================================================

function safeParseJson(jsonStr: string | null | undefined): Record<string, unknown> | null {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// ============================================================================
// GET — Query AI generation history from audit log
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // --- Auth ---
    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    if (!hasPermission(session, 'assets.view') && !hasPermission(session, 'system_settings.view') && !isAdmin(session)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Required: assets.view or settings.view' },
        { status: 403 },
      );
    }

    // --- Parse query params ---
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const offset = (page - 1) * pageSize;

    // Optional filters
    const userId = searchParams.get('userId');
    const assetId = searchParams.get('assetId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // --- Build where clause ---
    const where: Record<string, unknown> = {
      entityType: 'asset',
      action: 'create',
      newValues: { contains: 'ai-generate' },
    };

    if (userId) {
      where.userId = userId;
    }

    if (assetId) {
      where.entityId = assetId;
    }

    // Date range filter
    if (startDate || endDate) {
      const createdAt: Record<string, unknown> = {};
      if (startDate) {
        createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date (up to 23:59:59.999)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    // --- Query ---
    logger.info('Querying AI generation history', {
      page,
      pageSize,
      userId,
      assetId,
      hasSearch: !!search,
    });

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ]);

    // --- Transform logs into history entries ---
    let entries: AiHistoryEntry[] = logs.map((log) => {
      const parsed = safeParseJson(log.newValues);
      const machineName = (parsed?.machineName as string) || 'Unknown';
      const assetTag = (parsed?.assetTag as string) || '';
      const source = (parsed?.source as string) || 'ai-generate';

      return {
        id: log.id,
        userId: log.userId,
        username: log.user?.username || log.user?.fullName || 'Unknown User',
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        machineName,
        assetTag,
        subsystems: Number(parsed?.subsystems) || 0,
        components: Number(parsed?.components) || 0,
        inventoryItems: Number(parsed?.inventoryItems) || 0,
        pmTemplates: Number(parsed?.pmTemplates) || 0,
        source,
        createdAt: log.createdAt.toISOString(),
      };
    });

    // Apply text search filter (post-query since JSON search in DB is limited)
    if (search) {
      const searchLower = search.toLowerCase();
      entries = entries.filter(
        (entry) =>
          entry.machineName.toLowerCase().includes(searchLower) ||
          entry.assetTag.toLowerCase().includes(searchLower) ||
          entry.username.toLowerCase().includes(searchLower),
      );
    }

    const totalPages = Math.ceil(total / pageSize);

    logger.info('AI generation history retrieved', {
      total,
      returned: entries.length,
      page,
      totalPages,
    });

    const response: PaginatedResponse = {
      entries,
      total,
      page,
      pageSize,
      totalPages,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load AI generation history';
    logger.error('GET /api/ai/history failed', { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
