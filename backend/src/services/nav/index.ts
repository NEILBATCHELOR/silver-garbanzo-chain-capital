// TODO: Implement missing Nav services
// import { NavService } from './NavService'
// import { MarketDataOracleService } from './MarketDataOracleService'
// import { FxRateService } from './FxRateService'

// Export service classes (commented out until services are implemented)
// export { NavService } from './NavService'
// export { MarketDataOracleService } from './MarketDataOracleService'
// export { FxRateService } from './FxRateService'

// Export types
export * from './types'

// TODO: Implement Nav service factories when services are created
// Service instances (lazy loaded)
// let navService: NavService | undefined
// let marketDataOracleService: MarketDataOracleService | undefined
// let fxRateService: FxRateService | undefined

// Factory functions for dependency injection
// export const getNavService = (): NavService => {
//   if (!navService) {
//     navService = new NavService()
//   }
//   return navService
// }

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
// export const resetNavServices = (): void => {
//   navService = undefined
//   marketDataOracleService = undefined
//   fxRateService = undefined
// }
