/**
 * SView - Statistical Visualization Application
 * Main application component with data selection and visualization
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterPlot,
  AreaChart,
  Treemap,
  Heatmap,
  Choropleth,
  Sunburst,
  ForceGraph,
} from './components/visualizations';
import {
  fetchWorldBankData,
  aggregateByCountry,
  aggregateByYear,
  createTimeSeries,
  transformToHierarchical,
  createNetworkData,
  createHeatmapData,
  POPULAR_INDICATORS,
  MAJOR_COUNTRIES,
  DataFrame,
  getRecommendations,
  recommendFromDataFrame,
} from './services';
import type {
  VisualizationType,
  VisualizationRecommendation,
  DataPoint,
  HierarchicalData,
  NetworkData,
  HeatmapData,
  WorldBankDataEntry,
} from './types';
import './App.css';

function App() {
  // Data state
  const [rawData, setRawData] = useState<WorldBankDataEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedIndicator, setSelectedIndicator] = useState(POPULAR_INDICATORS[0].id);
  const [selectedVisualization, setSelectedVisualization] = useState<VisualizationType>('bar');

  // Recommendations state
  const [recommendations, setRecommendations] = useState<VisualizationRecommendation[]>([]);

  // Transformed data for different visualizations
  const [barData, setBarData] = useState<DataPoint[]>([]);
  const [lineData, setLineData] = useState<Map<string, DataPoint[]>>(new Map());
  const [hierarchicalData, setHierarchicalData] = useState<HierarchicalData | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);

  // Fetch data when indicator changes
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorldBankData(selectedIndicator, MAJOR_COUNTRIES);
      setRawData(data);

      // Transform data for different visualizations
      const byCountry = aggregateByCountry(data);
      setBarData(byCountry);

      const timeSeries = createTimeSeries(data);
      setLineData(timeSeries);

      const hierarchical = transformToHierarchical(data);
      setHierarchicalData(hierarchical);

      const network = createNetworkData(data);
      setNetworkData(network);

      const heatmap = createHeatmapData(data);
      setHeatmapData(heatmap);

      // Generate recommendations using DataFrame
      // Convert DataPoint[] to Row[] compatible format
      const dfData = byCountry.map(d => ({
        label: d.label,
        value: d.value,
        category: d.category || '',
      }));
      const df = new DataFrame(dfData);
      const recs = recommendFromDataFrame(df);
      
      // Also get recommendations from data points
      const dataPointRecs = getRecommendations(byCountry);
      
      // Merge and dedupe recommendations
      const allRecs = [...recs];
      dataPointRecs.forEach(rec => {
        if (!allRecs.find(r => r.type === rec.type)) {
          allRecs.push(rec);
        }
      });
      
      setRecommendations(allRecs.sort((a, b) => b.score - a.score));

      // Auto-select best visualization
      if (allRecs.length > 0) {
        setSelectedVisualization(allRecs[0].type);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedIndicator]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get current indicator name
  const currentIndicator = POPULAR_INDICATORS.find(i => i.id === selectedIndicator);

  // Render the selected visualization
  const renderVisualization = () => {
    if (loading) {
      return <div className="loading">Loading data...</div>;
    }

    if (error) {
      return <div className="error">Error: {error}</div>;
    }

    const title = currentIndicator?.name || 'Data Visualization';

    switch (selectedVisualization) {
      case 'bar':
        return <BarChart data={barData} config={{ title }} horizontal />;
      case 'line':
        return <LineChart data={[]} series={lineData} config={{ title }} />;
      case 'pie':
        return <PieChart data={barData.slice(0, 8)} config={{ title }} donut />;
      case 'scatter':
        return (
          <ScatterPlot
            data={barData.map(d => ({ ...d, x: d.value, y: Math.random() * d.value }))}
            config={{ title }}
            xLabel="Value"
            yLabel="Random Y"
          />
        );
      case 'area':
        return <AreaChart data={aggregateByYear(rawData)} config={{ title }} />;
      case 'treemap':
        return hierarchicalData ? <Treemap data={hierarchicalData} config={{ title }} /> : null;
      case 'heatmap':
        return heatmapData ? <Heatmap data={heatmapData} config={{ title }} /> : null;
      case 'choropleth':
        return <Choropleth data={barData} config={{ title }} />;
      case 'sunburst':
        return hierarchicalData ? <Sunburst data={hierarchicalData} config={{ title }} /> : null;
      case 'force':
        return networkData ? <ForceGraph data={networkData} config={{ title }} /> : null;
      default:
        return <BarChart data={barData} config={{ title }} />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>SView - Statistical Visualizations</h1>
        <p>Powered by D3.js and World Bank Open Data</p>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <section className="control-section">
            <h2>Data Selection</h2>
            <label htmlFor="indicator-select">Select Indicator:</label>
            <select
              id="indicator-select"
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value)}
            >
              {POPULAR_INDICATORS.map(indicator => (
                <option key={indicator.id} value={indicator.id}>
                  {indicator.name}
                </option>
              ))}
            </select>
          </section>

          <section className="control-section">
            <h2>Suggested Visualizations</h2>
            <p className="section-description">
              AI-recommended based on data characteristics
            </p>
            <div className="recommendations">
              {recommendations.slice(0, 5).map((rec, index) => (
                <button
                  key={rec.type}
                  className={`recommendation-btn ${selectedVisualization === rec.type ? 'active' : ''} ${index === 0 ? 'top-pick' : ''}`}
                  onClick={() => setSelectedVisualization(rec.type)}
                >
                  <span className="rec-name">{getVisualizationName(rec.type)}</span>
                  <span className="rec-score">{Math.round(rec.score)}%</span>
                  {index === 0 && <span className="rec-badge">Best Match</span>}
                </button>
              ))}
            </div>
          </section>

          <section className="control-section">
            <h2>All Visualizations</h2>
            <div className="viz-buttons">
              {VISUALIZATION_TYPES.map(type => (
                <button
                  key={type}
                  className={`viz-btn ${selectedVisualization === type ? 'active' : ''}`}
                  onClick={() => setSelectedVisualization(type)}
                >
                  {getVisualizationName(type)}
                </button>
              ))}
            </div>
          </section>

          <section className="control-section">
            <h2>Data Info</h2>
            <div className="data-info">
              <p><strong>Records:</strong> {rawData.length}</p>
              <p><strong>Countries:</strong> {MAJOR_COUNTRIES.length}</p>
              <p><strong>Source:</strong> World Bank</p>
            </div>
          </section>
        </aside>

        <div className="visualization-area">
          {renderVisualization()}
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Data sourced from{' '}
          <a href="https://data.worldbank.org/" target="_blank" rel="noopener noreferrer">
            World Bank Open Data
          </a>
        </p>
      </footer>
    </div>
  );
}

const VISUALIZATION_TYPES: VisualizationType[] = [
  'bar', 'line', 'pie', 'scatter', 'area',
  'treemap', 'heatmap', 'choropleth', 'sunburst', 'force'
];

function getVisualizationName(type: VisualizationType): string {
  const names: Record<VisualizationType, string> = {
    bar: 'Bar Chart',
    line: 'Line Chart',
    pie: 'Pie Chart',
    scatter: 'Scatter Plot',
    area: 'Area Chart',
    treemap: 'Treemap',
    heatmap: 'Heatmap',
    choropleth: 'World Map',
    sunburst: 'Sunburst',
    force: 'Network Graph',
  };
  return names[type];
}

export default App;
