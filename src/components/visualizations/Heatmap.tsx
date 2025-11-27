/**
 * Heatmap Visualization Component
 * D3-powered heatmap for showing patterns in matrix data
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { HeatmapData, VisualizationConfig } from '../../types';

interface HeatmapProps {
  data: HeatmapData;
  config?: Partial<VisualizationConfig>;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'heatmap',
  title: 'Heatmap',
  width: 700,
  height: 450,
  margin: { top: 60, right: 100, bottom: 30, left: 120 },
};

export function Heatmap({ data, config = {} }: HeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  useEffect(() => {
    if (!svgRef.current || !data.values.length) return;

    const { width, height, margin } = mergedConfig;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const { rows, columns, values } = data;

    // Flatten values for extent calculation
    const flatValues = values.flat().filter(v => v !== null && !isNaN(v));
    const valueExtent = d3.extent(flatValues) as [number, number];

    // Scales
    const x = d3.scaleBand()
      .domain(columns)
      .range([0, innerWidth])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(rows)
      .range([0, innerHeight])
      .padding(0.05);

    // Color scale (blue-white-red)
    const color = d3.scaleSequential()
      .domain(valueExtent)
      .interpolator(d3.interpolateYlOrRd);

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'heatmap-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Draw cells
    rows.forEach((row, i) => {
      columns.forEach((col, j) => {
        const value = values[i][j];
        
        svg.append('rect')
          .attr('x', x(col) || 0)
          .attr('y', y(row) || 0)
          .attr('width', x.bandwidth())
          .attr('height', y.bandwidth())
          .attr('fill', value !== null && !isNaN(value) ? color(value) : '#eee')
          .attr('stroke', 'white')
          .attr('stroke-width', 1)
          .style('opacity', 0)
          .on('mouseover', function() {
            d3.select(this)
              .attr('stroke', '#333')
              .attr('stroke-width', 2);

            tooltip
              .style('visibility', 'visible')
              .html(`
                <strong>${row}</strong><br/>
                ${col}: ${value !== null ? d3.format(',.2f')(value) : 'N/A'}
              `);
          })
          .on('mousemove', function(event: MouseEvent) {
            tooltip
              .style('top', `${event.pageY - 10}px`)
              .style('left', `${event.pageX + 10}px`);
          })
          .on('mouseout', function() {
            d3.select(this)
              .attr('stroke', 'white')
              .attr('stroke-width', 1);
            tooltip.style('visibility', 'hidden');
          })
          .transition()
          .duration(500)
          .delay(i * 50 + j * 30)
          .style('opacity', 1);
      });
    });

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${-5})`)
      .call(d3.axisTop(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'start')
      .style('font-size', '10px');

    // Y axis
    svg.append('g')
      .attr('transform', `translate(-5,0)`)
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('font-size', '10px')
      .text(d => {
        const text = d as string;
        return text.length > 15 ? text.slice(0, 15) + '...' : text;
      });

    // Color legend
    const legendWidth = 20;
    const legendHeight = innerHeight;
    
    const legendScale = d3.scaleLinear()
      .domain(valueExtent)
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .ticks(5)
      .tickFormat(d => d3.format('.2s')(d as number));

    // Legend gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    // Add gradient stops
    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const value = valueExtent[0] + t * (valueExtent[1] - valueExtent[0]);
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', color(value));
    }

    // Legend rect
    svg.append('rect')
      .attr('x', innerWidth + 20)
      .attr('y', 0)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');

    // Legend axis
    svg.append('g')
      .attr('transform', `translate(${innerWidth + 40}, 0)`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '10px');

    // Title
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -40)
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
    <div className="visualization heatmap">
      <svg ref={svgRef} />
    </div>
  );
}

export default Heatmap;
