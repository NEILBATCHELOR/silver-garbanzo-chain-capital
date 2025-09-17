/**
 * DatabaseService - Real database integration for NAV calculations
 * 
 * This service provides database access methods for NAV calculators,
 * replacing all mock data with actual Prisma queries.
 * 
 * All methods return actual database results or throw errors - no mocks!
 * Uses backend's existing Prisma infrastructure for proper architectural separation.
 */

import { getDatabase } from '../../infrastructure/database/client'
import { PrismaClient } from '../../infrastructure/database/generated'
import pino from 'pino'

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' } 
    : undefined
})

export interface DatabaseConfig {
  // No configuration needed - uses existing Prisma client
  // Configuration is handled by Prisma client initialization
}

export interface MmfProductDetails {
  id: string
  project_id: string
  fund_name: string
  fund_type: string
  fund_ticker: string
  net_asset_value: number
  assets_under_management: number
  expense_ratio: number
  currency: string
  status: string
}

export interface AssetHolding {
  id: string
  asset_id: string
  holding_type: string
  quantity: number
  value: number
  currency: string
  effective_date: string
  instrument_key: string
  oracle_price: number | null
  last_oracle_update: string | null
}

export interface PriceData {
  instrument_key: string
  price: number
  currency: string
  as_of: string
  source: string
}

export interface FxRate {
  base_ccy: string
  quote_ccy: string
  rate: number
  as_of: string
  source: string
}

export class DatabaseService {
  private prisma: PrismaClient

  constructor(config?: DatabaseConfig) {
    this.prisma = getDatabase()
    logger.info('✅ DatabaseService initialized with Prisma client')
  }

  // ==================== FUND PRODUCTS ====================

  /**
   * Get Money Market Fund product details by ID
   * Returns actual database record or throws error
   */
  async getMmfProductById(fundId: string): Promise<MmfProductDetails> {
    try {
      const result = await this.prisma.$queryRaw<MmfProductDetails[]>`
        SELECT 
          id,
          project_id,
          fund_name,
          fund_type,
          fund_ticker,
          net_asset_value,
          assets_under_management,
          expense_ratio,
          currency,
          status
        FROM fund_products 
        WHERE id = ${fundId} 
        AND fund_type = 'money_market'
        AND status = 'active'
        LIMIT 1
      `

      if (!result || result.length === 0 || !result[0]) {
        throw new Error(`MMF product ${fundId} not found`)
      }

      logger.info(`✅ Retrieved MMF product: ${result[0].fund_name}`)
      return result[0]
    } catch (error) {
      logger.error({ error, fundId }, `❌ Failed to fetch MMF product`)
      throw new Error(`Failed to fetch MMF product ${fundId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get equity product details by ID
   */
  async getEquityProductById(equityId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id,
          project_id,
          ticker_symbol,
          company_name,
          exchange,
          shares_outstanding,
          market_capitalization,
          sector,
          industry,
          dividend_yield,
          price_earnings_ratio,
          currency,
          status
        FROM equity_products 
        WHERE id = ${equityId}
        AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Equity product ${equityId} not found`)
      }

      logger.info(`✅ Retrieved equity product: ${equityId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, equityId }, `❌ Failed to fetch equity product`)
      throw new Error(`Failed to fetch equity product ${equityId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get bond product details by ID
   */
  async getBondProductById(bondId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, bond_name, bond_isin_cusip, issuer, bond_type,
          coupon_rate, face_value, maturity_date, issue_date, credit_rating,
          coupon_frequency, accrued_interest, currency, status
        FROM bond_products 
        WHERE id = ${bondId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Bond product ${bondId} not found`)
      }

      logger.info(`✅ Retrieved bond product: ${bondId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, bondId }, `❌ Failed to fetch bond product`)
      throw new Error(`Failed to fetch bond product ${bondId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get stablecoin product details by ID
   */
  async getStablecoinProductById(stablecoinId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, token_name, token_symbol, collateral_type_enum,
          peg_value, peg_currency, collateral_ratio, stability_mechanism,
          reserve_assets, total_supply, circulating_supply, contract_address,
          blockchain_network, currency, status
        FROM stablecoin_products 
        WHERE id = ${stablecoinId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Stablecoin product ${stablecoinId} not found`)
      }

      logger.info(`✅ Retrieved stablecoin product: ${stablecoinId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, stablecoinId }, `❌ Failed to fetch stablecoin product`)
      throw new Error(`Failed to fetch stablecoin product ${stablecoinId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== ALL OTHER PRODUCT TYPES ====================

  /**
   * Get real estate product details by ID
   */
  async getRealEstateProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, property_id, property_name, property_address,
          property_type, acquisition_date, area_type, units, tenant,
          lease_begin_date, lease_end_date, gross_amount, taxable_amount,
          geographic_location, development_stage, status
        FROM real_estate_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Real estate product ${productId} not found`)
      }

      logger.info(`✅ Retrieved real estate product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch real estate product`)
      throw new Error(`Failed to fetch real estate product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get private equity product details by ID
   */
  async getPrivateEquityProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, fund_name, fund_strategy, target_fund_size,
          committed_capital, deployed_capital, portfolio_companies,
          vintage_year, fund_term_years, management_fee, carried_interest,
          currency, status
        FROM private_equity_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Private equity product ${productId} not found`)
      }

      logger.info(`✅ Retrieved private equity product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch private equity product`)
      throw new Error(`Failed to fetch private equity product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get private debt product details by ID
   */
  async getPrivateDebtProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, fund_name, debt_strategy, target_fund_size,
          committed_capital, deployed_capital, interest_rate, loan_term_years,
          currency, status
        FROM private_debt_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Private debt product ${productId} not found`)
      }

      logger.info(`✅ Retrieved private debt product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch private debt product`)
      throw new Error(`Failed to fetch private debt product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get commodities product details by ID
   */
  async getCommoditiesProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, commodity_name, commodity_type, exchange,
          contract_size, tick_size, currency, delivery_location,
          storage_costs, quality_specifications, status
        FROM commodities_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Commodities product ${productId} not found`)
      }

      logger.info(`✅ Retrieved commodities product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch commodities product`)
      throw new Error(`Failed to fetch commodities product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get energy product details by ID
   */
  async getEnergyProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, project_name, energy_source, capacity_mw,
          installation_date, location, technology_type, power_purchase_agreement,
          revenue_model, environmental_impact, currency, status
        FROM energy_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Energy product ${productId} not found`)
      }

      logger.info(`✅ Retrieved energy product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch energy product`)
      throw new Error(`Failed to fetch energy product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get infrastructure product details by ID
   */
  async getInfrastructureProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, project_name, infrastructure_type, asset_value,
          construction_date, operational_date, location, revenue_model,
          concession_period_years, currency, status
        FROM infrastructure_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Infrastructure product ${productId} not found`)
      }

      logger.info(`✅ Retrieved infrastructure product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch infrastructure product`)
      throw new Error(`Failed to fetch infrastructure product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get collectibles product details by ID
   */
  async getCollectiblesProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, item_name, category, authentication_details,
          provenance, condition_assessment, appraisal_value, insurance_value,
          storage_location, currency, status
        FROM collectibles_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Collectibles product ${productId} not found`)
      }

      logger.info(`✅ Retrieved collectibles product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch collectibles product`)
      throw new Error(`Failed to fetch collectibles product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get asset backed product details by ID
   */
  async getAssetBackedProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, security_name, underlying_asset_type,
          asset_pool_value, credit_rating, maturity_date, coupon_rate,
          payment_frequency, currency, status
        FROM asset_backed_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Asset backed product ${productId} not found`)
      }

      logger.info(`✅ Retrieved asset backed product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch asset backed product`)
      throw new Error(`Failed to fetch asset backed product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get structured product details by ID
   */
  async getStructuredProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, product_name, product_type, underlying_assets,
          maturity_date, barrier_level, coupon_rate, protection_level,
          currency, issuer, status
        FROM structured_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Structured product ${productId} not found`)
      }

      logger.info(`✅ Retrieved structured product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch structured product`)
      throw new Error(`Failed to fetch structured product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get digital tokenized fund product details by ID
   */
  async getDigitalTokenizedFundProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, fund_name, token_symbol, blockchain_network,
          smart_contract_address, total_supply, circulating_supply,
          underlying_assets, management_fee, performance_fee,
          currency, status
        FROM digital_tokenized_fund_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Digital tokenized fund product ${productId} not found`)
      }

      logger.info(`✅ Retrieved digital tokenized fund product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch digital tokenized fund product`)
      throw new Error(`Failed to fetch digital tokenized fund product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get quantitative investment strategies product details by ID
   */
  async getQuantitativeStrategiesProductById(productId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, strategy_name, algorithm_type, risk_metrics,
          backtest_performance, live_performance, assets_under_management,
          management_fee, performance_fee, currency, status
        FROM quantitative_investment_strategies_products 
        WHERE id = ${productId} AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Quantitative strategies product ${productId} not found`)
      }

      logger.info(`✅ Retrieved quantitative strategies product: ${productId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, productId }, `❌ Failed to fetch quantitative strategies product`)
      throw new Error(`Failed to fetch quantitative strategies product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== ASSET HOLDINGS ====================

  /**
   * Get all holdings for a specific asset (fund)
   * Returns actual database records or empty array
   */
  async getAssetHoldings(assetId: string): Promise<AssetHolding[]> {
    try {
      const result = await this.prisma.$queryRaw<AssetHolding[]>`
        SELECT 
          id,
          asset_id,
          holding_type,
          quantity,
          value,
          currency,
          effective_date,
          instrument_key,
          oracle_price,
          last_oracle_update
        FROM asset_holdings 
        WHERE asset_id = ${assetId}
        ORDER BY value DESC
      `

      logger.info(`✅ Retrieved ${result.length} asset holdings for ${assetId}`)
      return result || []
    } catch (error) {
      logger.error({ error, assetId }, `❌ Failed to fetch asset holdings`)
      throw new Error(`Failed to fetch asset holdings for ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== PRICE DATA ====================

  /**
   * Get price data for a specific instrument
   * Returns actual database record or throws error
   */
  async getPriceData(instrumentKey: string): Promise<PriceData> {
    try {
      const result = await this.prisma.$queryRaw<PriceData[]>`
        SELECT 
          instrument_key,
          price,
          currency,
          as_of,
          source
        FROM nav_price_cache 
        WHERE instrument_key = ${instrumentKey}
        ORDER BY as_of DESC
        LIMIT 1
      `

      if (!result || result.length === 0 || !result[0]) {
        throw new Error(`Price data for ${instrumentKey} not found`)
      }

      logger.info(`✅ Retrieved price data for ${instrumentKey}: ${result[0].price} ${result[0].currency}`)
      return result[0]
    } catch (error) {
      logger.error({ error, instrumentKey }, `❌ Failed to fetch price data`)
      throw new Error(`Failed to fetch price data for ${instrumentKey}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get multiple price data records
   */
  async getBatchPriceData(instrumentKeys: string[]): Promise<PriceData[]> {
    if (instrumentKeys.length === 0) {
      return []
    }

    try {
      // Create parameterized query for IN clause
      const placeholders = instrumentKeys.map(() => '?').join(',')
      const result = await this.prisma.$queryRawUnsafe(
        `SELECT instrument_key, price, currency, as_of, source 
         FROM nav_price_cache 
         WHERE instrument_key IN (${placeholders})
         ORDER BY as_of DESC`,
        ...instrumentKeys
      ) as PriceData[]

      logger.info(`✅ Retrieved ${result.length} price data records for batch query`)
      return result || []
    } catch (error) {
      logger.error({ error, instrumentKeys }, `❌ Failed to fetch batch price data`)
      throw new Error(`Failed to fetch batch price data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== FX RATES ====================

  /**
   * Get FX rate for currency conversion
   * Returns actual database record or throws error
   */
  async getFxRate(baseCurrency: string, quoteCurrency: string): Promise<FxRate> {
    if (baseCurrency === quoteCurrency) {
      return {
        base_ccy: baseCurrency,
        quote_ccy: quoteCurrency,
        rate: 1.0,
        as_of: new Date().toISOString(),
        source: 'identity'
      }
    }

    try {
      const result = await this.prisma.$queryRaw<FxRate[]>`
        SELECT 
          base_ccy,
          quote_ccy,
          rate,
          as_of,
          source
        FROM nav_fx_rates 
        WHERE base_ccy = ${baseCurrency}
        AND quote_ccy = ${quoteCurrency}
        ORDER BY as_of DESC
        LIMIT 1
      `

      if (!result || result.length === 0 || !result[0]) {
        throw new Error(`FX rate ${baseCurrency}/${quoteCurrency} not found`)
      }

      logger.info(`✅ Retrieved FX rate ${baseCurrency}/${quoteCurrency}: ${result[0].rate}`)
      return result[0]
    } catch (error) {
      logger.error({ error, baseCurrency, quoteCurrency }, `❌ Failed to fetch FX rate`)
      throw new Error(`Failed to fetch FX rate ${baseCurrency}/${quoteCurrency}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== NAV CALCULATION RUNS ====================

  /**
   * Save NAV calculation run to database
   */
  async saveNavCalculationRun(run: {
    id: string
    asset_id: string
    product_type: string
    valuation_date: string
    started_at: string
    completed_at?: string
    status: string
    result_nav_value?: number
    nav_per_share?: number
    fx_rate_used?: number
    pricing_sources?: any
    error_message?: string
  }) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO nav_calculation_runs (
          id, asset_id, product_type, valuation_date, started_at,
          completed_at, status, result_nav_value, nav_per_share,
          fx_rate_used, pricing_sources, error_message
        ) VALUES (
          ${run.id}, ${run.asset_id}, ${run.product_type}, ${run.valuation_date}, ${run.started_at},
          ${run.completed_at || null}, ${run.status}, ${run.result_nav_value || null}, ${run.nav_per_share || null},
          ${run.fx_rate_used || null}, ${run.pricing_sources ? JSON.stringify(run.pricing_sources) : null}, ${run.error_message || null}
        )
      `
      logger.info(`✅ Saved NAV calculation run: ${run.id}`)
    } catch (error) {
      logger.error({ error, runId: run.id }, `❌ Failed to save NAV calculation run`)
      throw new Error(`Failed to save NAV calculation run: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update NAV calculation run status
   */
  async updateNavCalculationRun(runId: string, updates: {
    completed_at?: string
    status?: string
    result_nav_value?: number
    nav_per_share?: number
    error_message?: string
  }) {
    try {
      const setParts: string[] = []
      const values: any[] = []
      
      if (updates.completed_at !== undefined) {
        setParts.push('completed_at = ?')
        values.push(updates.completed_at)
      }
      if (updates.status !== undefined) {
        setParts.push('status = ?')
        values.push(updates.status)
      }
      if (updates.result_nav_value !== undefined) {
        setParts.push('result_nav_value = ?')
        values.push(updates.result_nav_value)
      }
      if (updates.nav_per_share !== undefined) {
        setParts.push('nav_per_share = ?')
        values.push(updates.nav_per_share)
      }
      if (updates.error_message !== undefined) {
        setParts.push('error_message = ?')
        values.push(updates.error_message)
      }
      
      if (setParts.length === 0) {
        logger.warn('No updates provided for NAV calculation run')
        return
      }
      
      await this.prisma.$executeRawUnsafe(
        `UPDATE nav_calculation_runs SET ${setParts.join(', ')} WHERE id = ?`,
        ...values,
        runId
      )
      
      logger.info(`✅ Updated NAV calculation run: ${runId}`)
    } catch (error) {
      logger.error({ error, runId }, `❌ Failed to update NAV calculation run`)
      throw new Error(`Failed to update NAV calculation run: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get invoice details by various identifiers
   */
  async getInvoiceById(invoiceId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, amount, created_at, currency, due_date,
          invoice_number, issued_date, paid, subscription_id
        FROM invoices 
        WHERE id = ${invoiceId}
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Invoice ${invoiceId} not found`)
      }

      logger.info(`✅ Retrieved invoice: ${invoiceId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, invoiceId }, `❌ Failed to fetch invoice`)
      throw new Error(`Failed to fetch invoice ${invoiceId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(invoiceNumber: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, amount, created_at, currency, due_date,
          invoice_number, issued_date, paid, subscription_id
        FROM invoices 
        WHERE invoice_number = ${invoiceNumber}
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Invoice with number ${invoiceNumber} not found`)
      }

      logger.info(`✅ Retrieved invoice by number: ${invoiceNumber}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, invoiceNumber }, `❌ Failed to fetch invoice by number`)
      throw new Error(`Failed to fetch invoice by number ${invoiceNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get climate receivable details by various identifiers
   */
  async getClimateReceivableById(receivableId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          receivable_id, asset_id, payer_id, amount, due_date,
          risk_score, discount_rate, created_at, updated_at, project_id
        FROM climate_receivables 
        WHERE receivable_id = ${receivableId}
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Climate receivable ${receivableId} not found`)
      }

      logger.info(`✅ Retrieved climate receivable: ${receivableId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, receivableId }, `❌ Failed to fetch climate receivable`)
      throw new Error(`Failed to fetch climate receivable ${receivableId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get climate receivable by asset ID
   */
  async getClimateReceivableByAssetId(assetId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          receivable_id, asset_id, payer_id, amount, due_date,
          risk_score, discount_rate, created_at, updated_at, project_id
        FROM climate_receivables 
        WHERE asset_id = ${assetId}
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Climate receivable with asset_id ${assetId} not found`)
      }

      logger.info(`✅ Retrieved climate receivable by asset_id: ${assetId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, assetId }, `❌ Failed to fetch climate receivable by asset_id`)
      throw new Error(`Failed to fetch climate receivable by asset_id ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== COMPOSITE FUND METHODS ====================

  /**
   * Get composite fund details and configuration
   */
  async getCompositeFundDetails(fundId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          id, project_id, fund_name, fund_type, fund_ticker, 
          fund_strategy, fund_currency, inception_date, management_fee,
          performance_fee, high_water_mark, benchmark_index,
          rebalancing_frequency, lockup_period, redemption_notice,
          minimum_investment, risk_budget, hedging_strategy, status
        FROM fund_products 
        WHERE id = ${fundId} 
        AND fund_type = 'composite_fund'
        AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Composite fund ${fundId} not found`)
      }

      logger.info(`✅ Retrieved composite fund: ${fundId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, fundId }, `❌ Failed to fetch composite fund details`)
      throw new Error(`Failed to fetch composite fund details ${fundId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get portfolio holdings for a composite fund
   */
  async getPortfolioHoldings(fundId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          ah.id, ah.asset_id, ah.holding_type, ah.quantity, ah.value,
          ah.currency, ah.effective_date, ah.instrument_key,
          p.asset_type, p.beta, p.volatility, p.expected_return,
          p.sector, p.market_weight, p.correlations
        FROM asset_holdings ah
        LEFT JOIN (
          -- Union of all product types with standardized fields
          SELECT id as asset_id, 'equity' as asset_type, null as beta, null as volatility, 
                 null as expected_return, sector, null as market_weight, null as correlations
          FROM equity_products WHERE status = 'active'
          UNION ALL
          SELECT id as asset_id, 'bond' as asset_type, null as beta, null as volatility,
                 null as expected_return, null as sector, null as market_weight, null as correlations  
          FROM bond_products WHERE status = 'active'
          UNION ALL
          SELECT id as asset_id, 'commodities' as asset_type, null as beta, null as volatility,
                 null as expected_return, null as sector, null as market_weight, null as correlations
          FROM commodities_products WHERE status = 'active'
          UNION ALL
          SELECT id as asset_id, 'real_estate' as asset_type, null as beta, null as volatility,
                 null as expected_return, null as sector, null as market_weight, null as correlations
          FROM real_estate_products WHERE status = 'active'
        ) p ON ah.asset_id = p.asset_id
        WHERE ah.asset_id = ${fundId}
        ORDER BY ah.value DESC
      `

      logger.info(`✅ Retrieved ${(result as any[]).length} portfolio holdings for fund ${fundId}`)
      return result || []
    } catch (error) {
      logger.error({ error, fundId }, `❌ Failed to fetch portfolio holdings`)
      throw new Error(`Failed to fetch portfolio holdings for ${fundId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get asset allocation configuration for a composite fund
   */
  async getAssetAllocation(fundId: string) {
    try {
      // Query fund_products for asset allocation JSON field
      const result = await this.prisma.$queryRaw`
        SELECT asset_allocation
        FROM fund_products 
        WHERE id = ${fundId} 
        AND fund_type = 'composite_fund'
        AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Asset allocation for fund ${fundId} not found`)
      }

      const allocation = (result as any[])[0]?.asset_allocation
      logger.info(`✅ Retrieved asset allocation for fund ${fundId}`)
      return allocation || []
    } catch (error) {
      logger.error({ error, fundId }, `❌ Failed to fetch asset allocation`)
      throw new Error(`Failed to fetch asset allocation for ${fundId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get concentration limits for a composite fund
   */
  async getConcentrationLimits(fundId: string) {
    try {
      // Query fund_products for concentration limits JSON field
      const result = await this.prisma.$queryRaw`
        SELECT concentration_limits
        FROM fund_products 
        WHERE id = ${fundId} 
        AND fund_type = 'composite_fund'
        AND status = 'active'
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Concentration limits for fund ${fundId} not found`)
      }

      const limits = (result as any[])[0]?.concentration_limits
      logger.info(`✅ Retrieved concentration limits for fund ${fundId}`)
      return limits || []
    } catch (error) {
      logger.error({ error, fundId }, `❌ Failed to fetch concentration limits`)
      throw new Error(`Failed to fetch concentration limits for ${fundId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== STABLECOIN FIAT METHODS ====================

  /**
   * Get fiat reserves for a stablecoin
   */
  async getFiatReserves(stablecoinId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          sc.reserve_assets,
          scp.*, 
          ah.quantity, ah.value, ah.currency as holding_currency,
          ah.effective_date, ah.instrument_key
        FROM stablecoin_products sp
        LEFT JOIN stablecoin_collateral sc ON sp.id = sc.stablecoin_id
        LEFT JOIN asset_holdings ah ON sp.id = ah.asset_id
        WHERE sp.id = ${stablecoinId}
        AND sp.status = 'active'
        AND sp.collateral_type_enum = 'fiat_backed'
        ORDER BY ah.value DESC
      `

      logger.info(`✅ Retrieved fiat reserves for stablecoin ${stablecoinId}`)
      return result || []
    } catch (error) {
      logger.error({ error, stablecoinId }, `❌ Failed to fetch fiat reserves`)
      throw new Error(`Failed to fetch fiat reserves for ${stablecoinId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get latest reserve attestation
   */
  async getReserveAttestation(stablecoinId: string) {
    try {
      // This would typically query a reserve_attestations table
      // For now, we'll create a structure based on available data
      const productResult = await this.prisma.$queryRaw`
        SELECT 
          sp.total_supply, sp.circulating_supply, sp.reserve_assets,
          sc.total_reserves, sc.backing_ratio, sc.audit_date,
          sc.auditor_firm, sc.attestation_url
        FROM stablecoin_products sp
        LEFT JOIN stablecoin_collateral sc ON sp.id = sc.stablecoin_id
        WHERE sp.id = ${stablecoinId}
        AND sp.status = 'active'
        AND sp.collateral_type_enum = 'fiat_backed'
        ORDER BY sc.audit_date DESC
        LIMIT 1
      `

      if (!productResult || (productResult as any[]).length === 0) {
        throw new Error(`Reserve attestation for stablecoin ${stablecoinId} not found`)
      }

      logger.info(`✅ Retrieved reserve attestation for stablecoin ${stablecoinId}`)
      return (productResult as any[])[0]
    } catch (error) {
      logger.error({ error, stablecoinId }, `❌ Failed to fetch reserve attestation`)
      throw new Error(`Failed to fetch reserve attestation for ${stablecoinId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== STABLECOIN CRYPTO METHODS ====================

  /**
   * Get collateral assets for crypto-backed stablecoin
   */
  async getCollateralAssets(stablecoinId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          sc.collateral_address, sc.collateral_symbol, sc.collateral_amount,
          sc.collateral_value_usd, sc.liquidation_ratio, sc.stability_fee,
          sc.debt_ceiling, sc.risk_parameters, sc.oracle_price,
          sc.last_oracle_update
        FROM stablecoin_products sp
        LEFT JOIN stablecoin_collateral sc ON sp.id = sc.stablecoin_id
        WHERE sp.id = ${stablecoinId}
        AND sp.status = 'active'
        AND sp.collateral_type_enum = 'crypto_backed'
        ORDER BY sc.collateral_value_usd DESC
      `

      logger.info(`✅ Retrieved collateral assets for stablecoin ${stablecoinId}`)
      return result || []
    } catch (error) {
      logger.error({ error, stablecoinId }, `❌ Failed to fetch collateral assets`)
      throw new Error(`Failed to fetch collateral assets for ${stablecoinId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get collateralization metrics
   */
  async getCollateralizationMetrics(stablecoinId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          sp.total_supply, sp.circulating_supply, sp.collateral_ratio,
          SUM(sc.collateral_value_usd) as total_collateral_value,
          AVG(sc.liquidation_ratio) as avg_liquidation_ratio,
          MIN(sc.liquidation_ratio) as min_liquidation_ratio
        FROM stablecoin_products sp
        LEFT JOIN stablecoin_collateral sc ON sp.id = sc.stablecoin_id  
        WHERE sp.id = ${stablecoinId}
        AND sp.status = 'active'
        AND sp.collateral_type_enum = 'crypto_backed'
        GROUP BY sp.id, sp.total_supply, sp.circulating_supply, sp.collateral_ratio
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        throw new Error(`Collateralization metrics for stablecoin ${stablecoinId} not found`)
      }

      logger.info(`✅ Retrieved collateralization metrics for stablecoin ${stablecoinId}`)
      return (result as any[])[0]
    } catch (error) {
      logger.error({ error, stablecoinId }, `❌ Failed to fetch collateralization metrics`)
      throw new Error(`Failed to fetch collateralization metrics for ${stablecoinId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== ENHANCED PRICE & FX METHODS ====================

  /**
   * Get latest FX rates with validation
   */
  async getLatestFxRates(baseCurrency: string, quoteCurrency: string) {
    try {
      // First try to get the direct rate
      let result = await this.prisma.$queryRaw<FxRate[]>`
        SELECT base_ccy, quote_ccy, rate, as_of, source
        FROM nav_fx_rates 
        WHERE base_ccy = ${baseCurrency}
        AND quote_ccy = ${quoteCurrency}
        ORDER BY as_of DESC
        LIMIT 1
      `

      // If no direct rate, try inverse rate
      if (!result || result.length === 0) {
        result = await this.prisma.$queryRaw<FxRate[]>`
          SELECT base_ccy, quote_ccy, (1.0/rate) as rate, as_of, source
          FROM nav_fx_rates 
          WHERE base_ccy = ${quoteCurrency}
          AND quote_ccy = ${baseCurrency}
          ORDER BY as_of DESC
          LIMIT 1
        `
        
        // Swap the currencies in the result
        if (result && result.length > 0 && result[0]) {
          const temp = result[0].base_ccy
          result[0].base_ccy = result[0].quote_ccy
          result[0].quote_ccy = temp
        }
      }

      if (!result || result.length === 0 || !result[0]) {
        throw new Error(`FX rate ${baseCurrency}/${quoteCurrency} not found`)
      }

      logger.info(`✅ Retrieved FX rate ${baseCurrency}/${quoteCurrency}: ${result[0].rate}`)
      return result[0]
    } catch (error) {
      logger.error({ error, baseCurrency, quoteCurrency }, `❌ Failed to fetch FX rate`)
      throw new Error(`Failed to fetch FX rate ${baseCurrency}/${quoteCurrency}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate price data freshness
   */
  async validatePriceDataFreshness(instrumentKey: string, maxStalenessMinutes: number = 60) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          instrument_key, price, currency, as_of, source,
          EXTRACT(EPOCH FROM (NOW() - as_of::timestamp)) / 60 as age_minutes
        FROM nav_price_cache 
        WHERE instrument_key = ${instrumentKey}
        ORDER BY as_of DESC
        LIMIT 1
      `

      if (!result || (result as any[]).length === 0) {
        return { isValid: false, reason: 'Price data not found', ageMinutes: null }
      }

      const priceData = (result as any[])[0]
      const isValid = priceData.age_minutes <= maxStalenessMinutes
      
      logger.info(`✅ Price validation for ${instrumentKey}: ${isValid ? 'valid' : 'stale'} (${priceData.age_minutes}min old)`)
      return { 
        isValid, 
        reason: isValid ? 'Price data is fresh' : `Price data is ${priceData.age_minutes}min old`,
        ageMinutes: priceData.age_minutes,
        priceData
      }
    } catch (error) {
      logger.error({ error, instrumentKey }, `❌ Failed to validate price data freshness`)
      return { isValid: false, reason: 'Validation error', ageMinutes: null }
    }
  }

  // ==================== CALCULATION HISTORY METHODS ====================

  /**
   * Save detailed calculation history for audit trail
   */
  async saveCalculationHistory(history: {
    run_id: string
    asset_id: string
    product_type: string
    calculation_step: string
    step_order: number
    input_data: any
    output_data: any
    processing_time_ms: number
    data_sources: string[]
    validation_results: any
    created_at?: Date
  }) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO nav_calculation_history (
          run_id, asset_id, product_type, calculation_step, step_order,
          input_data, output_data, processing_time_ms, data_sources,
          validation_results, created_at
        ) VALUES (
          ${history.run_id}, ${history.asset_id}, ${history.product_type}, 
          ${history.calculation_step}, ${history.step_order},
          ${JSON.stringify(history.input_data)}, ${JSON.stringify(history.output_data)}, 
          ${history.processing_time_ms}, ${JSON.stringify(history.data_sources)},
          ${JSON.stringify(history.validation_results)}, ${history.created_at || new Date()}
        )
      `
      logger.info(`✅ Saved calculation history step: ${history.calculation_step}`)
    } catch (error) {
      logger.error({ error, runId: history.run_id }, `❌ Failed to save calculation history`)
      throw new Error(`Failed to save calculation history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get calculation history for a specific run
   */
  async getCalculationHistory(runId: string) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          run_id, asset_id, product_type, calculation_step, step_order,
          input_data, output_data, processing_time_ms, data_sources,
          validation_results, created_at
        FROM nav_calculation_history 
        WHERE run_id = ${runId}
        ORDER BY step_order ASC
      `

      logger.info(`✅ Retrieved ${(result as any[]).length} calculation history steps for run ${runId}`)
      return result || []
    } catch (error) {
      logger.error({ error, runId }, `❌ Failed to fetch calculation history`)
      throw new Error(`Failed to fetch calculation history for ${runId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ==================== VALIDATION HELPERS ====================

  /**
   * Check if an asset exists and is active
   */
  async validateAssetExists(assetId: string, productType: string): Promise<boolean> {
    try {
      let tableName: string
      
      switch (productType) {
        case 'money_market':
        case 'composite_fund':
          tableName = 'fund_products'
          break
        case 'equity':
          tableName = 'equity_products'
          break
        case 'bonds':
          tableName = 'bond_products'
          break
        case 'stablecoin_fiat_backed':
        case 'stablecoin_crypto_backed':
          tableName = 'stablecoin_products'
          break
        case 'real_estate':
          tableName = 'real_estate_products'
          break
        case 'private_equity':
          tableName = 'private_equity_products'
          break
        case 'private_debt':
          tableName = 'private_debt_products'
          break
        case 'commodities':
          tableName = 'commodities_products'
          break
        case 'energy':
          tableName = 'energy_products'
          break
        case 'infrastructure':
          tableName = 'infrastructure_products'
          break
        case 'collectibles':
          tableName = 'collectibles_products'
          break
        case 'asset_backed':
          tableName = 'asset_backed_products'
          break
        case 'structured_products':
          tableName = 'structured_products'
          break
        case 'digital_tokenized_fund':
          tableName = 'digital_tokenized_fund_products'
          break
        case 'quantitative_strategies':
          tableName = 'quantitative_investment_strategies_products'
          break
        default:
          throw new Error(`Unsupported product type for validation: ${productType}`)
      }

      const result = await this.prisma.$queryRawUnsafe(
        `SELECT id, status FROM ${tableName} WHERE id = ? LIMIT 1`,
        assetId
      ) as { id: string; status: string }[]

      if (!result || result.length === 0) {
        return false
      }

      const isActive = result[0]?.status === 'active'
      logger.info(`✅ Asset validation for ${assetId}: ${isActive ? 'active' : 'inactive'}`)
      return isActive
    } catch (error) {
      logger.error({ error, assetId, productType }, `❌ Asset validation failed`)
      return false
    }
  }
}

/**
 * Factory function to create DatabaseService instance
 * Uses existing Prisma client from backend infrastructure
 */
export function createDatabaseService(): DatabaseService {
  return new DatabaseService()
}
