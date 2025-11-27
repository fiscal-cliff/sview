/**
 * Sunburst Visualization Component
 * D3-powered sunburst/radial tree for hierarchical data
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { HierarchicalData, VisualizationConfig } from '../../types';

interface SunburstProps {
  data: HierarchicalData;
  config?: Partial<VisualizationConfig>;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'sunburst',
  title: 'Sunburst',
  width: 600,
  height: 600,
  margin: { top: 40, right: 10, bottom: 10, left: 10 },
  colorScheme: d3.schemeTableau10 as string[],
};

export function Sunburst({ data, config = {} }: SunburstProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const { width, height, margin } = mergedConfig;
    const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Create hierarchy and partition layout
    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const partition = d3.partition<HierarchicalData>()
      .size([2 * Math.PI, radius]);

    partition(root);

    // Type alias for partition nodes (rectangular coordinates)
    type PartitionNode = d3.HierarchyRectangularNode<HierarchicalData>;

    // Color scale based on first-level children
    const categories = root.children?.map(d => d.data.name) || [];
    const color = d3.scaleOrdinal<string>()
      .domain(categories)
      .range(mergedConfig.colorScheme || d3.schemeTableau10);

    // Get color for a node
    const getNodeColor = (d: PartitionNode): string => {
      if (d.depth === 0) return '#fff';
      if (d.depth === 1) return color(d.data.name);
      // For deeper nodes, use parent color with different brightness
      let current: PartitionNode = d;
      while (current.depth > 1 && current.parent) {
        current = current.parent as PartitionNode;
      }
      const baseColor = d3.color(color(current.data.name));
      if (baseColor) {
        return baseColor.brighter(d.depth * 0.3).toString();
      }
      return '#ccc';
    };

    // Arc generator
    const arc = d3.arc<PartitionNode>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'sunburst-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Draw arcs
    const nodes = root.descendants().filter(d => d.depth > 0) as PartitionNode[];

    g.selectAll<SVGPathElement, PartitionNode>('path')
      .data(nodes)
      .enter()
      .append('path')
      .attr('d', d => arc(d) || '')
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('opacity', 0.9)
      .on('mouseover', function(_event, d) {
        // Highlight path to root
        d3.select(this)
          .style('opacity', 1)
          .attr('stroke-width', 2);

        // Build breadcrumb
        const ancestors = d.ancestors().reverse();
        const breadcrumb = ancestors.map(a => a.data.name).join(' > ');

        tooltip
          .style('visibility', 'visible')
          .html(`
            <strong>${d.data.name}</strong><br/>
            Path: ${breadcrumb}<br/>
            Value: ${d3.format(',.0f')(d.value || 0)}
          `);
      })
      .on('mousemove', function(event: MouseEvent) {
        tooltip
          .style('top', `${event.pageY - 10}px`)
          .style('left', `${event.pageX + 10}px`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('opacity', 0.9)
          .attr('stroke-width', 0.5);
        tooltip.style('visibility', 'hidden');
      })
      .transition()
      .duration(800)
      .attrTween('d', function(d) {
        const node = d as PartitionNode;
        const interpolate = d3.interpolate(
          { x0: 0, x1: 0, y0: node.y0, y1: node.y1 },
          { x0: node.x0, x1: node.x1, y0: node.y0, y1: node.y1 }
        );
        return (t: number) => arc(interpolate(t) as PartitionNode) || '';
      });

    // Labels for larger segments
    g.selectAll<SVGTextElement, PartitionNode>('text')
      .data(nodes.filter(d => {
        const angle = d.x1 - d.x0;
        const radius_diff = d.y1 - d.y0;
        return angle > 0.1 && radius_diff > 30;
      }))
      .enter()
      .append('text')
      .attr('transform', d => {
        const angle = (d.x0 + d.x1) / 2;
        const radius_mid = (d.y0 + d.y1) / 2;
        const x = Math.sin(angle) * radius_mid;
        const y = -Math.cos(angle) * radius_mid;
        const rotation = (angle * 180 / Math.PI) - 90;
        const flip = angle > Math.PI;
        return `translate(${x},${y}) rotate(${flip ? rotation + 180 : rotation})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '9px')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      .text(d => {
        const name = d.data.name;
        const maxChars = Math.floor((d.x1 - d.x0) * 20);
        return name.length > maxChars ? name.slice(0, maxChars - 2) + '..' : name;
      });

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .style('font-size', '12px')
      .style('fill', '#666')
      .text(data.name);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(d3.format(',.0f')(root.value || 0));

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(mergedConfig.title);

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };

  }, [data, mergedConfig]);

  return (
    <div className="visualization sunburst">
      <svg ref={svgRef} />
    </div>
  );
}

export default Sunburst;
