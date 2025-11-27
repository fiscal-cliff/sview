/**
 * Force-Directed Graph Visualization Component
 * D3-powered network visualization for showing relationships
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { NetworkData, VisualizationConfig } from '../../types';

interface ForceGraphProps {
  data: NetworkData;
  config?: Partial<VisualizationConfig>;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'force',
  title: 'Network Graph',
  width: 700,
  height: 500,
  margin: { top: 40, right: 20, bottom: 20, left: 20 },
  colorScheme: d3.schemeTableau10 as string[],
};

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  group?: number;
  value?: number;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  value?: number;
}

export function ForceGraph({ data, config = {} }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

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

    // Deep copy data to avoid mutating original
    const nodes: SimulationNode[] = data.nodes.map(n => ({ ...n }));
    const links: SimulationLink[] = data.links.map(l => ({
      source: l.source,
      target: l.target,
      value: l.value,
    }));

    // Color scale by group
    const groups = [...new Set(nodes.map(n => n.group ?? 0))];
    const color = d3.scaleOrdinal<number, string>()
      .domain(groups)
      .range(mergedConfig.colorScheme || d3.schemeTableau10);

    // Node size scale
    const nodeValues = nodes.map(n => n.value || 1);
    const sizeScale = d3.scaleSqrt()
      .domain([Math.min(...nodeValues), Math.max(...nodeValues)])
      .range([5, 20]);

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'force-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Force simulation
    const simulation = d3.forceSimulation<SimulationNode>(nodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(links)
        .id(d => d.id)
        .distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force('collision', d3.forceCollide<SimulationNode>().radius(d => sizeScale(d.value || 1) + 5));

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value || 1) * 2);

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', d => sizeScale(d.value || 1))
      .attr('fill', d => color(d.group ?? 0))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('mouseover', function(_event, d) {
        d3.select(this)
          .attr('stroke', '#333')
          .attr('stroke-width', 3);

        // Highlight connected links
        link
          .style('stroke-opacity', l => {
            const source = (l.source as SimulationNode).id;
            const target = (l.target as SimulationNode).id;
            return source === d.id || target === d.id ? 1 : 0.2;
          })
          .style('stroke', l => {
            const source = (l.source as SimulationNode).id;
            const target = (l.target as SimulationNode).id;
            return source === d.id || target === d.id ? '#666' : '#999';
          });

        // Count connections
        const connections = links.filter(l => 
          (l.source as SimulationNode).id === d.id || 
          (l.target as SimulationNode).id === d.id
        ).length;

        tooltip
          .style('visibility', 'visible')
          .html(`
            <strong>${d.name}</strong><br/>
            ${d.value ? `Value: ${d3.format(',.0f')(d.value)}<br/>` : ''}
            Connections: ${connections}
          `);
      })
      .on('mousemove', function(event: MouseEvent) {
        tooltip
          .style('top', `${event.pageY - 10}px`)
          .style('left', `${event.pageX + 10}px`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);

        link
          .style('stroke-opacity', 0.6)
          .style('stroke', '#999');

        tooltip.style('visibility', 'hidden');
      })
      .call(d3.drag<SVGCircleElement, SimulationNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Node labels
    const label = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text(d => d.name.length > 12 ? d.name.slice(0, 12) + '..' : d.name)
      .attr('font-size', '9px')
      .attr('dx', d => sizeScale(d.value || 1) + 3)
      .attr('dy', '0.35em')
      .style('pointer-events', 'none')
      .style('fill', '#333');

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimulationNode).x || 0)
        .attr('y1', d => (d.source as SimulationNode).y || 0)
        .attr('x2', d => (d.target as SimulationNode).x || 0)
        .attr('y2', d => (d.target as SimulationNode).y || 0);

      node
        .attr('cx', d => Math.max(20, Math.min(innerWidth - 20, d.x || 0)))
        .attr('cy', d => Math.max(20, Math.min(innerHeight - 20, d.y || 0)));

      label
        .attr('x', d => Math.max(20, Math.min(innerWidth - 20, d.x || 0)))
        .attr('y', d => Math.max(20, Math.min(innerHeight - 20, d.y || 0)));
    });

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 100}, ${margin.top})`);

    const uniqueGroups = [...new Set(nodes.map(n => n.group ?? 0))];
    const groupNames = ['N. America', 'Europe', 'Asia', 'Oceania', 'S. America', 'Other'];

    uniqueGroups.slice(0, 6).forEach((group, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 18})`);

      legendRow.append('circle')
        .attr('r', 6)
        .attr('fill', color(group));

      legendRow.append('text')
        .attr('x', 12)
        .attr('y', 4)
        .style('font-size', '10px')
        .text(groupNames[group] || `Group ${group}`);
    });

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(mergedConfig.title);

    // Cleanup
    return () => {
      simulation.stop();
      tooltip.remove();
    };

  }, [data, mergedConfig]);

  return (
    <div className="visualization force-graph">
      <svg ref={svgRef} />
    </div>
  );
}

export default ForceGraph;
