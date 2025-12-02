/**
 * Basket Calculator Service
 * 
 * Calculates in-kind basket composition for ETF creation and redemption
 * Handles both traditional and crypto ETF baskets
 * 
 * Key Features:
 * - Calculate creation basket (securities to deliver)
 * - Calculate redemption basket (securities to receive)
 * - Handle cash substitutes for illiquid securities
 * - Support for crypto ETFs with blockchain transfers
 * - Transaction cost estimation
 * - Basket optimization for tax efficiency
 * 
 * Following ZERO HARDCODED VALUES principle
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Decimal } from 'decimal.js'

// Import types (will be defined here since ETFDataFetcher not yet available)
interface ETFProduct {
  id: string
  fund_ticker: string
  fund_type: string
  net_asset_value: number
  shares_outstanding: number
  assets_under_management: number
  currency: string
}

interface ETFHolding {
  id: string
  fund_product_id: string
  security_ticker: string | null
  security_name: string
  security_type: 'equity' | 'bond' | 'crypto' | 'commodity' | 'cash' | 'derivative'
  quantity: number
  price_per_unit: number
  market_value: number
  weight_percentage: number
  blockchain: string | null
  contract_address: string | null
  custody_address: string | null
  status: string
}

export interface BasketComposition {
  etfId: string
  etfTicker: string
  operationType: 'creation' | 'redemption'
  creationUnits: number
  sharesPerUnit: number
  totalShares: number
  
  // Securities in basket
  securities: BasketSecurity[]
  
  // Cash component
  cashComponent: {
    amount: Decimal
    currency: string
    reason: 'balancing' | 'illiquid_substitute' | 'fractional_shares'
  } | null
  
  // Valuation
  basketValue: Decimal
  navPerShare: Decimal
  estimatedTransactionCosts: Decimal
  
  // Settlement
  settlementMethod: 'in_kind' | 'cash' | 'hybrid'
  expectedSettlementDate: Date
  
  // Crypto-specific
  blockchainTransfers?: {
    blockchain: string
    securities: string[]
    totalValue: Decimal
  }[]
  
  // Metadata
  calculatedAt: Date
  expiresAt: Date
}

export interface BasketSecurity {
  securityTicker: string | null
  securityName: string
  securityType: 'equity' | 'bond' | 'crypto' | 'cash'
  quantity: Decimal
  pricePerUnit: Decimal
  value: Decimal
  weightInBasket: number // percentage
  
  // Crypto-specific
  blockchain?: string
  contractAddress?: string
  custodyAddress?: string
  
  // Settlement details
  substitutionAllowed: boolean
  cashSubstituteValue?: Decimal
}

export interface BasketCalculationConfig {
  // Creation unit size (typically 25,000, 50,000, or 100,000 shares)
  creationUnitSize: number
  
  // Cash substitution rules
  allowCashSubstitution: boolean
  illiquidityThreshold: number // average daily volume threshold
  maxCashPercentage: number // max % of basket that can be cash
  
  // Transaction costs
  estimatedBrokerageFeeBps: number // basis points
  estimatedMarketImpactBps: number // basis points
  
  // Basket expiration (hours)
  basketExpirationHours: number
  
  // Settlement timeline
  settlementDays: number // T+n settlement
}

export class BasketCalculator {
  private readonly dbClient: SupabaseClient
  private readonly config: BasketCalculationConfig
  
  constructor(
    dbClient: SupabaseClient,
    config?: Partial<BasketCalculationConfig>
  ) {
    this.dbClient = dbClient
    
    // Default configuration (can be overridden)
    this.config = {
      creationUnitSize: config?.creationUnitSize ?? 50000,
      allowCashSubstitution: config?.allowCashSubstitution ?? true,
      illiquidityThreshold: config?.illiquidityThreshold ?? 100000,
      maxCashPercentage: config?.maxCashPercentage ?? 10,
      estimatedBrokerageFeeBps: config?.estimatedBrokerageFeeBps ?? 2,
      estimatedMarketImpactBps: config?.estimatedMarketImpactBps ?? 5,
      basketExpirationHours: config?.basketExpirationHours ?? 4,
      settlementDays: config?.settlementDays ?? 2
    }
  }
  
  /**
   * Calculate creation basket
   * Returns basket of securities to deliver to create new ETF shares
   */
  async calculateCreationBasket(
    etfId: string,
    creationUnits: number = 1
  ): Promise<BasketComposition> {
    
    console.log(`Calculating creation basket for ETF ${etfId}, ${creationUnits} creation units`)
    
    try {
      // Fetch ETF product and holdings
      const { product, holdings } = await this.fetchETFData(etfId)
      
      // Calculate total shares being created
      const sharesPerUnit = this.config.creationUnitSize
      const totalShares = creationUnits * sharesPerUnit
      
      console.log(`Creating ${totalShares} shares (${creationUnits} units × ${sharesPerUnit} shares/unit)`)
      
      // Build basket securities based on current holdings
      const basketSecurities = await this.buildBasketSecurities(
        holdings,
        totalShares,
        product
      )
      
      // Calculate basket value
      const basketValue = basketSecurities.reduce(
        (sum, sec) => sum.plus(sec.value),
        new Decimal(0)
      )
      
      // Check for cash component (illiquid securities)
      const cashComponent = this.calculateCashComponent(basketSecurities, basketValue)
      
      // Estimate transaction costs
      const transactionCosts = this.estimateTransactionCosts(basketValue)
      
      // Determine settlement method
      const settlementMethod = this.determineSettlementMethod(basketSecurities, cashComponent)
      
      // Calculate settlement date
      const settlementDate = new Date()
      settlementDate.setDate(settlementDate.getDate() + this.config.settlementDays)
      
      // Calculate expiration time
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + this.config.basketExpirationHours)
      
      // Group crypto transfers if crypto ETF
      const blockchainTransfers = product.fund_type === 'etf_crypto'
        ? this.groupBlockchainTransfers(basketSecurities)
        : undefined
      
      return {
        etfId,
        etfTicker: product.fund_ticker,
        operationType: 'creation',
        creationUnits,
        sharesPerUnit,
        totalShares,
        securities: basketSecurities,
        cashComponent,
        basketValue,
        navPerShare: new Decimal(product.net_asset_value),
        estimatedTransactionCosts: transactionCosts,
        settlementMethod,
        expectedSettlementDate: settlementDate,
        blockchainTransfers,
        calculatedAt: new Date(),
        expiresAt
      }
      
    } catch (error) {
      console.error('Error calculating creation basket:', error)
      throw new Error(`Failed to calculate creation basket: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Calculate redemption basket
   * Returns basket of securities to receive when redeeming ETF shares
   */
  async calculateRedemptionBasket(
    etfId: string,
    redemptionUnits: number = 1
  ): Promise<BasketComposition> {
    
    console.log(`Calculating redemption basket for ETF ${etfId}, ${redemptionUnits} redemption units`)
    
    // Redemption basket is identical to creation basket
    // (investor receives the same basket they would deliver for creation)
    const basket = await this.calculateCreationBasket(etfId, redemptionUnits)
    
    return {
      ...basket,
      operationType: 'redemption'
    }
  }
  
  /**
   * Fetch ETF product and holdings data
   */
  private async fetchETFData(
    etfId: string
  ): Promise<{ product: ETFProduct; holdings: ETFHolding[] }> {
    
    // Fetch product
    const { data: product, error: productError } = await this.dbClient
      .from('fund_products')
      .select('*')
      .eq('id', etfId)
      .like('fund_type', 'etf_%')
      .single()
    
    if (productError || !product) {
      throw new Error(`Failed to fetch ETF product: ${productError?.message || 'Not found'}`)
    }
    
    // Fetch current holdings
    const { data: holdings, error: holdingsError } = await this.dbClient
      .from('etf_holdings')
      .select('*')
      .eq('fund_product_id', etfId)
      .eq('status', 'active')
      .order('weight_percentage', { ascending: false })
    
    if (holdingsError) {
      throw new Error(`Failed to fetch holdings: ${holdingsError.message}`)
    }
    
    return { product, holdings: holdings || [] }
  }
  
  /**
   * Build basket securities from holdings
   * Scales quantities based on shares being created
   */
  private async buildBasketSecurities(
    holdings: ETFHolding[],
    totalShares: number,
    product: ETFProduct
  ): Promise<BasketSecurity[]> {
    
    const basketSecurities: BasketSecurity[] = []
    const sharesOutstanding = new Decimal(product.shares_outstanding)
    
    for (const holding of holdings) {
      // Calculate quantity for this basket
      // Formula: (holding quantity / total ETF shares) × basket shares
      const holdingQuantity = new Decimal(holding.quantity)
      const proportionalQuantity = holdingQuantity.div(sharesOutstanding).times(totalShares)
      
      // Round to appropriate precision
      const roundedQuantity = this.roundQuantity(
        proportionalQuantity,
        holding.security_type
      )
      
      // Calculate value
      const pricePerUnit = new Decimal(holding.price_per_unit)
      const value = roundedQuantity.times(pricePerUnit)
      
      // Check if security is liquid enough (not needed for crypto)
      const substitutionAllowed = holding.security_type !== 'crypto' 
        ? await this.checkLiquidity(holding)
        : false
      
      basketSecurities.push({
        securityTicker: holding.security_ticker,
        securityName: holding.security_name,
        securityType: holding.security_type as any,
        quantity: roundedQuantity,
        pricePerUnit,
        value,
        weightInBasket: holding.weight_percentage,
        blockchain: holding.blockchain || undefined,
        contractAddress: holding.contract_address || undefined,
        custodyAddress: holding.custody_address || undefined,
        substitutionAllowed,
        cashSubstituteValue: substitutionAllowed ? value : undefined
      })
    }
    
    return basketSecurities
  }
  
  /**
   * Round quantity to appropriate precision based on security type
   */
  private roundQuantity(quantity: Decimal, securityType: string): Decimal {
    switch (securityType) {
      case 'equity':
        // Equities: whole shares only
        return quantity.round()
      case 'crypto':
        // Crypto: up to 8 decimal places
        return quantity.toDecimalPlaces(8)
      case 'bond':
        // Bonds: typically whole bonds
        return quantity.round()
      default:
        return quantity.toDecimalPlaces(2)
    }
  }
  
  /**
   * Check if security is liquid enough for in-kind transfer
   * Returns true if cash substitution should be allowed
   */
  private async checkLiquidity(holding: ETFHolding): Promise<boolean> {
    if (!this.config.allowCashSubstitution) {
      return false
    }
    
    // For now, simple check based on security type
    // In production, would check average daily volume from market data
    if (holding.security_type === 'cash') {
      return true // Always allow cash substitution for cash holdings
    }
    
    // Could add more sophisticated liquidity checks here
    // e.g., query market data for average daily volume
    
    return false
  }
  
  /**
   * Calculate cash component if needed
   * Returns cash amount for illiquid securities or balancing
   */
  private calculateCashComponent(
    basketSecurities: BasketSecurity[],
    basketValue: Decimal
  ): BasketComposition['cashComponent'] {
    
    // Check for illiquid securities that need cash substitution
    const illiquidSecurities = basketSecurities.filter(s => s.substitutionAllowed)
    
    if (illiquidSecurities.length === 0) {
      return null
    }
    
    // Calculate total cash substitute value
    const totalCashSubstitute = illiquidSecurities.reduce(
      (sum, sec) => sum.plus(sec.cashSubstituteValue || 0),
      new Decimal(0)
    )
    
    // Check if cash percentage exceeds maximum
    const cashPercentage = totalCashSubstitute.div(basketValue).times(100).toNumber()
    if (cashPercentage > this.config.maxCashPercentage) {
      console.warn(`Cash component ${cashPercentage.toFixed(2)}% exceeds maximum ${this.config.maxCashPercentage}%`)
    }
    
    return {
      amount: totalCashSubstitute,
      currency: 'USD', // Could be made configurable
      reason: 'illiquid_substitute'
    }
  }
  
  /**
   * Estimate transaction costs for basket
   */
  private estimateTransactionCosts(basketValue: Decimal): Decimal {
    const brokerageFee = basketValue.times(this.config.estimatedBrokerageFeeBps).div(10000)
    const marketImpact = basketValue.times(this.config.estimatedMarketImpactBps).div(10000)
    
    return brokerageFee.plus(marketImpact)
  }
  
  /**
   * Determine settlement method based on basket composition
   */
  private determineSettlementMethod(
    basketSecurities: BasketSecurity[],
    cashComponent: BasketComposition['cashComponent']
  ): 'in_kind' | 'cash' | 'hybrid' {
    
    if (!cashComponent) {
      return 'in_kind'
    }
    
    const totalSecurities = basketSecurities.length
    const cashSubstitutes = basketSecurities.filter(s => s.substitutionAllowed).length
    
    if (cashSubstitutes === totalSecurities) {
      return 'cash'
    }
    
    return 'hybrid'
  }
  
  /**
   * Group securities by blockchain for crypto ETFs
   */
  private groupBlockchainTransfers(
    basketSecurities: BasketSecurity[]
  ): BasketComposition['blockchainTransfers'] {
    
    const cryptoSecurities = basketSecurities.filter(s => s.securityType === 'crypto' && s.blockchain)
    
    if (cryptoSecurities.length === 0) {
      return undefined
    }
    
    // Group by blockchain
    const blockchainMap = new Map<string, { securities: string[]; totalValue: Decimal }>()
    
    for (const security of cryptoSecurities) {
      const blockchain = security.blockchain!
      const existing = blockchainMap.get(blockchain)
      
      if (existing) {
        existing.securities.push(security.securityName)
        existing.totalValue = existing.totalValue.plus(security.value)
      } else {
        blockchainMap.set(blockchain, {
          securities: [security.securityName],
          totalValue: security.value
        })
      }
    }
    
    // Convert to array
    return Array.from(blockchainMap.entries()).map(([blockchain, data]) => ({
      blockchain,
      securities: data.securities,
      totalValue: data.totalValue
    }))
  }
}

/**
 * Factory function to create basket calculator with optional config
 */
export function createBasketCalculator(
  dbClient: SupabaseClient,
  config?: Partial<BasketCalculationConfig>
): BasketCalculator {
  return new BasketCalculator(dbClient, config)
}
