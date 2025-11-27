/**
 * Line Chart Visualization Component
 * D3-powered line chart for showing trends over time
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DataPoint, VisualizationConfig } from '../../types';

interface LineChartProps {
  data: DataPoint[];
  series?: Map<string, DataPoint[]>;
  config?: Partial<VisualizationConfig>;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'line',
  title: 'Line Chart',
  width: 700,
  height: 400,
  margin: { top: 30, right: 120, bottom: 50, left: 60 },
  colorScheme: d3.schemeTableau10 as string[],
};

export function LineChart({ data, series, config = {} }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  useEffect(() => {
    if (!svgRef.current) return;
    if (!data.length && !series?.size) return;

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

    let allPoints: DataPoint[] = [];
    let seriesData: [string, DataPoint[]][] = [];

    if (series && series.size > 0) {
      // Multi-line chart
      seriesData = Array.from(series.entries()).slice(0, 8);
      allPoints = seriesData.flatMap(([, points]) => points);
    } else {
      // Single line chart
      seriesData = [['Value', data]];
      allPoints = data;
    }

    // Parse dates if string
    const parseDate = (d: string | Date | undefined) => {
      if (!d) return new Date();
      if (d instanceof Date) return d;
      // Try year-only format first
      if (/^\d{4}$/.test(d)) return new Date(parseInt(d), 0, 1);
      return new Date(d);
    };

    // Scales
    const xExtent = d3.extent(allPoints, (d) => parseDate(d.date));
    const x = d3.scaleTime()
      .domain(xExtent[0] && xExtent[1] ? xExtent : [new Date(), new Date()])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(allPoints, (d) => d.value) || 0])
      .nice()
      .range([innerHeight, 0]);

    const color = d3.scaleOrdinal<string>()
      .domain(seriesData.map(([name]) => name))
      .range(mergedConfig.colorScheme || d3.schemeTableau10);

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-innerHeight).tickFormat(() => ''))
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7);

    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(() => ''))
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7);

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6))
      .selectAll('text')
      .style('font-size', '11px');

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .style('font-size', '11px');

    // Line generator
    const line = d3.line<DataPoint>()
      .defined((d) => d.value !== null && !isNaN(d.value))
      .x((d) => x(parseDate(d.date)))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    // Draw lines for each series
    seriesData.forEach(([name, points], i) => {
      const sortedPoints = [...points].sort((a, b) => 
        parseDate(a.date).getTime() - parseDate(b.date).getTime()
      );

      const path = svg.append('path')
        .datum(sortedPoints)
        .attr('fill', 'none')
        .attr('stroke', color(name))
        .attr('stroke-width', 2)
        .attr('d', line);

      // Animate line drawing
      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1500)
        .attr('stroke-dashoffset', 0);

      // Add dots
      svg.selectAll(`.dot-${i}`)
        .data(sortedPoints)
        .enter()
        .append('circle')
        .attr('class', `dot-${i}`)
        .attr('cx', (d) => x(parseDate(d.date)))
        .attr('cy', (d) => y(d.value))
        .attr('r', 3)
        .attr('fill', color(name))
        .style('opacity', 0)
        .transition()
        .delay(1500)
        .style('opacity', 1);
    });

    // Legend (for multi-series)
    if (seriesData.length > 1) {
      const legend = svg.append('g')
        .attr('transform', `translate(${innerWidth + 10}, 0)`);

      seriesData.forEach(([name], i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', color(name));

        legendRow.append('text')
          .attr('x', 16)
          .attr('y', 10)
          .style('font-size', '10px')
          .text(name.length > 12 ? name.slice(0, 12) + '...' : name);
      });
    }

    // Title
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(mergedConfig.title);

  }, [data, series, mergedConfig]);

  return (
    <div className="visualization line-chart">
      <svg ref={svgRef} />
    </div>
  );
}

export default LineChart;
