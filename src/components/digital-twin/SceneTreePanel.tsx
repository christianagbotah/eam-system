'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  X,
  TreePine,
  Circle,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useDigitalTwinStore, type DigitalTwinScene, type MeshHealthEntry } from '@/stores/digitalTwinStore';

// ============================================================================
// Types
// ============================================================================

/** A tree node representing a mesh or assembly in the BOM structure */
interface TreeNode {
  id: string;
  name: string;
  meshName?: string;
  assetId?: string;
  assetName?: string;
  healthStatus?: MeshHealthEntry['status'];
  children: TreeNode[];
  isExpanded?: boolean;
}

export interface SceneTreePanelProps {
  /** Whether the panel is visible */
  isOpen?: boolean;
  /** Callback to toggle panel visibility */
  onToggle?: () => void;
  /** Callback when a mesh is selected from the tree */
  onMeshSelect?: (meshName: string, assetId?: string) => void;
  /** External tree data (optional, auto-derived from scene if not provided) */
  treeData?: TreeNode[];
}

// ============================================================================
// Helper: Build tree from scene data
// ============================================================================

function buildTreeFromScene(
  scene: DigitalTwinScene | null,
  healthMap: Record<string, MeshHealthEntry>,
): TreeNode[] {
  if (!scene) return [];

  // Build a flat list of nodes from hotspots (as proxies for mesh names)
  // In production, this would come from the model's scene graph
  const meshNames = new Set<string>();

  if (scene.hotspots) {
    for (const hs of scene.hotspots) {
      meshNames.add(hs.meshName);
    }
  }

  if (scene.annotations) {
    for (const ann of scene.annotations) {
      if (ann.meshName) meshNames.add(ann.meshName);
    }
  }

  // Also add any keys from health map
  for (const key of Object.keys(healthMap)) {
    meshNames.add(key);
  }

  // Convert to tree nodes (flat list grouped under scene name)
  const children: TreeNode[] = Array.from(meshNames).map((name) => {
    const health = healthMap[name];
    return {
      id: name,
      name: name.replace(/_/g, ' ').replace(/-/g, ' '),
      meshName: name,
      assetId: scene.assetId,
      assetName: scene.name,
      healthStatus: health?.status,
      children: [],
    };
  });

  return [
    {
      id: 'root',
      name: scene.name || 'Digital Twin',
      assetId: scene.assetId,
      children,
      isExpanded: true,
    },
  ];
}

// ============================================================================
// Health status dot component
// ============================================================================

function HealthDot({ status }: { status?: MeshHealthEntry['status'] }) {
  if (!status) return <Circle className="h-2.5 w-2.5 text-slate-500" />;

  const colorMap: Record<string, string> = {
    healthy: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
    unknown: 'text-slate-500',
  };

  return (
    <Circle
      className={`h-2.5 w-2.5 fill-current ${colorMap[status] ?? colorMap.unknown}`}
    />
  );
}

// ============================================================================
// Tree Node Component
// ============================================================================

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedMeshName: string | null;
  onSelect: (node: TreeNode) => void;
}

function TreeNodeItem({ node, depth, selectedMeshName, onSelect }: TreeNodeItemProps) {
  const [expanded, setExpanded] = useState(node.isExpanded ?? false);
  const hasChildren = node.children.length > 0;
  const isSelected = node.meshName ? selectedMeshName === node.meshName : false;

  return (
    <div>
      <div
        className={`
          flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer
          transition-colors duration-100 text-xs group
          ${isSelected
            ? 'bg-cyan-500/15 text-cyan-300'
            : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
          }
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          if (node.meshName) onSelect(node);
        }}
      >
        {/* Expand/collapse arrow */}
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3 w-3 text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-500 flex-shrink-0" />
          )
        ) : (
          <div className="w-3 flex-shrink-0" />
        )}

        {/* Health dot */}
        <HealthDot status={node.healthStatus} />

        {/* Node name */}
        <span className="truncate flex-1 font-medium">
          {node.name}
        </span>

        {/* Asset indicator */}
        {node.assetId && !node.meshName && (
          <TreePine className="h-3 w-3 text-slate-500" />
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedMeshName={selectedMeshName}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main SceneTreePanel Component
// ============================================================================

export function SceneTreePanel({
  isOpen = true,
  onToggle,
  onMeshSelect,
  treeData: externalTreeData,
}: SceneTreePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const currentScene = useDigitalTwinStore((s) => s.currentScene);
  const selectedMeshName = useDigitalTwinStore((s) => s.selectedMeshName);
  const selectMesh = useDigitalTwinStore((s) => s.selectMesh);
  const iotHealthMap = useDigitalTwinStore((s) => s.iotHealthMap);

  // Build tree data
  const treeData = useMemo(() => {
    if (externalTreeData) return externalTreeData;
    return buildTreeFromScene(currentScene, iotHealthMap);
  }, [externalTreeData, currentScene, iotHealthMap]);

  // Filter tree by search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return treeData;

    const query = searchQuery.toLowerCase();

    function filterNodes(nodes: TreeNode[]): TreeNode[] {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const nameMatch = node.name.toLowerCase().includes(query);
        const filteredChildren = filterNodes(node.children);

        if (nameMatch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
            isExpanded: true, // Auto-expand when searching
          });
        }
        return acc;
      }, []);
    }

    return filterNodes(treeData);
  }, [treeData, searchQuery]);

  // Count total nodes
  const totalNodes = useMemo(() => {
    let count = 0;
    function countNodes(nodes: TreeNode[]) {
      for (const node of nodes) {
        count++;
        countNodes(node.children);
      }
    }
    countNodes(treeData);
    return count;
  }, [treeData]);

  // Handle mesh selection
  const handleSelect = useCallback(
    (node: TreeNode) => {
      if (onMeshSelect && node.meshName) {
        onMeshSelect(node.meshName, node.assetId);
      } else if (node.meshName) {
        selectMesh(node.meshName, node.assetId);
      }
    },
    [onMeshSelect, selectMesh],
  );

  // Collapsed state — show only toggle button
  if (!isOpen) {
    return (
      <div className="absolute top-3 left-3 z-30">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          style={{
            background: 'rgba(15,15,25,0.8)',
            border: '1px solid rgba(148,163,184,0.12)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="absolute top-0 left-0 z-20 h-full flex flex-col"
      style={{
        width: '280px',
        background: 'rgba(10,10,18,0.92)',
        borderRight: '1px solid rgba(148,163,184,0.1)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <TreePine className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
            Scene Tree
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-slate-400 border-slate-700">
            {totalNodes}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-6 w-6 text-slate-400 hover:text-slate-200"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search meshes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 pr-7 text-xs bg-white/5 border-white/10 rounded-md text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {filteredTree.length > 0 ? (
            filteredTree.map((node) => (
              <TreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                selectedMeshName={selectedMeshName}
                onSelect={handleSelect}
              />
            ))
          ) : searchQuery ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Search className="h-6 w-6 mb-2 opacity-50" />
              <span className="text-xs">No meshes match &ldquo;{searchQuery}&rdquo;</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <TreePine className="h-6 w-6 mb-2 opacity-50" />
              <span className="text-xs">No scene loaded</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default SceneTreePanel;
