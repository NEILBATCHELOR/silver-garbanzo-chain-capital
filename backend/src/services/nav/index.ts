// ==================== SERVICE IMPORTS ====================

// Implemented services
import { NavService } from './NavService'
// TODO: Implement remaining services
// import { MarketDataOracleService } from './MarketDataOracleService'
// import { FxRateService } from './FxRateService'

// ==================== EXPORTS ====================

// Export service classes
export { NavService } from './NavService'
// TODO: Export remaining services when implemented
// export { MarketDataOracleService } from './MarketDataOracleService'
// export { FxRateService } from './FxRateService'

// Export utility classes
export * from './ProductTypeUtilities'

// Export calculator infrastructure (Phase 5)
export * from './calculators'

// Export types
export * from './types'

// ==================== SERVICE FACTORIES ====================

// Service instances (lazy loaded)
let navService: NavService | undefined
// let marketDataOracleService: MarketDataOracleService | undefined
// let fxRateService: FxRateService | undefined

// Factory functions for dependency injection
export const getNavService = (): NavService => {
  if (!navService) {
    navService = new NavService()
  }
  return navService
}

// TODO: Implement remaining service factories
// export const getMarketDataOracleService = (): MarketDataOracleService => {
//   if (!marketDataOracleService) {
//     marketDataOracleService = new MarketDataOracleService()
//   }
//   return marketDataOracleService
// }

// export const getFxRateService = (): FxRateService => {
//   if (!fxRateService) {
//     fxRateService = new FxRateService()
//   }
//   return fxRateService
// }

// Utility function to reset services (useful for testing)
export const resetNavServices = (): void => {
  navService = undefined
  // marketDataOracleService = undefined
  // fxRateService = undefined
}
