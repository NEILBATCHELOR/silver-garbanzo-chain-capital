import { FactoringService } from './FactoringService'
import { FactoringValidationService } from './FactoringValidationService'
import { FactoringAnalyticsService } from './FactoringAnalyticsService'

// Export services
export { FactoringService } from './FactoringService'
export { FactoringValidationService } from './FactoringValidationService'
export { FactoringAnalyticsService } from './FactoringAnalyticsService'

// Export types
export * from './types'

// Service instances (lazy loaded)
let factoringService: FactoringService | undefined
let factoringValidationService: FactoringValidationService | undefined  
let factoringAnalyticsService: FactoringAnalyticsService | undefined

// Factory functions
export const getFactoringService = (): FactoringService => {
  if (!factoringService) {
    factoringService = new FactoringService()
  }
  return factoringService
}

export const getFactoringValidationService = (): FactoringValidationService => {
  if (!factoringValidationService) {
    factoringValidationService = new FactoringValidationService()
  }
  return factoringValidationService
}

export const getFactoringAnalyticsService = (): FactoringAnalyticsService => {
  if (!factoringAnalyticsService) {
    factoringAnalyticsService = new FactoringAnalyticsService()
  }
  return factoringAnalyticsService
}
