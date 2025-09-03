/**
 * CalculatorRegistry - Dynamic calculator resolution and management
 * 
 * Responsibilities:
 * - Register and manage asset-specific calculators
 * - Dynamic resolution of appropriate calculator by asset type
 * - Fallback strategies for unsupported asset types
 * - Calculator health checks and performance monitoring
 * - Load balancing and caching of calculator instances
 * 
 * This implements the Strategy pattern for NAV calculations, allowing
 * the system to dynamically choose the appropriate calculation algorithm
 * based on the asset type and input parameters.
 */

import {
  AssetNavCalculator,
  CalculationInput,
  AssetType,
  CalculationStatus,
  CalculationResult
} from '../types'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'

export interface CalculatorRegistration {
  calculator: AssetNavCalculator
  assetTypes: AssetType[]
  priority: number // Higher priority = preferred calculator for overlapping types
  enabled: boolean
  healthCheckUrl?: string
  description: string
  version: string
}

export interface CalculatorResolution {
  calculator: AssetNavCalculator
  match: 'exact' | 'fallback' | 'default'
  confidence: number // 0.0 - 1.0
  reason: string
}

export interface RegistryMetrics {
  totalRegistrations: number
  enabledCalculators: number
  resolutionStats: Record<string, number>
  failureStats: Record<string, number>
  averageResolutionTimeMs: number
  healthCheckResults: Record<string, boolean>
}

export interface RegistryOptions {
  enableHealthChecks?: boolean
  enableCaching?: boolean
  healthCheckIntervalMs?: number
  defaultFallbackEnabled?: boolean
  maxResolutionTimeMs?: number
}

/**
 * Main calculator registry class
 */
export class CalculatorRegistry {
  private registrations = new Map<string, CalculatorRegistration>()
  private resolutionCache = new Map<string, CalculatorResolution>()
  private metrics: RegistryMetrics
  private options: RegistryOptions
  private healthCheckTimer?: NodeJS.Timeout

  constructor(options: RegistryOptions = {}) {
    this.options = {
      enableHealthChecks: true,
      enableCaching: true,
      healthCheckIntervalMs: 60000, // 1 minute
      defaultFallbackEnabled: true,
      maxResolutionTimeMs: 1000,
      ...options
    }

    this.metrics = {
      totalRegistrations: 0,
      enabledCalculators: 0,
      resolutionStats: {},
      failureStats: {},
      averageResolutionTimeMs: 0,
      healthCheckResults: {}
    }

    if (this.options.enableHealthChecks) {
      this.startHealthCheckTimer()
    }
  }

  // ==================== REGISTRATION METHODS ====================

  /**
   * Registers a calculator with the registry
   */
  register(registration: CalculatorRegistration): void {
    const calculatorId = this.getCalculatorId(registration.calculator)
    
    // Validate registration
    this.validateRegistration(registration)
    
    this.registrations.set(calculatorId, registration)
    this.updateMetrics()
    
    // Clear cache when new calculator is registered
    if (this.options.enableCaching) {
      this.resolutionCache.clear()
    }

    console.log(`Registered calculator: ${calculatorId} for asset types: ${registration.assetTypes.join(', ')}`)
  }

  /**
   * Unregisters a calculator from the registry
   */
  unregister(calculator: AssetNavCalculator): boolean {
    const calculatorId = this.getCalculatorId(calculator)
    const wasRemoved = this.registrations.delete(calculatorId)
    
    if (wasRemoved) {
      this.updateMetrics()
      if (this.options.enableCaching) {
        this.resolutionCache.clear()
      }
      console.log(`Unregistered calculator: ${calculatorId}`)
    }
    
    return wasRemoved
  }

  /**
   * Bulk registration of multiple calculators
   */
  registerAll(registrations: CalculatorRegistration[]): void {
    registrations.forEach(registration => {
      try {
        this.register(registration)
      } catch (error) {
        console.error(`Failed to register calculator: ${error}`)
      }
    })
  }

  // ==================== RESOLUTION METHODS ====================

  /**
   * Main method to resolve the appropriate calculator for given input
   */
  resolve(input: CalculationInput): CalculatorResolution {
    const startTime = Date.now()
    
    try {
      // Check cache first
      if (this.options.enableCaching) {
        const cacheKey = this.getCacheKey(input)
        const cached = this.resolutionCache.get(cacheKey)
        if (cached) {
          return cached
        }
      }

      // Determine asset type from input
      const assetTypes = this.determineAssetTypes(input)
      
      // Find matching calculators
      const candidates = this.findCandidates(assetTypes)
      
      // Select best calculator
      const resolution = this.selectBestCalculator(candidates, input, assetTypes)
      
      // Cache the result
      if (this.options.enableCaching && resolution) {
        const cacheKey = this.getCacheKey(input)
        this.resolutionCache.set(cacheKey, resolution)
      }
      
      // Update metrics
      this.recordResolution(resolution, Date.now() - startTime)
      
      return resolution
      
    } catch (error) {
      console.error(`Calculator resolution failed: ${error}`)
      return this.getFallbackResolution(input)
    }
  }

  /**
   * Gets calculator specifically for an asset type
   */
  getCalculatorForAssetType(assetType: AssetType): AssetNavCalculator | null {
    const mockInput: CalculationInput = {
      productType: assetType,
      valuationDate: new Date()
    }
    
    const resolution = this.resolve(mockInput)
    return resolution ? resolution.calculator : null
  }

  /**
   * Checks if registry can handle a specific asset type
   */
  canHandle(assetType: AssetType): boolean {
    return Array.from(this.registrations.values())
      .some(reg => reg.enabled && reg.assetTypes.includes(assetType))
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Gets all registered calculators
   */
  getAllCalculators(): CalculatorRegistration[] {
    return Array.from(this.registrations.values())
  }

  /**
   * Gets enabled calculators only
   */
  getEnabledCalculators(): CalculatorRegistration[] {
    return Array.from(this.registrations.values())
      .filter(reg => reg.enabled)
  }

  /**
   * Gets supported asset types
   */
  getSupportedAssetTypes(): AssetType[] {
    const assetTypes = new Set<AssetType>()
    
    this.registrations.forEach(reg => {
      if (reg.enabled) {
        reg.assetTypes.forEach(type => assetTypes.add(type))
      }
    })
    
    return Array.from(assetTypes)
  }

  /**
   * Gets current registry metrics
   */
  getMetrics(): RegistryMetrics {
    return { ...this.metrics }
  }

  /**
   * Clears resolution cache
   */
  clearCache(): void {
    this.resolutionCache.clear()
    console.log('Calculator resolution cache cleared')
  }

  /**
   * Enables/disables a specific calculator
   */
  setCalculatorEnabled(calculator: AssetNavCalculator, enabled: boolean): boolean {
    const calculatorId = this.getCalculatorId(calculator)
    const registration = this.registrations.get(calculatorId)
    
    if (registration) {
      registration.enabled = enabled
      this.updateMetrics()
      this.clearCache()
      console.log(`Calculator ${calculatorId} ${enabled ? 'enabled' : 'disabled'}`)
      return true
    }
    
    return false
  }

  // ==================== HEALTH CHECK METHODS ====================

  /**
   * Performs health check on all registered calculators
   */
  async performHealthCheck(): Promise<Record<string, boolean>> {
    const healthResults: Record<string, boolean> = {}
    
    for (const [calculatorId, registration] of this.registrations.entries()) {
      try {
        const isHealthy = await this.checkCalculatorHealth(registration)
        healthResults[calculatorId] = isHealthy
        
        // Disable calculator if health check fails
        if (!isHealthy && registration.enabled) {
          console.warn(`Calculator ${calculatorId} failed health check, disabling`)
          registration.enabled = false
        }
      } catch (error) {
        console.error(`Health check failed for ${calculatorId}: ${error}`)
        healthResults[calculatorId] = false
      }
    }
    
    this.metrics.healthCheckResults = healthResults
    this.updateMetrics()
    
    return healthResults
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Generates unique ID for a calculator
   */
  private getCalculatorId(calculator: AssetNavCalculator): string {
    return calculator.constructor.name
  }

  /**
   * Validates calculator registration
   */
  private validateRegistration(registration: CalculatorRegistration): void {
    if (!registration.calculator) {
      throw new Error('Calculator is required')
    }
    
    if (!registration.assetTypes || registration.assetTypes.length === 0) {
      throw new Error('At least one asset type must be specified')
    }
    
    if (registration.priority < 0 || registration.priority > 100) {
      throw new Error('Priority must be between 0 and 100')
    }
    
    if (!registration.description) {
      throw new Error('Description is required')
    }
    
    if (!registration.version) {
      throw new Error('Version is required')
    }
  }

  /**
   * Determines asset types from calculation input
   */
  private determineAssetTypes(input: CalculationInput): AssetType[] {
    const assetTypes: AssetType[] = []
    
    // Direct asset type from product type
    if (input.productType && Object.values(AssetType).includes(input.productType as AssetType)) {
      assetTypes.push(input.productType as AssetType)
    }
    
    // TODO: Add logic to determine asset type from assetId or projectId
    // This would require database queries to resolve the asset type
    
    return assetTypes
  }

  /**
   * Finds candidate calculators for given asset types
   */
  private findCandidates(assetTypes: AssetType[]): CalculatorRegistration[] {
    const candidates: CalculatorRegistration[] = []
    
    for (const registration of this.registrations.values()) {
      if (!registration.enabled) continue
      
      // Check if calculator can handle any of the asset types
      const canHandleAssetType = registration.assetTypes.some(type => 
        assetTypes.includes(type)
      )
      
      if (canHandleAssetType) {
        candidates.push(registration)
      }
    }
    
    return candidates
  }

  /**
   * Selects the best calculator from candidates
   */
  private selectBestCalculator(
    candidates: CalculatorRegistration[], 
    input: CalculationInput, 
    assetTypes: AssetType[]
  ): CalculatorResolution {
    if (candidates.length === 0) {
      return this.getFallbackResolution(input)
    }
    
    // Sort by priority (higher priority first)
    candidates.sort((a, b) => b.priority - a.priority)
    
    // Test each candidate's canHandle method
    for (const candidate of candidates) {
      try {
        if (candidate.calculator.canHandle(input)) {
          return {
            calculator: candidate.calculator,
            match: 'exact',
            confidence: 1.0,
            reason: `Exact match for asset types: ${assetTypes.join(', ')}`
          }
        }
      } catch (error) {
        console.warn(`Calculator ${this.getCalculatorId(candidate.calculator)} canHandle check failed: ${error}`)
        continue
      }
    }
    
    // If no exact match, return the highest priority calculator as fallback
    const fallbackCandidate = candidates[0]
    if (!fallbackCandidate) {
      return this.getFallbackResolution(input)
    }
    
    return {
      calculator: fallbackCandidate.calculator,
      match: 'fallback',
      confidence: 0.7,
      reason: `Fallback to highest priority calculator for asset types: ${assetTypes.join(', ')}`
    }
  }

  /**
   * Gets fallback resolution when no calculators are available
   */
  private getFallbackResolution(input: CalculationInput): CalculatorResolution {
    if (!this.options.defaultFallbackEnabled) {
      throw new Error('No calculator available and fallback is disabled')
    }
    
    // Create a basic fallback calculator
    const fallbackCalculator = new DefaultFallbackCalculator()
    
    return {
      calculator: fallbackCalculator,
      match: 'default',
      confidence: 0.3,
      reason: 'No specific calculator available, using default fallback'
    }
  }

  /**
   * Generates cache key for resolution caching
   */
  private getCacheKey(input: CalculationInput): string {
    const keyParts = [
      input.assetId || 'no-asset',
      input.productType || 'no-product',
      input.projectId || 'no-project'
    ]
    return keyParts.join('|')
  }

  /**
   * Records resolution metrics
   */
  private recordResolution(resolution: CalculatorResolution, executionTimeMs: number): void {
    const calculatorType = this.getCalculatorId(resolution.calculator)
    
    // Update resolution stats
    this.metrics.resolutionStats[calculatorType] = 
      (this.metrics.resolutionStats[calculatorType] || 0) + 1
    
    // Update average resolution time
    const totalResolutions = Object.values(this.metrics.resolutionStats)
      .reduce((sum, count) => sum + count, 0)
    
    this.metrics.averageResolutionTimeMs = 
      (this.metrics.averageResolutionTimeMs * (totalResolutions - 1) + executionTimeMs) / totalResolutions
  }

  /**
   * Updates registry metrics
   */
  private updateMetrics(): void {
    this.metrics.totalRegistrations = this.registrations.size
    this.metrics.enabledCalculators = Array.from(this.registrations.values())
      .filter(reg => reg.enabled).length
  }

  /**
   * Checks health of a specific calculator
   */
  private async checkCalculatorHealth(registration: CalculatorRegistration): Promise<boolean> {
    try {
      // Basic health check - try to call canHandle with minimal input
      const testInput: CalculationInput = {
        valuationDate: new Date()
      }
      
      // This should not throw an error for a healthy calculator
      registration.calculator.canHandle(testInput)
      return true
      
    } catch (error) {
      console.error(`Health check failed for ${this.getCalculatorId(registration.calculator)}: ${error}`)
      return false
    }
  }

  /**
   * Starts periodic health check timer
   */
  private startHealthCheckTimer(): void {
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.options.healthCheckIntervalMs!
    )
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    
    this.registrations.clear()
    this.resolutionCache.clear()
    console.log('CalculatorRegistry destroyed')
  }
}

/**
 * Default fallback calculator for when no specific calculator is available
 */
class DefaultFallbackCalculator extends BaseCalculator {
  canHandle(input: CalculationInput): boolean {
    // Can handle any input as a last resort
    return true
  }

  getAssetTypes(): AssetType[] {
    return Object.values(AssetType) // Supports all asset types as fallback
  }

  protected async performCalculation(input: CalculationInput): Promise<import('../types').NavServiceResult<CalculationResult>> {
    // Very basic NAV calculation
    const totalAssets = input.fees ? -input.fees : 0
    const totalLiabilities = input.liabilities || 0
    const netAssets = totalAssets - totalLiabilities
    const navValue = Math.max(0, netAssets) // Ensure non-negative
    
    const result: CalculationResult = {
      runId: this.generateRunId(),
      assetId: input.assetId,
      productType: input.productType,
      projectId: input.projectId,
      valuationDate: input.valuationDate,
      totalAssets,
      totalLiabilities,
      netAssets,
      navValue,
      navPerShare: input.sharesOutstanding ? navValue / input.sharesOutstanding : undefined,
      sharesOutstanding: input.sharesOutstanding,
      currency: input.targetCurrency || 'USD',
      pricingSources: {},
      calculatedAt: new Date(),
      status: CalculationStatus.COMPLETED
    }
    
    return {
      success: true,
      data: result
    }
  }
}

/**
 * Factory function to create and initialize the registry with common calculators
 */
export function createCalculatorRegistry(options?: RegistryOptions): CalculatorRegistry {
  const registry = new CalculatorRegistry(options)
  
  // TODO: Register actual calculators when they are implemented
  // registry.register({
  //   calculator: new EquityCalculator(),
  //   assetTypes: [AssetType.EQUITY],
  //   priority: 90,
  //   enabled: true,
  //   description: 'Equity NAV calculator using market prices',
  //   version: '1.0.0'
  // })
  
  return registry
}
