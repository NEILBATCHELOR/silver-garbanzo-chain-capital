/**
 * NAV Config Service - ZERO HARDCODED VALUES
 * 
 * Manages configuration for NAV calculations
 * All defaults from database: nav_calculation_default_configs table
 * NO FALLBACKS - throws error if config not found
 * 
 * Configuration hierarchy:
 * 1. Database config (product-specific, highest priority)
 * 2. User overrides (for testing)
 * 3. ETF type defaults from database (system-level)
 */

import { Decimal } from 'decimal.js'
import { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface ETFCalculationConfig {
  // Pricing configuration
  pricing: {
    useMarketPrices: boolean
    maxPriceAge: number // milliseconds
    priceSourcePriority: string[] // ['coingecko', 'alphavantage', 'polygon']
  }
  
  // Tracking error configuration
  tracking: {
    enabled: boolean
    benchmarkRequired: boolean
    minDataPoints: number
    rollingWindow: number // days
  }
  
  // Crypto-specific configuration
  crypto?: {
    enabled: boolean
    stakingEnabled: boolean
    compoundingEnabled: boolean
    minimumStakingAPR: number
    maximumStakingAPR: number
  }
  
  // Premium/discount configuration
  premiumDiscount: {
    enabled: boolean
    alertThreshold: number // percentage
    considerOutliers: boolean
  }
  
  // Validation thresholds
  validation: {
    maxHoldingsDeviation: number // percentage from AUM
    minSharesOutstanding: number
    maxPremiumDiscount: number // percentage
    maxTrackingError: number // percentage
  }
  
  // Data quality requirements
  dataQuality?: {
    minConfidence: number // 0-1
    requireAllHoldingsPriced: boolean
    maxMissingHoldings: number // percentage
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
    value: any
  }>
  warnings: string[]
}

export interface NAVConfigServiceConfig {
  supabaseClient: SupabaseClient
  projectId?: string
}

// =====================================================
// NAV CONFIG SERVICE - ZERO FALLBACKS
// =====================================================

export class NAVConfigService {
  private readonly config: NAVConfigServiceConfig
  private readonly configCache: Map<string, { config: ETFCalculationConfig; cachedAt: number }> = new Map()
  private readonly CACHE_TTL = 300000 // 5 minutes
  
  // Database-backed defaults (loaded on demand)
  private etfTypeDefaults: Map<string, ETFCalculationConfig> = new Map()
  private configLoaded = false
  
  constructor(config: NAVConfigServiceConfig) {
    if (!config.supabaseClient) {
      throw new Error('Supabase client is required - NO FALLBACKS ALLOWED')
    }
    
    this.config = config
  }
  
  /**
   * Load default configurations from database
   * REQUIRED before any operations
   */
  private async loadConfiguration(): Promise<void> {
    if (this.configLoaded) return
    
    try {
      const { data, error } = await this.config.supabaseClient
        .from('nav_calculation_default_configs')
        .select('*')
        .eq('is_active', true)
      
      if (error) {
        throw new Error(`Failed to load NAV config defaults: ${error.message}`)
      }
      
      if (!data || data.length === 0) {
        throw new Error('No NAV calculation default configs found in database. Add to nav_calculation_default_configs table')
      }
      
      data.forEach((row: any) => {
        this.etfTypeDefaults.set(row.etf_type, row.config as ETFCalculationConfig)
      })
      
      this.configLoaded = true
      console.log('✅ NAV calculation default configs loaded from database')
      console.log(`  - ${this.etfTypeDefaults.size} ETF types configured`)
    } catch (error) {
      console.error('Failed to load NAV config defaults:', error)
      throw new Error('CRITICAL: NAV config service cannot operate without database configuration')
    }
  }
  
  /**
   * Get configuration for a specific ETF
   * Priority: Database (product-specific) > ETF type defaults > Error
   * NO FALLBACKS
   */
  async getConfig(productId: string, etfType?: string): Promise<ETFCalculationConfig> {
    await this.loadConfiguration()
    
    // Check cache
    const cacheKey = `${productId}:${etfType || 'default'}`
    const cached = this.configCache.get(cacheKey)
    
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      return cached.config
    }
    
    // Try to get product-specific config from database
    let config: ETFCalculationConfig | null = null
    
    if (this.config.supabaseClient) {
      try {
        const { data, error } = await this.config.supabaseClient
          .from('etf_calculation_configs')
          .select('*')
          .eq('product_id', productId)
          .single()
        
        if (data && !error) {
          config = data.config as ETFCalculationConfig
        }
      } catch (error) {
        console.warn(`No product-specific config for ${productId}`)
      }
    }
    
    // If no product-specific config, use ETF type defaults
    if (!config && etfType) {
      config = this.etfTypeDefaults.get(etfType) || null
    }
    
    if (!config) {
      throw new Error(
        `No configuration found for product ${productId} or ETF type ${etfType}. ` +
        `Add to nav_calculation_default_configs or etf_calculation_configs table. NO FALLBACK AVAILABLE`
      )
    }
    
    // Cache result
    this.configCache.set(cacheKey, {
      config,
      cachedAt: Date.now()
    })
    
    return config
  }
  
  /**
   * Get default configuration for an ETF type
   * NO FALLBACKS
   */
  async getDefaultConfig(etfType: string): Promise<ETFCalculationConfig> {
    await this.loadConfiguration()
    
    const config = this.etfTypeDefaults.get(etfType)
    if (!config) {
      throw new Error(
        `No default configuration for ETF type: ${etfType}. ` +
        `Add to nav_calculation_default_configs table. NO FALLBACK AVAILABLE`
      )
    }
    
    return config
  }
  
  /**
   * Save product-specific configuration override
   */
  async saveProductConfig(
    productId: string,
    config: ETFCalculationConfig
  ): Promise<void> {
    
    // Validate config first
    const validation = this.validateConfigOverrides(config)
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${JSON.stringify(validation.errors)}`)
    }
    
    const { error } = await this.config.supabaseClient
      .from('etf_calculation_configs')
      .upsert({
        product_id: productId,
        config,
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      throw new Error(`Failed to save product config: ${error.message}`)
    }
    
    // Clear cache
    this.configCache.clear()
    
    console.log(`✅ Saved custom config for product ${productId}`)
  }
  
  /**
   * Validate configuration overrides
   */
  validateConfigOverrides(overrides: any): ValidationResult {
    const errors: Array<{ field: string; message: string; value: any }> = []
    const warnings: string[] = []
    
    // Validate pricing config
    if (overrides.pricing) {
      if (typeof overrides.pricing.maxPriceAge === 'number' && overrides.pricing.maxPriceAge < 0) {
        errors.push({
          field: 'pricing.maxPriceAge',
          message: 'maxPriceAge must be non-negative',
          value: overrides.pricing.maxPriceAge
        })
      }
    }
    
    // Validate crypto config
    if (overrides.crypto) {
      const min = overrides.crypto.minimumStakingAPR
      const max = overrides.crypto.maximumStakingAPR
      
      if (typeof min === 'number' && typeof max === 'number' && min > max) {
        errors.push({
          field: 'crypto.stakingAPR',
          message: 'minimumStakingAPR cannot be greater than maximumStakingAPR',
          value: { min, max }
        })
      }
      
      if (typeof max === 'number' && max > 100) {
        warnings.push('maximumStakingAPR > 100% is unusually high')
      }
    }
    
    // Validate thresholds
    if (overrides.validation) {
      const v = overrides.validation
      
      if (typeof v.maxHoldingsDeviation === 'number' && (v.maxHoldingsDeviation < 0 || v.maxHoldingsDeviation > 100)) {
        errors.push({
          field: 'validation.maxHoldingsDeviation',
          message: 'maxHoldingsDeviation must be between 0 and 100',
          value: v.maxHoldingsDeviation
        })
      }
      
      if (typeof v.minSharesOutstanding === 'number' && v.minSharesOutstanding < 1) {
        errors.push({
          field: 'validation.minSharesOutstanding',
          message: 'minSharesOutstanding must be at least 1',
          value: v.minSharesOutstanding
        })
      }
    }
    
    // Validate data quality
    if (overrides.dataQuality) {
      const dq = overrides.dataQuality
      
      if (typeof dq.minConfidence === 'number' && (dq.minConfidence < 0 || dq.minConfidence > 1)) {
        errors.push({
          field: 'dataQuality.minConfidence',
          message: 'minConfidence must be between 0 and 1',
          value: dq.minConfidence
        })
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Merge configs with overrides
   * Overrides take precedence over default config
   */
  mergeConfigs(
    defaultConfig: ETFCalculationConfig,
    overrides?: any
  ): ETFCalculationConfig {
    if (!overrides) return defaultConfig
    
    return this.deepMerge(defaultConfig, overrides)
  }
  
  /**
   * Deep merge objects
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target }
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key]
        const targetValue = result[key]
        
        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          result[key] = this.deepMerge(targetValue, sourceValue) as any
        } else {
          result[key] = sourceValue as any
        }
      }
    }
    
    return result
  }
  
  /**
   * Clear cache and force reload
   */
  clearCache(): void {
    this.configCache.clear()
    this.configLoaded = false
    this.etfTypeDefaults.clear()
  }
  
  /**
   * Get all supported ETF types
   */
  async getSupportedETFTypes(): Promise<string[]> {
    await this.loadConfiguration()
    return Array.from(this.etfTypeDefaults.keys())
  }
}

// Export singleton factory
export function createNAVConfigService(config: NAVConfigServiceConfig): NAVConfigService {
  return new NAVConfigService(config)
}