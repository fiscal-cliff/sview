/**
 * Services module exports
 */

export { DataFrame } from './DataFrame';
export { Pipeline, aggregate, pivot, melt, bin, normalize, standardize } from './Pipeline';
export {
  fetchWorldBankData,
  transformToDataPoints,
  aggregateByCountry,
  aggregateByYear,
  createTimeSeries,
  transformToHierarchical,
  createNetworkData,
  createHeatmapData,
  fetchScatterData,
  createDataset,
  POPULAR_INDICATORS,
  MAJOR_COUNTRIES,
} from './dataService';
export {
  analyzeData,
  getRecommendations,
  getBestVisualization,
  getHierarchicalRecommendations,
  getNetworkRecommendations,
  getVisualizationProfile,
  getAllVisualizationProfiles,
  recommendFromDataFrame,
  recommendFromCharacteristics,
  recommendFromTabular,
  recommendEncodings,
  autoVisualize,
} from './recommendationEngine';
