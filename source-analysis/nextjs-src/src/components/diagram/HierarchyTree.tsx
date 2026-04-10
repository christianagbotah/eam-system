'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Cpu, Settings, Wrench } from 'lucide-react';

interface HierarchyTreeProps {
  hierarchy: any;
  selectedNode: any;
  onNodeSelect: (node: any) => void;
  onNodeHover?: (node: any, hovered: boolean) => void;
}

interface TreeNodeProps {
  node: any;
  level: number;
  selectedNode: any;
  onNodeSelect: (node: any) => void;
  onNodeHover?: (node: any, hovered: boolean) => void;
}

function TreeNode({ node, level, selectedNode, onNodeSelect, onNodeHover }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'machine': return <Cpu size={16} />;
      case 'assembly': return <Settings size={16} />;
      case 'part': return <Wrench size={16} />;
      default: return null;
    }
  };

  const isSelected = selectedNode?.node_id === node.id && selectedNode?.node_type === node.type;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 ${
          isSelected ? 'bg-blue-100 border-r-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onNodeSelect({ ...node, node_id: node.id, node_type: node.type, label: node.name })}
        onMouseEnter={() => onNodeHover?.({ ...node, node_id: node.id, node_type: node.type, label: node.name }, true)}
        onMouseLeave={() => onNodeHover?.({ ...node, node_id: node.id, node_type: node.type, label: node.name }, false)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        
        <div className="text-gray-600">{getIcon(node.type)}</div>
        <span className="text-sm font-medium">{node.name}</span>
        {node.code && <span className="text-xs text-gray-500">({node.code})</span>}
      </div>
      
      {hasChildren && expanded && (
        <div>
          {node.children.map((child: any) => (
            <TreeNode
              key={`${child.type}-${child.id}`}
              node={child}
              level={level + 1}
              selectedNode={selectedNode}
              onNodeSelect={onNodeSelect}
              onNodeHover={onNodeHover}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchyTree({ hierarchy, selectedNode, onNodeSelect, onNodeHover }: HierarchyTreeProps) {
  if (!hierarchy) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No hierarchy data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      <TreeNode
        node={hierarchy}
        level={0}
        selectedNode={selectedNode}
        onNodeSelect={onNodeSelect}
        onNodeHover={onNodeHover}
      />
    </div>
  );
}
