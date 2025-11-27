# SView - Statistical Visualization Platform

A modern, D3.js-powered statistical visualization application that provides intelligent visualization recommendations based on data characteristics. Inspired by Grafana's suggested visualization feature.

## Features

### 10 Powerful D3 Visualizations
- **Bar Chart** - Compare discrete categories
- **Line Chart** - Show trends over time
- **Pie/Donut Chart** - Display parts of a whole
- **Scatter Plot** - Reveal correlations between variables
- **Area Chart** - Cumulative trends over time
- **Treemap** - Hierarchical data with nested proportions
- **Heatmap** - Patterns in matrix data
- **Choropleth Map** - Geographical data distributions
- **Sunburst** - Hierarchical data with drill-down capability
- **Force-Directed Graph** - Network relationships

### Intelligent Visualization Recommendation
- Automatically suggests the best visualization based on:
  - Data dimensionality (scalar, series, table, hierarchical, network)
  - Semantic type detection (categorical, temporal, quantitative, geographical)
  - Data characteristics (cardinality, sparsity, relationships)
- Powered by research from Mackinlay's APT and Vega-Lite encoding guidelines

### Flexible Data Transformation Layer
- **DataFrame class** - pandas-like data manipulation
- **Pipeline API** - Declarative, chainable transformations
- Operations: filter, sort, group, pivot, melt, join, derive, window functions
- Automatic schema inference and type detection

### Open Data Integration
- World Bank Open Data API (free, no authentication required)
- 10 popular economic indicators pre-configured
- Support for 20 major countries

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **D3.js v7** - Visualization library
- **Vite** - Build tool
- **World Bank API** - Data source

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## Project Structure

```
src/
├── components/
│   └── visualizations/     # 10 D3 visualization components
│       ├── BarChart.tsx
│       ├── LineChart.tsx
│       ├── PieChart.tsx
│       ├── ScatterPlot.tsx
│       ├── AreaChart.tsx
│       ├── Treemap.tsx
│       ├── Heatmap.tsx
│       ├── Choropleth.tsx
│       ├── Sunburst.tsx
│       └── ForceGraph.tsx
├── services/
│   ├── DataFrame.ts        # Flexible data manipulation class
│   ├── Pipeline.ts         # Declarative transformation pipeline
│   ├── dataService.ts      # World Bank API integration
│   └── recommendationEngine.ts  # Visualization recommendations
├── types/
│   └── index.ts           # TypeScript type definitions
└── App.tsx                # Main application component
```

## Data Transformation Examples

### Using DataFrame

```typescript
import { DataFrame } from './services';

// Create from array of objects
const df = new DataFrame([
  { country: 'USA', gdp: 21000, population: 330 },
  { country: 'China', gdp: 14000, population: 1400 },
]);

// Chain transformations
const result = df
  .filter({ column: 'gdp', operator: 'gt', value: 10000 })
  .sort('population')
  .derive('gdpPerCapita', (row) => row.gdp / row.population);

// Convert to visualization formats
const dataPoints = df.toDataPoints('country', 'gdp');
const hierarchy = df.toHierarchy(['region', 'country'], 'gdp');
const heatmap = df.toHeatmap('country', 'year', 'gdp');
```

### Using Pipeline

```typescript
import { Pipeline } from './services';

const result = Pipeline.from(data)
  .filter({ column: 'year', operator: 'gte', value: 2010 })
  .groupBy({
    columns: ['country'],
    aggregations: [
      { column: 'gdp', function: 'mean', alias: 'avg_gdp' }
    ]
  })
  .sort('avg_gdp')
  .execute();
```

## Visualization Recommendations

```typescript
import { recommendFromDataFrame, autoVisualize } from './services';

// Get recommendations
const recommendations = recommendFromDataFrame(df);
// Returns: [{ type: 'bar', score: 85, reason: '...' }, ...]

// Auto-select best visualization
const { type, encodings } = autoVisualize(df);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and tests
5. Submit a pull request

## License

MIT

## Acknowledgments

- World Bank for providing free, open statistical data
- D3.js community for visualization excellence
- Research from Mackinlay's APT, Tableau Show Me, and Vega-Lite
