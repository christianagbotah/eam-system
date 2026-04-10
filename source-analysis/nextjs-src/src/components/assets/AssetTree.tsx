'use client';

import { useState } from 'react';

interface AssetNode {
  id: number;
  name: string;
  type: string;
  children?: AssetNode[];
}

interface AssetTreeProps {
  assets: AssetNode[];
  onSelect?: (asset: AssetNode) => void;
}

function TreeNode({ node, level = 0, onSelect }: { node: AssetNode; level?: number; onSelect?: (asset: AssetNode) => void }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          if (onSelect) onSelect(node);
        }}
      >
        {hasChildren && (
          <span className="text-gray-500 text-xs">{expanded ? '▼' : '▶'}</span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span className="text-xl">{node.type === 'facility' ? '🏭' : node.type === 'system' ? '⚙️' : node.type === 'equipment' ? '🔧' : '📦'}</span>
        <span className="font-medium">{node.name}</span>
        <span className="text-xs text-gray-500">({node.type})</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssetTree({ assets, onSelect }: AssetTreeProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold mb-4">Asset Hierarchy</h3>
      <div className="space-y-1">
        {assets.map(asset => (
          <TreeNode key={asset.id} node={asset} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
