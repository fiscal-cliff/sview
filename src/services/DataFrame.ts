/**
 * DataFrame - A flexible data transformation class
 * Inspired by pandas, dplyr, and Observable Plot
 * 
 * Provides a fluent API for data manipulation with:
 * - Type inference and schema detection
 * - Chainable transformation operations
 * - Aggregation and grouping
 * - Pivoting and reshaping
 * - Visualization-ready output
 */

import type {
  PrimitiveValue,
  SemanticType,
  Row,
  TabularData,
  ColumnSchema,
  ColumnStatistics,
  AggregateFunction,
  SortDirection,
  FilterCondition,
  FilterOperator,
  GroupBySpec,
  PivotSpec,
  DataCharacteristics,
  Dimensionality,
  DataPoint,
  HierarchicalData,
  NetworkData,
  HeatmapData,
} from '../types';

/**
 * DataFrame class for flexible data manipulation
 */
export class DataFrame {
  private _columns: string[];
  private _rows: Row[];
  private _schema: ColumnSchema[];

  constructor(data: Row[] | TabularData | Record<string, PrimitiveValue[]>) {
    // Initialize with defaults to avoid "used before assigned" errors
    this._columns = [];
    this._rows = [];
    this._schema = [];

    if (Array.isArray(data)) {
      // Array of row objects
      this._rows = data;
      this._columns = this.inferColumns(data);
    } else if ('rows' in data && 'columns' in data && 'schema' in data) {
      // TabularData format
      this._rows = data.rows as Row[];
      this._columns = data.columns as string[];
      this._schema = (data.schema as ColumnSchema[]) || [];
    } else {
      // Column-oriented object { colA: [...], colB: [...] }
      const entries = Object.entries(data as Record<string, PrimitiveValue[]>);
      this._columns = entries.map(([key]) => key);
      const rowCount = entries[0]?.[1]?.length || 0;
      this._rows = Array.from({ length: rowCount }, (_, i) =>
        Object.fromEntries(entries.map(([key, values]) => [key, values[i]]))
      );
    }

    // Infer schema if not provided
    if (this._schema.length === 0) {
      this._schema = this.inferSchema();
    }
  }

  // ===========================================================================
  // STATIC CONSTRUCTORS
  // ===========================================================================

  /**
   * Create DataFrame from CSV string
   */
  static fromCSV(csv: string, options?: { delimiter?: string; header?: boolean }): DataFrame {
    const delimiter = options?.delimiter || ',';
    const hasHeader = options?.header !== false;
    
    const lines = csv.trim().split('\n');
    const headers = hasHeader 
      ? lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
      : lines[0].split(delimiter).map((_, i) => `column${i}`);
    
    const dataLines = hasHeader ? lines.slice(1) : lines;
    
    const rows: Row[] = dataLines.map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Row = {};
      headers.forEach((header, i) => {
        row[header] = parseValue(values[i]);
      });
      return row;
    });

    return new DataFrame(rows);
  }

  /**
   * Create DataFrame from JSON array
   */
  static fromJSON(json: string | unknown[]): DataFrame {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    return new DataFrame(data as Row[]);
  }

  /**
   * Create empty DataFrame with schema
   */
  static empty(columns: string[]): DataFrame {
    return new DataFrame({ columns, rows: [], schema: [] });
  }

  // ===========================================================================
  // ACCESSORS
  // ===========================================================================

  get columns(): string[] {
    return [...this._columns];
  }

  get rows(): Row[] {
    return this._rows;
  }

  get schema(): ColumnSchema[] {
    return this._schema;
  }

  get rowCount(): number {
    return this._rows.length;
  }

  get columnCount(): number {
    return this._columns.length;
  }

  /**
   * Get column values as array
   */
  column<T extends PrimitiveValue = PrimitiveValue>(name: string): T[] {
    return this._rows.map(row => row[name] as T);
  }

  /**
   * Get single row by index
   */
  row(index: number): Row | undefined {
    return this._rows[index];
  }

  /**
   * Get value at row, column
   */
  at(row: number, column: string | number): PrimitiveValue {
    const col = typeof column === 'number' ? this._columns[column] : column;
    return this._rows[row]?.[col];
  }

  /**
   * Convert to TabularData format
   */
  toTabular(): TabularData {
    return {
      columns: this._columns,
      rows: this._rows,
      schema: this._schema,
    };
  }

  // ===========================================================================
  // SCHEMA INFERENCE
  // ===========================================================================

  private inferColumns(rows: Row[]): string[] {
    const columnSet = new Set<string>();
    rows.forEach(row => Object.keys(row).forEach(key => columnSet.add(key)));
    return Array.from(columnSet);
  }

  private inferSchema(): ColumnSchema[] {
    return this._columns.map(name => {
      const values = this.column(name);
      const nonNull = values.filter(v => v !== null && v !== undefined);
      const primitiveType = inferPrimitiveType(nonNull);
      const semanticType = inferSemanticType(name, nonNull, primitiveType);
      const unique = new Set(nonNull.map(v => String(v))).size;
      const missing = values.length - nonNull.length;

      const schema: ColumnSchema = {
        name,
        semanticType,
        primitiveType,
        nullable: missing > 0,
        unique,
        missing,
      };

      // Add statistics for numerical columns
      if (primitiveType === 'number') {
        schema.statistics = computeStatistics(nonNull as number[]);
      }

      return schema;
    });
  }

  /**
   * Get data characteristics for visualization recommendation
   */
  getCharacteristics(): DataCharacteristics {
    const cardinality = new Map<string, number>();
    this._schema.forEach(col => cardinality.set(col.name, col.unique));

    const hasTimeDimension = this._schema.some(s => s.semanticType === 'temporal');
    const hasCategoricalDimension = this._schema.some(s => 
      s.semanticType === 'categorical' || s.semanticType === 'nominal' || s.semanticType === 'ordinal'
    );
    const hasGeographicalDimension = this._schema.some(s => s.semanticType === 'geographical');

    const totalCells = this._rows.length * this._columns.length;
    const missingCells = this._schema.reduce((sum, col) => sum + col.missing, 0);
    const sparsity = totalCells > 0 ? missingCells / totalCells : 0;

    return {
      dimensionality: this.inferDimensionality(),
      rowCount: this._rows.length,
      columnCount: this._columns.length,
      hasTimeDimension,
      hasCategoricalDimension,
      hasGeographicalDimension,
      hasHierarchy: false,  // Detected in specific conversions
      hasRelationships: false,
      sparsity,
      cardinality,
    };
  }

  private inferDimensionality(): Dimensionality {
    if (this._rows.length === 1 && this._columns.length === 1) return 'scalar';
    if (this._columns.length === 1 || this._rows.length === 1) return 'series';
    return 'table';
  }

  // ===========================================================================
  // TRANSFORMATION OPERATIONS
  // ===========================================================================

  /**
   * Select specific columns
   */
  select(...columns: string[]): DataFrame {
    const newRows = this._rows.map(row =>
      Object.fromEntries(columns.map(col => [col, row[col]]))
    );
    return new DataFrame(newRows);
  }

  /**
   * Drop specific columns
   */
  drop(...columns: string[]): DataFrame {
    const keepCols = this._columns.filter(c => !columns.includes(c));
    return this.select(...keepCols);
  }

  /**
   * Rename columns
   */
  rename(mapping: Record<string, string>): DataFrame {
    const newRows = this._rows.map(row => {
      const newRow: Row = {};
      Object.entries(row).forEach(([key, value]) => {
        newRow[mapping[key] || key] = value;
      });
      return newRow;
    });
    return new DataFrame(newRows);
  }

  /**
   * Filter rows based on condition
   */
  filter(condition: FilterCondition | ((row: Row) => boolean)): DataFrame {
    let predicate: (row: Row) => boolean;

    if (typeof condition === 'function') {
      predicate = condition;
    } else {
      predicate = createFilterPredicate(condition);
    }

    return new DataFrame(this._rows.filter(predicate));
  }

  /**
   * Filter rows where column equals value
   */
  where(column: string, value: PrimitiveValue): DataFrame {
    return this.filter({ column, operator: 'eq', value });
  }

  /**
   * Sort by column(s)
   */
  sort(column: string | { column: string; direction: SortDirection }[]): DataFrame {
    const specs = Array.isArray(column) ? column : [{ column, direction: 'asc' as SortDirection }];
    
    const sorted = [...this._rows].sort((a, b) => {
      for (const spec of specs) {
        const va = a[spec.column];
        const vb = b[spec.column];
        const cmp = compareValues(va, vb);
        if (cmp !== 0) return spec.direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });

    return new DataFrame(sorted);
  }

  /**
   * Limit number of rows
   */
  head(n: number): DataFrame {
    return new DataFrame(this._rows.slice(0, n));
  }

  /**
   * Skip first n rows
   */
  tail(n: number): DataFrame {
    return new DataFrame(this._rows.slice(-n));
  }

  /**
   * Skip first n rows
   */
  skip(n: number): DataFrame {
    return new DataFrame(this._rows.slice(n));
  }

  /**
   * Get unique values (deduplicate by all columns or specific ones)
   */
  distinct(columns?: string[]): DataFrame {
    const cols = columns || this._columns;
    const seen = new Set<string>();
    const unique: Row[] = [];

    this._rows.forEach(row => {
      const key = cols.map(c => JSON.stringify(row[c])).join('|');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(row);
      }
    });

    return new DataFrame(unique);
  }

  /**
   * Add or compute a new column
   */
  derive(name: string, fn: (row: Row, index: number) => PrimitiveValue): DataFrame {
    const newRows = this._rows.map((row, i) => ({
      ...row,
      [name]: fn(row, i),
    }));
    return new DataFrame(newRows);
  }

  /**
   * Apply function to each row (mutate in place style but returns new DF)
   */
  mutate(mutations: Record<string, (row: Row) => PrimitiveValue>): DataFrame {
    const newRows = this._rows.map(row => {
      const newRow = { ...row };
      Object.entries(mutations).forEach(([name, fn]) => {
        newRow[name] = fn(row);
      });
      return newRow;
    });
    return new DataFrame(newRows);
  }

  // ===========================================================================
  // AGGREGATION & GROUPING
  // ===========================================================================

  /**
   * Group by column(s) and aggregate
   */
  groupBy(spec: GroupBySpec): DataFrame {
    const groups = new Map<string, Row[]>();

    // Group rows
    this._rows.forEach(row => {
      const key = spec.columns.map(c => JSON.stringify(row[c])).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    });

    // Aggregate each group
    const results: Row[] = [];
    groups.forEach((rows) => {
      const result: Row = {};
      
      // Include group columns
      spec.columns.forEach(col => {
        result[col] = rows[0][col];
      });

      // Compute aggregations
      spec.aggregations.forEach(agg => {
        const values = rows.map(r => r[agg.column]).filter(v => v !== null && v !== undefined);
        const alias = agg.alias || `${agg.function}_${agg.column}`;
        result[alias] = computeAggregate(values, agg.function);
      });

      results.push(result);
    });

    return new DataFrame(results);
  }

  /**
   * Shorthand for simple aggregation
   */
  aggregate(column: string, fn: AggregateFunction): PrimitiveValue {
    const values = this.column(column).filter(v => v !== null && v !== undefined);
    return computeAggregate(values, fn);
  }

  /**
   * Compute summary statistics for all numerical columns
   */
  describe(): DataFrame {
    const numericCols = this._schema.filter(s => s.primitiveType === 'number');
    const rows: Row[] = [];

    const stats = ['count', 'mean', 'min', 'max', 'stdDev'] as const;
    stats.forEach(stat => {
      const row: Row = { statistic: stat };
      numericCols.forEach(col => {
        const values = this.column<number>(col.name).filter(v => v !== null && !isNaN(v));
        row[col.name] = computeAggregate(values, stat === 'count' ? 'count' : stat as AggregateFunction);
      });
      rows.push(row);
    });

    return new DataFrame(rows);
  }

  // ===========================================================================
  // RESHAPING OPERATIONS
  // ===========================================================================

  /**
   * Pivot (wide format) - like spread/pivot_wider
   */
  pivot(spec: PivotSpec): DataFrame {
    const { index, columns: pivotCol, values, aggFunction } = spec;
    
    // Get unique values for pivot column
    const pivotValues = [...new Set(this.column<string>(pivotCol))];
    
    // Group by index columns
    const groups = new Map<string, Row[]>();
    this._rows.forEach(row => {
      const key = index.map(c => JSON.stringify(row[c])).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    });

    // Create pivoted rows
    const results: Row[] = [];
    groups.forEach((rows) => {
      const result: Row = {};
      
      // Index columns
      index.forEach(col => {
        result[col] = rows[0][col];
      });

      // Pivoted value columns
      pivotValues.forEach(pv => {
        const matchingRows = rows.filter(r => r[pivotCol] === pv);
        const vals = matchingRows.map(r => r[values]).filter(v => v !== null && v !== undefined);
        result[String(pv)] = vals.length > 0 ? computeAggregate(vals, aggFunction) : null;
      });

      results.push(result);
    });

    return new DataFrame(results);
  }

  /**
   * Melt (long format) - like gather/pivot_longer
   */
  melt(idColumns: string[], valueColumns?: string[], varName = 'variable', valueName = 'value'): DataFrame {
    const valueCols = valueColumns || this._columns.filter(c => !idColumns.includes(c));
    const results: Row[] = [];

    this._rows.forEach(row => {
      valueCols.forEach(col => {
        const newRow: Row = {};
        idColumns.forEach(id => {
          newRow[id] = row[id];
        });
        newRow[varName] = col;
        newRow[valueName] = row[col];
        results.push(newRow);
      });
    });

    return new DataFrame(results);
  }

  /**
   * Transpose rows and columns
   */
  transpose(headerColumn?: string): DataFrame {
    const headers = headerColumn 
      ? this.column<string>(headerColumn)
      : this._rows.map((_, i) => `row_${i}`);
    
    const dataCols = headerColumn 
      ? this._columns.filter(c => c !== headerColumn)
      : this._columns;

    const newRows: Row[] = dataCols.map(col => {
      const row: Row = { column: col };
      headers.forEach((header, i) => {
        row[String(header)] = this._rows[i][col];
      });
      return row;
    });

    return new DataFrame(newRows);
  }

  // ===========================================================================
  // JOIN OPERATIONS
  // ===========================================================================

  /**
   * Join with another DataFrame
   */
  join(other: DataFrame, leftKey: string | string[], rightKey?: string | string[], type: 'inner' | 'left' | 'right' | 'outer' = 'inner'): DataFrame {
    const leftKeys = Array.isArray(leftKey) ? leftKey : [leftKey];
    const rightKeys = rightKey 
      ? (Array.isArray(rightKey) ? rightKey : [rightKey])
      : leftKeys;

    // Build index for right table
    const rightIndex = new Map<string, Row[]>();
    other._rows.forEach(row => {
      const key = rightKeys.map(k => JSON.stringify(row[k])).join('|');
      if (!rightIndex.has(key)) rightIndex.set(key, []);
      rightIndex.get(key)!.push(row);
    });

    const results: Row[] = [];
    const matchedRight = new Set<string>();

    // Process left table
    this._rows.forEach(leftRow => {
      const key = leftKeys.map(k => JSON.stringify(leftRow[k])).join('|');
      const rightRows = rightIndex.get(key) || [];

      if (rightRows.length > 0) {
        rightRows.forEach(rightRow => {
          results.push(mergeRows(leftRow, rightRow, rightKeys));
          matchedRight.add(key);
        });
      } else if (type === 'left' || type === 'outer') {
        results.push({ ...leftRow });
      }
    });

    // Add unmatched right rows for right/outer joins
    if (type === 'right' || type === 'outer') {
      other._rows.forEach(rightRow => {
        const key = rightKeys.map(k => JSON.stringify(rightRow[k])).join('|');
        if (!matchedRight.has(key)) {
          results.push({ ...rightRow });
        }
      });
    }

    return new DataFrame(results);
  }

  // ===========================================================================
  // VISUALIZATION CONVERSIONS
  // ===========================================================================

  /**
   * Convert to DataPoint array for simple visualizations
   */
  toDataPoints(labelColumn: string, valueColumn: string, options?: {
    categoryColumn?: string;
    dateColumn?: string;
  }): DataPoint[] {
    return this._rows.map(row => ({
      label: String(row[labelColumn] ?? ''),
      value: Number(row[valueColumn] ?? 0),
      category: options?.categoryColumn ? String(row[options.categoryColumn]) : undefined,
      date: options?.dateColumn ? row[options.dateColumn] as string | Date : undefined,
    }));
  }

  /**
   * Convert to hierarchical data for treemap/sunburst
   */
  toHierarchy(levelColumns: string[], valueColumn: string): HierarchicalData {
    if (levelColumns.length === 0) {
      return { name: 'root', value: this.aggregate(valueColumn, 'sum') as number };
    }

    const buildLevel = (rows: Row[], levels: string[]): HierarchicalData[] => {
      if (levels.length === 0) {
        return rows.map(row => ({
          name: String(Object.values(row).find(v => typeof v === 'string') || 'item'),
          value: Number(row[valueColumn] ?? 0),
        }));
      }

      const [currentLevel, ...remainingLevels] = levels;
      const groups = new Map<string, Row[]>();

      rows.forEach(row => {
        const key = String(row[currentLevel] ?? 'Unknown');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      });

      return Array.from(groups.entries()).map(([name, groupRows]) => ({
        name,
        children: remainingLevels.length > 0 
          ? buildLevel(groupRows, remainingLevels)
          : groupRows.map(row => ({
              name: String(row[remainingLevels[0] ?? levelColumns[levelColumns.length - 1]] ?? 'item'),
              value: Number(row[valueColumn] ?? 0),
            })),
        value: remainingLevels.length === 0 
          ? groupRows.reduce((sum, row) => sum + Number(row[valueColumn] ?? 0), 0)
          : undefined,
      }));
    };

    return {
      name: 'root',
      children: buildLevel(this._rows, levelColumns),
    };
  }

  /**
   * Convert to network data for force-directed graphs
   */
  toNetwork(sourceColumn: string, targetColumn: string, options?: {
    valueColumn?: string;
    nodeValueColumn?: string;
    nodeGroupColumn?: string;
  }): NetworkData {
    const nodeSet = new Set<string>();
    const links: NetworkData['links'] = [];

    this._rows.forEach(row => {
      const source = String(row[sourceColumn]);
      const target = String(row[targetColumn]);
      nodeSet.add(source);
      nodeSet.add(target);
      links.push({
        source,
        target,
        value: options?.valueColumn ? Number(row[options.valueColumn]) : 1,
      });
    });

    const nodes: NetworkData['nodes'] = Array.from(nodeSet).map(id => ({
      id,
      name: id,
      group: options?.nodeGroupColumn 
        ? Number(this._rows.find(r => r[sourceColumn] === id || r[targetColumn] === id)?.[options.nodeGroupColumn])
        : 0,
      value: options?.nodeValueColumn
        ? Number(this._rows.find(r => r[sourceColumn] === id)?.[options.nodeValueColumn])
        : undefined,
    }));

    return { nodes, links };
  }

  /**
   * Convert to heatmap data
   */
  toHeatmap(rowColumn: string, columnColumn: string, valueColumn: string): HeatmapData {
    const rows = [...new Set(this.column<string>(rowColumn))];
    const columns = [...new Set(this.column<string>(columnColumn))];

    // Create value lookup
    const valueMap = new Map<string, number>();
    this._rows.forEach(row => {
      const key = `${row[rowColumn]}|${row[columnColumn]}`;
      valueMap.set(key, Number(row[valueColumn] ?? 0));
    });

    // Build matrix
    const values = rows.map(r =>
      columns.map(c => valueMap.get(`${r}|${c}`) ?? 0)
    );

    return { rows, columns, values };
  }

  /**
   * Convert to time series map (for multi-line charts)
   */
  toTimeSeries(dateColumn: string, valueColumn: string, seriesColumn: string): Map<string, DataPoint[]> {
    const series = new Map<string, DataPoint[]>();

    this._rows.forEach(row => {
      const seriesKey = String(row[seriesColumn]);
      if (!series.has(seriesKey)) series.set(seriesKey, []);
      
      series.get(seriesKey)!.push({
        label: String(row[dateColumn]),
        value: Number(row[valueColumn] ?? 0),
        date: row[dateColumn] as string | Date,
        category: seriesKey,
      });
    });

    // Sort each series by date
    series.forEach(points => {
      points.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    });

    return series;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function parseValue(value: string): PrimitiveValue {
  if (value === '' || value === 'null' || value === 'NULL') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') return num;
  
  // Try parsing as date
  const date = new Date(value);
  if (!isNaN(date.getTime()) && /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value)) {
    return date;
  }
  
  return value;
}

function inferPrimitiveType(values: PrimitiveValue[]): ColumnSchema['primitiveType'] {
  if (values.length === 0) return 'string';
  
  const sample = values.slice(0, 100);
  const types = new Set(sample.map(v => {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'boolean';
    if (v instanceof Date) return 'date';
    if (typeof v === 'object') return 'object';
    return 'string';
  }));

  types.delete('null');
  
  if (types.size === 1) {
    const result = types.values().next().value;
    if (result === 'number' || result === 'boolean' || result === 'date' || result === 'object') {
      return result;
    }
  }
  if (types.has('number') && types.size === 1) return 'number';
  return 'string';
}

function inferSemanticType(name: string, values: PrimitiveValue[], primitiveType: string): SemanticType {
  const lowerName = name.toLowerCase();
  
  // Check name patterns
  if (/^(id|_id|key)$/i.test(lowerName) || lowerName.endsWith('_id')) return 'identifier';
  if (/date|time|year|month|day|created|updated/i.test(lowerName)) return 'temporal';
  if (/country|city|state|region|lat|lng|longitude|latitude|geo|location/i.test(lowerName)) return 'geographical';
  if (/type|category|status|class|kind|group/i.test(lowerName)) return 'categorical';
  
  // Check value patterns
  if (primitiveType === 'boolean') return 'boolean';
  if (primitiveType === 'date') return 'temporal';
  if (primitiveType === 'number') {
    const uniqueValues = new Set(values).size;
    const ratio = uniqueValues / values.length;
    // If few unique values relative to count, likely ordinal
    if (uniqueValues <= 10 && ratio < 0.1) return 'ordinal';
    return 'quantitative';
  }
  
  // String type inference
  if (primitiveType === 'string') {
    const uniqueValues = new Set(values).size;
    const ratio = uniqueValues / values.length;
    
    // Check for year patterns
    if (values.every(v => /^\d{4}$/.test(String(v)))) return 'temporal';
    
    // Low cardinality = categorical
    if (uniqueValues <= 20 || ratio < 0.1) return 'categorical';
    
    // High cardinality strings are likely text or identifiers
    if (ratio > 0.9) return 'identifier';
    
    return 'nominal';
  }
  
  return 'categorical';
}

function computeStatistics(values: number[]): ColumnStatistics {
  if (values.length === 0) return {};
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];
  
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];

  return {
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    median,
    stdDev,
    quartiles: [q1, median, q3],
  };
}

function computeAggregate(values: PrimitiveValue[], fn: AggregateFunction): PrimitiveValue {
  if (values.length === 0) return null;
  
  const nums = values.filter(v => typeof v === 'number') as number[];
  
  switch (fn) {
    case 'count':
      return values.length;
    case 'countDistinct':
      return new Set(values.map(v => JSON.stringify(v))).size;
    case 'sum':
      return nums.reduce((a, b) => a + b, 0);
    case 'mean':
      return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    case 'median': {
      if (nums.length === 0) return null;
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
    case 'min':
      return nums.length > 0 ? Math.min(...nums) : null;
    case 'max':
      return nums.length > 0 ? Math.max(...nums) : null;
    case 'first':
      return values[0];
    case 'last':
      return values[values.length - 1];
    case 'variance': {
      if (nums.length === 0) return null;
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      return nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / nums.length;
    }
    case 'stdDev': {
      const variance = computeAggregate(values, 'variance');
      return variance !== null ? Math.sqrt(variance as number) : null;
    }
    default:
      return null;
  }
}

function createFilterPredicate(condition: FilterCondition): (row: Row) => boolean {
  const { column, operator, value } = condition;
  
  const ops: Record<FilterOperator, (rowVal: PrimitiveValue) => boolean> = {
    eq: (v) => v === value,
    neq: (v) => v !== value,
    gt: (v) => typeof v === 'number' && typeof value === 'number' && v > value,
    gte: (v) => typeof v === 'number' && typeof value === 'number' && v >= value,
    lt: (v) => typeof v === 'number' && typeof value === 'number' && v < value,
    lte: (v) => typeof v === 'number' && typeof value === 'number' && v <= value,
    contains: (v) => typeof v === 'string' && typeof value === 'string' && v.includes(value),
    startsWith: (v) => typeof v === 'string' && typeof value === 'string' && v.startsWith(value),
    endsWith: (v) => typeof v === 'string' && typeof value === 'string' && v.endsWith(value),
    in: (v) => Array.isArray(value) && value.includes(v),
    notIn: (v) => Array.isArray(value) && !value.includes(v),
    between: (v) => {
      if (typeof v !== 'number' || !Array.isArray(value)) return false;
      const [min, max] = value as number[];
      return v >= min && v <= max;
    },
    isNull: (v) => v === null || v === undefined,
    isNotNull: (v) => v !== null && v !== undefined,
  };

  return (row) => ops[operator](row[column]);
}

function compareValues(a: PrimitiveValue, b: PrimitiveValue): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  
  return String(a).localeCompare(String(b));
}

function mergeRows(left: Row, right: Row, rightKeys: string[]): Row {
  const result = { ...left };
  Object.entries(right).forEach(([key, value]) => {
    if (!rightKeys.includes(key)) {
      // Prefix right columns that conflict
      const newKey = key in result ? `right_${key}` : key;
      result[newKey] = value;
    }
  });
  return result;
}

export default DataFrame;
