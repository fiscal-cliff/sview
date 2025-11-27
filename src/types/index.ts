/**
 * Core type definitions for sview statistical visualization application
 * Based on modern data transformation patterns from tidy data principles
 */

// =============================================================================
// PRIMITIVE & SEMANTIC DATA TYPES
// =============================================================================

/** Primitive value types that can be stored in cells */
export type PrimitiveValue = string | number | boolean | Date | null | undefined;

/** Semantic data types for intelligent visualization mapping */
export type SemanticType = 
  | 'categorical'    // Discrete categories/labels
  | 'ordinal'        // Ordered categories
  | 'nominal'        // Unordered categories
  | 'quantitative'   // Continuous numerical
  | 'temporal'       // Date/time values
  | 'geographical'   // Location-based data
  | 'text'           // Free-form text
  | 'boolean'        // True/false values
  | 'identifier';    // Unique identifiers

/** Data dimensionality classification */
export type Dimensionality = 
  | 'scalar'         // Single value
  | 'series'         // 1D array (time series, list)
  | 'table'          // 2D tabular data
  | 'cube'           // 3D+ multidimensional
  | 'hierarchical'   // Tree structure
  | 'network';       // Graph structure

/** Data characteristics for visualization mapping */
export interface DataCharacteristics {
  dimensionality: Dimensionality;
  rowCount: number;
  columnCount: number;
  hasTimeDimension: boolean;
  hasCategoricalDimension: boolean;
  hasGeographicalDimension: boolean;
  hasHierarchy: boolean;
  hasRelationships: boolean;
  sparsity: number;  // 0-1, proportion of missing values
  cardinality: Map<string, number>;  // Unique values per column
}

// Legacy type alias for backwards compatibility
export type DataType = 'categorical' | 'temporal' | 'numerical' | 'geographical' | 'hierarchical';

// =============================================================================
// COLUMN & SCHEMA DEFINITIONS
// =============================================================================

/** Enhanced column metadata with semantic information */
export interface ColumnSchema {
  name: string;
  semanticType: SemanticType;
  primitiveType: 'string' | 'number' | 'boolean' | 'date' | 'object';
  nullable: boolean;
  unique: number;
  missing: number;
  statistics?: ColumnStatistics;
  format?: string;  // Display format pattern
  unit?: string;    // Measurement unit
  description?: string;
}

/** Statistical summary for numerical columns */
export interface ColumnStatistics {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  quartiles?: [number, number, number];  // Q1, Q2, Q3
  histogram?: { bin: number; count: number }[];
}

// Legacy alias
export interface ColumnInfo {
  name: string;
  type: DataType;
  unique?: number;
  min?: number;
  max?: number;
}

// =============================================================================
// CORE DATA STRUCTURES
// =============================================================================

/** Generic row type - record with string keys */
export type Row = Record<string, PrimitiveValue>;

/** DataFrame-like structure for tabular data */
export interface TabularData {
  columns: string[];
  rows: Row[];
  schema: ColumnSchema[];
}

/** Data point for visualizations (legacy support) */
export interface DataPoint {
  label: string;
  value: number;
  category?: string;
  date?: string | Date;
  x?: number;
  y?: number;
  children?: DataPoint[];
  [key: string]: unknown;
}

/** Dataset with metadata */
export interface Dataset {
  id: string;
  name: string;
  description: string;
  source: string;
  data: DataPoint[];
  dataTypes: DataType[];
  columns: ColumnInfo[];
}

// =============================================================================
// DATA TRANSFORMATION OPERATIONS
// =============================================================================

/** Aggregation functions */
export type AggregateFunction = 
  | 'sum' 
  | 'mean' 
  | 'median' 
  | 'min' 
  | 'max' 
  | 'count' 
  | 'countDistinct'
  | 'first'
  | 'last'
  | 'variance'
  | 'stdDev';

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Filter operator types */
export type FilterOperator = 
  | 'eq' | 'neq' 
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'startsWith' | 'endsWith'
  | 'in' | 'notIn'
  | 'between'
  | 'isNull' | 'isNotNull';

/** Filter condition */
export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: PrimitiveValue | PrimitiveValue[];
}

/** Group-by specification */
export interface GroupBySpec {
  columns: string[];
  aggregations: {
    column: string;
    function: AggregateFunction;
    alias?: string;
  }[];
}

/** Pivot specification */
export interface PivotSpec {
  index: string[];      // Row identifiers
  columns: string;      // Column to pivot
  values: string;       // Values to aggregate
  aggFunction: AggregateFunction;
}

/** Join specification */
export interface JoinSpec {
  type: 'inner' | 'left' | 'right' | 'outer';
  leftKey: string | string[];
  rightKey: string | string[];
}

/** Window function specification */
export interface WindowSpec {
  partition?: string[];
  orderBy?: { column: string; direction: SortDirection }[];
  function: 'rank' | 'rowNumber' | 'lag' | 'lead' | 'cumSum' | 'movingAvg';
  frameSize?: number;
}

// =============================================================================
// ENCODING & VISUALIZATION MAPPING
// =============================================================================

/** Represents different visualization types */
export type VisualizationType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'area'
  | 'treemap'
  | 'heatmap'
  | 'choropleth'
  | 'sunburst'
  | 'force';

/** Visual encoding channel */
export type EncodingChannel = 
  | 'x' | 'y' | 'z'
  | 'color' | 'fill' | 'stroke'
  | 'size' | 'shape' | 'opacity'
  | 'text' | 'tooltip'
  | 'row' | 'column'  // Faceting
  | 'theta' | 'radius'  // Polar coordinates
  | 'source' | 'target';  // Network graphs

/** Scale type for encoding */
export type ScaleType = 
  | 'linear' | 'log' | 'sqrt' | 'pow'
  | 'time' | 'utc'
  | 'ordinal' | 'band' | 'point'
  | 'quantize' | 'quantile' | 'threshold';

/** Encoding specification */
export interface EncodingSpec {
  channel: EncodingChannel;
  field: string;
  type: SemanticType;
  scale?: ScaleType;
  aggregate?: AggregateFunction;
  bin?: boolean | { maxbins: number };
  timeUnit?: 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour';
  format?: string;
  title?: string;
}

/** Complete visualization specification (Vega-Lite inspired) */
export interface VisualizationSpec {
  mark: VisualizationType;
  encodings: EncodingSpec[];
  data?: TabularData;
  transform?: TransformStep[];
  title?: string;
  width?: number;
  height?: number;
}

/** Transformation pipeline step */
export type TransformStep = 
  | { type: 'filter'; condition: FilterCondition }
  | { type: 'sort'; column: string; direction: SortDirection }
  | { type: 'groupBy'; spec: GroupBySpec }
  | { type: 'pivot'; spec: PivotSpec }
  | { type: 'select'; columns: string[] }
  | { type: 'rename'; mapping: Record<string, string> }
  | { type: 'derive'; name: string; expression: string }
  | { type: 'window'; spec: WindowSpec }
  | { type: 'sample'; n: number; seed?: number }
  | { type: 'flatten'; column: string }
  | { type: 'fold'; columns: string[]; as: [string, string] }
  | { type: 'unfold'; keyColumn: string; valueColumn: string };

/** Visualization configuration */
export interface VisualizationConfig {
  type: VisualizationType;
  title: string;
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  colorScheme?: string[];
}

/** Visualization recommendation */
export interface VisualizationRecommendation {
  type: VisualizationType;
  score: number;
  reason: string;
}

/** World Bank API indicator */
export interface WorldBankIndicator {
  id: string;
  name: string;
  sourceNote?: string;
  source?: {
    id: string;
    value: string;
  };
}

/** World Bank data entry */
export interface WorldBankDataEntry {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

/** Hierarchical data structure for treemap/sunburst */
export interface HierarchicalData {
  name: string;
  value?: number;
  children?: HierarchicalData[];
}

/** Network/Graph data for force-directed layouts */
export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface NetworkNode {
  id: string;
  name: string;
  group?: number;
  value?: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  value?: number;
}

/** Heatmap data structure */
export interface HeatmapData {
  rows: string[];
  columns: string[];
  values: number[][];
}

/** Geographical data for choropleth */
export interface GeoData {
  features: GeoFeature[];
  values: Map<string, number>;
}

export interface GeoFeature {
  id: string;
  properties: {
    name: string;
    [key: string]: unknown;
  };
  geometry: unknown;
}
