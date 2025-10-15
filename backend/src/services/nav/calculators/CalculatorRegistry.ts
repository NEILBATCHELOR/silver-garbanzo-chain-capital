/**
 * Calculator Registry
 * 
 * Factory pattern for dynamic calculator resolution
 * Currently supports: Bonds, MMF (Money Market Funds)
 * 
 * Following Phase 5 specifications
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { BaseCalculator } from './BaseCalculator'
import { createBondsCalculator } from './traditional/BondsCalculator'
import { createMMFCalculator } from './traditional/MMFCalculator'
import { CalculatorInput, CalculatorResult } from './types'

export type AssetType = 
  | 'bonds'
  | 'mmf'
  // Add more as implemented:
  // | 'equity'
  // | 'real_estate'
  // | 'private_equity'
  // etc.

/**
 * Calculator Registry
 * Manages all NAV calculators and provides dynamic routing
 */
export class CalculatorRegistry {
  private calculators = new Map<AssetType, BaseCalculator<any, any, any>>()
  
  constructor(private dbClient: SupabaseClient) {
    this.registerCalculators()
  }
  
  /**
   * Register all available calculators
   */
  private registerCalculators(): void {
    // Register Bonds calculator
    this.calculators.set('bonds', createBondsCalculator(this.dbClient))
    
    // Register MMF calculator
    this.calculators.set('mmf', createMMFCalculator(this.dbClient))
    
    // TODO: Register additional calculators as they are implemented
    // this.calculators.set('equity', createEquityCalculator(this.dbClient))
    // this.calculators.set('real_estate', createRealEstateCalculator(this.dbClient))
    // etc.
  }
  
  /**
   * Get calculator by asset type
   */
  getCalculator(assetType: AssetType): BaseCalculator<any, any, any> {
    const calculator = this.calculators.get(assetType)
    
    if (!calculator) {
      throw new Error(
        `No calculator registered for asset type: ${assetType}. ` +
        `Available calculators: ${Array.from(this.calculators.keys()).join(', ')}`
      )
    }
    
    return calculator
  }
  
  /**
   * Calculate NAV for any registered asset type
   */
  async calculate(assetType: AssetType, input: CalculatorInput): Promise<CalculatorResult> {
    const calculator = this.getCalculator(assetType)
    return calculator.calculate(input)
  }
  
  /**
   * Batch calculate multiple assets
   */
  async calculateBatch(
    requests: Array<{ assetType: AssetType; input: CalculatorInput }>
  ): Promise<CalculatorResult[]> {
    return Promise.all(
      requests.map(({ assetType, input }) => this.calculate(assetType, input))
    )
  }
  
  /**
   * Get list of supported asset types
   */
  getSupportedAssetTypes(): AssetType[] {
    return Array.from(this.calculators.keys())
  }
  
  /**
   * Check if asset type is supported
   */
  isSupported(assetType: string): boolean {
    return this.calculators.has(assetType as AssetType)
  }
}

/**
 * Create and export singleton factory
 */
export function createCalculatorRegistry(dbClient: SupabaseClient): CalculatorRegistry {
  return new CalculatorRegistry(dbClient)
}
