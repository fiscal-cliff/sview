/**
 * Choropleth Map Visualization Component
 * D3-powered geographical map showing data by region
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { DataPoint, VisualizationConfig } from '../../types';

interface ChoroplethProps {
  data: DataPoint[];
  config?: Partial<VisualizationConfig>;
}

const DEFAULT_CONFIG: VisualizationConfig = {
  type: 'choropleth',
  title: 'World Map',
  width: 800,
  height: 500,
  margin: { top: 40, right: 20, bottom: 20, left: 20 },
};

// Country code to name mapping for display
const COUNTRY_MAPPING: Record<string, string> = {
  USA: 'United States of America',
  CHN: 'China',
  JPN: 'Japan',
  DEU: 'Germany',
  GBR: 'United Kingdom',
  FRA: 'France',
  IND: 'India',
  ITA: 'Italy',
  BRA: 'Brazil',
  CAN: 'Canada',
  RUS: 'Russia',
  KOR: 'South Korea',
  AUS: 'Australia',
  ESP: 'Spain',
  MEX: 'Mexico',
  IDN: 'Indonesia',
  NLD: 'Netherlands',
  SAU: 'Saudi Arabia',
  TUR: 'Turkey',
  CHE: 'Switzerland',
};

// GeoJSON URL for world map (Natural Earth simplified)
const WORLD_GEOJSON_URL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

export function Choropleth({ data, config = {} }: ChoroplethProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geoData, setGeoData] = useState<d3.GeoGeometryObjects | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Fetch GeoJSON data
  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        const response = await fetch(WORLD_GEOJSON_URL);
        if (!response.ok) throw new Error('Failed to fetch map data');
        const geo = await response.json();
        setGeoData(geo);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map');
        setLoading(false);
      }
    };

    fetchGeoData();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !geoData || !data.length) return;

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

    // Create value map by country name
    const valueMap = new Map<string, number>();
    data.forEach(d => {
      const countryName = COUNTRY_MAPPING[d.category || ''] || d.label;
      valueMap.set(countryName, d.value);
    });

    // Value extent for color scale
    const values = data.map(d => d.value);
    const valueExtent = d3.extent(values) as [number, number];

    // Color scale
    const color = d3.scaleSequential()
      .domain(valueExtent)
      .interpolator(d3.interpolateBlues);

    // Projection
    const projection = d3.geoNaturalEarth1()
      .fitSize([innerWidth, innerHeight], geoData as d3.GeoGeometryObjects);

    // Path generator
    const path = d3.geoPath().projection(projection);

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'choropleth-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Draw countries
    const features = (geoData as unknown as GeoJSON.FeatureCollection).features;
    
    g.selectAll('path')
      .data(features)
      .enter()
      .append('path')
      .attr('d', d => path(d as d3.GeoPermissibleObjects) || '')
      .attr('fill', d => {
        const name = (d as GeoJSON.Feature).properties?.name;
        const value = valueMap.get(name);
        return value !== undefined ? color(value) : '#f0f0f0';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .on('mouseover', function(_event, d) {
        const feature = d as GeoJSON.Feature;
        const name = feature.properties?.name || 'Unknown';
        const value = valueMap.get(name);

        d3.select(this)
          .attr('stroke', '#333')
          .attr('stroke-width', 2);

        tooltip
          .style('visibility', 'visible')
          .html(`
            <strong>${name}</strong><br/>
            ${value !== undefined ? `Value: ${d3.format(',.2f')(value)}` : 'No data'}
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
          .attr('stroke-width', 0.5);
        tooltip.style('visibility', 'hidden');
      });

    // Color legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legendX = innerWidth - legendWidth - 20;
    const legendY = innerHeight - 30;

    const legendScale = d3.scaleLinear()
      .domain(valueExtent)
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => d3.format('.2s')(d as number));

    // Legend gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'choropleth-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const value = valueExtent[0] + t * (valueExtent[1] - valueExtent[0]);
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', color(value));
    }

    // Legend rect
    g.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#choropleth-gradient)');

    // Legend axis
    g.append('g')
      .attr('transform', `translate(${legendX}, ${legendY + legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '9px');

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

  }, [data, geoData, mergedConfig]);

  if (loading) {
    return (
      <div className="visualization choropleth loading">
        <p>Loading map data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visualization choropleth error">
        <p>Error loading map: {error}</p>
      </div>
    );
  }

  return (
    <div className="visualization choropleth">
      <svg ref={svgRef} />
    </div>
  );
}

export default Choropleth;
