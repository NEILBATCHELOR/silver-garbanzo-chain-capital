/**
 * NAV Components - Central exports
 * All NAV-related React components
 */

// Main components
export { NavDashboardHeader } from './nav-dashboard-header'
export { NavDashboardHeaderEnhanced } from './nav-dashboard-header-enhanced'
export { NavKpiCards } from './nav-kpi-cards'
export { default as NavNavigation } from './shared/nav-navigation'

// Calculator components
export { CalculatorShell } from './calculators/calculator-shell'
export {
  CALCULATOR_REGISTRY,
  getCalculatorById,
  getCalculatorComponent,
  getCalculatorsByCategory,
  getCalculatorsByAssetType,
  getEnabledCalculators,
  getCalculatorsByComplexity,
  getCalculatorCategories,
  searchCalculators,
  hasCalculatorPermissions,
  getAvailableCalculators,
  type CalculatorRegistryEntry,
  type CalculatorFormProps,
  type CalculatorFormComponent
} from './calculators/calculators.config'

// Async calculation components
export {
  AsyncCalculationProgress,
  AsyncCalculationProgressCompact
} from './async-calculation-progress'

// Valuation management components
export {
  SaveAsValuation,
  QuickSaveValuation
} from './save-as-valuation'

// Permission components
export {
  NavPermissionGuard,
  NavPermissionNotice,
  InlineNavPermissionGuard,
  useNavPermissionCheck
} from './nav-permission-guard'

// UX and accessibility components
export {
  NavKpiCardsSkeleton,
  CalculatorListSkeleton,
  CalculationHistorySkeleton,
  ValuationListSkeleton,
  CalculatorFormSkeleton,
  CalculatorResultsSkeleton,
  AuditLogSkeleton,
  NavPageSkeleton,
  SearchResultsSkeleton
} from './nav-loading-skeletons'

export {
  EmptyState,
  NoCalculationsEmpty,
  NoHistoryEmpty,
  NoValuationsEmpty,
  NoSearchResultsEmpty,
  NoAuditDataEmpty,
  NoTrendingDataEmpty,
  ErrorState,
  LoadingFailedState,
  PermissionDeniedState,
  ComingSoonState
} from './nav-empty-states'

// Future components (to be implemented)
// export { NavHistoryTable } from './nav-history-table'
// export { NavValuationTable } from './nav-valuation-table'
// export { NavAuditTable } from './nav-audit-table'
// export { SchemaForm } from './calculators/schema-form'

/**
 * NAV Components
 * Dashboard components for Net Asset Value calculations
 */

// Placeholder exports - components will be implemented in next phases
// export * from './nav-dashboard-header'
// export * from './nav-kpi-cards'
// export * from './nav-history-table'
// export * from './nav-valuation-table'
// export * from './nav-audit-table'
// export * from './calculators'
// export * from './pages'
