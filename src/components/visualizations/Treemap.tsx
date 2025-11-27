/**
 * Treemap Visualization Component
 * D3-powered treemap for hierarchical data with nested rectangles
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { HierarchicalData, VisualizationConfig } from '../../types';

interface TreemapProps {
  data: HierarchicalData;
  config?: Partial<VisualizationConfig>;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'treemap',
  title: 'Treemap',
  width: 700,
  height: 500,
  margin: { top: 40, right: 10, bottom: 10, left: 10 },
  colorScheme: d3.schemeTableau10 as string[],
};

export function Treemap({ data, config = {} }: TreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const { width, height, margin } = mergedConfig;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    const treemap = d3.treemap<HierarchicalData>()
      .size([innerWidth, innerHeight])
      .padding(2)
      .paddingTop(20)
      .round(true);

    treemap(root);

    // Now root and its descendants have rectangular properties (x0, y0, x1, y1)
    type TreemapNode = d3.HierarchyRectangularNode<HierarchicalData>;

    // Color scale based on parent categories
    const categories = root.children?.map(d => d.data.name) || [];
    const color = d3.scaleOrdinal<string>()
      .domain(categories)
      .range(mergedConfig.colorScheme || d3.schemeTableau10);

    // Get color for a node (based on parent)
    const getNodeColor = (d: TreemapNode) => {
      if (d.depth === 1) return color(d.data.name);
      if (d.parent) return d3.color(color(d.parent.data.name))?.brighter(0.5)?.toString() || '#ccc';
      return '#ccc';
    };

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'treemap-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Draw cells - cast leaves to rectangular nodes
    const leaves = root.leaves() as TreemapNode[];
    
    const cell = g.selectAll<SVGGElement, TreemapNode>('g')
      .data(leaves)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Rectangles
    cell.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .style('opacity', 0.9)
      .on('mouseover', function(_event, d) {
        d3.select(this)
          .style('opacity', 1)
          .attr('stroke-width', 2);

        const parent = d.parent?.data.name || '';
        tooltip
          .style('visibility', 'visible')
          .html(`
            <strong>${d.data.name}</strong><br/>
            ${parent ? `Category: ${parent}<br/>` : ''}
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
          .attr('stroke-width', 1);
        tooltip.style('visibility', 'hidden');
      });

    // Labels (only for cells large enough)
    cell.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .style('font-size', '10px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        if (width < 40 || height < 20) return '';
        const name = d.data.name;
        const maxChars = Math.floor(width / 6);
        return name.length > maxChars ? name.slice(0, maxChars - 2) + '..' : name;
      });

    // Draw parent group labels
    const parents = root.children || [];
    parents.forEach(parent => {
      const node = parent as d3.HierarchyRectangularNode<HierarchicalData>;
      if (node.x0 !== undefined && node.y0 !== undefined) {
        g.append('rect')
          .attr('x', node.x0)
          .attr('y', node.y0)
          .attr('width', node.x1 - node.x0)
          .attr('height', 18)
          .attr('fill', color(node.data.name))
          .attr('opacity', 0.8);

        g.append('text')
          .attr('x', node.x0 + 4)
          .attr('y', node.y0 + 13)
          .style('font-size', '11px')
          .style('fill', 'white')
          .style('font-weight', 'bold')
          .text(node.data.name);
      }
    });

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
    <div className="visualization treemap">
      <svg ref={svgRef} />
    </div>
  );
}

export default Treemap;
