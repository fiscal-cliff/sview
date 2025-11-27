/**
 * Data Transformation Pipeline
 * A declarative, composable pipeline for data transformations
 * Based on the Grammar of Data Manipulation (dplyr) and Observable's Plot
 */

import { DataFrame } from './DataFrame';
import type {
  Row,
  PrimitiveValue,
  TransformStep,
  AggregateFunction,
  SortDirection,
  FilterCondition,
  GroupBySpec,
  PivotSpec,
  WindowSpec,
  TabularData,
} from '../types';

/**
 * Pipeline builder for declarative data transformations
 * Supports lazy evaluation and operation chaining
 */
export class Pipeline {
  private steps: TransformStep[] = [];
  private _source: DataFrame | null = null;

  /**
   * Create pipeline from data source
   */
  static from(data: Row[] | TabularData | DataFrame): Pipeline {
    const pipeline = new Pipeline();
    pipeline._source = data instanceof DataFrame ? data : new DataFrame(data);
    return pipeline;
  }

  /**
   * Create pipeline from CSV
   */
  static fromCSV(csv: string): Pipeline {
    const pipeline = new Pipeline();
    pipeline._source = DataFrame.fromCSV(csv);
    return pipeline;
  }

  /**
   * Create pipeline from JSON
   */
  static fromJSON(json: string | unknown[]): Pipeline {
    const pipeline = new Pipeline();
    pipeline._source = DataFrame.fromJSON(json);
    return pipeline;
  }

  // ===========================================================================
  // SELECTION & PROJECTION
  // ===========================================================================

  /**
   * Select columns to keep
   */
  select(...columns: string[]): Pipeline {
    this.steps.push({ type: 'select', columns });
    return this;
  }

  /**
   * Rename columns
   */
  rename(mapping: Record<string, string>): Pipeline {
    this.steps.push({ type: 'rename', mapping });
    return this;
  }

  // ===========================================================================
  // FILTERING
  // ===========================================================================

  /**
   * Filter rows based on condition
   */
  filter(condition: FilterCondition): Pipeline {
    this.steps.push({ type: 'filter', condition });
    return this;
  }

  /**
   * Filter where column equals value
   */
  where(column: string, value: PrimitiveValue): Pipeline {
    return this.filter({ column, operator: 'eq', value });
  }

  /**
   * Filter where column is in list
   */
  whereIn(column: string, values: PrimitiveValue[]): Pipeline {
    return this.filter({ column, operator: 'in', value: values });
  }

  /**
   * Filter where column is between min and max
   */
  whereBetween(column: string, min: number, max: number): Pipeline {
    return this.filter({ column, operator: 'between', value: [min, max] });
  }

  /**
   * Filter where column is not null
   */
  whereNotNull(column: string): Pipeline {
    return this.filter({ column, operator: 'isNotNull', value: null });
  }

  // ===========================================================================
  // SORTING
  // ===========================================================================

  /**
   * Sort by column
   */
  sort(column: string, direction: SortDirection = 'asc'): Pipeline {
    this.steps.push({ type: 'sort', column, direction });
    return this;
  }

  /**
   * Sort ascending
   */
  sortAsc(column: string): Pipeline {
    return this.sort(column, 'asc');
  }

  /**
   * Sort descending
   */
  sortDesc(column: string): Pipeline {
    return this.sort(column, 'desc');
  }

  // ===========================================================================
  // GROUPING & AGGREGATION
  // ===========================================================================

  /**
   * Group by columns and aggregate
   */
  groupBy(spec: GroupBySpec): Pipeline {
    this.steps.push({ type: 'groupBy', spec });
    return this;
  }

  /**
   * Simple group by with single aggregation
   */
  summarize(
    groupColumns: string[],
    valueColumn: string,
    aggFunction: AggregateFunction,
    alias?: string
  ): Pipeline {
    return this.groupBy({
      columns: groupColumns,
      aggregations: [{ column: valueColumn, function: aggFunction, alias }],
    });
  }

  /**
   * Count by group
   */
  countBy(...columns: string[]): Pipeline {
    return this.groupBy({
      columns,
      aggregations: [{ column: columns[0], function: 'count', alias: 'count' }],
    });
  }

  /**
   * Sum by group
   */
  sumBy(groupColumns: string[], valueColumn: string): Pipeline {
    return this.summarize(groupColumns, valueColumn, 'sum', `sum_${valueColumn}`);
  }

  /**
   * Average by group
   */
  avgBy(groupColumns: string[], valueColumn: string): Pipeline {
    return this.summarize(groupColumns, valueColumn, 'mean', `avg_${valueColumn}`);
  }

  // ===========================================================================
  // RESHAPING
  // ===========================================================================

  /**
   * Pivot to wide format
   */
  pivot(spec: PivotSpec): Pipeline {
    this.steps.push({ type: 'pivot', spec });
    return this;
  }

  /**
   * Fold/melt to long format
   */
  fold(columns: string[], keyName = 'variable', valueName = 'value'): Pipeline {
    this.steps.push({ type: 'fold', columns, as: [keyName, valueName] });
    return this;
  }

  /**
   * Unfold/spread to wide format
   */
  unfold(keyColumn: string, valueColumn: string): Pipeline {
    this.steps.push({ type: 'unfold', keyColumn, valueColumn });
    return this;
  }

  // ===========================================================================
  // DERIVED COLUMNS
  // ===========================================================================

  /**
   * Add computed column using expression
   */
  derive(name: string, expression: string): Pipeline {
    this.steps.push({ type: 'derive', name, expression });
    return this;
  }

  // ===========================================================================
  // WINDOW FUNCTIONS
  // ===========================================================================

  /**
   * Apply window function
   */
  window(spec: WindowSpec): Pipeline {
    this.steps.push({ type: 'window', spec });
    return this;
  }

  /**
   * Add row number column
   */
  rowNumber(orderBy?: string): Pipeline {
    return this.window({
      function: 'rowNumber',
      orderBy: orderBy ? [{ column: orderBy, direction: 'asc' }] : undefined,
    });
  }

  /**
   * Add cumulative sum column
   */
  cumSum(column: string): Pipeline {
    return this.window({
      function: 'cumSum',
      orderBy: [{ column, direction: 'asc' }],
    });
  }

  // ===========================================================================
  // SAMPLING
  // ===========================================================================

  /**
   * Random sample of n rows
   */
  sample(n: number, seed?: number): Pipeline {
    this.steps.push({ type: 'sample', n, seed });
    return this;
  }

  // ===========================================================================
  // FLATTENING
  // ===========================================================================

  /**
   * Flatten array column into multiple rows
   */
  flatten(column: string): Pipeline {
    this.steps.push({ type: 'flatten', column });
    return this;
  }

  // ===========================================================================
  // EXECUTION
  // ===========================================================================

  /**
   * Execute pipeline and return DataFrame
   */
  execute(): DataFrame {
    if (!this._source) {
      throw new Error('Pipeline has no data source');
    }

    let df = this._source;

    for (const step of this.steps) {
      df = this.applyStep(df, step);
    }

    return df;
  }

  /**
   * Execute and return raw rows
   */
  toRows(): Row[] {
    return this.execute().rows;
  }

  /**
   * Execute and return TabularData
   */
  toTabular(): TabularData {
    return this.execute().toTabular();
  }

  /**
   * Apply single transformation step
   */
  private applyStep(df: DataFrame, step: TransformStep): DataFrame {
    switch (step.type) {
      case 'filter':
        return df.filter(step.condition);
      
      case 'sort':
        return df.sort(step.column);
      
      case 'groupBy':
        return df.groupBy(step.spec);
      
      case 'pivot':
        return df.pivot(step.spec);
      
      case 'select':
        return df.select(...step.columns);
      
      case 'rename':
        return df.rename(step.mapping);
      
      case 'derive':
        return this.applyDerive(df, step.name, step.expression);
      
      case 'sample':
        return this.applySample(df, step.n, step.seed);
      
      case 'fold':
        return this.applyFold(df, step.columns, step.as);
      
      case 'unfold':
        return this.applyUnfold(df, step.keyColumn, step.valueColumn);
      
      case 'flatten':
        return this.applyFlatten(df, step.column);
      
      case 'window':
        return this.applyWindow(df, step.spec);
      
      default:
        return df;
    }
  }

  private applyDerive(df: DataFrame, name: string, expression: string): DataFrame {
    // Simple expression parser for common operations
    // Supports: column references, arithmetic, simple functions
    return df.derive(name, (row) => {
      try {
        // Replace column references with values
        let expr = expression;
        df.columns.forEach(col => {
          const regex = new RegExp(`\\b${col}\\b`, 'g');
          const value = row[col];
          expr = expr.replace(regex, typeof value === 'string' ? `"${value}"` : String(value));
        });
        
        // Safe evaluation using Function constructor
        return new Function(`return ${expr}`)();
      } catch {
        return null;
      }
    });
  }

  private applySample(df: DataFrame, n: number, seed?: number): DataFrame {
    const rows = df.rows;
    const sampleSize = Math.min(n, rows.length);
    
    // Simple seeded random for reproducibility
    const random = seed !== undefined
      ? (() => {
          let s = seed;
          return () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
          };
        })()
      : Math.random;

    // Fisher-Yates shuffle and take first n
    const shuffled = [...rows];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return new DataFrame(shuffled.slice(0, sampleSize));
  }

  private applyFold(df: DataFrame, columns: string[], names: [string, string]): DataFrame {
    const [keyName, valueName] = names;
    const idCols = df.columns.filter(c => !columns.includes(c));
    return df.melt(idCols, columns, keyName, valueName);
  }

  private applyUnfold(df: DataFrame, keyColumn: string, valueColumn: string): DataFrame {
    const idCols = df.columns.filter(c => c !== keyColumn && c !== valueColumn);
    return df.pivot({
      index: idCols,
      columns: keyColumn,
      values: valueColumn,
      aggFunction: 'first',
    });
  }

  private applyFlatten(df: DataFrame, column: string): DataFrame {
    const rows: Row[] = [];
    
    df.rows.forEach(row => {
      const value = row[column];
      if (Array.isArray(value)) {
        value.forEach(v => {
          rows.push({ ...row, [column]: v });
        });
      } else {
        rows.push(row);
      }
    });

    return new DataFrame(rows);
  }

  private applyWindow(df: DataFrame, spec: WindowSpec): DataFrame {
    const { function: fn, partition, orderBy } = spec;
    
    // Sort if orderBy specified
    let sortedDf = df;
    if (orderBy && orderBy.length > 0) {
      sortedDf = df.sort(orderBy.map(o => ({ column: o.column, direction: o.direction })));
    }

    const rows = sortedDf.rows;
    
    // Group by partition if specified
    const groups = new Map<string, { indices: number[]; rows: Row[] }>();
    rows.forEach((row, i) => {
      const key = partition ? partition.map(p => JSON.stringify(row[p])).join('|') : '__all__';
      if (!groups.has(key)) groups.set(key, { indices: [], rows: [] });
      groups.get(key)!.indices.push(i);
      groups.get(key)!.rows.push(row);
    });

    const resultRows = [...rows];
    const alias = `${fn}_result`;

    groups.forEach(({ indices, rows: groupRows }) => {
      groupRows.forEach((_row, groupIndex) => {
        const globalIndex = indices[groupIndex];
        let value: PrimitiveValue = null;

        switch (fn) {
          case 'rowNumber':
            value = groupIndex + 1;
            break;
          case 'rank':
            value = groupIndex + 1; // Simplified rank
            break;
          case 'cumSum': {
            const valueCol = orderBy?.[0]?.column || df.columns[0];
            value = groupRows.slice(0, groupIndex + 1)
              .reduce((sum, r) => sum + (Number(r[valueCol]) || 0), 0);
            break;
          }
          case 'lag': {
            const valueCol = orderBy?.[0]?.column || df.columns[0];
            value = groupIndex > 0 ? groupRows[groupIndex - 1][valueCol] : null;
            break;
          }
          case 'lead': {
            const valueCol = orderBy?.[0]?.column || df.columns[0];
            value = groupIndex < groupRows.length - 1 ? groupRows[groupIndex + 1][valueCol] : null;
            break;
          }
        }

        resultRows[globalIndex] = { ...resultRows[globalIndex], [alias]: value };
      });
    });

    return new DataFrame(resultRows);
  }

  /**
   * Get pipeline steps for inspection
   */
  getSteps(): TransformStep[] {
    return [...this.steps];
  }

  /**
   * Clone pipeline
   */
  clone(): Pipeline {
    const cloned = new Pipeline();
    cloned._source = this._source;
    cloned.steps = [...this.steps];
    return cloned;
  }
}

// =============================================================================
// UTILITY FUNCTIONS FOR COMMON TRANSFORMATIONS
// =============================================================================

/**
 * Quick aggregation helper
 */
export function aggregate(
  data: Row[],
  groupBy: string[],
  aggregations: { column: string; function: AggregateFunction; alias?: string }[]
): Row[] {
  return Pipeline.from(data)
    .groupBy({ columns: groupBy, aggregations })
    .toRows();
}

/**
 * Quick pivot helper
 */
export function pivot(
  data: Row[],
  index: string[],
  columns: string,
  values: string,
  aggFunction: AggregateFunction = 'sum'
): Row[] {
  return Pipeline.from(data)
    .pivot({ index, columns, values, aggFunction })
    .toRows();
}

/**
 * Quick melt/unpivot helper
 */
export function melt(
  data: Row[],
  idColumns: string[],
  valueColumns?: string[]
): Row[] {
  const df = new DataFrame(data);
  const valueCols = valueColumns || df.columns.filter(c => !idColumns.includes(c));
  return df.melt(idColumns, valueCols).rows;
}

/**
 * Bin numerical values into ranges
 */
export function bin(
  data: Row[],
  column: string,
  bins: number | number[],
  alias = 'bin'
): Row[] {
  const df = new DataFrame(data);
  const values = df.column<number>(column).filter(v => v !== null && !isNaN(v));
  
  let edges: number[];
  if (typeof bins === 'number') {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const step = (max - min) / bins;
    edges = Array.from({ length: bins + 1 }, (_, i) => min + i * step);
  } else {
    edges = bins;
  }

  return df.derive(alias, (row) => {
    const val = row[column] as number;
    if (val === null || val === undefined) return null;
    
    for (let i = 0; i < edges.length - 1; i++) {
      if (val >= edges[i] && val < edges[i + 1]) {
        return `${edges[i].toFixed(1)}-${edges[i + 1].toFixed(1)}`;
      }
    }
    return `>=${edges[edges.length - 1].toFixed(1)}`;
  }).rows;
}

/**
 * Normalize numerical column to 0-1 range
 */
export function normalize(data: Row[], column: string, alias?: string): Row[] {
  const df = new DataFrame(data);
  const values = df.column<number>(column).filter(v => v !== null && !isNaN(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return df.derive(alias || `${column}_normalized`, (row) => {
    const val = row[column] as number;
    return val !== null ? (val - min) / range : null;
  }).rows;
}

/**
 * Z-score standardization
 */
export function standardize(data: Row[], column: string, alias?: string): Row[] {
  const df = new DataFrame(data);
  const values = df.column<number>(column).filter(v => v !== null && !isNaN(v));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length);

  return df.derive(alias || `${column}_standardized`, (row) => {
    const val = row[column] as number;
    return val !== null && stdDev !== 0 ? (val - mean) / stdDev : null;
  }).rows;
}

export default Pipeline;
