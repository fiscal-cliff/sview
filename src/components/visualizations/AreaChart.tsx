/**
 * Area Chart Visualization Component
 * D3-powered stacked area chart for cumulative trends
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DataPoint, VisualizationConfig } from '../../types';

interface AreaChartProps {
  data: DataPoint[];
  series?: Map<string, DataPoint[]>;
  config?: Partial<VisualizationConfig>;
  stacked?: boolean;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'area',
  title: 'Area Chart',
  width: 700,
  height: 400,
  margin: { top: 30, right: 120, bottom: 50, left: 60 },
  colorScheme: d3.schemeTableau10 as string[],
};

export function AreaChart({ data, series, config = {}, stacked = false }: AreaChartProps) {
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

    let allDates: (string | Date)[] = [];
    let seriesData: [string, DataPoint[]][] = [];

    if (series && series.size > 0) {
      seriesData = Array.from(series.entries()).slice(0, 6);
      allDates = [...new Set(seriesData.flatMap(([, points]) => 
        points.map(p => p.date as string)
      ))].sort();
    } else {
      seriesData = [['Value', data]];
      allDates = data.map(d => d.date as string).sort();
    }

    // Parse date
    const parseDate = (d: string | Date | undefined) => {
      if (!d) return new Date();
      if (d instanceof Date) return d;
      if (/^\d{4}$/.test(d)) return new Date(parseInt(d), 0, 1);
      return new Date(d);
    };

    // X scale
    const xExtent = d3.extent(allDates, d => parseDate(d));
    const x = d3.scaleTime()
      .domain(xExtent[0] && xExtent[1] ? xExtent : [new Date(), new Date()])
      .range([0, innerWidth]);

    // Color scale
    const color = d3.scaleOrdinal<string>()
      .domain(seriesData.map(([name]) => name))
      .range(mergedConfig.colorScheme || d3.schemeTableau10);

    if (stacked && series && series.size > 1) {
      // Stacked area chart
      // Create matrix data
      const stackData = allDates.map(date => {
        const row: Record<string, number | Date> = { date: parseDate(date) };
        seriesData.forEach(([name, points]) => {
          const point = points.find(p => p.date === date);
          row[name] = point?.value || 0;
        });
        return row;
      });

      const keys = seriesData.map(([name]) => name);
      const stack = d3.stack<Record<string, number | Date>>()
        .keys(keys)
        .value((d, key) => (d[key] as number) || 0);

      const stackedData = stack(stackData);

      // Y scale for stacked
      const yMax = d3.max(stackedData[stackedData.length - 1], d => d[1]) || 0;
      const y = d3.scaleLinear()
        .domain([0, yMax])
        .nice()
        .range([innerHeight, 0]);

      // Area generator
      const area = d3.area<d3.SeriesPoint<Record<string, number | Date>>>()
        .x(d => x(d.data.date as Date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveMonotoneX);

      // Draw stacked areas
      svg.selectAll('.layer')
        .data(stackedData)
        .enter()
        .append('path')
        .attr('class', 'layer')
        .attr('fill', d => color(d.key))
        .attr('opacity', 0.8)
        .attr('d', area);

      // Y axis
      svg.append('g')
        .call(d3.axisLeft(y).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');
    } else {
      // Non-stacked (overlapping) areas
      const allPoints = seriesData.flatMap(([, points]) => points);
      const yMax = d3.max(allPoints, d => d.value) || 0;
      
      const y = d3.scaleLinear()
        .domain([0, yMax])
        .nice()
        .range([innerHeight, 0]);

      // Area generator
      const area = d3.area<DataPoint>()
        .defined(d => d.value !== null && !isNaN(d.value))
        .x(d => x(parseDate(d.date)))
        .y0(innerHeight)
        .y1(d => y(d.value))
        .curve(d3.curveMonotoneX);

      // Line generator
      const line = d3.line<DataPoint>()
        .defined(d => d.value !== null && !isNaN(d.value))
        .x(d => x(parseDate(d.date)))
        .y(d => y(d.value))
        .curve(d3.curveMonotoneX);

      // Draw areas for each series
      seriesData.forEach(([name, points]) => {
        const sortedPoints = [...points].sort((a, b) =>
          parseDate(a.date).getTime() - parseDate(b.date).getTime()
        );

        // Gradient
        const gradientId = `gradient-${name.replace(/\s+/g, '-')}`;
        const gradient = svg.append('defs')
          .append('linearGradient')
          .attr('id', gradientId)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '0%')
          .attr('y2', '100%');

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', color(name))
          .attr('stop-opacity', 0.6);

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', color(name))
          .attr('stop-opacity', 0.1);

        // Draw area
        svg.append('path')
          .datum(sortedPoints)
          .attr('fill', `url(#${gradientId})`)
          .attr('d', area);

        // Draw line on top
        svg.append('path')
          .datum(sortedPoints)
          .attr('fill', 'none')
          .attr('stroke', color(name))
          .attr('stroke-width', 2)
          .attr('d', line);
      });

      // Y axis
      svg.append('g')
        .call(d3.axisLeft(y).ticks(5))
        .selectAll('text')
        .style('font-size', '11px');
    }

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6))
      .selectAll('text')
      .style('font-size', '11px');

    // Legend
    if (seriesData.length > 1) {
      const legend = svg.append('g')
        .attr('transform', `translate(${innerWidth + 10}, 0)`);

      seriesData.forEach(([name], i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', color(name))
          .attr('opacity', 0.8);

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

  }, [data, series, mergedConfig, stacked]);

  return (
    <div className="visualization area-chart">
      <svg ref={svgRef} />
    </div>
  );
}

export default AreaChart;
