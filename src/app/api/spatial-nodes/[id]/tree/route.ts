import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hasPermission, isAdmin } from '@/lib/auth';

interface FlatTreeNode {
  id: string;
  name: string;
  code: string | null;
  nodeType: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  childrenCount: number;
  assetsCount: number;
  assets: Array<{ id: string; name: string; assetTag: string | null }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasPermission(session, 'assets.view') && !isAdmin(session)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Verify root node exists
    const rootNode = await db.spatialNode.findUnique({
      where: { id },
    });
    if (!rootNode) {
      return NextResponse.json({ success: false, error: 'Spatial node not found' }, { status: 404 });
    }

    // Fetch the entire subtree using recursive CTE-like approach
    // First, get all nodes in the subtree by traversing
    const getAllDescendantIds = async (pid: string): Promise<string[]> => {
      const children = await db.spatialNode.findMany({
        where: { parentId: pid },
        select: { id: true },
      });
      const ids: string[] = [];
      for (const child of children) {
        ids.push(child.id);
        const childIds = await getAllDescendantIds(child.id);
        ids.push(...childIds);
      }
      return ids;
    };

    const descendantIds = await getAllDescendantIds(id);
    const allIds = [id, ...descendantIds];

    // Fetch all nodes with their assets in one query
    const allNodes = await db.spatialNode.findMany({
      where: { id: { in: allIds } },
      include: {
        assets: {
          select: { id: true, name: true, assetTag: true },
        },
        _count: {
          select: { children: true, assets: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Build a map for parent lookup
    const nodeMap = new Map<string, typeof allNodes[0]>();
    for (const node of allNodes) {
      nodeMap.set(node.id, node);
    }

    // Compute level for each node
    const computeLevel = (nodeId: string): number => {
      const node = nodeMap.get(nodeId);
      if (!node || !node.parentId || !nodeMap.has(node.parentId)) return 0;
      return computeLevel(node.parentId) + 1;
    };

    const flatTree: FlatTreeNode[] = allNodes.map((node) => ({
      id: node.id,
      name: node.name,
      code: node.code,
      nodeType: node.nodeType,
      parentId: node.parentId,
      level: computeLevel(node.id),
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      childrenCount: node._count.children,
      assetsCount: node._count.assets,
      assets: node.assets,
    }));

    // Sort by level then sortOrder then name
    flatTree.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      data: flatTree,
      meta: { totalNodes: flatTree.length, rootId: id },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load spatial tree';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
