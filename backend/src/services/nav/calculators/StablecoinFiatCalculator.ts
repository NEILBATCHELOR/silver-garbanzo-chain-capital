/**
 * StablecoinFiatCalculator - NAV calculation for Fiat-backed Stablecoins
 * 
 * Handles:
 * - 1:1 peg validation against underlying fiat currency
 * - Reserve attestation verification and monitoring
 * - Depeg risk assessment and alerting
 * - Multi-currency fiat backing (USD, EUR, GBP, etc.)
 * - Reserve composition analysis (cash, treasuries, commercial paper)
 * - Redemption/minting mechanism validation
 * - Regulatory compliance monitoring
 * - Market price vs. peg deviation tracking
 * 
 * Supports fiat-backed stablecoin products from stablecoin_products table
 */

import { Decimal } from 'decimal.js'
import { BaseCalculator, CalculatorOptions } from './BaseCalculator'
import { DatabaseService } from '../DatabaseService'
import {
  AssetType,
  CalculationInput,
  CalculationResult,
  CalculationStatus,
  PriceData,
  NavServiceResult,
  ValidationSeverity,
  AssetHolding
} from '../types'

export interface StablecoinFiatCalculationInput extends CalculationInput {
  // Stablecoin-specific parameters
  stablecoinSymbol?: string // USDC, USDT, BUSD, etc.
  pegCurrency?: string // USD, EUR, GBP, etc.
  contractAddress?: string
  chainId?: number
  totalSupply?: number // total tokens in circulation
  reserveDisclosureRequired?: boolean
  attestationRequired?: boolean
  maxPegDeviationBps?: number // max allowed deviation from peg in basis points
  liquidityThreshold?: number // minimum liquidity requirement
  redemptionMechanism?: 'direct' | 'authorized_participants' | 'market_based'
  reserveComposition?: 'cash_only' | 'cash_equivalents' | 'mixed' | 'full_reserve'
  regulatoryFramework?: 'US_TRUST' | 'EU_EMI' | 'UK_PI' | 'OFFSHORE' | 'UNREGULATED'
  auditFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
}

export interface FiatReserve extends AssetHolding {
  // Reserve asset details
  reserveType: 'cash' | 'treasury_bill' | 'commercial_paper' | 'money_market' | 'repo' | 'bank_deposit'
  maturityDate?: Date
  creditRating?: string
  bankName?: string
  accountType?: 'checking' | 'savings' | 'money_market' | 'cd'
  fdic_insured?: boolean
  yield?: number
  liquidationTime?: number // days to convert to cash
  attestationDate?: Date
  attestationFirm?: string
  marketValue?: number
  bookValue?: number
}

export interface StablecoinPriceData extends PriceData {
  pegPrice: number // theoretical peg price (usually 1.00)
  marketPrice: number // actual market price
  deviationFromPeg: number // market price - peg price
  deviationBasisPoints: number // deviation in basis points
  volume24h: number
  marketCap: number
  liquidityScore: number
  priceStability: number // rolling volatility measure
  redemptionAvailable: boolean
  mintingAvailable: boolean
  lastPegRestoration?: Date
}

export interface ReserveAttestation {
  attestationDate: Date
  attestationFirm: string
  totalReserves: number
  totalLiabilities: number
  netReserves: number
  reserveCoverage: number // reserves / total supply
  breakdownByCurrency: Record<string, number>
  breakdownByAssetType: Record<string, number>
  cashPercentage: number
  equivalentsPercentage: number
  riskAssetPercentage: number
  attestationOpinion: 'unqualified' | 'qualified' | 'adverse' | 'disclaimer'
  nextAttestationDue: Date
  reportUrl?: string
}

export interface DepegRiskMetrics {
  currentDeviationBps: number
  maxDeviationLast30d: number
  averageDeviationLast7d: number
  pegRestorationTime: number // average minutes to restore peg
  redemptionBacklog: number // pending redemption requests
  reserveRatio: number // reserves / total supply
  liquidityRisk: number // 0-100 risk score
  counterpartyRisk: number // 0-100 risk score
  regulatoryRisk: number // 0-100 risk score
  marketStressScore: number // 0-100 stress indicator
}

export interface StablecoinComplianceMetrics {
  reserveAdequacy: boolean
  attestationCurrent: boolean
  regulatoryCompliance: boolean
  pegStability: boolean
  redemptionOperational: boolean
  auditTrail: boolean
  transparencyScore: number // 0-100
  trustScore: number // 0-100
}

export class StablecoinFiatCalculator extends BaseCalculator {
  private static readonly DEFAULT_PEG_PRICE = 1.00
  private static readonly MAX_ACCEPTABLE_DEVIATION_BPS = 100 // 1%
  private static readonly MIN_RESERVE_RATIO = 1.00 // 100% backing minimum
  private static readonly LIQUIDITY_STRESS_THRESHOLD = 0.75
  private static readonly TRANSPARENCY_WEIGHT = 0.3
  private static readonly STABILITY_WEIGHT = 0.4
  private static readonly COMPLIANCE_WEIGHT = 0.3

  constructor(databaseService: DatabaseService, options: CalculatorOptions = {}) {
    super(databaseService, options)
  }

  // ==================== ABSTRACT METHOD IMPLEMENTATIONS ====================

  canHandle(input: CalculationInput): boolean {
    if (!input.productType) return false
    
    const supportedTypes = this.getAssetTypes()
    return supportedTypes.includes(input.productType as AssetType)
  }

  getAssetTypes(): AssetType[] {
    return [AssetType.STABLECOIN_FIAT_BACKED]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      const stablecoinInput = input as StablecoinFiatCalculationInput
      
      // Get stablecoin product details and reserve holdings
      const productDetails = await this.getStablecoinProductDetails(stablecoinInput)
      const reserves = await this.getFiatReserves(stablecoinInput)
      const attestation = await this.getLatestAttestation(stablecoinInput)
      
      // Fetch current market data and peg analysis
      const priceData = await this.fetchStablecoinPriceData(stablecoinInput, productDetails)
      const pegAnalysis = await this.analyzePegStability(priceData, productDetails)
      
      // Calculate reserve valuation and coverage
      const reserveValuation = await this.calculateReserveValuation(reserves, stablecoinInput.valuationDate)
      const coverageAnalysis = await this.analyzeCoverageRatio(reserveValuation, productDetails, attestation)
      
      // Assess depeg risks and compliance
      const depegRisk = await this.assessDepegRisk(priceData, reserveValuation, productDetails)
      const complianceMetrics = await this.evaluateCompliance(attestation, depegRisk, productDetails)
      
      // Calculate final NAV based on reserve backing
      const navCalculation = await this.calculateStablecoinNav(
        reserveValuation,
        productDetails,
        stablecoinInput,
        priceData
      )
      
      // Determine calculation status based on risk assessment
      let calculationStatus = CalculationStatus.COMPLETED
      let errorMessage: string | undefined
      
      if (!complianceMetrics.reserveAdequacy) {
        calculationStatus = CalculationStatus.FAILED
        errorMessage = 'Insufficient reserve backing detected'
      } else if (depegRisk.currentDeviationBps > (stablecoinInput.maxPegDeviationBps || 200)) {
        calculationStatus = CalculationStatus.FAILED
        errorMessage = `Peg deviation exceeds threshold: ${depegRisk.currentDeviationBps} bps`
      }
      
      // Build comprehensive calculation result
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId || `stablecoin_${productDetails.symbol}`,
        productType: AssetType.STABLECOIN_FIAT_BACKED,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: this.toNumber(reserveValuation.totalReserveValue),
        totalLiabilities: this.toNumber(reserveValuation.totalLiabilities),
        netAssets: this.toNumber(reserveValuation.netReserves),
        navValue: this.toNumber(navCalculation.totalNavValue),
        navPerShare: this.toNumber(navCalculation.navPerToken),
        sharesOutstanding: productDetails.totalSupply,
        currency: stablecoinInput.pegCurrency || 'USD',
        pricingSources: this.buildPricingSources(reserves, priceData),
        calculatedAt: new Date(),
        status: calculationStatus,
        errorMessage
      }

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown stablecoin calculation error',
        code: 'STABLECOIN_CALCULATION_FAILED'
      }
    }
  }

  // ==================== STABLECOIN-SPECIFIC METHODS ====================

  /**
   * Fetches stablecoin product details from the database using real DatabaseService
   */
  private async getStablecoinProductDetails(input: StablecoinFiatCalculationInput): Promise<any> {
    try {
      // Use DatabaseService to get real stablecoin product details
      const productDetails = await this.databaseService.getStablecoinProductById(
        input.assetId || input.projectId!
      )
      
      // Transform database fields to expected format
      const result = {
        id: productDetails.id,
        symbol: productDetails.token_symbol,
        name: productDetails.token_name,
        pegCurrency: productDetails.peg_currency,
        contractAddress: productDetails.contract_address,
        chainId: productDetails.blockchain_network, // May need mapping from network name to chain ID
        totalSupply: productDetails.total_supply,
        circulatingSupply: productDetails.circulating_supply,
        pegValue: productDetails.peg_value,
        collateralType: productDetails.collateral_type_enum,
        stabilityMechanism: productDetails.stability_mechanism,
        reserveAssets: productDetails.reserve_assets ? JSON.parse(productDetails.reserve_assets) : [],
        collateralRatio: productDetails.collateral_ratio,
        minimumReserveRatio: productDetails.collateral_ratio || 1.00,
        maxPegDeviationBps: 100, // Default value - could be added to schema
        attestationRequired: true,
        auditFrequency: 'monthly' // Default - could be added to schema
      }
      
      // Save calculation step for audit trail
      await this.databaseService.saveCalculationHistory({
        run_id: this.generateRunId(),
        asset_id: input.assetId || input.projectId!,
        product_type: 'stablecoin_fiat_backed',
        calculation_step: 'get_stablecoin_product_details',
        step_order: 1,
        input_data: { assetId: input.assetId, projectId: input.projectId },
        output_data: result,
        processing_time_ms: Date.now() - Date.now(), // Will be properly timed
        data_sources: ['stablecoin_products'],
        validation_results: { productFound: true, collateralType: result.collateralType }
      })
      
      return result
    } catch (error) {
      throw new Error(`Failed to fetch stablecoin product details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetches fiat reserve holdings from the database using real DatabaseService
   */
  private async getFiatReserves(input: StablecoinFiatCalculationInput): Promise<FiatReserve[]> {
    try {
      // Use DatabaseService to get real fiat reserves
      const reservesData = await this.databaseService.getFiatReserves(
        input.assetId || input.projectId!
      )
      
      // Transform database reserves to FiatReserve format
      const fiatReserves: FiatReserve[] = []
      
      for (const reserve of reservesData) {
        const fiatReserve: FiatReserve = {
          instrumentKey: reserve.instrument_key,
          quantity: reserve.quantity,
          currency: reserve.holding_currency || reserve.currency,
          effectiveDate: new Date(reserve.effective_date),
          reserveType: this.mapReserveType(reserve.holding_type),
          bankName: this.extractBankName(reserve.instrument_key),
          accountType: this.extractAccountType(reserve.instrument_key),
          fdic_insured: this.isFdicInsured(reserve.instrument_key),
          liquidationTime: this.getLiquidationTime(reserve.holding_type),
          attestationDate: new Date(), // Could be from reserve attestation data
          attestationFirm: 'Independent Auditor', // Could be from attestation table
          marketValue: reserve.value,
          bookValue: reserve.value // Assuming market value = book value for simplicity
        }
        
        fiatReserves.push(fiatReserve)
      }
      
      // Save calculation step for audit trail
      await this.databaseService.saveCalculationHistory({
        run_id: this.generateRunId(),
        asset_id: input.assetId || input.projectId!,
        product_type: 'stablecoin_fiat_backed',
        calculation_step: 'get_fiat_reserves',
        step_order: 2,
        input_data: { assetId: input.assetId },
        output_data: { reservesCount: fiatReserves.length, totalValue: fiatReserves.reduce((sum, r) => sum + (r.marketValue || 0), 0) },
        processing_time_ms: Date.now() - Date.now(), // Will be properly timed
        data_sources: ['stablecoin_collateral', 'asset_holdings'],
        validation_results: { reservesFound: fiatReserves.length > 0 }
      })
      
      return fiatReserves
    } catch (error) {
      throw new Error(`Failed to fetch fiat reserves: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Maps database holding type to reserve type
   */
  private mapReserveType(holdingType: string): 'cash' | 'treasury_bill' | 'commercial_paper' | 'money_market' | 'repo' | 'bank_deposit' {
    const typeMapping: { [key: string]: 'cash' | 'treasury_bill' | 'commercial_paper' | 'money_market' | 'repo' | 'bank_deposit' } = {
      'cash': 'cash',
      'treasury': 'treasury_bill',
      'money_market': 'money_market',
      'deposit': 'bank_deposit',
      'cd': 'bank_deposit',
      'commercial_paper': 'commercial_paper',
      'repo': 'repo'
    }
    return typeMapping[holdingType] || 'cash'
  }
  
  /**
   * Extracts bank name from instrument key
   */
  private extractBankName(instrumentKey: string): string {
    // Simple extraction - could be more sophisticated
    if (instrumentKey.includes('JPMORGAN')) return 'JPMorgan Chase'
    if (instrumentKey.includes('GOLDMAN')) return 'Goldman Sachs'
    if (instrumentKey.includes('CITI')) return 'Citibank'
    if (instrumentKey.includes('TREASURY')) return 'US Treasury'
    return 'Banking Partner'
  }
  
  /**
   * Extracts account type from instrument key
   */
  private extractAccountType(instrumentKey: string): 'checking' | 'savings' | 'money_market' | 'cd' {
    if (instrumentKey.includes('CHECKING')) return 'checking'
    if (instrumentKey.includes('SAVINGS')) return 'savings'
    if (instrumentKey.includes('MMF')) return 'money_market'
    if (instrumentKey.includes('CD')) return 'cd'
    return 'checking' // Default to checking instead of 'institutional'
  }
  
  /**
   * Determines if reserve is FDIC insured
   */
  private isFdicInsured(instrumentKey: string): boolean {
    // US banks are typically FDIC insured up to limits
    return instrumentKey.includes('USD') && 
           (instrumentKey.includes('CASH') || instrumentKey.includes('DEPOSIT'))
  }
  
  /**
   * Gets typical liquidation time for reserve type
   */
  private getLiquidationTime(holdingType: string): number {
    const liquidationTimes: { [key: string]: number } = {
      'cash': 0,           // immediate
      'treasury': 1,       // 1 day
      'money_market': 1,   // 1 day
      'deposit': 0,        // immediate
      'cd': 30             // 30 days (early withdrawal penalty)
    }
    return liquidationTimes[holdingType] || 1
  }

  /**
   * Gets the latest reserve attestation using real DatabaseService
   */
  private async getLatestAttestation(input: StablecoinFiatCalculationInput): Promise<ReserveAttestation> {
    try {
      // Use DatabaseService to get real reserve attestation
      const attestationData = await this.databaseService.getReserveAttestation(
        input.assetId || input.projectId!
      )
      
      // Also get the reserves data for breakdown calculations
      const reservesData = await this.databaseService.getFiatReserves(
        input.assetId || input.projectId!
      )
      
      // Calculate breakdowns from actual reserve data
      const breakdownByCurrency: { [key: string]: number } = {}
      const breakdownByAssetType: { [key: string]: number } = {}
      let totalReserveValue = 0
      
      for (const reserve of reservesData) {
        const currency = reserve.holding_currency || reserve.currency || 'USD'
        const assetType = this.mapReserveType(reserve.holding_type)
        const value = reserve.value || 0
        
        // Aggregate by currency
        breakdownByCurrency[currency] = (breakdownByCurrency[currency] || 0) + value
        
        // Aggregate by asset type
        breakdownByAssetType[assetType] = (breakdownByAssetType[assetType] || 0) + value
        
        totalReserveValue += value
      }
      
      // Calculate percentages
      const cashValue = breakdownByAssetType['cash'] || 0
      const treasuryValue = breakdownByAssetType['treasury_bill'] || 0
      const mmfValue = breakdownByAssetType['money_market'] || 0
      const equivalentsValue = treasuryValue + mmfValue
      
      const cashPercentage = totalReserveValue > 0 ? cashValue / totalReserveValue : 0
      const equivalentsPercentage = totalReserveValue > 0 ? equivalentsValue / totalReserveValue : 0
      const riskAssetPercentage = 1 - cashPercentage - equivalentsPercentage
      
      const result: ReserveAttestation = {
        attestationDate: new Date(attestationData.audit_date || Date.now()),
        attestationFirm: attestationData.auditor_firm || 'Independent Auditor',
        totalReserves: attestationData.total_reserves || totalReserveValue,
        totalLiabilities: 0, // Assuming no liabilities for now
        netReserves: (attestationData.total_reserves || totalReserveValue) - 0,
        reserveCoverage: attestationData.backing_ratio || 1.0,
        breakdownByCurrency,
        breakdownByAssetType,
        cashPercentage,
        equivalentsPercentage,
        riskAssetPercentage: Math.max(0, riskAssetPercentage),
        attestationOpinion: 'unqualified', // Could be added to schema
        nextAttestationDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        reportUrl: attestationData.attestation_url || null
      }
      
      // Save calculation step for audit trail
      await this.databaseService.saveCalculationHistory({
        run_id: this.generateRunId(),
        asset_id: input.assetId || input.projectId!,
        product_type: 'stablecoin_fiat_backed',
        calculation_step: 'get_reserve_attestation',
        step_order: 3,
        input_data: { assetId: input.assetId },
        output_data: {
          totalReserves: result.totalReserves,
          reserveCoverage: result.reserveCoverage,
          attestationFirm: result.attestationFirm
        },
        processing_time_ms: Date.now() - Date.now(), // Will be properly timed
        data_sources: ['stablecoin_collateral', 'asset_holdings'],
        validation_results: {
          attestationFound: true,
          reserveCoverageAdequate: result.reserveCoverage >= 1.0
        }
      })
      
      return result
    } catch (error) {
      throw new Error(`Failed to fetch reserve attestation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetches current stablecoin market data
   */
  private async fetchStablecoinPriceData(
    input: StablecoinFiatCalculationInput, 
    productDetails: any
  ): Promise<StablecoinPriceData> {
    // Mock implementation - replace with actual price feed integration
    const pegPrice = StablecoinFiatCalculator.DEFAULT_PEG_PRICE
    const marketPrice = 1.0005 // Slight premium
    const deviationFromPeg = marketPrice - pegPrice
    const deviationBasisPoints = deviationFromPeg * 10000

    return {
      price: marketPrice,
      currency: productDetails.pegCurrency,
      source: 'chainlink_coingecko_composite',
      asOf: input.valuationDate,
      pegPrice,
      marketPrice,
      deviationFromPeg,
      deviationBasisPoints,
      volume24h: 5000000000, // $5B daily volume
      marketCap: productDetails.totalSupply * marketPrice,
      liquidityScore: 95, // High liquidity
      priceStability: 0.0002, // Very stable
      redemptionAvailable: true,
      mintingAvailable: true,
      lastPegRestoration: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    }
  }

  /**
   * Analyzes peg stability metrics
   */
  private async analyzePegStability(
    priceData: StablecoinPriceData, 
    productDetails: any
  ): Promise<{
    isPegStable: boolean,
    deviationSeverity: 'low' | 'medium' | 'high',
    stabilityScore: number,
    recommendedAction: string
  }> {
    const absBps = Math.abs(priceData.deviationBasisPoints)
    
    let deviationSeverity: 'low' | 'medium' | 'high' = 'low'
    let recommendedAction = 'Monitor'
    
    if (absBps > 200) { // > 2%
      deviationSeverity = 'high'
      recommendedAction = 'Emergency intervention required'
    } else if (absBps > 50) { // > 0.5%
      deviationSeverity = 'medium'
      recommendedAction = 'Consider market operations'
    }
    
    const stabilityScore = Math.max(0, 100 - (absBps / 10)) // Score out of 100
    const isPegStable = absBps <= (productDetails.maxPegDeviationBps || 100)
    
    return {
      isPegStable,
      deviationSeverity,
      stabilityScore,
      recommendedAction
    }
  }

  /**
   * Calculates comprehensive reserve valuation
   */
  private async calculateReserveValuation(
    reserves: FiatReserve[],
    valuationDate: Date
  ): Promise<{
    totalReserveValue: Decimal,
    totalLiabilities: Decimal,
    netReserves: Decimal,
    reserveBreakdown: Array<{
      instrumentKey: string,
      reserveType: string,
      marketValue: Decimal,
      bookValue: Decimal,
      yieldToMaturity?: number
    }>
  }> {
    let totalReserveValue = this.decimal(0)
    let totalLiabilities = this.decimal(0) // Usually zero for stablecoins
    const reserveBreakdown = []

    for (const reserve of reserves) {
      // Use market value with daily marking-to-market
      const marketValue = this.decimal(reserve.marketValue || 0)
      const bookValue = this.decimal(reserve.bookValue || 0)
      
      reserveBreakdown.push({
        instrumentKey: reserve.instrumentKey,
        reserveType: reserve.reserveType,
        marketValue,
        bookValue,
        yieldToMaturity: reserve.yield
      })
      
      totalReserveValue = totalReserveValue.plus(marketValue)
    }

    const netReserves = totalReserveValue.minus(totalLiabilities)

    return {
      totalReserveValue,
      totalLiabilities,
      netReserves,
      reserveBreakdown
    }
  }

  /**
   * Analyzes reserve coverage ratio and adequacy
   */
  private async analyzeCoverageRatio(
    reserveValuation: any,
    productDetails: any,
    attestation: ReserveAttestation
  ): Promise<{
    coverageRatio: number,
    isAdequate: boolean,
    surplus: number,
    riskLevel: 'low' | 'medium' | 'high',
    recommendations: string[]
  }> {
    const totalSupplyValue = this.decimal(productDetails.totalSupply)
    const coverageRatio = this.toNumber(reserveValuation.netReserves.div(totalSupplyValue))
    const surplus = this.toNumber(reserveValuation.netReserves.minus(totalSupplyValue))
    
    const isAdequate = coverageRatio >= productDetails.minimumReserveRatio
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    const recommendations: string[] = []
    
    if (coverageRatio < 1.0) {
      riskLevel = 'high'
      recommendations.push('Immediate reserve replenishment required')
      recommendations.push('Consider halting new token issuance')
    } else if (coverageRatio < 1.02) {
      riskLevel = 'medium'
      recommendations.push('Monitor reserve levels closely')
      recommendations.push('Prepare contingency funding sources')
    }
    
    if (attestation.cashPercentage < 0.20) {
      recommendations.push('Consider increasing cash reserves for liquidity')
    }

    return {
      coverageRatio,
      isAdequate,
      surplus,
      riskLevel,
      recommendations
    }
  }

  /**
   * Assesses comprehensive depeg risk
   */
  private async assessDepegRisk(
    priceData: StablecoinPriceData,
    reserveValuation: any,
    productDetails: any
  ): Promise<DepegRiskMetrics> {
    // Mock historical data - replace with actual database queries
    const maxDeviationLast30d = 25 // bps
    const averageDeviationLast7d = 5 // bps
    const pegRestorationTime = 120 // minutes
    const redemptionBacklog = 0 // no backlog
    
    const reserveRatio = this.toNumber(reserveValuation.netReserves.div(this.decimal(productDetails.totalSupply)))
    
    // Risk scoring (0-100 scale, higher = more risk)
    const liquidityRisk = Math.max(0, 100 - priceData.liquidityScore)
    const counterpartyRisk = productDetails.reserveComposition === 'cash_only' ? 5 : 25
    const regulatoryRisk = productDetails.regulatoryFramework === 'UNREGULATED' ? 80 : 15
    const marketStressScore = Math.abs(priceData.deviationBasisPoints) / 2 // Simple stress indicator

    return {
      currentDeviationBps: priceData.deviationBasisPoints,
      maxDeviationLast30d,
      averageDeviationLast7d,
      pegRestorationTime,
      redemptionBacklog,
      reserveRatio,
      liquidityRisk,
      counterpartyRisk,
      regulatoryRisk,
      marketStressScore
    }
  }

  /**
   * Evaluates comprehensive compliance metrics
   */
  private async evaluateCompliance(
    attestation: ReserveAttestation,
    depegRisk: DepegRiskMetrics,
    productDetails: any
  ): Promise<StablecoinComplianceMetrics> {
    // Check individual compliance factors
    const reserveAdequacy = depegRisk.reserveRatio >= productDetails.minimumReserveRatio
    const attestationCurrent = (Date.now() - attestation.attestationDate.getTime()) < (35 * 24 * 60 * 60 * 1000) // 35 days
    const regulatoryCompliance = productDetails.regulatoryFramework !== 'UNREGULATED'
    const pegStability = Math.abs(depegRisk.currentDeviationBps) <= productDetails.maxPegDeviationBps
    const redemptionOperational = depegRisk.redemptionBacklog < 1000000 // $1M threshold
    const auditTrail = attestation.attestationOpinion === 'unqualified'
    
    // Calculate composite scores
    const transparencyScore = Math.min(100, (
      (attestationCurrent ? 30 : 0) +
      (auditTrail ? 25 : 0) +
      (attestation.reportUrl ? 15 : 0) +
      (regulatoryCompliance ? 20 : 0) +
      (productDetails.auditFrequency === 'monthly' ? 10 : 5)
    ))
    
    const trustScore = Math.min(100, (
      (reserveAdequacy ? 40 : 0) +
      (pegStability ? 30 : 0) +
      (transparencyScore * 0.3)
    ))
    
    return {
      reserveAdequacy,
      attestationCurrent,
      regulatoryCompliance,
      pegStability,
      redemptionOperational,
      auditTrail,
      transparencyScore,
      trustScore
    }
  }

  /**
   * Calculates final stablecoin NAV
   */
  private async calculateStablecoinNav(
    reserveValuation: any,
    productDetails: any,
    input: StablecoinFiatCalculationInput,
    priceData: StablecoinPriceData
  ): Promise<{
    totalNavValue: Decimal,
    navPerToken: Decimal
  }> {
    // For fiat-backed stablecoins, NAV should theoretically equal the peg
    // But we calculate based on actual reserve backing
    
    const totalSupply = this.decimal(productDetails.totalSupply)
    
    // Use net reserves as the total NAV
    const totalNavValue = reserveValuation.netReserves
    const navPerToken = totalNavValue.div(totalSupply)
    
    return { totalNavValue, navPerToken }
  }

  /**
   * Builds pricing sources map
   */
  private buildPricingSources(reserves: FiatReserve[], priceData: StablecoinPriceData): Record<string, PriceData> {
    const pricingSources: Record<string, PriceData> = {}
    
    // Add reserve pricing sources
    for (const reserve of reserves) {
      pricingSources[reserve.instrumentKey] = {
        price: reserve.marketValue || 0,
        currency: reserve.currency,
        asOf: new Date(),
        source: 'reserve_valuation'
      }
    }
    
    // Add market price
    pricingSources['market_price'] = {
      price: priceData.marketPrice,
      currency: priceData.currency,
      asOf: priceData.asOf,
      source: priceData.source
    }
    
    return pricingSources
  }

  /**
   * Validates stablecoin-specific input parameters
   */
  protected override validateInput(input: CalculationInput): { 
    isValid: boolean, 
    errors: string[], 
    warnings: string[], 
    severity: ValidationSeverity 
  } {
    const baseValidation = super.validateInput(input)
    const stablecoinInput = input as StablecoinFiatCalculationInput
    
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate stablecoin symbol
    if (stablecoinInput.stablecoinSymbol && !/^[A-Z]{2,10}$/.test(stablecoinInput.stablecoinSymbol)) {
      errors.push('Stablecoin symbol must be 2-10 uppercase letters')
    }

    // Validate peg currency
    if (stablecoinInput.pegCurrency && !this.isValidCurrencyCode(stablecoinInput.pegCurrency)) {
      errors.push(`Invalid peg currency code: ${stablecoinInput.pegCurrency}`)
    }

    // Validate contract address format (basic check)
    if (stablecoinInput.contractAddress && 
        !/^0x[a-fA-F0-9]{40}$/.test(stablecoinInput.contractAddress)) {
      errors.push('Contract address must be a valid Ethereum address format')
    }

    // Validate total supply
    if (stablecoinInput.totalSupply !== undefined && stablecoinInput.totalSupply <= 0) {
      errors.push('Total supply must be positive')
    }

    // Validate deviation threshold
    if (stablecoinInput.maxPegDeviationBps !== undefined && 
        (stablecoinInput.maxPegDeviationBps < 0 || stablecoinInput.maxPegDeviationBps > 1000)) {
      errors.push('Max peg deviation must be between 0 and 1000 basis points')
    }

    // Validate redemption mechanism
    const validRedemptionMechanisms = ['direct', 'authorized_participants', 'market_based']
    if (stablecoinInput.redemptionMechanism && 
        !validRedemptionMechanisms.includes(stablecoinInput.redemptionMechanism)) {
      errors.push(`Redemption mechanism must be one of: ${validRedemptionMechanisms.join(', ')}`)
    }

    // Warnings for risk factors
    if (stablecoinInput.regulatoryFramework === 'UNREGULATED') {
      warnings.push('Unregulated stablecoins carry higher regulatory risk')
    }

    if (stablecoinInput.attestationRequired === false) {
      warnings.push('Stablecoins without attestation requirements have higher trust risk')
    }

    if (stablecoinInput.auditFrequency === 'quarterly') {
      warnings.push('Quarterly attestation frequency may be insufficient for large stablecoin issuances')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? ValidationSeverity.ERROR : 
                warnings.length > 0 ? ValidationSeverity.WARN : 
                ValidationSeverity.INFO
    }
  }

  /**
   * Generates a unique run ID for the calculation
   */
  protected override generateRunId(): string {
    return `stablecoin_fiat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
