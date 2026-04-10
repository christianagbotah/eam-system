'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
}

interface SunburstChartProps {
  data: SunburstNode;
  width?: number;
  height?: number;
}

export default function SunburstChart({ data, width = 600, height = 600 }: SunburstChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const radius = Math.min(width, height) / 2;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const root = d3.hierarchy(data)
      .sum(d => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const partition = d3.partition<SunburstNode>()
      .size([2 * Math.PI, radius]);

    partition(root);

    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    svg.selectAll('path')
      .data(root.descendants())
      .enter()
      .append('path')
      .attr('d', arc)
      .style('fill', d => color(d.data.name))
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 0.8);
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('opacity', 1);
      })
      .append('title')
      .text(d => `${d.data.name}\nValue: ${d.value}`);

  }, [data, width, height]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Asset Distribution</h2>
      <svg ref={svgRef} className="mx-auto"></svg>
    </div>
  );
}
