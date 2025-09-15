/**
 * Climate Receivables Chart Color Palette
 * 
 * Enhanced earth-tone palette with improved contrast and definition
 * Applied consistently across all climate receivables visualizations for brand coherence
 */

// Base Color Palette - Enhanced for Better Definition
export const CLIMATE_COLORS = {
  // Primary earth-tone palette with enhanced contrast
  black: '#0a0908',           // Deep charcoal - darkest anchor
  gunmetal: '#22333b',        // Blue-gray - medium dark with cool undertones
  walnutBrown: '#5e503f',     // Rich brown - medium dark with warm undertones  
  khaki: '#c6ac8f',           // Warm tan - medium light
  almond: '#eae0d5',          // Soft cream - lightest tone
  
  // Enhanced variations for better chart differentiation
  blackLight: '#1a1816',      // Lighter black variation
  gunmetalLight: '#3a4951',   // Lighter gunmetal
  walnutLight: '#7a6b57',     // Lighter walnut brown
  khakiDark: '#a68f75',       // Darker khaki
  almondDark: '#d4c5b2',      // Darker almond
  
  // Additional accent colors for enhanced contrast
  deepWalnut: '#4a3d2f',      // Deeper brown for high contrast
  warmIvory: '#f5f0e8',       // Warmer light tone
  coolGray: '#2d3a44',        // Cool medium tone
} as const;

// Chart-specific color arrays for multi-series data
export const CHART_COLOR_SEQUENCES = {
  // Primary sequence for most charts (5 colors with good contrast)
  primary: [
    CLIMATE_COLORS.black,        // #0a0908 - Darkest anchor
    CLIMATE_COLORS.gunmetal,     // #22333b - Cool medium dark
    CLIMATE_COLORS.walnutBrown,  // #5e503f - Warm medium dark
    CLIMATE_COLORS.khaki,        // #c6ac8f - Medium light
    CLIMATE_COLORS.almond,       // #eae0d5 - Lightest
  ],
  
  // Extended sequence with enhanced variations (9 colors)
  extended: [
    CLIMATE_COLORS.black,        // #0a0908
    CLIMATE_COLORS.gunmetal,     // #22333b
    CLIMATE_COLORS.walnutBrown,  // #5e503f
    CLIMATE_COLORS.khaki,        // #c6ac8f
    CLIMATE_COLORS.almond,       // #eae0d5
    CLIMATE_COLORS.deepWalnut,   // #4a3d2f - High contrast brown
    CLIMATE_COLORS.gunmetalLight,// #3a4951 - Lighter cool tone
    CLIMATE_COLORS.khakiDark,    // #a68f75 - Darker warm medium
    CLIMATE_COLORS.warmIvory,    // #f5f0e8 - Enhanced light
  ],
  
  // Monochromatic sequence for single-metric visualizations
  monochrome: [
    CLIMATE_COLORS.black,        // #0a0908
    CLIMATE_COLORS.blackLight,   // #1a1816
    CLIMATE_COLORS.walnutBrown,  // #5e503f
    CLIMATE_COLORS.walnutLight,  // #7a6b57
    CLIMATE_COLORS.khaki,        // #c6ac8f
  ],
  
  // High contrast sequence for accessibility
  highContrast: [
    CLIMATE_COLORS.black,        // #0a0908 - Darkest
    CLIMATE_COLORS.coolGray,     // #2d3a44 - Cool medium
    CLIMATE_COLORS.deepWalnut,   // #4a3d2f - Warm medium dark
    CLIMATE_COLORS.khaki,        // #c6ac8f - Medium light
    CLIMATE_COLORS.warmIvory,    // #f5f0e8 - Lightest
  ],
} as const;

// Risk-specific colors for risk assessment charts (light to dark progression)
export const RISK_COLORS = {
  LOW: CLIMATE_COLORS.almond,      // Light cream for low risk
  MEDIUM: CLIMATE_COLORS.khaki,    // Medium tan for medium risk  
  HIGH: CLIMATE_COLORS.walnutBrown,// Dark brown for high risk
  CRITICAL: CLIMATE_COLORS.black,  // Darkest for critical risk
} as const;

// Cash flow specific colors with better contrast
export const CASH_FLOW_COLORS = {
  receivables: CLIMATE_COLORS.gunmetal,    // Cool medium dark
  incentives: CLIMATE_COLORS.walnutBrown,  // Warm medium dark
  cumulative: CLIMATE_COLORS.khaki,        // Medium light for cumulative
  total: CLIMATE_COLORS.black,             // Darkest for total emphasis
} as const;

// Market data colors for different data series
export const MARKET_DATA_COLORS = {
  treasury: {
    primary: CLIMATE_COLORS.gunmetal,     // #22333b - Cool primary
    secondary: CLIMATE_COLORS.gunmetalLight, // #3a4951 - Lighter variation
    rates: [
      CLIMATE_COLORS.black,        // 1M - Darkest
      CLIMATE_COLORS.gunmetal,     // 3M - Cool dark
      CLIMATE_COLORS.walnutBrown,  // 1Y - Warm dark
      CLIMATE_COLORS.khaki,        // 10Y - Medium light
      CLIMATE_COLORS.almond,       // 30Y - Lightest
    ],
  },
  credit: {
    investmentGrade: CLIMATE_COLORS.gunmetal,    // Cool tone for stable credit
    highYield: CLIMATE_COLORS.walnutBrown,       // Warm tone for riskier credit
    corporateAAA: CLIMATE_COLORS.almond,         // Light for highest grade
    corporateBAA: CLIMATE_COLORS.khaki,          // Medium for lower grade
  },
  energy: {
    electricity: CLIMATE_COLORS.gunmetal,        // Cool for electricity
    renewable: CLIMATE_COLORS.khaki,             // Earth tone for renewable
    carbon: CLIMATE_COLORS.walnutBrown,          // Brown for carbon
    demand: CLIMATE_COLORS.coolGray,             // Gray for demand data
  },
  volatility: {
    treasury: CLIMATE_COLORS.gunmetal,
    credit: CLIMATE_COLORS.walnutBrown,
    energy: CLIMATE_COLORS.deepWalnut,
  },
} as const;

// Weather impact colors with logical associations
export const WEATHER_COLORS = {
  production: CLIMATE_COLORS.gunmetal,     // Steady cool tone for production
  sunlight: CLIMATE_COLORS.khaki,          // Warm tone for sunlight
  wind: CLIMATE_COLORS.coolGray,           // Cool gray for wind
  temperature: CLIMATE_COLORS.walnutBrown, // Earth tone for temperature
  correlation: CLIMATE_COLORS.black,       // Dark for correlation emphasis
} as const;

// Policy timeline colors for impact levels (clear progression)
export const POLICY_COLORS = {
  impactLevels: {
    low: CLIMATE_COLORS.almond,      // Light cream for low impact
    medium: CLIMATE_COLORS.khaki,    // Medium tan for medium impact
    high: CLIMATE_COLORS.walnutBrown,// Dark brown for high impact
    critical: CLIMATE_COLORS.black,  // Darkest for critical impact
  },
  timeline: CLIMATE_COLORS.gunmetal,     // Cool tone for timeline
  cumulative: CLIMATE_COLORS.deepWalnut, // Rich brown for cumulative
} as const;

// Utility function to get color by index for dynamic charts
export const getChartColor = (index: number, sequence: 'primary' | 'extended' | 'monochrome' = 'primary'): string => {
  const colors = CHART_COLOR_SEQUENCES[sequence];
  return colors[index % colors.length];
};

// Utility function to create color with opacity
export const withOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Common chart styling options with enhanced contrast
export const CHART_STYLES = {
  grid: {
    stroke: withOpacity(CLIMATE_COLORS.gunmetal, 0.2),
    strokeDasharray: '3 3',
  },
  axis: {
    tick: { fill: CLIMATE_COLORS.walnutBrown },
    line: { stroke: CLIMATE_COLORS.gunmetal },
  },
  tooltip: {
    backgroundColor: CLIMATE_COLORS.warmIvory,
    border: `1px solid ${CLIMATE_COLORS.gunmetal}`,
    color: CLIMATE_COLORS.black,
  },
  legend: {
    fontSize: 12,
    color: CLIMATE_COLORS.walnutBrown,
  },
} as const;
