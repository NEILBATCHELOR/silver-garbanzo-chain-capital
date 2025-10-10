// Nav Service Exports
export { FinancialModelsService } from './FinancialModelsService'
export * from './ProductTypeUtilities'
export * from './types'

// Export a convenience function to get the nav service
import { FinancialModelsService } from './FinancialModelsService'

export function getNavService() {
  return new FinancialModelsService()
}
