import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('systemDiagram');

export interface DiagramValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    disconnectedNodes: string[];
    nodeTypes: Record<string, number>;
    edgeTypes: Record<string, number>;
  };
}

export class SystemDiagramService {
  /**
   * Validate diagram structure for completeness
   */
  static validateDiagram(nodes: unknown[], edges: unknown[]): DiagramValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const nodeTypes: Record<string, number> = {};
    const edgeTypes: Record<string, number> = {};

    if (!Array.isArray(nodes)) {
      errors.push('Nodes must be an array');
      return { isValid: false, warnings, errors, stats: { totalNodes: 0, totalEdges: 0, disconnectedNodes: [], nodeTypes, edgeTypes } };
    }

    if (!Array.isArray(edges)) {
      errors.push('Edges must be an array');
      return { isValid: false, warnings, errors, stats: { totalNodes: nodes.length, totalEdges: 0, disconnectedNodes: [], nodeTypes, edgeTypes } };
    }

    // Count types
    for (const node of nodes) {
      const n = node as Record<string, unknown>;
      const type = (n.type as string) || 'unknown';
      nodeTypes[type] = (nodeTypes[type] || 0) + 1;
    }

    for (const edge of edges) {
      const e = edge as Record<string, unknown>;
      const type = (e.type as string) || 'default';
      edgeTypes[type] = (edgeTypes[type] || 0) + 1;
    }

    // Find connected node IDs
    const connectedIds = new Set<string>();
    for (const edge of edges) {
      const e = edge as Record<string, unknown>;
      connectedIds.add(e.source as string);
      connectedIds.add(e.target as string);
    }

    // Find disconnected nodes (not junction nodes which are allowed to be isolated)
    const disconnectedNodes: string[] = [];
    for (const node of nodes) {
      const n = node as Record<string, unknown>;
      if (!connectedIds.has(n.id as string) && n.type !== 'junctionNode') {
        disconnectedNodes.push(n.id as string);
      }
    }

    if (disconnectedNodes.length > 0) {
      warnings.push(`${disconnectedNodes.length} node(s) are not connected to any edge`);
    }

    if (nodes.length === 0) {
      warnings.push('Diagram has no nodes');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        disconnectedNodes,
        nodeTypes,
        edgeTypes,
      },
    };
  }

  /**
   * Get diagram statistics for analytics
   */
  static async getDiagramStats(plantId?: string) {
    try {
      const where: Record<string, unknown> = plantId ? { plantId } : {};

      const [totalDiagrams, byType, recentActivity] = await Promise.all([
        db.systemDiagram.count({ where }),
        db.systemDiagram.groupBy({
          by: ['type'],
          where: Object.keys(where).length > 0 ? where : undefined,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
        db.systemDiagram.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: { updatedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            type: true,
            version: true,
            updatedAt: true,
            createdByIdUser: { select: { fullName: true } },
          },
        }),
      ]);

      return {
        success: true,
        data: {
          totalDiagrams,
          byType: byType.map(t => ({ type: t.type, count: t._count.id })),
          recentActivity,
        },
      };
    } catch (error) {
      logger.error('Failed to get diagram stats', error);
      return { success: false, error: 'Failed to get stats' };
    }
  }

  /**
   * Compare two diagram versions
   */
  static compareVersions(
    currentNodes: unknown[],
    currentEdges: unknown[],
    previousNodes: unknown[],
    previousEdges: unknown[]
  ) {
    const currentIds = new Set((currentNodes as Record<string, unknown>[]).map(n => n.id));
    const previousIds = new Set((previousNodes as Record<string, unknown>[]).map(n => n.id));

    const addedNodes = [...currentIds].filter(id => !previousIds.has(id));
    const removedNodes = [...previousIds].filter(id => !currentIds.has(id));

    const currentEdgeKeys = new Set(
      (currentEdges as Record<string, unknown>[]).map(e => `${e.source}->${e.target}`)
    );
    const previousEdgeKeys = new Set(
      (previousEdges as Record<string, unknown>[]).map(e => `${e.source}->${e.target}`)
    );

    const addedEdges = [...currentEdgeKeys].filter(k => !previousEdgeKeys.has(k));
    const removedEdges = [...previousEdgeKeys].filter(k => !currentEdgeKeys.has(k));

    return {
      nodes: { added: addedNodes.length, removed: removedNodes.length, unchanged: currentIds.size - addedNodes.length },
      edges: { added: addedEdges.length, removed: removedEdges.length, unchanged: currentEdgeKeys.size - addedEdges.length },
    };
  }
}
