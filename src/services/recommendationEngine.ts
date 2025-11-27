/**
 * Visualization Recommendation Engine
 * Suggests the most suitable visualization type based on data characteristics
 * Similar to Grafana's suggested visualization feature
 * 
 * Based on research:
 * - Mackinlay's APT (A Presentation Tool) - effectiveness rankings
 * - Tableau's Show Me feature logic
 * - Observable Plot's auto-mark selection
 * - Vega-Lite's encoding recommendations
 */

import type {
  DataPoint,
  DataType,
  VisualizationType,
  VisualizationRecommendation,
  ColumnInfo,
  HierarchicalData,
  NetworkData,
  DataCharacteristics,
  SemanticType,
  Dimensionality,
  ColumnSchema,
  TabularData,
} from '../types';
import { DataFrame } from './DataFrame';

/** Configuration for visualization scoring */
interface VisualizationProfile {
  type: VisualizationType;
  name: string;
  description: string;
  idealDataTypes: DataType[];
  minDataPoints: number;
  maxDataPoints: number;
  requiresCategories: boolean;
  requiresTemporal: boolean;
  requiresHierarchy: boolean;
  requiresNetwork: boolean;
  requiresGeography: boolean;
}

/** Visualization profiles defining characteristics of each chart type */
const VISUALIZATION_PROFILES: VisualizationProfile[] = [
  {
    type: 'bar',
    name: 'Bar Chart',
    description: 'Best for comparing discrete categories',
    idealDataTypes: ['categorical', 'numerical'],
    minDataPoints: 2,
    maxDataPoints: 50,
    requiresCategories: true,
    requiresTemporal: false,
    requiresHierarchy: false,
    requiresNetwork: false,
    requiresGeography: false,
  },
  {
    type: 'line',
    name: 'Line Chart',
    description: 'Best for showing trends over time',
    idealDataTypes: ['temporal', 'numerical'],
    minDataPoints: 3,
    maxDataPoints: 500,
    requiresCategories: false,
    requiresTemporal: true,
    requiresHierarchy: false,
    requiresNetwork: false,
    requiresGeography: false,
  },
  {
    type: 'pie',
    name: 'Pie Chart',
    description: 'Best for showing parts of a whole',
    idealDataTypes: ['categorical', 'numerical'],
    minDataPoints: 2,
    maxDataPoints: 10,
    requiresCategories: true,
    requiresTemporal: false,
    requiresHierarchy: false,
    requiresNetwork: false,
    requiresGeography: false,
  },
  {
    type: 'scatter',
    name: 'Scatter Plot',
    description: 'Best for showing relationships between two variables',
    idealDataTypes: ['numerical'],
    minDataPoints: 5,
    maxDataPoints: 1000,
    requiresCategories: false,
    requiresTemporal: false,
    requiresHierarchy: false,
    requiresNetwork: false,
    requiresGeography: false,
  },
  {
    type: 'area',
    name: 'Area Chart',
    description: 'Best for showing cumulative trends over time',
    idealDataTypes: ['temporal', 'numerical'],
    minDataPoints: 3,
    maxDataPoints: 500,
    requiresCategories: false,
    requiresTemporal: true,
    requiresHierarchy: false,
    requiresNetwork: false,
    requiresGeography: false,
  },
  {
    type: 'treemap',
    name: 'Treemap',
    description: 'Best for showing hierarchical data and proportions',
    idealDataTypes: ['hierarchical', 'categorical', 'numerical'],
    minDataPoints: 5,
    maxDataPoints: 200,
    requiresCategories: true,
    requiresTemporal: false,
    requiresHierarchy: true,
    requiresNetwork: false,
    requiresGeography: false,
  },
  {
    type: 'heatmap',
    name: 'Heatmap',
    description: 'Best for showing patterns in matrix data',
    idealDataTypes: ['categorical', 'numerical'],
    minDataPoints: 10,
    maxDataPoints: 500,
    requiresCategories: true,
    requiresTemporal: false,
    requiresHierarchy: false,
    requiresNetwork: false,
    requiresGeography: false,
  },
  {
    type: 'choropleth',
    name: 'Choropleth Map',
    description: 'Best for showing geographical distributions',
    idealDataTypes: ['geographical', 'numerical'],
    minDataPoints: 3,
    maxDataPoints: 300,
    requiresCategories: false,
    requiresTemporal: false,
    requiresHierarchy: false,
    requiresNetwork: false,
    requiresGeography: true,
  },
  {
    type: 'sunburst',
    name: 'Sunburst',
    description: 'Best for showing hierarchical data with drill-down',
    idealDataTypes: ['hierarchical', 'categorical', 'numerical'],
    minDataPoints: 5,
    maxDataPoints: 100,
    requiresCategories: true,
    requiresTemporal: false,
    requiresHierarchy: true,
    requiresNetwork: false,
    requiresGeography: false,
  },
  {
    type: 'force',
    name: 'Force-Directed Graph',
    description: 'Best for showing relationships and networks',
    idealDataTypes: ['categorical'],
    minDataPoints: 3,
    maxDataPoints: 100,
    requiresCategories: true,
    requiresTemporal: false,
    requiresHierarchy: false,
    requiresNetwork: true,
    requiresGeography: false,
  },
];

/** Analyze data to determine its characteristics */
export interface DataAnalysis {
  dataPoints: number;
  hasCategories: boolean;
  hasTemporal: boolean;
  hasNumerical: boolean;
  hasHierarchy: boolean;
  hasNetwork: boolean;
  hasGeography: boolean;
  uniqueCategories: number;
  temporalRange: number;
  valueRange: { min: number; max: number };
  dataTypes: DataType[];
}

/**
 * Analyze data points to understand their characteristics
 */
export function analyzeData(
  data: DataPoint[],
  columns?: ColumnInfo[]
): DataAnalysis {
  if (!data || data.length === 0) {
    return {
      dataPoints: 0,
      hasCategories: false,
      hasTemporal: false,
      hasNumerical: false,
      hasHierarchy: false,
      hasNetwork: false,
      hasGeography: false,
      uniqueCategories: 0,
      temporalRange: 0,
      valueRange: { min: 0, max: 0 },
      dataTypes: [],
    };
  }

  const categories = new Set(data.map((d) => d.category || d.label));
  const dates = data.filter((d) => d.date).map((d) => d.date);
  const values = data.map((d) => d.value).filter((v) => typeof v === 'number');

  const hasTemporal = dates.length > 0 || columns?.some((c) => c.type === 'temporal') || false;
  const hasCategories = categories.size > 1;
  const hasNumerical = values.length > 0;
  const hasHierarchy = data.some((d) => d.children && d.children.length > 0);
  const hasGeography = columns?.some((c) => c.type === 'geographical') || 
    data.some((d) => d.countryCode !== undefined);

  const dataTypes: DataType[] = [];
  if (hasCategories) dataTypes.push('categorical');
  if (hasTemporal) dataTypes.push('temporal');
  if (hasNumerical) dataTypes.push('numerical');
  if (hasHierarchy) dataTypes.push('hierarchical');
  if (hasGeography) dataTypes.push('geographical');

  return {
    dataPoints: data.length,
    hasCategories,
    hasTemporal,
    hasNumerical,
    hasHierarchy,
    hasNetwork: false, // Determined separately
    hasGeography,
    uniqueCategories: categories.size,
    temporalRange: dates.length,
    valueRange: {
      min: Math.min(...values),
      max: Math.max(...values),
    },
    dataTypes,
  };
}

/**
 * Score a visualization type for a given data analysis
 */
function scoreVisualization(
  profile: VisualizationProfile,
  analysis: DataAnalysis
): number {
  let score = 0;

  // Base score for data type match
  const typeMatches = profile.idealDataTypes.filter((t) =>
    analysis.dataTypes.includes(t)
  );
  score += (typeMatches.length / profile.idealDataTypes.length) * 40;

  // Data point count scoring
  if (
    analysis.dataPoints >= profile.minDataPoints &&
    analysis.dataPoints <= profile.maxDataPoints
  ) {
    score += 20;
  } else if (analysis.dataPoints < profile.minDataPoints) {
    score -= 10;
  } else {
    // Too many data points
    const excess = analysis.dataPoints - profile.maxDataPoints;
    score -= Math.min(20, excess / 10);
  }

  // Requirement penalties
  if (profile.requiresCategories && !analysis.hasCategories) {
    score -= 30;
  }
  if (profile.requiresTemporal && !analysis.hasTemporal) {
    score -= 30;
  }
  if (profile.requiresHierarchy && !analysis.hasHierarchy) {
    score -= 20;
  }
  if (profile.requiresNetwork && !analysis.hasNetwork) {
    score -= 20;
  }
  if (profile.requiresGeography && !analysis.hasGeography) {
    score -= 20;
  }

  // Bonus for perfect matches
  if (profile.requiresCategories && analysis.hasCategories) {
    score += 10;
  }
  if (profile.requiresTemporal && analysis.hasTemporal) {
    score += 15;
  }
  if (profile.requiresGeography && analysis.hasGeography) {
    score += 15;
  }

  // Category count specific bonuses/penalties
  if (profile.type === 'pie' && analysis.uniqueCategories > 8) {
    score -= 20; // Pie charts bad with many categories
  }
  if (profile.type === 'bar' && analysis.uniqueCategories <= 20) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate reason for recommendation
 */
function generateReason(
  profile: VisualizationProfile,
  analysis: DataAnalysis
): string {
  const reasons: string[] = [];

  if (profile.requiresTemporal && analysis.hasTemporal) {
    reasons.push('time-series data detected');
  }
  if (profile.requiresCategories && analysis.hasCategories) {
    reasons.push(`${analysis.uniqueCategories} categories`);
  }
  if (profile.requiresGeography && analysis.hasGeography) {
    reasons.push('geographical data detected');
  }
  if (analysis.dataPoints >= profile.minDataPoints && analysis.dataPoints <= profile.maxDataPoints) {
    reasons.push(`optimal data size (${analysis.dataPoints} points)`);
  }

  if (reasons.length === 0) {
    reasons.push(profile.description.toLowerCase());
  }

  return reasons.join(', ');
}

/**
 * Get visualization recommendations based on data characteristics
 * Returns recommendations sorted by score (highest first)
 */
export function getRecommendations(
  data: DataPoint[],
  columns?: ColumnInfo[]
): VisualizationRecommendation[] {
  const analysis = analyzeData(data, columns);

  return VISUALIZATION_PROFILES.map((profile) => {
    const score = scoreVisualization(profile, analysis);
    return {
      type: profile.type,
      score,
      reason: generateReason(profile, analysis),
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Get the best visualization recommendation
 */
export function getBestVisualization(
  data: DataPoint[],
  columns?: ColumnInfo[]
): VisualizationType {
  const recommendations = getRecommendations(data, columns);
  return recommendations[0]?.type || 'bar';
}

/**
 * Get recommendations for hierarchical data
 */
export function getHierarchicalRecommendations(
  data: HierarchicalData
): VisualizationRecommendation[] {
  const nodeCount = countNodes(data);
  const depth = getDepth(data);

  const recommendations: VisualizationRecommendation[] = [];

  // Treemap
  let treemapScore = 70;
  if (nodeCount <= 50) treemapScore += 15;
  if (depth <= 3) treemapScore += 10;
  recommendations.push({
    type: 'treemap',
    score: treemapScore,
    reason: `hierarchical data with ${nodeCount} nodes and depth ${depth}`,
  });

  // Sunburst
  let sunburstScore = 65;
  if (depth >= 2 && depth <= 4) sunburstScore += 20;
  if (nodeCount <= 30) sunburstScore += 10;
  recommendations.push({
    type: 'sunburst',
    score: sunburstScore,
    reason: `radial visualization suits depth ${depth} hierarchy`,
  });

  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Get recommendations for network data
 */
export function getNetworkRecommendations(
  data: NetworkData
): VisualizationRecommendation[] {
  const nodeCount = data.nodes.length;
  const linkCount = data.links.length;
  const density = linkCount / (nodeCount * (nodeCount - 1) / 2);

  let forceScore = 60;
  if (nodeCount <= 50) forceScore += 20;
  if (density > 0.1 && density < 0.5) forceScore += 15;

  return [
    {
      type: 'force',
      score: forceScore,
      reason: `network with ${nodeCount} nodes and ${linkCount} connections`,
    },
  ];
}

/** Helper to count nodes in hierarchical data */
function countNodes(node: HierarchicalData): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

/** Helper to get depth of hierarchical data */
function getDepth(node: HierarchicalData): number {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  return 1 + Math.max(...node.children.map(getDepth));
}

/**
 * Get visualization profile by type
 */
export function getVisualizationProfile(type: VisualizationType): VisualizationProfile | undefined {
  return VISUALIZATION_PROFILES.find((p) => p.type === type);
}

/**
 * Get all visualization profiles
 */
export function getAllVisualizationProfiles(): VisualizationProfile[] {
  return VISUALIZATION_PROFILES;
}

// =============================================================================
// ADVANCED RECOMMENDATION ENGINE (Data Characteristics Based)
// =============================================================================

/**
 * Encoding effectiveness rankings based on Mackinlay's APT
 * Lower rank = more effective for that data type
 */
export const ENCODING_EFFECTIVENESS: Record<SemanticType, EncodingChannel[]> = {
  quantitative: ['x', 'y', 'size', 'color', 'opacity'],
  temporal: ['x', 'y', 'color'],
  categorical: ['color', 'shape', 'x', 'y', 'row', 'column'],
  ordinal: ['x', 'y', 'color', 'size'],
  nominal: ['color', 'shape', 'row', 'column'],
  geographical: ['x', 'y', 'color'],
  text: ['text', 'tooltip'],
  boolean: ['color', 'shape'],
  identifier: ['text', 'tooltip'],
};

type EncodingChannel = 'x' | 'y' | 'color' | 'size' | 'shape' | 'opacity' | 'text' | 'tooltip' | 'row' | 'column';

/**
 * Mark types suitable for different data dimensionalities
 */
const MARK_BY_DIMENSIONALITY: Record<Dimensionality, VisualizationType[]> = {
  scalar: ['bar', 'pie'],
  series: ['line', 'area', 'bar'],
  table: ['bar', 'scatter', 'heatmap', 'line'],
  cube: ['heatmap', 'treemap'],
  hierarchical: ['treemap', 'sunburst'],
  network: ['force'],
};

/**
 * Advanced recommendation based on DataFrame characteristics
 */
export function recommendFromDataFrame(df: DataFrame): VisualizationRecommendation[] {
  const characteristics = df.getCharacteristics();
  const schema = df.schema;
  
  return recommendFromCharacteristics(characteristics, schema);
}

/**
 * Recommend visualizations based on data characteristics and schema
 */
export function recommendFromCharacteristics(
  characteristics: DataCharacteristics,
  schema: ColumnSchema[]
): VisualizationRecommendation[] {
  const recommendations: VisualizationRecommendation[] = [];
  
  // Get semantic type counts
  const typeCounts = countSemanticTypes(schema);
  
  // Determine primary recommendation based on dimensionality
  const dimensionalMarks = MARK_BY_DIMENSIONALITY[characteristics.dimensionality] || ['bar'];
  
  // Score each visualization type
  VISUALIZATION_PROFILES.forEach(profile => {
    let score = 50; // Base score
    const reasons: string[] = [];
    
    // Boost score if mark matches dimensionality
    if (dimensionalMarks.includes(profile.type)) {
      score += 15;
      reasons.push(`suitable for ${characteristics.dimensionality} data`);
    }
    
    // Time-based visualizations
    if (characteristics.hasTimeDimension) {
      if (profile.type === 'line' || profile.type === 'area') {
        score += 25;
        reasons.push('time dimension detected');
      } else if (profile.type === 'bar') {
        score += 10;
      }
    }
    
    // Categorical data handling
    if (characteristics.hasCategoricalDimension) {
      const maxCardinality = Math.max(...Array.from(characteristics.cardinality.values()));
      
      if (profile.type === 'bar' && maxCardinality <= 20) {
        score += 20;
        reasons.push(`${maxCardinality} categories`);
      } else if (profile.type === 'pie' && maxCardinality <= 8) {
        score += 25;
        reasons.push(`ideal for ${maxCardinality} categories`);
      } else if (profile.type === 'treemap' && maxCardinality > 10) {
        score += 15;
        reasons.push('many categories');
      }
    }
    
    // Geographical data
    if (characteristics.hasGeographicalDimension) {
      if (profile.type === 'choropleth') {
        score += 30;
        reasons.push('geographical data detected');
      } else {
        score -= 10;
      }
    }
    
    // Hierarchical data
    if (characteristics.hasHierarchy) {
      if (profile.type === 'treemap' || profile.type === 'sunburst') {
        score += 30;
        reasons.push('hierarchical structure detected');
      }
    }
    
    // Relationship data
    if (characteristics.hasRelationships) {
      if (profile.type === 'force') {
        score += 35;
        reasons.push('relationship data detected');
      }
    }
    
    // Data size considerations
    const rowCount = characteristics.rowCount;
    if (rowCount > 1000) {
      if (profile.type === 'heatmap' || profile.type === 'scatter') {
        score += 10;
        reasons.push('handles large datasets');
      } else if (profile.type === 'pie') {
        score -= 20;
      }
    }
    
    // Sparse data handling
    if (characteristics.sparsity > 0.3) {
      if (profile.type === 'heatmap') {
        score -= 10;
        reasons.push('sparse data may have gaps');
      }
    }
    
    // Multi-variable analysis
    const quantitativeCols = typeCounts.get('quantitative') || 0;
    if (quantitativeCols >= 2) {
      if (profile.type === 'scatter') {
        score += 20;
        reasons.push(`${quantitativeCols} numeric variables for correlation`);
      }
    }
    
    // Ensure minimum requirements
    if (profile.minDataPoints > rowCount) {
      score -= 30;
      reasons.push('insufficient data points');
    }
    if (profile.maxDataPoints < rowCount) {
      score -= 10;
    }
    
    recommendations.push({
      type: profile.type,
      score: Math.max(0, Math.min(100, score)),
      reason: reasons.length > 0 ? reasons.join(', ') : profile.description,
    });
  });
  
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Get recommended encodings for a visualization type and schema
 */
export function recommendEncodings(
  type: VisualizationType,
  schema: ColumnSchema[]
): Map<EncodingChannel, string> {
  const encodings = new Map<EncodingChannel, string>();
  
  // Find columns by type
  const temporal = schema.find(s => s.semanticType === 'temporal');
  const quantitative = schema.filter(s => s.semanticType === 'quantitative');
  const categorical = schema.filter(s => 
    s.semanticType === 'categorical' || s.semanticType === 'nominal' || s.semanticType === 'ordinal'
  );
  
  switch (type) {
    case 'line':
    case 'area':
      if (temporal) encodings.set('x', temporal.name);
      if (quantitative.length > 0) encodings.set('y', quantitative[0].name);
      if (categorical.length > 0) encodings.set('color', categorical[0].name);
      break;
      
    case 'bar':
      if (categorical.length > 0) encodings.set('x', categorical[0].name);
      if (quantitative.length > 0) encodings.set('y', quantitative[0].name);
      if (categorical.length > 1) encodings.set('color', categorical[1].name);
      break;
      
    case 'scatter':
      if (quantitative.length >= 2) {
        encodings.set('x', quantitative[0].name);
        encodings.set('y', quantitative[1].name);
      }
      if (categorical.length > 0) encodings.set('color', categorical[0].name);
      if (quantitative.length > 2) encodings.set('size', quantitative[2].name);
      break;
      
    case 'pie':
      if (categorical.length > 0) encodings.set('color', categorical[0].name);
      if (quantitative.length > 0) encodings.set('size', quantitative[0].name);
      break;
      
    case 'heatmap':
      if (categorical.length >= 2) {
        encodings.set('x', categorical[0].name);
        encodings.set('y', categorical[1].name);
      }
      if (quantitative.length > 0) encodings.set('color', quantitative[0].name);
      break;
  }
  
  return encodings;
}

/**
 * Auto-select best visualization and generate complete spec
 */
export function autoVisualize(df: DataFrame): {
  type: VisualizationType;
  encodings: Map<EncodingChannel, string>;
  recommendation: VisualizationRecommendation;
} {
  const recommendations = recommendFromDataFrame(df);
  const best = recommendations[0];
  const encodings = recommendEncodings(best.type, df.schema);
  
  return {
    type: best.type,
    encodings,
    recommendation: best,
  };
}

/**
 * Count semantic types in schema
 */
function countSemanticTypes(schema: ColumnSchema[]): Map<SemanticType, number> {
  const counts = new Map<SemanticType, number>();
  schema.forEach(col => {
    counts.set(col.semanticType, (counts.get(col.semanticType) || 0) + 1);
  });
  return counts;
}

/**
 * Recommend based on TabularData directly
 */
export function recommendFromTabular(data: TabularData): VisualizationRecommendation[] {
  const df = new DataFrame(data);
  return recommendFromDataFrame(df);
}
