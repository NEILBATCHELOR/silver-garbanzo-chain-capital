// Nav Service Exports
export { FinancialModelsService } from './FinancialModelsService'
export { MMFInvestorService } from './MMFInvestorService'
export * from './ProductTypeUtilities'
export * from './types'

// Export a convenience function to get the nav service
import { FinancialModelsService } from './FinancialModelsService'
import { MMFInvestorService } from './MMFInvestorService'

export function getNavService() {
  return new FinancialModelsService()
}

export function getMMFInvestorService(supabase: any) {
  return new MMFInvestorService(supabase)
}
