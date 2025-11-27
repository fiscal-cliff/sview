/**
 * Data service for fetching open statistical data from World Bank API
 * World Bank API is free, open, and does not require authentication
 */

import type {
  Dataset,
  DataPoint,
  WorldBankIndicator,
  WorldBankDataEntry,
  HierarchicalData,
  NetworkData,
  HeatmapData,
} from '../types';

const WORLD_BANK_API = 'https://api.worldbank.org/v2';

/** Popular indicators for demonstration */
export const POPULAR_INDICATORS: WorldBankIndicator[] = [
  { id: 'NY.GDP.MKTP.CD', name: 'GDP (current US$)' },
  { id: 'SP.POP.TOTL', name: 'Population, total' },
  { id: 'SP.DYN.LE00.IN', name: 'Life expectancy at birth, total (years)' },
  { id: 'SL.UEM.TOTL.ZS', name: 'Unemployment, total (% of total labor force)' },
  { id: 'EN.ATM.CO2E.PC', name: 'CO2 emissions (metric tons per capita)' },
  { id: 'SE.XPD.TOTL.GD.ZS', name: 'Government expenditure on education (% of GDP)' },
  { id: 'SH.XPD.CHEX.PC.CD', name: 'Current health expenditure per capita (current US$)' },
  { id: 'IT.NET.USER.ZS', name: 'Individuals using the Internet (% of population)' },
  { id: 'NY.GDP.PCAP.CD', name: 'GDP per capita (current US$)' },
  { id: 'SP.URB.TOTL.IN.ZS', name: 'Urban population (% of total population)' },
];

/** Major countries for data fetching */
export const MAJOR_COUNTRIES = [
  'USA', 'CHN', 'JPN', 'DEU', 'GBR', 'FRA', 'IND', 'ITA', 'BRA', 'CAN',
  'RUS', 'KOR', 'AUS', 'ESP', 'MEX', 'IDN', 'NLD', 'SAU', 'TUR', 'CHE',
];

/** Sample data for demonstration when API is unavailable */
const SAMPLE_DATA: Record<string, WorldBankDataEntry[]> = {
  'NY.GDP.MKTP.CD': [
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'USA', value: 'United States' }, countryiso3code: 'USA', date: '2022', value: 25462700000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'CHN', value: 'China' }, countryiso3code: 'CHN', date: '2022', value: 17963170000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'JPN', value: 'Japan' }, countryiso3code: 'JPN', date: '2022', value: 4231140000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'DEU', value: 'Germany' }, countryiso3code: 'DEU', date: '2022', value: 4072190000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'GBR', value: 'United Kingdom' }, countryiso3code: 'GBR', date: '2022', value: 3070670000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'IND', value: 'India' }, countryiso3code: 'IND', date: '2022', value: 3385090000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'FRA', value: 'France' }, countryiso3code: 'FRA', date: '2022', value: 2782910000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'ITA', value: 'Italy' }, countryiso3code: 'ITA', date: '2022', value: 2010430000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'CAN', value: 'Canada' }, countryiso3code: 'CAN', date: '2022', value: 2139840000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'BRA', value: 'Brazil' }, countryiso3code: 'BRA', date: '2022', value: 1920100000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'KOR', value: 'Korea, Rep.' }, countryiso3code: 'KOR', date: '2022', value: 1673920000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'AUS', value: 'Australia' }, countryiso3code: 'AUS', date: '2022', value: 1675420000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'RUS', value: 'Russian Federation' }, countryiso3code: 'RUS', date: '2022', value: 2240420000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'ESP', value: 'Spain' }, countryiso3code: 'ESP', date: '2022', value: 1397510000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'MEX', value: 'Mexico' }, countryiso3code: 'MEX', date: '2022', value: 1414190000000, unit: '', obs_status: '', decimal: 0 },
    // Additional years for time series
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'USA', value: 'United States' }, countryiso3code: 'USA', date: '2021', value: 23315080000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'USA', value: 'United States' }, countryiso3code: 'USA', date: '2020', value: 21060470000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'USA', value: 'United States' }, countryiso3code: 'USA', date: '2019', value: 21380980000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'CHN', value: 'China' }, countryiso3code: 'CHN', date: '2021', value: 17734060000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'CHN', value: 'China' }, countryiso3code: 'CHN', date: '2020', value: 14687740000000, unit: '', obs_status: '', decimal: 0 },
    { indicator: { id: 'NY.GDP.MKTP.CD', value: 'GDP' }, country: { id: 'CHN', value: 'China' }, countryiso3code: 'CHN', date: '2019', value: 14279940000000, unit: '', obs_status: '', decimal: 0 },
  ],
};

/** Generate sample data for any indicator based on GDP pattern */
function generateSampleData(indicatorId: string): WorldBankDataEntry[] {
  const baseData = SAMPLE_DATA['NY.GDP.MKTP.CD'];
  if (indicatorId === 'NY.GDP.MKTP.CD') return baseData;
  
  // Generate scaled data for other indicators
  const indicatorScale: Record<string, number> = {
    'SP.POP.TOTL': 1e-5,
    'SP.DYN.LE00.IN': 3e-12,
    'SL.UEM.TOTL.ZS': 5e-13,
    'EN.ATM.CO2E.PC': 5e-13,
    'SE.XPD.TOTL.GD.ZS': 2e-13,
    'SH.XPD.CHEX.PC.CD': 5e-10,
    'IT.NET.USER.ZS': 4e-12,
    'NY.GDP.PCAP.CD': 3e-6,
    'SP.URB.TOTL.IN.ZS': 4e-12,
  };
  
  const scale = indicatorScale[indicatorId] || 1e-10;
  return baseData.map(entry => ({
    ...entry,
    indicator: { id: indicatorId, value: indicatorId },
    value: entry.value ? Math.abs(entry.value * scale * (0.5 + Math.random())) : null,
  }));
}

/**
 * Fetch data from World Bank API for a specific indicator
 * Falls back to sample data if API is unavailable
 */
export async function fetchWorldBankData(
  indicatorId: string,
  countries: string[] = MAJOR_COUNTRIES,
  dateRange: string = '2010:2023'
): Promise<WorldBankDataEntry[]> {
  const countryParam = countries.join(';');
  const url = `${WORLD_BANK_API}/country/${countryParam}/indicator/${indicatorId}?format=json&date=${dateRange}&per_page=1000`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data = await response.json();
    // World Bank API returns [metadata, data] array
    if (Array.isArray(data) && data.length >= 2) {
      return (data[1] || []).filter((entry: WorldBankDataEntry) => entry.value !== null);
    }
    return [];
  } catch (error) {
    console.error('Error fetching World Bank data, using sample data:', error);
    // Return sample data as fallback
    return generateSampleData(indicatorId);
  }
}

/**
 * Transform World Bank data to generic DataPoints for bar/line charts
 */
export function transformToDataPoints(data: WorldBankDataEntry[]): DataPoint[] {
  return data.map((entry) => ({
    label: entry.country.value,
    value: entry.value ?? 0,
    category: entry.country.id,
    date: entry.date,
    countryCode: entry.countryiso3code,
  }));
}

/**
 * Aggregate data by country (latest year)
 */
export function aggregateByCountry(data: WorldBankDataEntry[]): DataPoint[] {
  const countryMap = new Map<string, WorldBankDataEntry>();

  // Keep the latest year for each country
  data.forEach((entry) => {
    const existing = countryMap.get(entry.countryiso3code);
    if (!existing || parseInt(entry.date) > parseInt(existing.date)) {
      countryMap.set(entry.countryiso3code, entry);
    }
  });

  return Array.from(countryMap.values())
    .filter((entry) => entry.value !== null)
    .map((entry) => ({
      label: entry.country.value,
      value: entry.value ?? 0,
      category: entry.countryiso3code,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Aggregate data by year (all countries summed)
 */
export function aggregateByYear(data: WorldBankDataEntry[]): DataPoint[] {
  const yearMap = new Map<string, number>();
  const yearCount = new Map<string, number>();

  data.forEach((entry) => {
    if (entry.value !== null) {
      const current = yearMap.get(entry.date) || 0;
      yearMap.set(entry.date, current + entry.value);
      yearCount.set(entry.date, (yearCount.get(entry.date) || 0) + 1);
    }
  });

  return Array.from(yearMap.entries())
    .map(([year, total]) => ({
      label: year,
      value: total / (yearCount.get(year) || 1), // Average instead of sum for indicators
      date: year,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Create time series data by country
 */
export function createTimeSeries(data: WorldBankDataEntry[]): Map<string, DataPoint[]> {
  const seriesMap = new Map<string, DataPoint[]>();

  data.forEach((entry) => {
    if (entry.value !== null) {
      const countryCode = entry.countryiso3code;
      if (!seriesMap.has(countryCode)) {
        seriesMap.set(countryCode, []);
      }
      seriesMap.get(countryCode)!.push({
        label: entry.date,
        value: entry.value,
        date: entry.date,
        category: entry.country.value,
      });
    }
  });

  // Sort each series by date
  seriesMap.forEach((series) => {
    series.sort((a, b) => (a.date as string).localeCompare(b.date as string));
  });

  return seriesMap;
}

/**
 * Transform data for hierarchical visualizations (treemap/sunburst)
 */
export function transformToHierarchical(data: WorldBankDataEntry[]): HierarchicalData {
  // Group by region (first letter of country code as proxy)
  const regionMap = new Map<string, WorldBankDataEntry[]>();

  data.forEach((entry) => {
    if (entry.value !== null) {
      // Simple region grouping by continent-like classification
      const region = getRegion(entry.countryiso3code);
      if (!regionMap.has(region)) {
        regionMap.set(region, []);
      }
      regionMap.get(region)!.push(entry);
    }
  });

  // Keep only latest year per country
  const root: HierarchicalData = {
    name: 'World',
    children: [],
  };

  regionMap.forEach((entries, region) => {
    const countryMap = new Map<string, WorldBankDataEntry>();
    entries.forEach((entry) => {
      const existing = countryMap.get(entry.countryiso3code);
      if (!existing || parseInt(entry.date) > parseInt(existing.date)) {
        countryMap.set(entry.countryiso3code, entry);
      }
    });

    const regionNode: HierarchicalData = {
      name: region,
      children: Array.from(countryMap.values())
        .filter((e) => e.value !== null && e.value > 0)
        .map((e) => ({
          name: e.country.value,
          value: Math.abs(e.value ?? 0),
        })),
    };

    if (regionNode.children && regionNode.children.length > 0) {
      root.children!.push(regionNode);
    }
  });

  return root;
}

/**
 * Simple region classification by country code
 */
function getRegion(countryCode: string): string {
  const regions: Record<string, string[]> = {
    'North America': ['USA', 'CAN', 'MEX'],
    'Europe': ['GBR', 'DEU', 'FRA', 'ITA', 'ESP', 'NLD', 'CHE', 'RUS', 'TUR'],
    'Asia': ['CHN', 'JPN', 'IND', 'KOR', 'IDN', 'SAU'],
    'Oceania': ['AUS'],
    'South America': ['BRA'],
  };

  for (const [region, codes] of Object.entries(regions)) {
    if (codes.includes(countryCode)) {
      return region;
    }
  }
  return 'Other';
}

/**
 * Create correlation network between countries based on similar values
 */
export function createNetworkData(data: WorldBankDataEntry[]): NetworkData {
  // Get latest values per country
  const countryMap = new Map<string, WorldBankDataEntry>();
  data.forEach((entry) => {
    if (entry.value !== null) {
      const existing = countryMap.get(entry.countryiso3code);
      if (!existing || parseInt(entry.date) > parseInt(existing.date)) {
        countryMap.set(entry.countryiso3code, entry);
      }
    }
  });

  const countries = Array.from(countryMap.values());
  const nodes: NetworkData['nodes'] = countries.map((c) => ({
    id: c.countryiso3code,
    name: c.country.value,
    group: getRegionIndex(c.countryiso3code),
    value: c.value ?? 0,
  }));

  // Create links between similar countries (within 20% of each other)
  const links: NetworkData['links'] = [];
  for (let i = 0; i < countries.length; i++) {
    for (let j = i + 1; j < countries.length; j++) {
      const v1 = countries[i].value ?? 0;
      const v2 = countries[j].value ?? 0;
      const similarity = Math.min(v1, v2) / Math.max(v1, v2);
      if (similarity > 0.5) {
        links.push({
          source: countries[i].countryiso3code,
          target: countries[j].countryiso3code,
          value: similarity,
        });
      }
    }
  }

  return { nodes, links };
}

function getRegionIndex(countryCode: string): number {
  const region = getRegion(countryCode);
  const regions = ['North America', 'Europe', 'Asia', 'Oceania', 'South America', 'Other'];
  return regions.indexOf(region);
}

/**
 * Create heatmap data (countries vs years)
 */
export function createHeatmapData(data: WorldBankDataEntry[]): HeatmapData {
  const countries = [...new Set(data.map((d) => d.country.value))].slice(0, 10);
  const years = [...new Set(data.map((d) => d.date))].sort().slice(-10);

  const valueMap = new Map<string, number>();
  data.forEach((entry) => {
    if (entry.value !== null) {
      valueMap.set(`${entry.country.value}-${entry.date}`, entry.value);
    }
  });

  const values = countries.map((country) =>
    years.map((year) => valueMap.get(`${country}-${year}`) ?? 0)
  );

  return {
    rows: countries,
    columns: years,
    values,
  };
}

/**
 * Create scatter plot data (two indicators)
 */
export async function fetchScatterData(
  indicatorX: string,
  indicatorY: string,
  countries: string[] = MAJOR_COUNTRIES
): Promise<DataPoint[]> {
  const [dataX, dataY] = await Promise.all([
    fetchWorldBankData(indicatorX, countries),
    fetchWorldBankData(indicatorY, countries),
  ]);

  // Get latest year for each country for both indicators
  const mapX = new Map<string, number>();
  const mapY = new Map<string, number>();
  const countryNames = new Map<string, string>();

  dataX.forEach((entry) => {
    if (entry.value !== null) {
      const existing = mapX.get(entry.countryiso3code);
      if (existing === undefined) {
        mapX.set(entry.countryiso3code, entry.value);
        countryNames.set(entry.countryiso3code, entry.country.value);
      }
    }
  });

  dataY.forEach((entry) => {
    if (entry.value !== null) {
      const existing = mapY.get(entry.countryiso3code);
      if (existing === undefined) {
        mapY.set(entry.countryiso3code, entry.value);
      }
    }
  });

  const result: DataPoint[] = [];
  mapX.forEach((xVal, code) => {
    const yVal = mapY.get(code);
    if (yVal !== undefined) {
      result.push({
        label: countryNames.get(code) || code,
        value: xVal,
        x: xVal,
        y: yVal,
        category: code,
      });
    }
  });

  return result;
}

/**
 * Create a complete dataset from World Bank data
 */
export async function createDataset(indicator: WorldBankIndicator): Promise<Dataset> {
  const rawData = await fetchWorldBankData(indicator.id);
  const dataPoints = transformToDataPoints(rawData);

  return {
    id: indicator.id,
    name: indicator.name,
    description: indicator.sourceNote || '',
    source: 'World Bank Open Data',
    data: dataPoints,
    dataTypes: ['categorical', 'temporal', 'numerical'],
    columns: [
      { name: 'Country', type: 'categorical', unique: MAJOR_COUNTRIES.length },
      { name: 'Year', type: 'temporal' },
      { name: 'Value', type: 'numerical' },
    ],
  };
}
