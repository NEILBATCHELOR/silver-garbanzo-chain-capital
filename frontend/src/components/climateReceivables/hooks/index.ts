/**
 * Climate Receivables Hooks - Export Index
 * 
 * Centralized exports for all climate receivables business logic hooks.
 * Provides a clean interface for frontend components to access enhanced services.
 */

// Enhanced Risk Calculation Hooks
export {
  useEnhancedRiskCalculation,
  useReceivableRiskMonitor
} from './useEnhancedRiskCalculation';

// Cash Flow Forecasting Hooks
export {
  useCashFlowForecasting,
  useReceivableCashFlowMonitor
} from './useCashFlowForecasting';

// Realtime Alert System Hooks
export {
  useRealtimeAlerts,
  useReceivableAlerts
} from './useRealtimeAlerts';

// Climate Token Distribution Hooks (existing)
export {
  useClimateTokenDistributionData,
  useClimateAllocationForm,
  useClimateSelectionManagement,
  type ClimateTokenAllocation,
  type ClimateInvestor,
  type ClimateTokenDistributionFormData,
  type ClimateNavigationItem
} from './useClimateTokenDistribution';

// Integrated Climate Valuation Hooks
export {
  useIntegratedClimateValuation,
  useReceivableValuationMonitor,
  usePortfolioOptimization
} from './useIntegratedClimateValuation';

// Master Service Integration Hook
export {
  useClimateReceivablesServices
} from './useClimateReceivablesServices';

// Type exports for external use
export type {
  EnhancedRiskAssessmentResult,
  RiskLevel,
  AlertItem
} from '../services/business-logic/enhanced-types';
