import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('facilityIntelligence');

export interface FacilityNode {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  level: number;
  childCount: number;
  equipmentCount: number;
  position?: { x: number; y: number };
  bounds?: { width: number; height: number };
}

export interface FacilityTree {
  root: FacilityNode;
  children: FacilityTree[];
}

export interface EquipmentLocation {
  assetId: string;
  assetName: string;
  assetType: string;
  spatialNodeId: string;
  spatialNodeName: string;
  path: string;
  position?: { x: number; y: number };
}

export interface FacilityStats {
  totalLocations: number;
  locationsByType: Record<string, number>;
  totalEquipment: number;
  equipmentByType: Record<string, number>;
  occupancy: Record<string, { total: number; occupied: number; percentage: number }>;
}

export class FacilityIntelligenceService {
  /**
   * Get the full facility tree structure.
   * If rootId is provided, returns the subtree rooted at that node.
   */
  static async getFacilityTree(rootId?: string): Promise<FacilityNode[]> {
    try {
      let where: Record<string, unknown> | undefined;

      if (rootId) {
        // Verify root node exists and collect all descendant IDs
        const rootNode = await db.spatialNode.findUnique({ where: { id: rootId } });
        if (!rootNode) return [];

        const descendantIds = await FacilityIntelligenceService.getDescendantIds(rootId);
        where = { id: { in: [rootId, ...descendantIds] } };
      }

      const nodes = await db.spatialNode.findMany({
        where,
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { children: true, assets: true },
          },
        },
      });

      // Build a parent→children count map
      const childCountMap: Record<string, number> = {};
      for (const node of nodes) {
        if (node.parentId) {
          childCountMap[node.parentId] = (childCountMap[node.parentId] || 0) + 1;
        }
      }

      return nodes.map(node => {
        let position, bounds;
        try {
          const geo = node.coordinates ? JSON.parse(node.coordinates) : null;
          position = geo?.position;
          bounds = geo?.bounds;
        } catch { /* keep undefined */ }

        return {
          id: node.id,
          name: node.name,
          type: node.nodeType,
          parentId: node.parentId,
          level: node.level,
          childCount: childCountMap[node.id] || 0,
          equipmentCount: node._count.assets,
          position,
          bounds,
        };
      });
    } catch (error) {
      logger.error('Failed to get facility tree', error as Error);
      return [];
    }
  }

  /**
   * Get equipment locations mapped to spatial nodes.
   * If spatialNodeId is provided, returns equipment under that node's subtree.
   */
  static async getEquipmentLocations(spatialNodeId?: string): Promise<EquipmentLocation[]> {
    try {
      let nodeIds: string[];

      if (spatialNodeId) {
        const node = await db.spatialNode.findUnique({ where: { id: spatialNodeId } });
        if (!node) return [];
        const descendantIds = await FacilityIntelligenceService.getDescendantIds(spatialNodeId);
        nodeIds = [spatialNodeId, ...descendantIds];
      } else {
        // Get up to 500 nodes
        const allNodes = await db.spatialNode.findMany({
          take: 500,
          orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
        });
        nodeIds = allNodes.map(n => n.id);
      }

      // Fetch nodes with their assets
      const nodes = await db.spatialNode.findMany({
        where: { id: { in: nodeIds } },
        include: {
          assets: {
            select: { id: true, name: true, assetTag: true, category: { select: { name: true } } },
          },
        },
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      });

      // Build a path cache: nodeId → path string
      const nodeMap = new Map<string, typeof nodes[0]>();
      for (const node of nodes) {
        nodeMap.set(node.id, node);
      }

      const getPath = (nodeId: string): string => {
        const parts: string[] = [];
        let current = nodeMap.get(nodeId);
        const visited = new Set<string>();
        while (current && !visited.has(current.id)) {
          visited.add(current.id);
          parts.unshift(current.name);
          if (current.parentId) {
            current = nodeMap.get(current.parentId);
            // If parent not in map, try DB lookup
            if (!current) {
              break;
            }
          } else {
            current = undefined as unknown as typeof nodes[0];
          }
        }
        return parts.join(' > ');
      };

      const locations: EquipmentLocation[] = [];

      for (const node of nodes) {
        let position: { x: number; y: number } | undefined;
        try {
          const geo = node.coordinates ? JSON.parse(node.coordinates) : null;
          position = geo?.position;
        } catch { /* keep undefined */ }

        const path = getPath(node.id);

        // Add the node itself as a location entry
        if (node.assets.length > 0) {
          for (const asset of node.assets) {
            locations.push({
              assetId: asset.id,
              assetName: asset.name,
              assetType: asset.category?.name || 'unknown',
              spatialNodeId: node.id,
              spatialNodeName: node.name,
              path,
              position,
            });
          }
        } else {
          // Also include spatial nodes that have no direct assets
          locations.push({
            assetId: node.id,
            assetName: node.name,
            assetType: node.nodeType,
            spatialNodeId: node.id,
            spatialNodeName: node.name,
            path,
            position,
          });
        }
      }

      return locations;
    } catch (error) {
      logger.error('Failed to get equipment locations', error as Error);
      return [];
    }
  }

  /**
   * Get facility statistics.
   * If rootId is provided, computes stats for that subtree only.
   */
  static async getFacilityStats(rootId?: string): Promise<FacilityStats> {
    try {
      let where: Record<string, unknown> | undefined;

      if (rootId) {
        const rootNode = await db.spatialNode.findUnique({ where: { id: rootId } });
        if (!rootNode) {
          return {
            totalLocations: 0,
            locationsByType: {},
            totalEquipment: 0,
            equipmentByType: {},
            occupancy: {},
          };
        }
        const descendantIds = await FacilityIntelligenceService.getDescendantIds(rootId);
        where = { id: { in: [rootId, ...descendantIds] } };
      }

      const [totalLocations, byType, nodesWithCounts] = await Promise.all([
        db.spatialNode.count({ where }),
        db.spatialNode.groupBy({
          by: ['nodeType'],
          where,
          _count: { id: true },
        }),
        db.spatialNode.findMany({
          where,
          select: {
            nodeType: true,
            _count: { select: { assets: true, children: true } },
          },
        }),
      ]);

      const locationsByType: Record<string, number> = {};
      for (const t of byType) {
        locationsByType[t.nodeType] = t._count.id;
      }

      const totalEquipment = nodesWithCounts.reduce((sum, n) => sum + n._count.assets, 0);

      // Equipment by node type (leaf-level types that typically represent equipment)
      const equipmentTypes = ['machine', 'component', 'equipment', 'asset', 'pump', 'motor', 'valve', 'tank', 'vessel', 'compressor'];
      const equipmentByType: Record<string, number> = {};
      for (const n of nodesWithCounts) {
        if (equipmentTypes.includes(n.nodeType)) {
          equipmentByType[n.nodeType] = (equipmentByType[n.nodeType] || 0) + n._count.assets;
        }
      }

      // Occupancy by top-level nodes under the given root (or root-level nodes)
      const topLevelWhere = rootId
        ? { parentId: rootId }
        : { parentId: null };

      const topLevelNodes = await db.spatialNode.findMany({
        where: topLevelWhere,
        include: {
          children: {
            select: {
              _count: { select: { assets: true } },
            },
          },
        },
      });

      const occupancy: Record<string, { total: number; occupied: number; percentage: number }> = {};
      for (const parent of topLevelNodes) {
        const childCount = parent.children.length;
        const occupied = parent.children.filter(c => c._count.assets > 0).length;
        occupancy[parent.name] = {
          total: childCount,
          occupied,
          percentage: childCount > 0 ? Math.round((occupied / childCount) * 100) : 0,
        };
      }

      return {
        totalLocations,
        locationsByType,
        totalEquipment,
        equipmentByType,
        occupancy,
      };
    } catch (error) {
      logger.error('Failed to get facility stats', error as Error);
      return {
        totalLocations: 0,
        locationsByType: {},
        totalEquipment: 0,
        equipmentByType: {},
        occupancy: {},
      };
    }
  }

  /**
   * Search for nodes across the facility by name, code, or node type.
   */
  static async searchEquipment(query: string, rootId?: string): Promise<EquipmentLocation[]> {
    try {
      const where: Record<string, unknown> = {
        OR: [
          { name: { contains: query } },
          { code: { contains: query } },
          { nodeType: { contains: query } },
        ],
        isActive: true,
      };

      if (rootId) {
        const rootNode = await db.spatialNode.findUnique({ where: { id: rootId } });
        if (!rootNode) return [];
        const descendantIds = await FacilityIntelligenceService.getDescendantIds(rootId);
        where.id = { in: [rootId, ...descendantIds] };
      }

      const nodes = await db.spatialNode.findMany({
        where,
        take: 50,
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { assets: true } },
        },
      });

      // Build path for each result
      const results: EquipmentLocation[] = [];
      for (const node of nodes) {
        const path = await FacilityIntelligenceService.getNodePath(node.id);

        let position: { x: number; y: number } | undefined;
        try {
          const geo = node.coordinates ? JSON.parse(node.coordinates) : null;
          position = geo?.position;
        } catch { /* keep undefined */ }

        results.push({
          assetId: node.id,
          assetName: node.name,
          assetType: node.nodeType,
          spatialNodeId: node.id,
          spatialNodeName: node.name,
          path,
          position,
        });
      }

      return results;
    } catch (error) {
      logger.error('Failed to search equipment', error as Error);
      return [];
    }
  }

  /**
   * Get spatial navigation path from one node to another using LCA algorithm.
   */
  static async getNavigationPath(fromId: string, toId: string): Promise<{
    path: string[];
    distance: number;
    nodes: Array<{ id: string; name: string; type: string }>;
  } | null> {
    try {
      const fromPath = await FacilityIntelligenceService.getPathToRoot(fromId);
      const toPath = await FacilityIntelligenceService.getPathToRoot(toId);

      if (fromPath.length === 0 || toPath.length === 0) return null;

      // Find lowest common ancestor index
      let lcaIndex = 0;
      while (
        lcaIndex < fromPath.length &&
        lcaIndex < toPath.length &&
        fromPath[lcaIndex].id === toPath[lcaIndex].id
      ) {
        lcaIndex++;
      }

      // Build path: from → LCA → to
      // fromPath goes [root, ..., from], toPath goes [root, ..., to]
      const pathNodes = [
        ...fromPath.slice(0, lcaIndex).reverse(), // from node up to LCA
        ...toPath.slice(lcaIndex - 1),            // from LCA's child down to to node (avoiding duplicate LCA)
      ];

      // Remove duplicates at junction point
      const uniqueNodes: typeof pathNodes = [];
      for (const node of pathNodes) {
        if (uniqueNodes.length === 0 || uniqueNodes[uniqueNodes.length - 1].id !== node.id) {
          uniqueNodes.push(node);
        }
      }

      return {
        path: uniqueNodes.map(n => n.name),
        distance: uniqueNodes.length - 1,
        nodes: uniqueNodes,
      };
    } catch (error) {
      logger.error('Failed to get navigation path', error as Error);
      return null;
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────────────

  /**
   * Recursively collect all descendant IDs of a given node.
   */
  private static async getDescendantIds(parentId: string): Promise<string[]> {
    const children = await db.spatialNode.findMany({
      where: { parentId },
      select: { id: true },
    });
    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      const childIds = await FacilityIntelligenceService.getDescendantIds(child.id);
      ids.push(...childIds);
    }
    return ids;
  }

  /**
   * Get the path from a node to the root as an array of {id, name, type}.
   */
  private static async getPathToRoot(nodeId: string): Promise<Array<{ id: string; name: string; type: string }>> {
    const path: Array<{ id: string; name: string; type: string }> = [];
    let current = await db.spatialNode.findUnique({ where: { id: nodeId } });
    while (current) {
      path.unshift({ id: current.id, name: current.name, type: current.nodeType });
      if (current.parentId) {
        current = await db.spatialNode.findUnique({ where: { id: current.parentId } });
      } else {
        current = null;
      }
    }
    return path;
  }

  /**
   * Get a human-readable path string for a node.
   */
  private static async getNodePath(nodeId: string): Promise<string> {
    const pathNodes = await FacilityIntelligenceService.getPathToRoot(nodeId);
    return pathNodes.map(n => n.name).join(' > ');
  }
}
