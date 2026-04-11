import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

    const tool = await db.tool.findUnique({ where: { id }, select: { id: true, toolCode: true, name: true } });
    if (!tool) {
      return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const [transactions, total] = await Promise.all([
      db.toolTransaction.findMany({
        where: { toolId: id },
        include: {
          performedBy: { select: { id: true, fullName: true, username: true } },
          fromUser: { select: { id: true, fullName: true, username: true } },
          toUser: { select: { id: true, fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.toolTransaction.count({ where: { toolId: id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      tool,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load tool transactions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
