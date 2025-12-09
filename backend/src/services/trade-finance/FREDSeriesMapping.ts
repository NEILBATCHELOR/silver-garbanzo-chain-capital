/**
 * FRED Commodity Series IDs - Complete Reference
 * 
 * Source: Federal Reserve Economic Data (FRED)
 * API Docs: https://fred.stlouisfed.org/docs/api/fred/
 * Categories: https://fred.stlouisfed.org/categories/32455
 * 
 * Access via Supabase Edge Function:
 * POST https://jrwfkxfzsnnjppogthaw.supabase.co/functions/v1/market-data-proxy
 * 
 * Request Format:
 * {
 *   "provider": "fred",
 *   "endpoint": "series/observations",
 *   "params": {
 *     "series_id": "GOLDAMGBD228NLBM",
 *     "api_key": "2f9410eb4d82bffc020c077ef79259e3",
 *     "sort_order": "desc",
 *     "limit": 1
 *   }
 * }
 */

export interface FREDSeriesInfo {
  seriesId: string
  name: string
  unit: string
  source: string
  url: string
}

/**
 * Complete FRED Series Mapping for All Commodities
 */
export const FRED_COMMODITY_SERIES: Record<string, FREDSeriesInfo> = {
  // ==================== PRECIOUS METALS ====================
  'GOLD': {
    seriesId: 'GOLDAMGBD228NLBM',
    name: 'Gold Fixing Price 10:30 A.M. (London time) in London Bullion Market',
    unit: 'USD per Troy Ounce',
    source: 'ICE Benchmark Administration Limited (IBA)',
    url: 'https://fred.stlouisfed.org/series/GOLDAMGBD228NLBM'
  },
  'SILVER': {
    seriesId: 'SLVPRUSD',
    name: 'Global price of Silver',
    unit: 'USD per Troy Ounce',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/SLVPRUSD'
  },
  'PLATINUM': {
    seriesId: 'PLAT',
    name: 'Global price of Platinum',
    unit: 'USD per Troy Ounce',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PLAT'
  },
  'PALLADIUM': {
    seriesId: 'PALL',
    name: 'Global price of Palladium',
    unit: 'USD per Troy Ounce',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PALL'
  },

  // ==================== ENERGY ====================
  'WTI_CRUDE': {
    seriesId: 'DCOILWTICO',
    name: 'Crude Oil Prices: West Texas Intermediate (WTI) - Cushing, Oklahoma',
    unit: 'USD per Barrel',
    source: 'U.S. Energy Information Administration',
    url: 'https://fred.stlouisfed.org/series/DCOILWTICO'
  },
  'BRENT_CRUDE': {
    seriesId: 'DCOILBRENTEU',
    name: 'Crude Oil Prices: Brent - Europe',
    unit: 'USD per Barrel',
    source: 'U.S. Energy Information Administration',
    url: 'https://fred.stlouisfed.org/series/DCOILBRENTEU'
  },
  'NATURAL_GAS': {
    seriesId: 'DHHNGSP',
    name: 'Henry Hub Natural Gas Spot Price',
    unit: 'USD per Million Btu',
    source: 'U.S. Energy Information Administration',
    url: 'https://fred.stlouisfed.org/series/DHHNGSP'
  },
  'HEATING_OIL': {
    seriesId: 'DHOILNYH',
    name: 'No. 2 Heating Oil Prices: New York Harbor',
    unit: 'USD per Gallon',
    source: 'U.S. Energy Information Administration',
    url: 'https://fred.stlouisfed.org/series/DHOILNYH'
  },
  'GASOLINE': {
    seriesId: 'GASREGW',
    name: 'US Regular All Formulations Retail Gasoline Prices',
    unit: 'USD per Gallon',
    source: 'U.S. Energy Information Administration',
    url: 'https://fred.stlouisfed.org/series/GASREGW'
  },

  // ==================== AGRICULTURAL - GRAINS ====================
  'WHEAT': {
    seriesId: 'PWHEAMTUSDM',
    name: 'Global price of Wheat',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PWHEAMTUSDM'
  },
  'CORN': {
    seriesId: 'PMAIZMTUSDM',
    name: 'Global price of Corn (Maize)',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PMAIZMTUSDM'
  },
  'SOYBEANS': {
    seriesId: 'PSOYBUSDM',
    name: 'Global price of Soybeans',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PSOYBUSDM'
  },
  'RICE': {
    seriesId: 'PRICENPQUSDM',
    name: 'Global price of Rice',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PRICENPQUSDM'
  },
  'BARLEY': {
    seriesId: 'PBARLUSDM',
    name: 'Global price of Barley',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PBARLUSDM'
  },

  // ==================== AGRICULTURAL - SOFTS ====================
  'COFFEE': {
    seriesId: 'PCOFFOTMUSDM',
    name: 'Global price of Coffee, Other Mild Arabica',
    unit: 'USD per Kilogram',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PCOFFOTMUSDM'
  },
  'COTTON': {
    seriesId: 'PCOTTINDUSDM',
    name: 'Global price of Cotton',
    unit: 'USD per Kilogram',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PCOTTINDUSDM'
  },
  'SUGAR': {
    seriesId: 'PSUGAISAUSDM',
    name: 'Global price of Sugar, No. 11, World',
    unit: 'USD per Kilogram',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PSUGAISAUSDM'
  },
  'COCOA': {
    seriesId: 'PCOCOTUSDM',
    name: 'Global price of Cocoa beans',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PCOCOTUSDM'
  },

  // ==================== BASE METALS ====================
  'COPPER': {
    seriesId: 'PCOPPUSDM',
    name: 'Global price of Copper',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PCOPPUSDM'
  },
  'ALUMINUM': {
    seriesId: 'PALUMUSDM',
    name: 'Global price of Aluminum',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PALUMUSDM'
  },
  'ZINC': {
    seriesId: 'PZINCUSDM',
    name: 'Global price of Zinc',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PZINCUSDM'
  },
  'NICKEL': {
    seriesId: 'PNICKUSDM',
    name: 'Global price of Nickel',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PNICKUSDM'
  },
  'LEAD': {
    seriesId: 'PLEADUSDM',
    name: 'Global price of Lead',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PLEADUSDM'
  },
  'TIN': {
    seriesId: 'PTINUSDM',
    name: 'Global price of Tin',
    unit: 'USD per Metric Ton',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PTINUSDM'
  },

  // ==================== OTHER ====================
  'LUMBER': {
    seriesId: 'PLUMBUSDM',
    name: 'Global price of Softwood Lumber',
    unit: 'USD per Cubic Meter',
    source: 'International Monetary Fund',
    url: 'https://fred.stlouisfed.org/series/PLUMBUSDM'
  }
}

/**
 * Get commodity name from type
 */
export function getCommodityName(commodityType: string): string {
  return FRED_COMMODITY_SERIES[commodityType.toUpperCase()]?.name || commodityType
}

/**
 * Get commodity unit from type
 */
export function getCommodityUnit(commodityType: string): string {
  return FRED_COMMODITY_SERIES[commodityType.toUpperCase()]?.unit || 'USD'
}

/**
 * Get FRED series ID from commodity type
 */
export function getFREDSeriesId(commodityType: string): string {
  return FRED_COMMODITY_SERIES[commodityType.toUpperCase()]?.seriesId || ''
}

/**
 * Get all supported commodity types
 */
export function getSupportedCommodities(): string[] {
  return Object.keys(FRED_COMMODITY_SERIES)
}

/**
 * Check if commodity is supported
 */
export function isCommoditySupported(commodityType: string): boolean {
  return commodityType.toUpperCase() in FRED_COMMODITY_SERIES
}
