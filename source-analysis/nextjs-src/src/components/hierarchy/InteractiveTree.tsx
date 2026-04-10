'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface AssetNode {
  id: number;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  status: string;
  criticality: string;
  parent_id: number | null;
  children?: AssetNode[];
}

interface InteractiveTreeProps {
  data: AssetNode[];
  initialSearch?: string;
}

export default function InteractiveTree({ data, initialSearch = '' }: InteractiveTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  
  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const width = 1200;
    const height = 800;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Filter data based on search
    const filteredData = searchTerm
      ? data.filter(d => 
          d.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.asset_code.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : data;

    // Build hierarchy - filter to get only one root
    const rootNodes = data.filter(d => !d.parent_id);
    if (rootNodes.length === 0) {
      console.error('No root nodes found');
      return;
    }
    
    // Use first root or create virtual root if multiple
    let hierarchyData = data;
    if (rootNodes.length > 1) {
      const virtualRoot = {
        id: 0,
        asset_code: 'ROOT',
        asset_name: 'All Assets',
        asset_type: 'root',
        status: 'active',
        criticality: 'low',
        parent_id: null
      };
      hierarchyData = [virtualRoot, ...data.map(d => ({
        ...d,
        parent_id: d.parent_id || 0
      }))];
    }
    
    const root = d3.stratify<AssetNode>()
      .id(d => d.id.toString())
      .parentId(d => d.parent_id?.toString() || null)(hierarchyData);

    const treeLayout = d3.tree<AssetNode>().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    treeLayout(root);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Links
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x))
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2);

    // Nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // Color by status
    const statusColor = (status: string) => {
      switch (status) {
        case 'active': return '#10b981';
        case 'inactive': return '#6b7280';
        case 'maintenance': return '#f59e0b';
        case 'down': return '#ef4444';
        default: return '#3b82f6';
      }
    };

    const isMatch = (d: any) => {
      if (!searchTerm) return false;
      const term = searchTerm.toLowerCase();
      return d.data.asset_name.toLowerCase().includes(term) ||
             d.data.asset_code.toLowerCase().includes(term);
    };

    node.append('circle')
      .attr('r', d => isMatch(d) ? 12 : 8)
      .attr('fill', d => statusColor(d.data.status))
      .attr('stroke', d => isMatch(d) ? '#fbbf24' : (d.data.criticality === 'critical' ? '#dc2626' : '#fff'))
      .attr('stroke-width', d => isMatch(d) ? 4 : (d.data.criticality === 'critical' ? 3 : 2))
      .style('cursor', 'pointer');

    node.append('text')
      .attr('dy', '.35em')
      .attr('x', d => d.children ? -12 : 12)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.asset_name)
      .style('font-size', d => isMatch(d) ? '14px' : '12px')
      .style('font-weight', d => isMatch(d) ? 'bold' : 'normal')
      .style('fill', d => isMatch(d) ? '#f59e0b' : '#1f2937');

    // Tooltips
    node.append('title')
      .text(d => `${d.data.asset_code}\n${d.data.asset_type}\nStatus: ${d.data.status}\nCriticality: ${d.data.criticality}`);

  }, [data, searchTerm]);

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg p-4">
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <div className="flex gap-2 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span> Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span> Maintenance
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span> Down
          </span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full" style={{ minHeight: '600px' }}></svg>
    </div>
  );
}
