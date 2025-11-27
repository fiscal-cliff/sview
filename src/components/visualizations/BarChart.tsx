/**
 * Bar Chart Visualization Component
 * D3-powered horizontal/vertical bar chart for comparing categories
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DataPoint, VisualizationConfig } from '../../types';

interface BarChartProps {
  data: DataPoint[];
  config?: Partial<VisualizationConfig>;
  horizontal?: boolean;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'bar',
  title: 'Bar Chart',
  width: 600,
  height: 400,
  margin: { top: 30, right: 30, bottom: 70, left: 60 },
  colorScheme: d3.schemeTableau10 as string[],
};

export function BarChart({ data, config = {}, horizontal = false }: BarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

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

    // Sort data by value descending
    const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 20);

    // Color scale
    const color = d3.scaleOrdinal<string>()
      .domain(sortedData.map((d) => d.label))
      .range(mergedConfig.colorScheme || d3.schemeTableau10);

    if (horizontal) {
      // Horizontal bar chart
      const x = d3.scaleLinear()
        .domain([0, d3.max(sortedData, (d) => d.value) || 0])
        .nice()
        .range([0, innerWidth]);

      const y = d3.scaleBand()
        .domain(sortedData.map((d) => d.label))
        .range([0, innerHeight])
        .padding(0.2);

      // X axis
      svg.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');

      // Y axis
      svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '11px')
        .attr('transform', 'translate(-5,0)')
        .style('text-anchor', 'end')
        .text((d) => {
          const text = d as string;
          return text.length > 15 ? text.slice(0, 15) + '...' : text;
        });

      // Bars
      svg.selectAll('.bar')
        .data(sortedData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', (d) => y(d.label) || 0)
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', 0)
        .attr('fill', (d) => color(d.label))
        .transition()
        .duration(800)
        .attr('width', (d) => x(d.value));

      // Value labels
      svg.selectAll('.label')
        .data(sortedData)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('y', (d) => (y(d.label) || 0) + y.bandwidth() / 2)
        .attr('x', (d) => x(d.value) + 5)
        .attr('dy', '0.35em')
        .style('font-size', '10px')
        .style('fill', '#666')
        .text((d) => d3.format(',.0f')(d.value));
    } else {
      // Vertical bar chart
      const x = d3.scaleBand()
        .domain(sortedData.map((d) => d.label))
        .range([0, innerWidth])
        .padding(0.2);

      const y = d3.scaleLinear()
        .domain([0, d3.max(sortedData, (d) => d.value) || 0])
        .nice()
        .range([innerHeight, 0]);

      // X axis
      svg.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '10px')
        .text((d) => {
          const text = d as string;
          return text.length > 10 ? text.slice(0, 10) + '...' : text;
        });

      // Y axis
      svg.append('g')
        .call(d3.axisLeft(y).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');

      // Bars
      svg.selectAll('.bar')
        .data(sortedData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => x(d.label) || 0)
        .attr('width', x.bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0)
        .attr('fill', (d) => color(d.label))
        .transition()
        .duration(800)
        .attr('y', (d) => y(d.value))
        .attr('height', (d) => innerHeight - y(d.value));
    }

    // Title
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(mergedConfig.title);

  }, [data, mergedConfig, horizontal]);

  return (
    <div className="visualization bar-chart">
      <svg ref={svgRef} />
    </div>
  );
}

export default BarChart;
