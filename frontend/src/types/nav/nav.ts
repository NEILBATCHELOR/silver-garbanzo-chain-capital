/**
 * NAV Domain Types
 * Type definitions for Net Asset Value operations
 * Based on backend API OpenAPI specification
 */

// Asset types supported by the NAV calculation system (21 confirmed from API)
export enum AssetType {
  // Priority Calculators (7)
  EQUITY = 'equity',
  BONDS = 'bonds',
  MMF = 'mmf',
  COMMODITIES = 'commodities',
  STABLECOIN_FIAT_BACKED = 'stablecoin_fiat_backed',
  STABLECOIN_CRYPTO_BACKED = 'stablecoin_crypto_backed',
  ASSET_BACKED = 'asset_backed',

  // Extended Calculators (14)
  COMPOSITE_FUNDS = 'composite_funds',
  PRIVATE_EQUITY = 'private_equity',
  PRIVATE_DEBT = 'private_debt',
  REAL_ESTATE = 'real_estate',
  INFRASTRUCTURE = 'infrastructure',
  ENERGY = 'energy',
  STRUCTURED_PRODUCTS = 'structured_products',
  QUANT_STRATEGIES = 'quant_strategies',
  COLLECTIBLES = 'collectibles',
  DIGITAL_TOKENIZED_FUNDS = 'digital_tokenized_funds',
  CLIMATE_RECEIVABLES = 'climate_receivables',
  INVOICE_RECEIVABLES = 'invoice_receivables',
  STABLECOIN_COMMODITY_BACKED = 'stablecoin_commodity_backed',
  STABLECOIN_ALGORITHMIC = 'stablecoin_algorithmic',
}

// Calculation statuses from backend API
export enum CalculationStatus {
  QUEUED = 'queued',
  RUNNING = 'running', 
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Approval workflow statuses from backend API
export enum ApprovalStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published',
}

// Core calculation result from backend API
export interface CalculationResult {
  runId: string;
  assetId?: string;
  productType?: AssetType;
  projectId?: string;
  valuationDate: string; // ISO date string
  navValue: number;
  navPerShare?: number;
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
  sharesOutstanding?: number;
  currency: string;
  calculatedAt: string; // ISO date string
  status: CalculationStatus;
  approvalStatus?: ApprovalStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// NAV calculation request types
export interface NavCalculationRequest {
  assetId?: string;
  productType?: AssetType;
  projectId?: string;
  valuationDate: string; // Required - ISO date string
  targetCurrency?: string; // Default 'USD'
  runManually?: boolean; // Default false
}

// NAV query parameters
export interface NavCurrentRequest {
  assetId?: string;
  productType?: AssetType;
  projectId?: string;
  asOf?: string; // ISO date string
}

// NAV runs list parameters
export interface NavRunsListRequest {
  page?: number; // Default 1
  limit?: number; // Default 20, max 100
  assetId?: string;
  productType?: AssetType;
  projectId?: string;
  status?: CalculationStatus;
  approvalStatus?: ApprovalStatus;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  sortBy?: 'valuationDate' | 'calculatedAt' | 'navValue' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Calculator configuration (for future use when backend provides)
export interface Calculator {
  id: string; // slug/identifier
  name: string;
  description: string;
  assetTypes: AssetType[];
  enabled: boolean;
  version: string;
  priority: number; // For ordering in UI
  requiredPermissions?: string[];
}

// Calculator input schema (for dynamic form generation)
export interface CalculatorSchema {
  id: string;
  name: string;
  description: string;
  inputs: CalculatorInputField[];
  outputs: CalculatorOutputField[];
}

export interface CalculatorInputField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: { value: any; label: string }[];
  };
  units?: string; // e.g., 'USD', '%', 'shares'
  format?: 'currency' | 'percentage' | 'date' | 'decimal';
}

export interface CalculatorOutputField {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean';
  description?: string;
  units?: string;
  format?: 'currency' | 'percentage' | 'date' | 'decimal';
}

// KPI data for dashboard overview
export interface NavKpi {
  label: string;
  value: number | string;
  change?: {
    value: number;
    percentage: number;
    period: string; // e.g., '24h', '7d', '30d'
    trend: 'up' | 'down' | 'neutral';
  };
  format?: 'currency' | 'percentage' | 'number';
  currency?: string;
}

// NAV history record for tables
export interface NavHistoryRow {
  id: string;
  runId: string;
  assetType: AssetType;
  assetName?: string;
  navValue: number;
  currency: string;
  calculatedAt: string;
  status: CalculationStatus;
  change?: {
    value: number;
    percentage: number;
  };
}

// Saved valuations (for future implementation)
export interface NavValuation {
  id: string;
  name: string;
  description?: string;
  calculationResult: CalculationResult;
  savedAt: string;
  savedBy: string; // user ID
  tags?: string[];
  isPublic: boolean;
}

// Audit trail event (for future implementation)
export interface NavAuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  username?: string;
  action: string; // e.g., 'calculation_created', 'valuation_saved'
  entityType: 'calculation' | 'valuation' | 'approval';
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// API response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    totalPages: number;
  };
  timestamp: string;
}

// Error handling
export interface NavError {
  message: string;
  statusCode: number;
  details?: any;
  timestamp?: string;
}

// Error conversion utility
export function convertToNavError(error: unknown): NavError {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return error as NavError
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
      timestamp: new Date().toISOString()
    }
  }
  
  return {
    message: typeof error === 'string' ? error : 'Unknown error',
    statusCode: 500,
    timestamp: new Date().toISOString()
  }
}

// UI-specific types
export interface NavFormData {
  assetType: AssetType;
  valuationDate: Date;
  currency: string;
  [key: string]: any; // Dynamic fields based on calculator
}

export interface NavCalculationState {
  isLoading: boolean;
  result?: CalculationResult;
  error?: NavError;
  progress?: number; // For long-running calculations
}

// Utility types
export type AssetTypeKey = keyof typeof AssetType;
export type CalculationStatusKey = keyof typeof CalculationStatus;
export type ApprovalStatusKey = keyof typeof ApprovalStatus;
