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

// GeoJSON URLs for world map - using public CDN with fallback
// Primary: jsDelivr CDN (reliable, high availability)
// Fallback: Local bundled simplified data
const GEOJSON_URLS = [
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
  '/data/world-simplified.json', // Local fallback
];

// Simplified world data for fallback (major countries only)
const FALLBACK_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'United States' }, geometry: { type: 'Polygon', coordinates: [[[-125, 50], [-125, 25], [-70, 25], [-70, 50], [-125, 50]]] } },
    { type: 'Feature', properties: { name: 'China' }, geometry: { type: 'Polygon', coordinates: [[[75, 55], [75, 20], [135, 20], [135, 55], [75, 55]]] } },
    { type: 'Feature', properties: { name: 'Japan' }, geometry: { type: 'Polygon', coordinates: [[[130, 45], [130, 30], [145, 30], [145, 45], [130, 45]]] } },
    { type: 'Feature', properties: { name: 'Germany' }, geometry: { type: 'Polygon', coordinates: [[[6, 55], [6, 47], [15, 47], [15, 55], [6, 55]]] } },
    { type: 'Feature', properties: { name: 'United Kingdom' }, geometry: { type: 'Polygon', coordinates: [[[-8, 60], [-8, 50], [2, 50], [2, 60], [-8, 60]]] } },
    { type: 'Feature', properties: { name: 'India' }, geometry: { type: 'Polygon', coordinates: [[[68, 35], [68, 8], [97, 8], [97, 35], [68, 35]]] } },
    { type: 'Feature', properties: { name: 'France' }, geometry: { type: 'Polygon', coordinates: [[[-5, 51], [-5, 42], [8, 42], [8, 51], [-5, 51]]] } },
    { type: 'Feature', properties: { name: 'Brazil' }, geometry: { type: 'Polygon', coordinates: [[[-74, 5], [-74, -34], [-35, -34], [-35, 5], [-74, 5]]] } },
    { type: 'Feature', properties: { name: 'Canada' }, geometry: { type: 'Polygon', coordinates: [[[-141, 70], [-141, 42], [-52, 42], [-52, 70], [-141, 70]]] } },
    { type: 'Feature', properties: { name: 'Russia' }, geometry: { type: 'Polygon', coordinates: [[[27, 72], [27, 42], [180, 42], [180, 72], [27, 72]]] } },
  ],
};

export function Choropleth({ data, config = {} }: ChoroplethProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Fetch GeoJSON data with fallbacks
  useEffect(() => {
    const fetchGeoData = async () => {
      // Try each URL in order
      for (const url of GEOJSON_URLS) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const geo = await response.json();
          // Handle TopoJSON format from world-atlas
          if (geo.type === 'Topology' && geo.objects) {
            const topoFeature = geo.objects.countries || geo.objects.world;
            if (topoFeature) {
              // Convert TopoJSON to GeoJSON (simplified)
              const features = topoFeature.geometries.map((g: { type: string; arcs: number[][]; properties?: Record<string, unknown> }, i: number) => ({
                type: 'Feature',
                properties: g.properties || { name: `Country ${i}` },
                geometry: g,
              }));
              setGeoData({ type: 'FeatureCollection', features });
              setLoading(false);
              return;
            }
          }
          setGeoData(geo);
          setLoading(false);
          return;
        } catch {
          // Try next URL
          continue;
        }
      }
      // If all URLs fail, use fallback data
      console.warn('Using fallback geo data');
      setGeoData(FALLBACK_GEOJSON);
      setLoading(false);
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
      .fitSize([innerWidth, innerHeight], geoData as d3.ExtendedFeatureCollection);

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
    const features = geoData.features;
    
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

  return (
    <div className="visualization choropleth">
      <svg ref={svgRef} />
    </div>
  );
}

export default Choropleth;
