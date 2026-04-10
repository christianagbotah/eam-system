'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Asset {
  id: number;
  asset_name: string;
  status: string;
  criticality: string;
}

export default function AssetHealthMatrix() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<Asset[]>([]);

  useEffect(() => {
    fetch('/api/v1/eam/assets/visualization/health-matrix')
      .then(res => res.json())
      .then(json => setData(json.data || []));
  }, []);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().domain(['low', 'medium', 'high']).range([0, width]);
    const y = d3.scalePoint().domain(['active', 'inactive', 'out_of_service']).range([height, 0]);

    g.selectAll('circle').data(data).enter().append('circle')
      .attr('cx', d => x(d.criticality) || 0)
      .attr('cy', d => y(d.status) || 0)
      .attr('r', 8)
      .attr('fill', d => d.status === 'active' ? '#10b981' : '#ef4444')
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .append('title').text(d => d.asset_name);

    g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
    g.append('g').call(d3.axisLeft(y));
  }, [data]);

  return (
    <div className="w-full bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Asset Health Matrix</h3>
      <svg ref={svgRef} width="800" height="400" />
    </div>
  );
}
