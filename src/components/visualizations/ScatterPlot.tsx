/**
 * Scatter Plot Visualization Component
 * D3-powered scatter plot for showing relationships between variables
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DataPoint, VisualizationConfig } from '../../types';

interface ScatterPlotProps {
  data: DataPoint[];
  config?: Partial<VisualizationConfig>;
  xLabel?: string;
  yLabel?: string;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'scatter',
  title: 'Scatter Plot',
  width: 600,
  height: 450,
  margin: { top: 40, right: 30, bottom: 60, left: 70 },
  colorScheme: d3.schemeTableau10 as string[],
};

export function ScatterPlot({
  data,
  config = {},
  xLabel = 'X Value',
  yLabel = 'Y Value',
}: ScatterPlotProps) {
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

    // Filter data with valid x and y
    const validData = data.filter(
      (d) => d.x !== undefined && d.y !== undefined && !isNaN(d.x) && !isNaN(d.y)
    );

    if (validData.length === 0) return;

    // Scales
    const xExtent = d3.extent(validData, (d) => d.x as number);
    const yExtent = d3.extent(validData, (d) => d.y as number);

    const x = d3.scaleLinear()
      .domain([
        (xExtent[0] || 0) * 0.9,
        (xExtent[1] || 0) * 1.1,
      ])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([
        (yExtent[0] || 0) * 0.9,
        (yExtent[1] || 0) * 1.1,
      ])
      .range([innerHeight, 0]);

    // Color by category
    const categories = [...new Set(validData.map((d) => d.category || 'default'))];
    const color = d3.scaleOrdinal<string>()
      .domain(categories)
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
      .call(d3.axisBottom(x).ticks(5))
      .selectAll('text')
      .style('font-size', '11px');

    // X axis label
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 45)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(xLabel);

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .style('font-size', '11px');

    // Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(yLabel);

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'scatter-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Draw points
    svg.selectAll('.dot')
      .data(validData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => x(d.x as number))
      .attr('cy', (d) => y(d.y as number))
      .attr('r', 0)
      .attr('fill', (d) => color(d.category || 'default'))
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)
      .style('opacity', 0.8)
      .on('mouseover', function(_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 10)
          .style('opacity', 1);

        tooltip
          .style('visibility', 'visible')
          .html(`
            <strong>${d.label}</strong><br/>
            ${xLabel}: ${d3.format(',.2f')(d.x as number)}<br/>
            ${yLabel}: ${d3.format(',.2f')(d.y as number)}
          `);
      })
      .on('mousemove', function(event: MouseEvent) {
        tooltip
          .style('top', `${event.pageY - 10}px`)
          .style('left', `${event.pageX + 10}px`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 7)
          .style('opacity', 0.8);

        tooltip.style('visibility', 'hidden');
      })
      .transition()
      .duration(800)
      .delay((_, i) => i * 30)
      .attr('r', 7);

    // Add trend line (linear regression)
    const xValues = validData.map((d) => d.x as number);
    const yValues = validData.map((d) => d.y as number);
    const regression = linearRegression(xValues, yValues);

    if (regression.r2 > 0.1) {
      const lineData = [
        { x: xExtent[0] || 0, y: regression.predict(xExtent[0] || 0) },
        { x: xExtent[1] || 0, y: regression.predict(xExtent[1] || 0) },
      ];

      svg.append('line')
        .attr('class', 'trend-line')
        .attr('x1', x(lineData[0].x))
        .attr('y1', y(lineData[0].y))
        .attr('x2', x(lineData[0].x))
        .attr('y2', y(lineData[0].y))
        .attr('stroke', '#666')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5')
        .style('opacity', 0.6)
        .transition()
        .delay(1000)
        .duration(500)
        .attr('x2', x(lineData[1].x))
        .attr('y2', y(lineData[1].y));

      // R² label
      svg.append('text')
        .attr('x', innerWidth - 10)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .style('font-size', '11px')
        .style('fill', '#666')
        .text(`R² = ${regression.r2.toFixed(3)}`);
    }

    // Title
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(mergedConfig.title);

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };

  }, [data, mergedConfig, xLabel, yLabel]);

  return (
    <div className="visualization scatter-plot">
      <svg ref={svgRef} />
    </div>
  );
}

/** Simple linear regression */
function linearRegression(xVals: number[], yVals: number[]) {
  const n = xVals.length;
  const sumX = xVals.reduce((a, b) => a + b, 0);
  const sumY = yVals.reduce((a, b) => a + b, 0);
  const sumXY = xVals.reduce((total, x, i) => total + x * yVals[i], 0);
  const sumX2 = xVals.reduce((total, x) => total + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  const ssTotal = yVals.reduce((total, y) => total + Math.pow(y - yMean, 2), 0);
  const ssRes = yVals.reduce((total, y, i) => {
    const predicted = slope * xVals[i] + intercept;
    return total + Math.pow(y - predicted, 2);
  }, 0);
  const r2 = 1 - ssRes / ssTotal;

  return {
    slope,
    intercept,
    r2: isNaN(r2) ? 0 : r2,
    predict: (x: number) => slope * x + intercept,
  };
}

export default ScatterPlot;
