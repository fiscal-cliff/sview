/**
 * Pie Chart Visualization Component
 * D3-powered pie/donut chart for showing parts of a whole
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DataPoint, VisualizationConfig } from '../../types';

interface PieChartProps {
  data: DataPoint[];
  config?: Partial<VisualizationConfig>;
  donut?: boolean;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'pie',
  title: 'Pie Chart',
  width: 500,
  height: 400,
  margin: { top: 40, right: 150, bottom: 40, left: 40 },
  colorScheme: d3.schemeTableau10 as string[],
};

export function PieChart({ data, config = {}, donut = false }: PieChartProps) {
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
      .attr('height', height);

    // Sort and limit data
    const sortedData = [...data]
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // If there are more items, add "Others"
    if (data.length > 10) {
      const othersValue = data
        .filter((d) => d.value > 0)
        .slice(10)
        .reduce((sum, d) => sum + d.value, 0);
      if (othersValue > 0) {
        sortedData.push({ label: 'Others', value: othersValue });
      }
    }

    const total = sortedData.reduce((sum, d) => sum + d.value, 0);

    // Dimensions
    const radius = Math.min(innerWidth, innerHeight) / 2;
    const innerRadius = donut ? radius * 0.5 : 0;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left + innerWidth / 2},${margin.top + innerHeight / 2})`);

    // Color scale
    const color = d3.scaleOrdinal<string>()
      .domain(sortedData.map((d) => d.label))
      .range(mergedConfig.colorScheme || d3.schemeTableau10);

    // Pie generator
    const pie = d3.pie<DataPoint>()
      .value((d) => d.value)
      .sort(null);

    // Arc generator
    const arc = d3.arc<d3.PieArcDatum<DataPoint>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    // Arc for labels
    const labelArc = d3.arc<d3.PieArcDatum<DataPoint>>()
      .innerRadius(radius * 0.7)
      .outerRadius(radius * 0.7);

    // Arc for hover effect
    const hoverArc = d3.arc<d3.PieArcDatum<DataPoint>>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 10);

    // Create arcs
    const arcs = g.selectAll('.arc')
      .data(pie(sortedData))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // Draw slices with animation
    arcs.append('path')
      .attr('fill', (d) => color(d.data.label))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .each(function(d) {
        const arcPath = d3.select(this);
        const startAngle = d.startAngle;
        const endAngle = d.endAngle;
        
        // Store interpolator for animation
        arcPath
          .transition()
          .duration(800)
          .attrTween('d', function() {
            const interpolate = d3.interpolate(
              { startAngle, endAngle: startAngle },
              { startAngle, endAngle }
            );
            return function(t) {
              return arc(interpolate(t) as d3.PieArcDatum<DataPoint>) || '';
            };
          });
      })
      .on('mouseover', function(_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc(d) || '');
      })
      .on('mouseout', function(_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc(d) || '');
      });

    // Add percentage labels (only for slices > 5%)
    arcs.append('text')
      .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .style('opacity', 0)
      .text((d) => {
        const percent = (d.data.value / total) * 100;
        return percent >= 5 ? `${percent.toFixed(1)}%` : '';
      })
      .transition()
      .delay(800)
      .duration(300)
      .style('opacity', 1);

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`);

    sortedData.forEach((d, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 22})`);

      legendRow.append('rect')
        .attr('width', 14)
        .attr('height', 14)
        .attr('rx', 2)
        .attr('fill', color(d.label));

      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 11)
        .style('font-size', '11px')
        .text(d.label.length > 15 ? d.label.slice(0, 15) + '...' : d.label);
    });

    // Center text for donut
    if (donut) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.5em')
        .style('font-size', '12px')
        .style('fill', '#666')
        .text('Total');

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(d3.format(',.0f')(total));
    }

    // Title
    svg.append('text')
      .attr('x', margin.left + innerWidth / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(mergedConfig.title);

  }, [data, mergedConfig, donut]);

  return (
    <div className="visualization pie-chart">
      <svg ref={svgRef} />
    </div>
  );
}

export default PieChart;
