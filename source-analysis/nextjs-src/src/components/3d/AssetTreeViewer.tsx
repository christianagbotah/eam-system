'use client';

import React, { useState, useEffect } from 'react';
import { TreeNode } from '@/types/viewer3d';

interface AssetTreeViewerProps {
  assetId: number;
  selectedMeshId: string | null;
  highlightedMeshId: string | null;
  onNodeClick: (meshId: string) => void;
  onNodeHover: (meshId: string | null) => void;
}

export default function AssetTreeViewer({
  assetId,
  selectedMeshId,
  highlightedMeshId,
  onNodeClick,
  onNodeHover
}: AssetTreeViewerProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTreeData();
  }, [assetId]);

  useEffect(() => {
    const handleMeshSelected = (event: CustomEvent) => {
      const { meshId } = event.detail;
      expandToNode(meshId);
    };

    window.addEventListener('meshSelected', handleMeshSelected as EventListener);
    return () => window.removeEventListener('meshSelected', handleMeshSelected as EventListener);
  }, []);

  const loadTreeData = async () => {
    try {
      const machineResponse = await fetch(`/api/v1/eam/equipment/${assetId}`);
      if (!machineResponse.ok) return;
      
      const machineData = await machineResponse.json();
      const machine = machineData.data;

      const assembliesResponse = await fetch(`/api/v1/eam/assemblies?machine_id=${assetId}`);
      const assembliesData = assembliesResponse.ok ? await assembliesResponse.json() : { data: [] };

      const partsResponse = await fetch(`/api/v1/eam/parts?machine_id=${assetId}`);
      const partsData = partsResponse.ok ? await partsResponse.json() : { data: [] };

      const tree: TreeNode[] = [{
        id: `machine-${machine.id}`,
        name: machine.asset_name || machine.name,
        type: 'machine',
        meshId: `machine-${machine.id}`,
        children: assembliesData.data?.map((assembly: any) => ({
          id: `assembly-${assembly.id}`,
          name: assembly.assembly_name,
          type: 'assembly' as const,
          meshId: `assembly-${assembly.id}`,
          children: partsData.data?.filter((part: any) => part.component_id === assembly.id)
            .map((part: any) => ({
              id: `part-${part.id}`,
              name: part.part_name,
              type: 'part' as const,
              meshId: `part-${part.id}`
            })) || []
        })) || []
      }];

      setTreeData(tree);
      setExpandedNodes(new Set([`machine-${machine.id}`]));
    } catch (error) {
      console.error('Error loading tree data:', error);
    }
  };

  const expandToNode = (meshId: string) => {
    const findNodePath = (nodes: TreeNode[], targetMeshId: string, path: string[] = []): string[] | null => {
      for (const node of nodes) {
        const currentPath = [...path, node.id];
        if (node.meshId === targetMeshId) {
          return currentPath;
        }
        if (node.children) {
          const result = findNodePath(node.children, targetMeshId, currentPath);
          if (result) return result;
        }
      }
      return null;
    };

    const path = findNodePath(treeData, meshId);
    if (path) {
      setExpandedNodes(prev => new Set([...prev, ...path]));
    }
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderNode = (node: TreeNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = node.meshId === selectedMeshId;
    const isHighlighted = node.meshId === highlightedMeshId;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100 text-blue-800' : ''
          } ${isHighlighted ? 'bg-yellow-100' : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => node.meshId && onNodeClick(node.meshId)}
          onMouseEnter={() => node.meshId && onNodeHover(node.meshId)}
          onMouseLeave={() => onNodeHover(null)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="mr-1 p-0.5 hover:bg-gray-200 rounded"
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
          )}
          <span className="text-sm font-medium">{node.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-white border-r border-gray-200">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Asset Tree</h3>
      </div>
      <div className="p-2">
        {treeData.map(node => renderNode(node))}
      </div>
    </div>
  );
}
