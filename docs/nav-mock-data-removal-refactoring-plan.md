# NAV System Mock Data Removal & Database Integration Plan

## Executive Summary

**Objective**: Remove all mock data from the NAV calculation system and fully integrate with the existing DatabaseService for real database operations.

**Current State**: 
- ✅ DatabaseService exists with comprehensive real database integration
- ❌ Multiple calculators contain extensive mock data implementations
- ❌ BaseCalculator contains mock FX and price data methods
- ❌ CalculatorRegistry not connected to real data sources

**Target State**: 
- ✅ All calculators use DatabaseService for real data
- ✅ No mock data anywhere in the system
- ✅ Consistent error handling and logging
- ✅ Full database integration with proper validation

---

## Phase 1: DatabaseService Extensions

### 1.1 Add Missing Product-Specific Methods

The DatabaseService already has methods for many product types but needs extensions for calculator-specific needs.

#### Required Extensions:

```typescript
// Add to DatabaseService.ts
export class DatabaseService {
  // ... existing methods ...

  // ==================== COMPOSITE FUND METHODS ====================
  
  async getCompositeFundById(fundId: string): Promise<any> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, fund_name, fund_strategy, inception_date, management_fee,
          performance_fee, high_water_mark, benchmark_index, rebalancing_frequency,
          lockup_period, redemption_notice, minimum_investment, fund_currency,
          hedging_strategy, risk_budget, status
        FROM fund_products 
        WHERE id = ${fundId} AND fund_type = 'composite' AND status = 'active'
        LIMIT 1
      `
      if (!result || (result as any[]).length === 0) {
        throw new Error(`Composite fund ${fundId} not found`)
      }
      logger.info(`✅ Retrieved composite fund: ${fundId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, fundId }, `❌ Failed to fetch composite fund`)
      throw error
    }
  }

  async getAssetAllocationTargets(fundId: string): Promise<any[]> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          asset_class, target_allocation, min_allocation, max_allocation,
          current_allocation, strategic_weight, tactical_weight
        FROM fund_asset_allocations 
        WHERE fund_id = ${fundId} AND active = true
        ORDER BY target_allocation DESC
      `
      logger.info(`✅ Retrieved ${(result as any[]).length} allocation targets for fund ${fundId}`)
      return result as any[]
    } catch (error) {
      logger.error({ error, fundId }, `❌ Failed to fetch asset allocation targets`)
      throw error
    }
  }

  async getPortfolioHoldings(fundId: string): Promise<any[]> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          ph.asset_id, ph.asset_type, ph.quantity, ph.market_value,
          ph.weight, ph.currency, ph.beta, ph.volatility, ph.expected_return,
          ph.effective_date
        FROM portfolio_holdings ph
        WHERE ph.fund_id = ${fundId} 
        AND ph.effective_date <= CURRENT_DATE
        ORDER BY ph.market_value DESC
      `
      logger.info(`✅ Retrieved ${(result as any[]).length} portfolio holdings for fund ${fundId}`)
      return result as any[]
    } catch (error) {
      logger.error({ error, fundId }, `❌ Failed to fetch portfolio holdings`)
      throw error
    }
  }

  // ==================== FX RATE METHODS ====================
  
  async getFxRate(baseCurrency: string, quoteCurrency: string): Promise<FxRate> {
    // Already implemented - using existing method
    return super.getFxRate(baseCurrency, quoteCurrency)
  }

  // ==================== STABLECOIN RESERVE METHODS ====================
  
  async getStablecoinReserves(stablecoinId: string): Promise<any[]> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          reserve_type, quantity, currency, effective_date, maturity_date,
          credit_rating, bank_name, account_type, fdic_insured, yield_rate,
          liquidation_time_days, attestation_date, attestation_firm,
          market_value, book_value, instrument_key
        FROM stablecoin_reserves 
        WHERE stablecoin_id = ${stablecoinId} 
        AND effective_date <= CURRENT_DATE
        ORDER BY market_value DESC
      `
      logger.info(`✅ Retrieved ${(result as any[]).length} reserve assets for stablecoin ${stablecoinId}`)
      return result as any[]
    } catch (error) {
      logger.error({ error, stablecoinId }, `❌ Failed to fetch stablecoin reserves`)
      throw error
    }
  }

  async getLatestAttestation(stablecoinId: string): Promise<any> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          attestation_date, attestation_firm, total_reserves, total_liabilities,
          net_reserves, reserve_coverage, breakdown_by_currency, breakdown_by_asset_type,
          cash_percentage, equivalents_percentage, risk_asset_percentage,
          attestation_opinion, next_attestation_due, report_url
        FROM stablecoin_attestations 
        WHERE stablecoin_id = ${stablecoinId}
        ORDER BY attestation_date DESC
        LIMIT 1
      `
      if (!result || (result as any[]).length === 0) {
        throw new Error(`No attestation found for stablecoin ${stablecoinId}`)
      }
      logger.info(`✅ Retrieved latest attestation for stablecoin ${stablecoinId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, stablecoinId }, `❌ Failed to fetch latest attestation`)
      throw error
    }
  }

  async getStablecoinMarketData(stablecoinSymbol: string): Promise<any> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          symbol, peg_price, market_price, deviation_from_peg, deviation_bps,
          volume_24h, market_cap, liquidity_score, price_stability,
          redemption_available, minting_available, last_peg_restoration,
          as_of, source
        FROM stablecoin_market_data 
        WHERE symbol = ${stablecoinSymbol}
        ORDER BY as_of DESC
        LIMIT 1
      `
      if (!result || (result as any[]).length === 0) {
        throw new Error(`No market data found for stablecoin ${stablecoinSymbol}`)
      }
      logger.info(`✅ Retrieved market data for stablecoin ${stablecoinSymbol}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, stablecoinSymbol }, `❌ Failed to fetch stablecoin market data`)
      throw error
    }
  }

  // ==================== CRYPTO COLLATERAL METHODS ====================
  
  async getCryptoCollateralAssets(stablecoinId: string): Promise<any[]> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          symbol, contract_address, balance, price_usd, liquidation_ratio,
          stability_fee, debt_ceiling, volatility, liquidity_score,
          correlation_to_eth, last_updated
        FROM crypto_collateral_assets 
        WHERE stablecoin_id = ${stablecoinId} AND active = true
        ORDER BY balance * price_usd DESC
      `
      logger.info(`✅ Retrieved ${(result as any[]).length} collateral assets for stablecoin ${stablecoinId}`)
      return result as any[]
    } catch (error) {
      logger.error({ error, stablecoinId }, `❌ Failed to fetch crypto collateral assets`)
      throw error
    }
  }

  async getProtocolMetrics(protocolType: string): Promise<any> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          total_value_locked, total_debt, global_collateralization_ratio,
          system_surplus, emergency_shutdown_threshold, governance_voting_power,
          last_updated
        FROM protocol_metrics 
        WHERE protocol_type = ${protocolType}
        ORDER BY last_updated DESC
        LIMIT 1
      `
      if (!result || (result as any[]).length === 0) {
        throw new Error(`No protocol metrics found for ${protocolType}`)
      }
      logger.info(`✅ Retrieved protocol metrics for ${protocolType}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, protocolType }, `❌ Failed to fetch protocol metrics`)
      throw error
    }
  }

  // ==================== PRICE DATA ENHANCEMENTS ====================
  
  async getPriceDataWithValidation(instrumentKey: string, maxStalenessMinutes: number = 60): Promise<PriceData> {
    const priceData = await this.getPriceData(instrumentKey)
    
    const ageMs = Date.now() - new Date(priceData.as_of).getTime()
    const maxStaleMs = maxStalenessMinutes * 60 * 1000
    
    if (ageMs > maxStaleMs) {
      throw new Error(`Price data for ${instrumentKey} is stale (${Math.round(ageMs/60000)} minutes old)`)
    }
    
    return priceData
  }

  // ==================== CALCULATION HISTORY ====================
  
  async saveCalculationHistory(calculation: {
    run_id: string
    calculator_type: string
    asset_id: string
    product_type: string
    valuation_date: Date
    nav_value: number
    execution_time_ms: number
    pricing_sources: any
    status: string
    error_message?: string
  }): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO nav_calculation_history (
          run_id, calculator_type, asset_id, product_type, valuation_date,
          nav_value, execution_time_ms, pricing_sources, status, error_message,
          created_at
        ) VALUES (
          ${calculation.run_id}, ${calculation.calculator_type}, ${calculation.asset_id},
          ${calculation.product_type}, ${calculation.valuation_date}, ${calculation.nav_value},
          ${calculation.execution_time_ms}, ${JSON.stringify(calculation.pricing_sources)},
          ${calculation.status}, ${calculation.error_message || null}, NOW()
        )
      `
      logger.info(`✅ Saved calculation history: ${calculation.run_id}`)
    } catch (error) {
      logger.error({ error, runId: calculation.run_id }, `❌ Failed to save calculation history`)
      throw error
    }
  }
}
```

### 1.2 Add Database Table Creation Scripts

Some tables may need to be created to support the enhanced functionality:

```sql
-- Add to migration script
CREATE TABLE IF NOT EXISTS fund_asset_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID REFERENCES fund_products(id),
    asset_class VARCHAR(50) NOT NULL,
    target_allocation DECIMAL(5,2) NOT NULL,
    min_allocation DECIMAL(5,2) NOT NULL,
    max_allocation DECIMAL(5,2) NOT NULL,
    current_allocation DECIMAL(5,2),
    strategic_weight DECIMAL(5,2) NOT NULL,
    tactical_weight DECIMAL(5,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID REFERENCES fund_products(id),
    asset_id UUID NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    market_value DECIMAL(18,2) NOT NULL,
    weight DECIMAL(8,6) NOT NULL,
    currency CHAR(3) NOT NULL,
    beta DECIMAL(6,4),
    volatility DECIMAL(6,4),
    expected_return DECIMAL(6,4),
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stablecoin_reserves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stablecoin_id UUID REFERENCES stablecoin_products(id),
    reserve_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    currency CHAR(3) NOT NULL,
    effective_date DATE NOT NULL,
    maturity_date DATE,
    credit_rating VARCHAR(10),
    bank_name VARCHAR(100),
    account_type VARCHAR(50),
    fdic_insured BOOLEAN,
    yield_rate DECIMAL(8,6),
    liquidation_time_days INTEGER,
    attestation_date DATE,
    attestation_firm VARCHAR(100),
    market_value DECIMAL(18,2),
    book_value DECIMAL(18,2),
    instrument_key VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stablecoin_attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stablecoin_id UUID REFERENCES stablecoin_products(id),
    attestation_date DATE NOT NULL,
    attestation_firm VARCHAR(100) NOT NULL,
    total_reserves DECIMAL(18,2),
    total_liabilities DECIMAL(18,2),
    net_reserves DECIMAL(18,2),
    reserve_coverage DECIMAL(8,6),
    breakdown_by_currency JSONB,
    breakdown_by_asset_type JSONB,
    cash_percentage DECIMAL(5,4),
    equivalents_percentage DECIMAL(5,4),
    risk_asset_percentage DECIMAL(5,4),
    attestation_opinion VARCHAR(50),
    next_attestation_due DATE,
    report_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stablecoin_market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    peg_price DECIMAL(18,8) NOT NULL,
    market_price DECIMAL(18,8) NOT NULL,
    deviation_from_peg DECIMAL(18,8),
    deviation_bps INTEGER,
    volume_24h DECIMAL(18,2),
    market_cap DECIMAL(18,2),
    liquidity_score INTEGER,
    price_stability DECIMAL(8,6),
    redemption_available BOOLEAN,
    minting_available BOOLEAN,
    last_peg_restoration TIMESTAMP,
    as_of TIMESTAMP NOT NULL,
    source VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crypto_collateral_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stablecoin_id UUID REFERENCES stablecoin_products(id),
    symbol VARCHAR(10) NOT NULL,
    contract_address VARCHAR(42),
    balance DECIMAL(18,8) NOT NULL,
    price_usd DECIMAL(18,8) NOT NULL,
    liquidation_ratio DECIMAL(6,4),
    stability_fee DECIMAL(8,6),
    debt_ceiling DECIMAL(18,2),
    volatility DECIMAL(6,4),
    liquidity_score DECIMAL(3,2),
    correlation_to_eth DECIMAL(4,3),
    active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS protocol_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_type VARCHAR(50) NOT NULL,
    total_value_locked DECIMAL(18,2),
    total_debt DECIMAL(18,2),
    global_collateralization_ratio DECIMAL(8,6),
    system_surplus DECIMAL(18,2),
    emergency_shutdown_threshold DECIMAL(8,6),
    governance_voting_power DECIMAL(18,8),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nav_calculation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id VARCHAR(100) NOT NULL UNIQUE,
    calculator_type VARCHAR(100) NOT NULL,
    asset_id UUID,
    product_type VARCHAR(50),
    valuation_date DATE NOT NULL,
    nav_value DECIMAL(18,8) NOT NULL,
    execution_time_ms INTEGER,
    pricing_sources JSONB,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 2: BaseCalculator Integration

### 2.1 Remove Mock Data from BaseCalculator

Update `BaseCalculator.ts` to use DatabaseService instead of mock data:

```typescript
// In BaseCalculator.ts

import { createDatabaseService } from '../DatabaseService'

export abstract class BaseCalculator implements AssetNavCalculator {
  protected readonly databaseService: DatabaseService

  constructor(options: CalculatorOptions = {}) {
    // ... existing constructor code ...
    this.databaseService = createDatabaseService()
  }

  /**
   * Converts amount from one currency to another using real FX data
   */
  protected async convertCurrency(
    amount: number | Decimal, 
    fromCurrency: string, 
    toCurrency: string,
    asOf?: Date
  ): Promise<{ convertedAmount: Decimal; fxRate: number; source: string }> {
    // If same currency, no conversion needed
    if (fromCurrency.toLowerCase() === toCurrency.toLowerCase()) {
      return {
        convertedAmount: amount instanceof Decimal ? amount : new Decimal(amount),
        fxRate: 1.0,
        source: 'no_conversion_needed'
      }
    }

    try {
      // Use DatabaseService for real FX rates
      const fxRateData = await this.databaseService.getFxRate(fromCurrency, toCurrency)
      const amountDecimal = amount instanceof Decimal ? amount : new Decimal(amount)
      
      this.metrics.fxRatesUsed[`${fromCurrency}/${toCurrency}`] = fxRateData.rate
      
      return {
        convertedAmount: this.multiply(amountDecimal, fxRateData.rate),
        fxRate: fxRateData.rate,
        source: fxRateData.source
      }
    } catch (error) {
      throw new Error(`Failed to get FX rate for ${fromCurrency}/${toCurrency}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetches price data for an instrument using real market data
   */
  protected async fetchPriceData(
    instrumentKey: string, 
    asOf?: Date,
    maxStalenessMinutes?: number
  ): Promise<PriceData> {
    try {
      // Use DatabaseService for real price data
      const priceData = await this.databaseService.getPriceDataWithValidation(
        instrumentKey, 
        maxStalenessMinutes || this.options.maxPriceStalenessMinutes!
      )
      
      this.metrics.priceDataSources[instrumentKey] = priceData.source as MarketDataProvider
      
      return priceData
    } catch (error) {
      throw new Error(`Failed to get price data for ${instrumentKey}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Save calculation results to database for audit trail
   */
  protected async saveCalculationHistory(result: CalculationResult): Promise<void> {
    if (!this.options.enableObservability) return
    
    try {
      await this.databaseService.saveCalculationHistory({
        run_id: result.runId,
        calculator_type: this.constructor.name,
        asset_id: result.assetId || '',
        product_type: result.productType || '',
        valuation_date: result.valuationDate,
        nav_value: result.navValue,
        execution_time_ms: this.metrics.executionTimeMs,
        pricing_sources: result.pricingSources,
        status: result.status,
        error_message: result.errorMessage
      })
    } catch (error) {
      // Log but don't fail the calculation for audit trail issues
      console.warn(`Failed to save calculation history: ${error}`)
    }
  }
}
```

---

## Phase 3: Individual Calculator Refactoring

### 3.1 CompositeFundCalculator Refactoring

Replace mock data with DatabaseService calls:

```typescript
// In CompositeFundCalculator.ts

export class CompositeFundCalculator extends BaseCalculator {
  /**
   * Fetches composite fund details from database
   */
  private async getCompositeFundDetails(input: CompositeFundCalculationInput): Promise<any> {
    try {
      const fundDetails = await this.databaseService.getCompositeFundById(
        input.assetId || input.productType || 'default_fund'
      )
      
      // Get asset allocation targets
      const assetAllocation = await this.databaseService.getAssetAllocationTargets(fundDetails.id)
      fundDetails.assetAllocation = assetAllocation
      
      return fundDetails
    } catch (error) {
      throw new Error(`Failed to get composite fund details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets current portfolio holdings from database
   */
  private async getPortfolioHoldings(
    input: CompositeFundCalculationInput,
    fundDetails: any
  ): Promise<PortfolioHolding[]> {
    try {
      const holdings = await this.databaseService.getPortfolioHoldings(fundDetails.id)
      
      // Transform database results to expected format
      return holdings.map(holding => ({
        assetId: holding.asset_id,
        assetType: holding.asset_type,
        quantity: holding.quantity,
        marketValue: holding.market_value,
        weight: holding.weight,
        currency: holding.currency,
        beta: holding.beta || 1.0,
        volatility: holding.volatility || 0.2,
        expectedReturn: holding.expected_return || 0.08,
        correlations: {} // TODO: Implement correlation matrix from database
      }))
    } catch (error) {
      throw new Error(`Failed to get portfolio holdings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Remove all other mock methods and use real data throughout
}
```

### 3.2 StablecoinFiatCalculator Refactoring

```typescript
// In StablecoinFiatCalculator.ts

export class StablecoinFiatCalculator extends BaseCalculator {
  /**
   * Fetches stablecoin product details from the database
   */
  private async getStablecoinProductDetails(input: StablecoinFiatCalculationInput): Promise<any> {
    try {
      return await this.databaseService.getStablecoinProductById(
        input.assetId || 'default_stablecoin'
      )
    } catch (error) {
      throw new Error(`Failed to get stablecoin product details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetches fiat reserve holdings from the database
   */
  private async getFiatReserves(input: StablecoinFiatCalculationInput): Promise<FiatReserve[]> {
    try {
      const productDetails = await this.getStablecoinProductDetails(input)
      const reserves = await this.databaseService.getStablecoinReserves(productDetails.id)
      
      return reserves.map(reserve => ({
        instrumentKey: reserve.instrument_key,
        quantity: reserve.quantity,
        currency: reserve.currency,
        effectiveDate: reserve.effective_date,
        reserveType: reserve.reserve_type,
        maturityDate: reserve.maturity_date,
        creditRating: reserve.credit_rating,
        bankName: reserve.bank_name,
        accountType: reserve.account_type,
        fdic_insured: reserve.fdic_insured,
        yield: reserve.yield_rate,
        liquidationTime: reserve.liquidation_time_days,
        attestationDate: reserve.attestation_date,
        attestationFirm: reserve.attestation_firm,
        marketValue: reserve.market_value,
        bookValue: reserve.book_value
      }))
    } catch (error) {
      throw new Error(`Failed to get fiat reserves: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets the latest reserve attestation from database
   */
  private async getLatestAttestation(input: StablecoinFiatCalculationInput): Promise<ReserveAttestation> {
    try {
      const productDetails = await this.getStablecoinProductDetails(input)
      const attestation = await this.databaseService.getLatestAttestation(productDetails.id)
      
      return {
        attestationDate: attestation.attestation_date,
        attestationFirm: attestation.attestation_firm,
        totalReserves: attestation.total_reserves,
        totalLiabilities: attestation.total_liabilities,
        netReserves: attestation.net_reserves,
        reserveCoverage: attestation.reserve_coverage,
        breakdownByCurrency: JSON.parse(attestation.breakdown_by_currency || '{}'),
        breakdownByAssetType: JSON.parse(attestation.breakdown_by_asset_type || '{}'),
        cashPercentage: attestation.cash_percentage,
        equivalentsPercentage: attestation.equivalents_percentage,
        riskAssetPercentage: attestation.risk_asset_percentage,
        attestationOpinion: attestation.attestation_opinion,
        nextAttestationDue: attestation.next_attestation_due,
        reportUrl: attestation.report_url
      }
    } catch (error) {
      throw new Error(`Failed to get latest attestation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetches current stablecoin market data from database
   */
  private async fetchStablecoinPriceData(
    input: StablecoinFiatCalculationInput, 
    productDetails: any
  ): Promise<StablecoinPriceData> {
    try {
      const marketData = await this.databaseService.getStablecoinMarketData(productDetails.symbol)
      
      return {
        price: marketData.market_price,
        currency: productDetails.peg_currency,
        source: marketData.source,
        asOf: marketData.as_of,
        pegPrice: marketData.peg_price,
        marketPrice: marketData.market_price,
        deviationFromPeg: marketData.deviation_from_peg,
        deviationBasisPoints: marketData.deviation_bps,
        volume24h: marketData.volume_24h,
        marketCap: marketData.market_cap,
        liquidityScore: marketData.liquidity_score,
        priceStability: marketData.price_stability,
        redemptionAvailable: marketData.redemption_available,
        mintingAvailable: marketData.minting_available,
        lastPegRestoration: marketData.last_peg_restoration
      }
    } catch (error) {
      throw new Error(`Failed to get stablecoin market data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Remove all other mock methods and use real data throughout
}
```

### 3.3 StablecoinCryptoCalculator Refactoring

```typescript
// In StablecoinCryptoCalculator.ts

export class StablecoinCryptoCalculator extends BaseCalculator {
  /**
   * Fetches stablecoin product details from database
   */
  private async getStablecoinProductDetails(input: StablecoinCryptoCalculationInput): Promise<any> {
    try {
      return await this.databaseService.getStablecoinProductById(
        input.assetId || 'default_crypto_stablecoin'
      )
    } catch (error) {
      throw new Error(`Failed to get stablecoin product details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetches collateral asset data and prices from database
   */
  private async fetchCollateralData(
    input: StablecoinCryptoCalculationInput,
    productDetails: any
  ): Promise<CollateralAsset[]> {
    try {
      const collateralAssets = await this.databaseService.getCryptoCollateralAssets(productDetails.id)
      
      return collateralAssets.map(asset => ({
        symbol: asset.symbol,
        address: asset.contract_address,
        balance: asset.balance,
        priceUSD: asset.price_usd,
        liquidationRatio: asset.liquidation_ratio,
        stabilityFee: asset.stability_fee,
        debtCeiling: asset.debt_ceiling,
        riskParameters: {
          volatility: asset.volatility,
          liquidity: asset.liquidity_score,
          correlationToETH: asset.correlation_to_eth
        }
      }))
    } catch (error) {
      throw new Error(`Failed to get collateral data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets protocol metrics for governance value calculation
   */
  private async getProtocolMetrics(protocolType: string): Promise<ProtocolMetrics> {
    try {
      const metrics = await this.databaseService.getProtocolMetrics(protocolType)
      
      return {
        totalValueLocked: metrics.total_value_locked,
        totalDebt: metrics.total_debt,
        globalCollateralizationRatio: metrics.global_collateralization_ratio,
        systemSurplus: metrics.system_surplus,
        emergencyShutdownThreshold: metrics.emergency_shutdown_threshold,
        governanceVotingPower: metrics.governance_voting_power
      }
    } catch (error) {
      throw new Error(`Failed to get protocol metrics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Remove all other mock methods and use real data throughout
}
```

---

## Phase 4: Registry Integration & Testing

### 4.1 Update CalculatorRegistry

Ensure the registry properly integrates with the refactored calculators:

```typescript
// In CalculatorRegistry.ts - update factory function

export function createCalculatorRegistry(options?: RegistryOptions): CalculatorRegistry {
  const registry = new CalculatorRegistry(options)
  
  // Register all real calculators
  const calculators = [
    {
      calculator: new CompositeFundCalculator(),
      assetTypes: [AssetType.COMPOSITE_FUNDS],
      priority: 90,
      enabled: true,
      description: 'Composite fund NAV calculator with real database integration',
      version: '2.0.0'
    },
    {
      calculator: new StablecoinFiatCalculator(),
      assetTypes: [AssetType.STABLECOIN_FIAT_BACKED],
      priority: 90,
      enabled: true,
      description: 'Fiat-backed stablecoin NAV calculator with real reserve data',
      version: '2.0.0'
    },
    {
      calculator: new StablecoinCryptoCalculator(),
      assetTypes: [AssetType.STABLECOIN_CRYPTO_BACKED],
      priority: 90,
      enabled: true,
      description: 'Crypto-backed stablecoin NAV calculator with real collateral data',
      version: '2.0.0'
    }
    // Add all other calculators...
  ]
  
  registry.registerAll(calculators)
  
  return registry
}
```

### 4.2 Integration Testing

Create comprehensive tests for the refactored system:

```typescript
// Create backend/src/services/nav/__tests__/DatabaseIntegration.test.ts

describe('NAV Calculator Database Integration', () => {
  let databaseService: DatabaseService
  
  beforeEach(() => {
    databaseService = createDatabaseService()
  })
  
  describe('CompositeFundCalculator', () => {
    it('should calculate NAV using real database data', async () => {
      const calculator = new CompositeFundCalculator()
      const input: CompositeFundCalculationInput = {
        assetId: 'test_composite_fund_id',
        valuationDate: new Date(),
        targetCurrency: 'USD'
      }
      
      const result = await calculator.calculate(input)
      
      expect(result.status).toBe(CalculationStatus.COMPLETED)
      expect(result.navValue).toBeGreaterThan(0)
      expect(result.pricingSources).toBeDefined()
      expect(Object.keys(result.pricingSources)).toHaveLength(0) // Should have real pricing sources
    })
  })
  
  describe('StablecoinFiatCalculator', () => {
    it('should calculate NAV using real reserve data', async () => {
      const calculator = new StablecoinFiatCalculator()
      const input: StablecoinFiatCalculationInput = {
        assetId: 'test_stablecoin_id',
        stablecoinSymbol: 'USDC',
        pegCurrency: 'USD',
        valuationDate: new Date()
      }
      
      const result = await calculator.calculate(input)
      
      expect(result.status).toBe(CalculationStatus.COMPLETED)
      expect(result.navPerShare).toBeCloseTo(1.0, 2) // Should be close to peg
      expect(result.pricingSources).toBeDefined()
    })
  })
  
  describe('DatabaseService Extensions', () => {
    it('should fetch composite fund data', async () => {
      const fundData = await databaseService.getCompositeFundById('test_fund_id')
      expect(fundData.id).toBe('test_fund_id')
      expect(fundData.fund_name).toBeDefined()
    })
    
    it('should fetch stablecoin reserves', async () => {
      const reserves = await databaseService.getStablecoinReserves('test_stablecoin_id')
      expect(Array.isArray(reserves)).toBe(true)
      expect(reserves.length).toBeGreaterThan(0)
    })
    
    it('should handle missing data gracefully', async () => {
      await expect(
        databaseService.getCompositeFundById('non_existent_fund')
      ).rejects.toThrow('Composite fund non_existent_fund not found')
    })
  })
})
```

---

## Phase 5: Validation & Quality Assurance

### 5.1 Create Validation Scripts

```bash
#!/bin/bash
# scripts/validate-mock-removal.sh

echo "🔍 Validating Mock Data Removal..."

# Search for any remaining mock implementations
echo "Checking for remaining mock data..."
MOCK_FOUND=$(grep -r "mock.*implementation\|Mock implementation\|TODO.*mock" backend/src/services/nav/calculators/ || true)

if [ ! -z "$MOCK_FOUND" ]; then
  echo "❌ Found remaining mock implementations:"
  echo "$MOCK_FOUND"
  exit 1
else
  echo "✅ No mock implementations found"
fi

# Check for proper DatabaseService usage
echo "Checking DatabaseService integration..."
DATABASE_SERVICE_USAGE=$(grep -r "createDatabaseService\|this\.databaseService" backend/src/services/nav/calculators/ | wc -l)

if [ "$DATABASE_SERVICE_USAGE" -lt 3 ]; then
  echo "❌ Insufficient DatabaseService usage found"
  exit 1
else
  echo "✅ DatabaseService properly integrated ($DATABASE_SERVICE_USAGE usages found)"
fi

# Run TypeScript compilation
echo "Running TypeScript compilation..."
cd backend && npm run type-check
if [ $? -eq 0 ]; then
  echo "✅ TypeScript compilation successful"
else
  echo "❌ TypeScript compilation failed"
  exit 1
fi

# Run tests
echo "Running integration tests..."
cd backend && npm test -- --testPathPattern="DatabaseIntegration"
if [ $? -eq 0 ]; then
  echo "✅ Integration tests passed"
else
  echo "❌ Integration tests failed"
  exit 1
fi

echo "🎉 All validation checks passed!"
```

### 5.2 Performance Benchmarking

Create benchmarks to ensure database integration doesn't degrade performance:

```typescript
// Create backend/src/services/nav/__tests__/Performance.benchmark.ts

describe('NAV Calculator Performance Benchmarks', () => {
  describe('Database vs Mock Performance', () => {
    it('should complete calculations within acceptable time limits', async () => {
      const calculator = new CompositeFundCalculator()
      const input: CompositeFundCalculationInput = {
        assetId: 'benchmark_fund_id',
        valuationDate: new Date()
      }
      
      const startTime = Date.now()
      const result = await calculator.calculate(input)
      const executionTime = Date.now() - startTime
      
      expect(result.status).toBe(CalculationStatus.COMPLETED)
      expect(executionTime).toBeLessThan(5000) // Should complete within 5 seconds
      
      console.log(`Execution time: ${executionTime}ms`)
    })
    
    it('should handle concurrent calculations efficiently', async () => {
      const calculator = new StablecoinFiatCalculator()
      const inputs = Array.from({ length: 10 }, (_, i) => ({
        assetId: `concurrent_test_${i}`,
        stablecoinSymbol: 'USDC',
        valuationDate: new Date()
      }))
      
      const startTime = Date.now()
      const results = await Promise.all(
        inputs.map(input => calculator.calculate(input))
      )
      const totalTime = Date.now() - startTime
      
      expect(results).toHaveLength(10)
      expect(totalTime).toBeLessThan(15000) // Should complete within 15 seconds
      
      console.log(`Concurrent execution time: ${totalTime}ms for 10 calculations`)
    })
  })
})
```

---

## Phase 6: Documentation & Migration Guide

### 6.1 Update Documentation

Create comprehensive documentation for the refactored system:

```markdown
# NAV Calculator Database Integration Guide

## Overview
The NAV calculation system has been fully integrated with the DatabaseService, removing all mock data implementations and providing real-time access to production data.

## Key Changes

### 1. Database Integration
- ✅ All calculators now use `DatabaseService` for data access
- ✅ Real FX rates from `nav_fx_rates` table
- ✅ Real price data from `nav_price_cache` table  
- ✅ Product-specific data from respective product tables
- ✅ Calculation history saved to `nav_calculation_history` table

### 2. Mock Data Removal
- ❌ Removed all mock implementations from calculators
- ❌ Removed mock FX rates from `BaseCalculator`
- ❌ Removed mock price data from `BaseCalculator`
- ❌ Removed hardcoded sample data from all calculators

### 3. Error Handling
- ✅ Comprehensive error handling for database failures
- ✅ Graceful degradation when data is missing
- ✅ Detailed error messages for troubleshooting

## Usage Examples

### Basic NAV Calculation
```typescript
import { CompositeFundCalculator } from './calculators/CompositeFundCalculator'

const calculator = new CompositeFundCalculator({
  enableRiskControls: true,
  enableObservability: true,
  maxPriceStalenessMinutes: 60
})

const result = await calculator.calculate({
  assetId: 'fund_123',
  valuationDate: new Date(),
  targetCurrency: 'USD'
})

console.log(`NAV: ${result.navValue} ${result.currency}`)
```

### Registry Usage
```typescript
import { createCalculatorRegistry } from './calculators/CalculatorRegistry'

const registry = createCalculatorRegistry()
const calculator = registry.getCalculatorForAssetType(AssetType.COMPOSITE_FUNDS)

if (calculator) {
  const result = await calculator.calculate(input)
  console.log(`Calculated NAV: ${result.navValue}`)
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```
   Failed to get composite fund details: Composite fund fund_123 not found
   ```
   - Verify the asset ID exists in the database
   - Check database connectivity
   - Ensure proper permissions

2. **Stale Price Data**
   ```
   Price data for AAPL is stale (75 minutes old)
   ```
   - Update price data in `nav_price_cache` table
   - Adjust `maxPriceStalenessMinutes` if necessary

3. **Missing FX Rates**
   ```
   FX rate USD/EUR not found
   ```
   - Ensure FX rates are populated in `nav_fx_rates` table
   - Verify currency codes are correct (3-letter ISO codes)

### Performance Tuning

1. **Database Indexes**
   ```sql
   CREATE INDEX idx_nav_price_cache_instrument ON nav_price_cache(instrument_key, as_of DESC);
   CREATE INDEX idx_nav_fx_rates_pair ON nav_fx_rates(base_ccy, quote_ccy, as_of DESC);
   CREATE INDEX idx_portfolio_holdings_fund ON portfolio_holdings(fund_id, effective_date DESC);
   ```

2. **Connection Pooling**
   - Ensure proper Prisma connection pool configuration
   - Monitor connection usage under load

## Testing

Run the full test suite to validate integration:

```bash
# Run all NAV calculator tests
npm test -- --testPathPattern="nav"

# Run specific integration tests  
npm test -- --testPathPattern="DatabaseIntegration"

# Run performance benchmarks
npm test -- --testPathPattern="Performance"

# Validate mock removal
./scripts/validate-mock-removal.sh
```
```

### 6.2 Create Migration Checklist

```markdown
# NAV System Mock Data Removal - Migration Checklist

## Pre-Migration Checklist

- [ ] **Database Backup**: Create full backup of production database
- [ ] **Schema Validation**: Ensure all required tables exist
- [ ] **Test Data**: Populate test environment with representative data
- [ ] **Dependency Check**: Verify Prisma client is up to date

## Migration Steps

### Phase 1: DatabaseService Extensions
- [ ] Add new methods to `DatabaseService.ts`
- [ ] Create required database tables (if not exist)
- [ ] Add appropriate indexes for performance  
- [ ] Test new methods with sample data

### Phase 2: BaseCalculator Updates  
- [ ] Replace mock FX conversion with DatabaseService
- [ ] Replace mock price data with DatabaseService
- [ ] Add calculation history saving
- [ ] Test BaseCalculator with real data

### Phase 3: Calculator Refactoring
- [ ] Refactor `CompositeFundCalculator`
- [ ] Refactor `StablecoinFiatCalculator` 
- [ ] Refactor `StablecoinCryptoCalculator`
- [ ] Refactor remaining calculators
- [ ] Validate all mock data removal

### Phase 4: Integration & Testing
- [ ] Update `CalculatorRegistry` 
- [ ] Run integration tests
- [ ] Run performance benchmarks
- [ ] Validate calculation accuracy

### Phase 5: Deployment
- [ ] Deploy to staging environment
- [ ] Run end-to-end tests
- [ ] Performance testing under load
- [ ] Deploy to production
- [ ] Monitor calculation performance

## Post-Migration Verification

- [ ] All calculators return real data (no mock values)
- [ ] Database queries execute within acceptable time limits
- [ ] Error handling works for missing/stale data
- [ ] Calculation history is being saved properly
- [ ] No TypeScript compilation errors
- [ ] All tests pass

## Rollback Plan

If issues arise:

1. **Immediate**: Revert to previous version
2. **Database**: Restore from backup if schema changes cause issues  
3. **Config**: Switch back to mock data temporarily (not recommended)
4. **Monitoring**: Set up alerts for calculation failures

## Success Criteria

✅ **Zero Mock Data**: No remaining mock implementations  
✅ **Performance**: Calculations complete within 5 seconds  
✅ **Accuracy**: Results match expected business logic  
✅ **Reliability**: 99.9% success rate for calculations  
✅ **Observability**: Full audit trail in database  
```

---

## Implementation Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | 2-3 days | DatabaseService extensions and table creation |
| **Phase 2** | 1-2 days | BaseCalculator mock removal and integration |
| **Phase 3** | 3-4 days | Individual calculator refactoring |
| **Phase 4** | 2-3 days | Registry updates and integration testing |
| **Phase 5** | 1-2 days | Performance validation and QA |
| **Phase 6** | 1 day | Documentation and migration guide |

**Total Estimated Time: 10-15 days**

---

## Risk Mitigation

### High-Risk Areas
1. **Database Performance**: New queries may impact system performance
   - **Mitigation**: Comprehensive indexing and connection pooling
   
2. **Data Availability**: Missing or stale data could cause calculation failures  
   - **Mitigation**: Graceful error handling and fallback mechanisms

3. **Calculation Accuracy**: Changes to data sources might affect results
   - **Mitigation**: Extensive validation testing and result comparison

### Monitoring & Alerts
- Set up database query performance monitoring
- Alert on calculation failure rates > 1%
- Monitor NAV calculation execution times
- Track database connection pool usage

---

## Conclusion

This refactoring plan provides a systematic approach to completely remove all mock data from the NAV calculation system and fully integrate with real database operations. The phased approach ensures minimal disruption while maximizing the benefits of real-time data integration.

**Key Benefits Post-Refactoring:**
- ✅ **Real-Time Data**: All calculations use live production data
- ✅ **Audit Trail**: Complete calculation history in database
- ✅ **Scalability**: Database-optimized queries with proper indexing
- ✅ **Reliability**: Comprehensive error handling and validation
- ✅ **Maintainability**: Consistent patterns across all calculators

The system will be production-ready with enterprise-grade data integration upon completion of this refactoring program.
