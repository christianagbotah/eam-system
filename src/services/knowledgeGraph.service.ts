// ============================================================================
// INDUSTRIAL KNOWLEDGE GRAPH — Entity relationships across the platform
// Builds an in-memory graph from Prisma data with traversal and analysis
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cache, CACHE_TTL } from '@/lib/cache';

const logger = createLogger('knowledgeGraph');

export interface GraphNode {
  id: string;
  type: string; // asset, component, failure_mode, work_order, technician, sensor, spare_part, procedure
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string; // installed_on, causes, repaired_by, uses, belongs_to, related_to, has_failure, requires
  weight: number;
  properties?: Record<string, unknown>;
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalWeight: number;
}

export interface GraphAnalysis {
  nodeCount: number;
  edgeCount: number;
  mostConnected: Array<{ id: string; type: string; label: string; connections: number }>;
  clusters: Array<{ label: string; nodeCount: number; nodeIds: string[] }>;
  isolatedNodes: number;
}

export class KnowledgeGraphService {
  private static buildGraphKey(filter?: string): string {
    return `kg:graph:${filter || 'all'}`;
  }

  /**
   * Build the knowledge graph from database
   */
  static async buildGraph(plantId?: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const cacheKey = this.buildGraphKey(plantId);

    return cache.getOrSet(cacheKey, async () => {
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const where = plantId ? { plantId } : {};

      try {
        // === ASSETS ===
        const assets = await db.asset.findMany({
          where,
          select: { id: true, name: true, assetTag: true, status: true, condition: true, criticality: true, categoryId: true, plantId: true },
          take: 500,
        });

        for (const a of assets) {
          nodes.push({
            id: a.id,
            type: 'asset',
            label: a.name,
            properties: { assetTag: a.assetTag, status: a.status, condition: a.condition, criticality: a.criticality, plantId: a.plantId },
          });
        }

        // === WORK ORDERS ===
        const workOrders = await db.workOrder.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          select: { id: true, title: true, status: true, priority: true, assetId: true, assignedTo: true, plantId: true },
          take: 500,
        });

        for (const wo of workOrders) {
          nodes.push({
            id: wo.id,
            type: 'work_order',
            label: wo.title,
            properties: { status: wo.status, priority: wo.priority },
          });

          if (wo.assetId) {
            edges.push({ source: wo.id, target: wo.assetId, type: 'performed_on', weight: 1 });
          }
          if (wo.assignedTo) {
            edges.push({ source: wo.id, target: wo.assignedTo, type: 'assigned_to', weight: 1 });
          }
        }

        // === FAILURE RECORDS ===
        const failures = await db.failureRecord.findMany({
          select: { id: true, failureMode: true, failureSeverity: true, assetId: true, detectedAt: true },
          take: 200,
        });

        for (const f of failures) {
          nodes.push({
            id: f.id,
            type: 'failure',
            label: f.failureMode || 'Unknown Failure',
            properties: { severity: f.failureSeverity, date: f.detectedAt },
          });

          if (f.assetId) {
            edges.push({ source: f.id, target: f.assetId, type: 'occurred_on', weight: 2 });
          }
        }

        // === USERS/TECHNICIANS ===
        const users = await db.user.findMany({
          where: { status: 'active' },
          select: { id: true, fullName: true, username: true },
          take: 200,
        });

        for (const u of users) {
          nodes.push({
            id: u.id,
            type: 'technician',
            label: u.fullName || u.username,
            properties: {},
          });
        }

        // === INVENTORY ITEMS (Spare Parts) ===
        const inventory = await db.inventoryItem.findMany({
          select: { id: true, name: true, itemCode: true, category: true, currentStock: true },
          take: 300,
        });

        for (const item of inventory) {
          nodes.push({
            id: item.id,
            type: 'spare_part',
            label: `${item.itemCode} — ${item.name}`,
            properties: { category: item.category, stock: item.currentStock },
          });
        }

        // === TELEMETRY SOURCES (Sensors) ===
        const sensors = await db.telemetrySource.findMany({
          select: { id: true, name: true, sourceType: true, status: true, plantId: true },
          take: 200,
        });

        for (const s of sensors) {
          nodes.push({
            id: s.id,
            type: 'sensor',
            label: s.name,
            properties: { sourceType: s.sourceType, status: s.status },
          });
        }

        // === WORK INSTRUCTIONS ===
        const instructions = await db.workInstruction.findMany({
          select: { id: true, title: true, maintenanceType: true, componentId: true, assetId: true },
          take: 200,
        });

        for (const wi of instructions) {
          nodes.push({
            id: wi.id,
            type: 'procedure',
            label: wi.title,
            properties: { maintenanceType: wi.maintenanceType },
          });

          if (wi.componentId) {
            edges.push({ source: wi.id, target: wi.componentId, type: 'for_component', weight: 1 });
          }
          if (wi.assetId) {
            edges.push({ source: wi.id, target: wi.assetId, type: 'for_asset', weight: 1 });
          }
        }

        logger.info('Knowledge graph built', { nodes: nodes.length, edges: edges.length });
      } catch (error) {
        logger.error('Failed to build knowledge graph', error);
      }

      return { nodes, edges };
    }, CACHE_TTL.LONG);
  }

  /**
   * Find shortest path between two nodes
   */
  static async findPath(fromId: string, toId: string, plantId?: string): Promise<GraphPath | null> {
    const { nodes, edges } = await this.buildGraph(plantId);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // BFS
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: GraphNode[]; edgePath: GraphEdge[] }> = [{ nodeId: fromId, path: [], edgePath: [] }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.nodeId === toId) {
        const node = nodeMap.get(toId);
        if (node) current.path.push(node);
        return {
          nodes: current.path,
          edges: current.edgePath,
          totalWeight: current.edgePath.reduce((s, e) => s + e.weight, 0),
        };
      }

      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      const node = nodeMap.get(current.nodeId);
      if (node) current.path.push(node);

      for (const edge of edges) {
        if (edge.source === current.nodeId && !visited.has(edge.target)) {
          queue.push({
            nodeId: edge.target,
            path: [...current.path],
            edgePath: [...current.edgePath, edge],
          });
        } else if (edge.target === current.nodeId && !visited.has(edge.source)) {
          queue.push({
            nodeId: edge.source,
            path: [...current.path],
            edgePath: [...current.edgePath, edge],
          });
        }
      }
    }

    return null;
  }

  /**
   * Get neighbors of a node
   */
  static async getNeighbors(nodeId: string, depth = 1, plantId?: string): Promise<GraphNode[]> {
    const { nodes, edges } = await this.buildGraph(plantId);
    const visited = new Set<string>();
    visited.add(nodeId);
    let frontier = new Set<string>([nodeId]);

    for (let i = 0; i < depth; i++) {
      const nextFrontier = new Set<string>();
      for (const fid of frontier) {
        for (const edge of edges) {
          if (edge.source === fid && !visited.has(edge.target)) {
            visited.add(edge.target);
            nextFrontier.add(edge.target);
          } else if (edge.target === fid && !visited.has(edge.source)) {
            visited.add(edge.source);
            nextFrontier.add(edge.source);
          }
        }
      }
      frontier = nextFrontier;
    }

    visited.delete(nodeId);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return [...visited].map(id => nodeMap.get(id)!).filter(Boolean);
  }

  /**
   * Analyze graph structure
   */
  static async analyze(plantId?: string): Promise<GraphAnalysis> {
    const { nodes, edges } = await this.buildGraph(plantId);

    // Most connected nodes
    const connectionCount = new Map<string, number>();
    for (const edge of edges) {
      connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
      connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const mostConnected = [...connectionCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => {
        const node = nodeMap.get(id);
        return node ? { id, type: node.type, label: node.label, connections: count } : null;
      })
      .filter(Boolean) as Array<{ id: string; type: string; label: string; connections: number }>;

    // Isolated nodes
    const connectedNodes = new Set(connectionCount.keys());
    const isolatedNodes = nodes.filter(n => !connectedNodes.has(n.id)).length;

    // Simple clustering by type
    const typeGroups = new Map<string, GraphNode[]>();
    for (const node of nodes) {
      if (!typeGroups.has(node.type)) typeGroups.set(node.type, []);
      typeGroups.get(node.type)!.push(node);
    }

    const clusters = [...typeGroups.entries()].map(([type, group]) => ({
      label: type,
      nodeCount: group.length,
      nodeIds: group.map(n => n.id).slice(0, 10),
    }));

    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      mostConnected,
      clusters,
      isolatedNodes,
    };
  }

  /**
   * Get entity details with its relationships
   */
  static async getEntityDetails(entityId: string, plantId?: string): Promise<{
    entity: GraphNode | null;
    neighbors: GraphNode[];
    relationshipCount: number;
  }> {
    const { nodes, edges } = await this.buildGraph(plantId);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const entity = nodeMap.get(entityId) || null;

    if (!entity) return { entity: null, neighbors: [], relationshipCount: 0 };

    const relatedIds = new Set<string>();
    for (const edge of edges) {
      if (edge.source === entityId) relatedIds.add(edge.target);
      if (edge.target === entityId) relatedIds.add(edge.source);
    }

    const neighbors = [...relatedIds].map(id => nodeMap.get(id)!).filter(Boolean);

    return { entity, neighbors, relationshipCount: relatedIds.size };
  }
}
