/**
 * NAV Hooks - Central exports
 * React hooks for NAV operations with real-time backend integration
 */

// Calculation hooks - now with domain-specific support
export {
  useCalculateNav,
  useBatchCalculateNav,
  useBondCalculateNav,
  useAssetBackedCalculateNav,
  useEquityCalculateNav,
  type UseCalculateNavResult
} from './useCalculateNav'

// Async calculation hooks with polling and cancellation
export {
  useAsyncCalculation,
  type UseAsyncCalculationResult,
  type AsyncCalculationStatus
} from './useAsyncCalculation'

// UX and notification hooks
export {
  useNavToast,
  NavToastTemplates,
  type NavToastType,
  type NavToastOptions
} from './useNavToast'

// History hooks
export {
  useNavHistory,
  useNavRunDetails,
  useNavHistoryRealtime,
  useNavHistoryExport,
  type UseNavHistoryResult
} from './useNavHistory'

// Overview and dashboard hooks
export {
  useNavOverview,
  useNavOverviewRealtime,
  useNavMetrics,
  type UseNavOverviewResult,
  type NavOverviewData
} from './useNavOverview'

// Calculator management hooks
export {
  useCalculators,
  usePriorityCalculators,
  useExtendedCalculators,
  useCalculatorsByComplexity,
  useCalculator,
  type UseCalculatorsResult
} from './useCalculators'

// Calculator schema hooks
export {
  useCalculatorSchema,
  type UseCalculatorSchemaResult
} from './useCalculatorSchema'

// Valuations and audit hooks
export {
  useNavValuations,
  useNavValuation,
  type UseNavValuationsResult
} from './useNavValuations'

export {
  useNavAudit,
  useNavAuditRealtime,
  useNavEntityAudit,
  useNavUserAudit,
  type UseNavAuditResult
} from './useNavAudit'

/**
 * NAV Hooks
 * React hooks for NAV calculations and data management
 */

// Placeholder exports - hooks will be implemented in next phases
// export * from './useNavOverview'
// export * from './useCalculators'
// export * from './useCalculatorSchema'
// export * from './useCalculateNav'
// export * from './useNavHistory'
// export * from './useNavValuations'
// export * from './useNavAudit'
