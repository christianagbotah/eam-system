'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Asset {
  id: number;
  asset_name: string;
  asset_type: string;
  status: string;
  children?: Asset[];
}

export default function AssetHierarchyTree({ rootId, onNodeClick }: { rootId?: number; onNodeClick?: (asset: Asset) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<Asset[]>([]);

  useEffect(() => {
    fetch(rootId ? `/api/v1/eam/assets/hierarchy/tree/${rootId}` : '/api/v1/eam/assets/hierarchy/tree')
      .then(res => res.json())
      .then(json => setData(json.data || []));
  }, [rootId]);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', 'translate(120,20)');
    const tree = d3.tree<Asset>().size([560, 660]);
    const root = d3.hierarchy(data[0] || { id: 0, asset_name: 'Root', asset_type: 'root', status: 'active' });
    const treeData = tree(root);

    g.selectAll('.link').data(treeData.links()).enter().append('path')
      .attr('fill', 'none').attr('stroke', '#ccc').attr('stroke-width', 2)
      .attr('d', d3.linkHorizontal<any, any>().x(d => d.y).y(d => d.x));

    const node = g.selectAll('.node').data(treeData.descendants()).enter().append('g')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => onNodeClick?.(d.data));

    node.append('circle').attr('r', 6)
      .attr('fill', d => d.data.status === 'active' ? '#10b981' : '#ef4444');

    node.append('text').attr('dy', '.35em').attr('x', d => d.children ? -10 : 10)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.asset_name).style('font-size', '12px');
  }, [data, onNodeClick]);

  return (
    <div className="w-full bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Asset Hierarchy</h3>
      <svg ref={svgRef} width="100%" height="600" />
    </div>
  );
}
