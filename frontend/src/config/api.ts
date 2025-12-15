/**
 * API Configuration
 * 
 * Centralized configuration for all API endpoints
 */

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

// ============================================================================
// API BASE URLS
// ============================================================================

export const API_CONFIG = {
  // Backend REST API
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  
  // WebSocket URL
  wsURL: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
  
  // Timeout settings
  timeout: 30000, // 30 seconds
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// ============================================================================
// TRADE FINANCE API ENDPOINTS
// ============================================================================

export const TRADE_FINANCE_ENDPOINTS = {
  // Position endpoints
  positions: {
    healthFactor: (userAddress: string) => `/api/trade-finance/positions/health-factor/${userAddress}`,
    details: (userAddress: string) => `/api/trade-finance/positions/details/${userAddress}`,
    liquidatable: '/api/trade-finance/positions/liquidatable',
  },
  
  // Haircut endpoints
  haircut: {
    calculate: '/api/trade-finance/haircut/calculate',
    metrics: (commodity: string) => `/api/trade-finance/haircut/metrics/${commodity}`,
    history: (commodity: string) => `/api/trade-finance/haircut/history/${commodity}`,
    submitOnChain: '/api/trade-finance/haircut/submit-onchain',
  },
  
  // Price endpoints
  prices: {
    update: '/api/trade-finance/prices/update',
    current: (commodity: string) => `/api/trade-finance/prices/current/${commodity}`,
    historical: (commodity: string) => `/api/trade-finance/prices/historical/${commodity}`,
    loadHistorical: '/api/trade-finance/prices/load-historical',
  },
  
  // Oracle endpoints
  oracles: {
    configuration: '/api/trade-finance/oracles/configuration',
    status: '/api/trade-finance/oracles/status',
  },
  
  // WebSocket endpoint
  websocket: '/api/trade-finance/ws',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build full URL for an endpoint
 */
export function buildURL(endpoint: string, baseURL: string = API_CONFIG.baseURL): string {
  return `${baseURL}${endpoint}`;
}

/**
 * Build query string from params
 */
export function buildQueryString(params: Record<string, any>): string {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Build full WebSocket URL
 */
export function buildWebSocketURL(
  endpoint: string = TRADE_FINANCE_ENDPOINTS.websocket,
  params?: Record<string, any>
): string {
  const baseWS = API_CONFIG.wsURL;
  const queryString = params ? buildQueryString(params) : '';
  return `${baseWS}${endpoint}${queryString}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default API_CONFIG;
