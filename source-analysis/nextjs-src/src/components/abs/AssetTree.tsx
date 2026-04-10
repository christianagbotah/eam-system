'use client';

import { useState } from 'react';

interface TreeNode {
  id: number;
  node_name: string;
  node_type: string;
  node_code: string;
  children?: TreeNode[];
}

interface AssetTreeProps {
  nodes: TreeNode[];
  onNodeClick: (node: TreeNode) => void;
  onNodeContextMenu: (node: TreeNode, e: React.MouseEvent) => void;
  selectedNodeId?: number;
}

export default function AssetTree({ nodes, onNodeClick, onNodeContextMenu, selectedNodeId }: AssetTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getNodeIcon = (nodeType: string) => {
    const icons: Record<string, string> = {
      machine: '🏭',
      assembly: '📦',
      component: '⚙️',
      sub_component: '🔧',
      part: '🔩',
      sub_part: '⚡',
    };
    return icons[nodeType] || '📄';
  };

  const renderNode = (node: TreeNode, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-2 px-3 hover:bg-gray-100 cursor-pointer rounded-lg transition-colors ${
            isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => onNodeClick(node)}
          onContextMenu={(e) => {
            e.preventDefault();
            onNodeContextMenu(node, e);
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="mr-2 text-gray-500 hover:text-gray-700"
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {!hasChildren && <span className="w-4 mr-2"></span>}
          <span className="mr-2 text-lg">{getNodeIcon(node.node_type)}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{node.node_name}</p>
            <p className="text-xs text-gray-500">{node.node_code}</p>
          </div>
          <span className="text-xs text-gray-400 uppercase">{node.node_type.replace('_', ' ')}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>{node.children!.map((child) => renderNode(child, level + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      {nodes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No asset structure defined</p>
          <p className="text-sm mt-2">Right-click to add nodes</p>
        </div>
      ) : (
        nodes.map((node) => renderNode(node))
      )}
    </div>
  );
}
