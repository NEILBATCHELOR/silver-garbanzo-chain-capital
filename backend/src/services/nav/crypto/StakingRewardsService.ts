/**
 * Staking Rewards Service - ZERO HARDCODED VALUES
 * 
 * Calculates and tracks staking rewards for proof-of-stake crypto assets
 * All APRs from database: staking_apr_config table
 * NO FALLBACKS - throws error if APR not configured
 */

import { Decimal } from 'decimal.js'
import { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface CryptoHolding {
  blockchain: string
  quantity: number
  is_staked: boolean
  staking_apr: number | null
  staking_rewards_accrued?: number
}

export interface StakingRewardsRequest {
  blockchain: string
  quantity: number
  stakingAPR: number
  days?: number
  compounding?: boolean
}

export interface StakingRewardsResult {
  blockchain: string
  quantity: Decimal
  stakingAPR: number
  dailyReward: Decimal
  totalRewards: Decimal
  finalBalance: Decimal
  rewardsInUSD?: Decimal
  metadata: {
    calculationDate: Date
    compounding: boolean
    effectiveAPY?: number
    validator?: string
    commission?: number
  }
}

export interface StakingAPRRequest {
  blockchain: string
  validator?: string
}

export interface StakingAPRResult {
  blockchain: string
  apr: number
  apy: number
  validator?: string
  commission: number
  source: string
  timestamp: Date
}

export interface StakingRewardsServiceConfig {
  supabaseClient: SupabaseClient
  projectId?: string
}

interface StakingAPRConfig {
  blockchain: string
  currentApr: number
  minApr: number
  maxApr: number
  commission: number
  source: string
  lastUpdated: Date
}

// =====================================================
// STAKING REWARDS SERVICE - ZERO FALLBACKS
// =====================================================

export class StakingRewardsService {
  private readonly config: StakingRewardsServiceConfig
  private readonly aprCache: Map<string, { apr: StakingAPRResult; cachedAt: number }> = new Map()
  private readonly CACHE_TTL = 3600000 // 1 hour
  
  // Database-backed APR configuration (loaded on demand)
  private stakingAPRs: Map<string, StakingAPRConfig> = new Map()
  private configLoaded = false
  
  constructor(config: StakingRewardsServiceConfig) {
    if (!config.supabaseClient) {
      throw new Error('Supabase client is required - NO FALLBACKS ALLOWED')
    }
    
    this.config = config
  }
  
  /**
   * Load staking APR configuration from database
   * REQUIRED before any operations
   */
  private async loadConfiguration(): Promise<void> {
    if (this.configLoaded) return
    
    try {
      const { data, error } = await this.config.supabaseClient
        .from('staking_apr_config')
        .select('*')
      
      if (error) {
        throw new Error(`Failed to load staking APR config: ${error.message}`)
      }
      
      if (!data || data.length === 0) {
        throw new Error('No staking APR configuration found in database. Add to staking_apr_config table')
      }
      
      data.forEach((config: any) => {
        this.stakingAPRs.set(config.blockchain.toLowerCase(), {
          blockchain: config.blockchain,
          currentApr: parseFloat(config.current_apr),
          minApr: parseFloat(config.min_apr),
          maxApr: parseFloat(config.max_apr),
          commission: parseFloat(config.commission),
          source: config.source,
          lastUpdated: new Date(config.last_updated)
        })
      })
      
      this.configLoaded = true
      console.log('✅ Staking APR configuration loaded from database')
      console.log(`  - ${this.stakingAPRs.size} blockchains configured`)
    } catch (error) {
      console.error('Failed to load staking APR configuration:', error)
      throw new Error('CRITICAL: Staking rewards service cannot operate without database configuration')
    }
  }
  
  /**
   * Calculate daily staking rewards
   */
  async calculateDailyRewards(
    blockchain: string,
    quantity: number,
    stakingAPR: number
  ): Promise<Decimal> {
    // Daily reward = (Quantity × APR) / 365
    const quantityDecimal = new Decimal(quantity)
    const aprDecimal = new Decimal(stakingAPR).div(100)
    const dailyReward = quantityDecimal.times(aprDecimal).div(365)
    
    return dailyReward
  }
  
  /**
   * Calculate total staking rewards over a period
   */
  async calculateStakingRewards(
    request: StakingRewardsRequest
  ): Promise<StakingRewardsResult> {
    
    const days = request.days || 365
    const quantityDecimal = new Decimal(request.quantity)
    const aprDecimal = new Decimal(request.stakingAPR).div(100)
    
    let totalRewards: Decimal
    let finalBalance: Decimal
    let effectiveAPY: number | undefined
    
    if (request.compounding) {
      // Compounding rewards: A = P(1 + r/n)^(nt)
      const years = days / 365
      const dailyRate = aprDecimal.div(365)
      const compoundFactor = new Decimal(1).plus(dailyRate).pow(days)
      
      finalBalance = quantityDecimal.times(compoundFactor)
      totalRewards = finalBalance.minus(quantityDecimal)
      
      // Calculate effective APY
      effectiveAPY = compoundFactor.minus(1).times(100).toNumber()
    } else {
      // Simple interest
      const dailyReward = await this.calculateDailyRewards(
        request.blockchain,
        request.quantity,
        request.stakingAPR
      )
      
      totalRewards = dailyReward.times(days)
      finalBalance = quantityDecimal.plus(totalRewards)
    }
    
    return {
      blockchain: request.blockchain,
      quantity: quantityDecimal,
      stakingAPR: request.stakingAPR,
      dailyReward: await this.calculateDailyRewards(
        request.blockchain,
        request.quantity,
        request.stakingAPR
      ),
      totalRewards,
      finalBalance,
      metadata: {
        calculationDate: new Date(),
        compounding: request.compounding || false,
        effectiveAPY
      }
    }
  }
  
  /**
   * Calculate compounded rewards over time
   */
  async calculateCompoundedRewards(
    holdings: CryptoHolding[],
    days: number
  ): Promise<Map<string, Decimal>> {
    
    const rewardsByBlockchain = new Map<string, Decimal>()
    
    for (const holding of holdings) {
      if (!holding.is_staked || !holding.staking_apr) continue
      
      const result = await this.calculateStakingRewards({
        blockchain: holding.blockchain,
        quantity: holding.quantity,
        stakingAPR: holding.staking_apr,
        days,
        compounding: true
      })
      
      rewardsByBlockchain.set(holding.blockchain, result.totalRewards)
    }
    
    return rewardsByBlockchain
  }
  
  /**
   * Get current staking APR from database
   * NO FALLBACKS - throws error if not configured
   */
  async getCurrentStakingAPR(request: StakingAPRRequest): Promise<StakingAPRResult> {
    await this.loadConfiguration()
    
    // Check cache
    const cacheKey = `${request.blockchain}:${request.validator || 'default'}`
    const cached = this.aprCache.get(cacheKey)
    
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      return cached.apr
    }
    
    // Get from database configuration
    const config = this.stakingAPRs.get(request.blockchain.toLowerCase())
    if (!config) {
      throw new Error(
        `No staking APR configured for blockchain: ${request.blockchain}. ` +
        `Add to staking_apr_config table. NO FALLBACK AVAILABLE`
      )
    }
    
    const aprResult: StakingAPRResult = {
      blockchain: request.blockchain,
      apr: config.currentApr,
      apy: this.calculateAPYFromAPR(config.currentApr),
      validator: request.validator || 'Network Average',
      commission: config.commission,
      source: config.source,
      timestamp: config.lastUpdated
    }
    
    // Cache result
    this.aprCache.set(cacheKey, {
      apr: aprResult,
      cachedAt: Date.now()
    })
    
    return aprResult
  }
  
  /**
   * Update staking APR in database
   * Call this periodically to keep APRs current
   */
  async updateStakingAPR(
    blockchain: string,
    apr: number,
    source: string
  ): Promise<void> {
    const { error } = await this.config.supabaseClient
      .from('staking_apr_config')
      .update({
        current_apr: apr,
        source,
        last_updated: new Date().toISOString()
      })
      .eq('blockchain', blockchain)
    
    if (error) {
      throw new Error(`Failed to update staking APR: ${error.message}`)
    }
    
    // Clear cache to force reload
    this.aprCache.clear()
    this.configLoaded = false
    
    console.log(`✅ Updated ${blockchain} staking APR to ${apr}% (source: ${source})`)
  }
  
  /**
   * Validate staking APR is within configured range
   */
  async validateStakingAPR(blockchain: string, apr: number): Promise<{
    isValid: boolean
    reason?: string
  }> {
    await this.loadConfiguration()
    
    const config = this.stakingAPRs.get(blockchain.toLowerCase())
    if (!config) {
      return {
        isValid: false,
        reason: `No configuration for blockchain: ${blockchain}`
      }
    }
    
    if (apr < config.minApr) {
      return {
        isValid: false,
        reason: `APR ${apr}% below minimum ${config.minApr}% for ${blockchain}`
      }
    }
    
    if (apr > config.maxApr) {
      return {
        isValid: false,
        reason: `APR ${apr}% exceeds maximum ${config.maxApr}% for ${blockchain}`
      }
    }
    
    return { isValid: true }
  }
  
  /**
   * Calculate APY from APR (assuming daily compounding)
   */
  private calculateAPYFromAPR(apr: number): number {
    // APY = (1 + APR/365)^365 - 1
    const dailyRate = apr / 100 / 365
    const apy = (Math.pow(1 + dailyRate, 365) - 1) * 100
    return apy
  }
  
  /**
   * Clear cache and force reload
   */
  clearCache(): void {
    this.aprCache.clear()
    this.configLoaded = false
    this.stakingAPRs.clear()
  }
  
  /**
   * Get all configured blockchains
   */
  async getSupportedBlockchains(): Promise<string[]> {
    await this.loadConfiguration()
    return Array.from(this.stakingAPRs.keys())
  }
}

// Export singleton factory
export function createStakingRewardsService(config: StakingRewardsServiceConfig): StakingRewardsService {
  return new StakingRewardsService(config)
}