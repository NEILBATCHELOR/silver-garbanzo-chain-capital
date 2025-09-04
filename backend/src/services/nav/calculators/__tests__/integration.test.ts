/**
 * Integration Tests for NAV Calculator Registry
 * Tests the full integration between registry, calculators, and database service
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createCalculatorRegistry } from '../CalculatorRegistry'
import { AssetType, CalculationInput, CalculationStatus } from '../../types'
import { DatabaseService } from '../../DatabaseService'

// Mock database responses for integration testing
const createMockDatabaseService = (): DatabaseService => {
  const mockDb = {
    // Equity product mock
    getEquityProductById: vi.fn().mockResolvedValue({
      id: 'equity-1',
      ticker_symbol: 'AAPL',
      company_name: 'Apple Inc.',
      exchange: 'NASDAQ',
      currency: 'USD',
      market_capitalization: 3000000000,
      shares_outstanding: 1000000,
      dividend_yield: 0.02
    }),

    // Bond product mock
    getBondProductById: vi.fn().mockResolvedValue({
      id: 'bond-1',
      bond_isin_cusip: 'US123456789',
      bond_name: 'US Treasury 10Y',
      issuer: 'US Treasury',
      face_value: 1000,
      coupon_rate: 0.03,
      maturity_date: '2034-01-01',
      issue_date: '2024-01-01',
      coupon_frequency: 2,
      credit_rating: 'AAA',
      currency: 'USD'
    }),

    // MMF product mock
    getMmfProductById: vi.fn().mockResolvedValue({
      id: 'mmf-1',
      fund_name: 'Prime MMF',
      fund_type: 'stable_nav',
      currency: 'USD',
      net_asset_value: 1.00,
      assets_under_management: 1000000000,
      expense_ratio: 0.001
    }),

    // Asset holdings mock
    getAssetHoldings: vi.fn().mockResolvedValue([
      {
        instrument_key: 'US123456789',
        quantity: 1000,
        currency: 'USD',
        effective_date: '2024-01-01',
        holding_type: 'treasury_bill',
        value: 1000000
      }
    ]),

    // Price data mock
    getPriceData: vi.fn().mockResolvedValue({
      price: 100.50,
      currency: 'USD',
      source: 'market_data',
      as_of: new Date().toISOString(),
      instrument_key: 'AAPL'
    }),

    // Add other required mock methods
    getCommoditiesProductById: vi.fn().mockResolvedValue({
      id: 'commodity-1',
      commodity_name: 'Crude Oil',
      commodity_type: 'energy',
      contract_size: 1000,
      quality_specifications: 'WTI',
      exchange: 'NYMEX'
    }),

    getPrivateEquityProductById: vi.fn().mockResolvedValue({
      id: 'pe-1',
      fund_name: 'Growth PE Fund',
      fund_type: 'buyout',
      vintage_year: 2024,
      investment_stage: 'growth',
      sector_focus: 'technology'
    }),

    // Add minimal implementations for other calculator-specific methods
    getAssetBackedProductById: vi.fn().mockResolvedValue({ id: 'abs-1' }),
    getClimateReceivableById: vi.fn().mockResolvedValue({ id: 'climate-1' }),
    getCollectiblesProductById: vi.fn().mockResolvedValue({ id: 'collectible-1' }),
    getDigitalTokenizedFundById: vi.fn().mockResolvedValue({ id: 'dtf-1' }),
    getEnergyAssetById: vi.fn().mockResolvedValue({ id: 'energy-1' }),
    getInfrastructureAssetById: vi.fn().mockResolvedValue({ id: 'infra-1' }),
    getInvoiceReceivableById: vi.fn().mockResolvedValue({ id: 'invoice-1' }),
    getPrivateDebtById: vi.fn().mockResolvedValue({ id: 'pd-1' }),
    getRealEstateProductById: vi.fn().mockResolvedValue({ id: 're-1' }),
    getStructuredProductById: vi.fn().mockResolvedValue({ id: 'sp-1' }),
    getQuantitativeStrategyById: vi.fn().mockResolvedValue({ id: 'quant-1' })

  } as unknown as DatabaseService

  return mockDb
}

describe('NAV Calculator Integration Tests', () => {
  let mockDatabase: DatabaseService
  let registry: any

  beforeAll(() => {
    mockDatabase = createMockDatabaseService()
    registry = createCalculatorRegistry(mockDatabase)
  })

  afterAll(() => {
    registry.destroy()
  })

  describe('Registry Initialization', () => {
    it('should initialize with all calculators', () => {
      const calculators = registry.getAllCalculators()
      const supportedTypes = registry.getSupportedAssetTypes()

      expect(calculators.length).toBe(16)
      expect(supportedTypes.length).toBe(16)

      // Verify key asset types are supported
      const expectedTypes = [
        AssetType.EQUITY,
        AssetType.BONDS,
        AssetType.MMF,
        AssetType.COMMODITIES,
        AssetType.PRIVATE_EQUITY,
        AssetType.PRIVATE_DEBT,
        AssetType.REAL_ESTATE,
        AssetType.INFRASTRUCTURE,
        AssetType.ENERGY,
        AssetType.COLLECTIBLES,
        AssetType.ASSET_BACKED,
        AssetType.STRUCTURED_PRODUCTS,
        AssetType.QUANT_STRATEGIES,
        AssetType.INVOICE_RECEIVABLES,
        AssetType.CLIMATE_RECEIVABLES,
        AssetType.DIGITAL_TOKENIZED_FUNDS
      ]

      expectedTypes.forEach(type => {
        expect(supportedTypes).toContain(type)
      })
    })
  })

  describe('End-to-End Calculator Integration', () => {
    it('should handle equity calculation end-to-end', async () => {
      const input: CalculationInput = {
        assetId: 'equity-1',
        productType: AssetType.EQUITY,
        valuationDate: new Date('2024-01-01'),
        targetCurrency: 'USD',
        sharesOutstanding: 1000
      }

      const resolution = registry.resolve(input)
      expect(resolution.match).toBe('exact')
      expect(resolution.calculator.getAssetTypes()).toContain(AssetType.EQUITY)

      // Test actual calculation
      const result = await resolution.calculator.calculate(input)
      
      expect(result).toBeDefined()
      expect(result.assetId).toBe('equity-1')
      expect(result.productType).toBe(AssetType.EQUITY)
      expect(result.navValue).toBeGreaterThanOrEqual(0)
    })

    it('should handle bond calculation end-to-end', async () => {
      const input: CalculationInput = {
        assetId: 'bond-1',
        productType: AssetType.BONDS,
        valuationDate: new Date('2024-01-01'),
        targetCurrency: 'USD'
      }

      const resolution = registry.resolve(input)
      expect(resolution.match).toBe('exact')
      expect(resolution.calculator.getAssetTypes()).toContain(AssetType.BONDS)

      // Test actual calculation
      const result = await resolution.calculator.calculate(input)
      
      expect(result).toBeDefined()
      expect(result.assetId).toBe('bond-1')
      expect(result.productType).toBe(AssetType.BONDS)
      expect(result.navValue).toBeGreaterThanOrEqual(0)
    })

    it('should handle MMF calculation with SEC compliance', async () => {
      const input: CalculationInput = {
        assetId: 'mmf-1',
        productType: AssetType.MMF,
        valuationDate: new Date('2024-01-01'),
        targetCurrency: 'USD',
        sharesOutstanding: 1000000
      }

      const resolution = registry.resolve(input)
      expect(resolution.match).toBe('exact')
      expect(resolution.calculator.getAssetTypes()).toContain(AssetType.MMF)

      // Test actual calculation
      const result = await resolution.calculator.calculate(input)
      
      expect(result).toBeDefined()
      expect(result.assetId).toBe('mmf-1')
      expect(result.productType).toBe(AssetType.MMF)
      expect(result.navPerShare).toBeCloseTo(1.0, 2) // MMF should be close to $1
    })

    it('should handle multiple asset types in sequence', async () => {
      const testCases = [
        { assetId: 'commodity-1', productType: AssetType.COMMODITIES },
        { assetId: 'pe-1', productType: AssetType.PRIVATE_EQUITY },
        { assetId: 're-1', productType: AssetType.REAL_ESTATE }
      ]

      for (const testCase of testCases) {
        const input: CalculationInput = {
          assetId: testCase.assetId,
          productType: testCase.productType,
          valuationDate: new Date('2024-01-01'),
          targetCurrency: 'USD'
        }

        const resolution = registry.resolve(input)
        expect(resolution.match).toBe('exact')
        expect(resolution.calculator.getAssetTypes()).toContain(testCase.productType)

        const result = await resolution.calculator.calculate(input)
        expect(result).toBeDefined()
        expect(result.productType).toBe(testCase.productType)
      }
    })
  })

  describe('Database Integration', () => {
    it('should call appropriate database methods for equity', async () => {
      const input: CalculationInput = {
        assetId: 'equity-1',
        productType: AssetType.EQUITY,
        valuationDate: new Date('2024-01-01')
      }

      const resolution = registry.resolve(input)
      await resolution.calculator.calculate(input)

      // Verify database methods were called
      expect(mockDatabase.getEquityProductById).toHaveBeenCalledWith('equity-1')
      expect(mockDatabase.getPriceData).toHaveBeenCalled()
    })

    it('should call appropriate database methods for bonds', async () => {
      const input: CalculationInput = {
        assetId: 'bond-1',
        productType: AssetType.BONDS,
        valuationDate: new Date('2024-01-01')
      }

      const resolution = registry.resolve(input)
      await resolution.calculator.calculate(input)

      // Verify database methods were called
      expect(mockDatabase.getBondProductById).toHaveBeenCalledWith('bond-1')
    })

    it('should call appropriate database methods for MMF', async () => {
      const input: CalculationInput = {
        assetId: 'mmf-1',
        productType: AssetType.MMF,
        valuationDate: new Date('2024-01-01')
      }

      const resolution = registry.resolve(input)
      await resolution.calculator.calculate(input)

      // Verify database methods were called
      expect(mockDatabase.getMmfProductById).toHaveBeenCalledWith('mmf-1')
      expect(mockDatabase.getAssetHoldings).toHaveBeenCalledWith('mmf-1')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const failingDb = createMockDatabaseService()
      vi.mocked(failingDb.getEquityProductById).mockRejectedValue(new Error('Database connection failed'))
      
      const failingRegistry = createCalculatorRegistry(failingDb)
      
      const input: CalculationInput = {
        assetId: 'equity-1',
        productType: AssetType.EQUITY,
        valuationDate: new Date('2024-01-01')
      }

      const resolution = failingRegistry.resolve(input)
      const result = await resolution.calculator.calculate(input)

      expect(result).toBeDefined()
      expect(result.status).toBe(CalculationStatus.FAILED)
      expect(result.errorMessage).toContain('Database connection failed')

      failingRegistry.destroy()
    })

    it('should handle invalid asset IDs gracefully', async () => {
      const input: CalculationInput = {
        assetId: 'invalid-asset-id',
        productType: AssetType.EQUITY,
        valuationDate: new Date('2024-01-01')
      }

      // Mock database to return null for invalid asset
      vi.mocked(mockDatabase.getEquityProductById).mockRejectedValueOnce(new Error('Asset not found'))

      const resolution = registry.resolve(input)
      const result = await resolution.calculator.calculate(input)

      expect(result).toBeDefined()
      expect(result.status).toBe(CalculationStatus.FAILED)
      expect(result.errorMessage).toContain('Asset not found')
    })
  })

  describe('Performance Integration', () => {
    it('should handle multiple calculations efficiently', async () => {
      const startTime = Date.now()

      const calculations: Promise<any>[] = []
      for (let i = 0; i < 10; i++) {
        const input: CalculationInput = {
          assetId: `equity-${i}`,
          productType: AssetType.EQUITY,
          valuationDate: new Date('2024-01-01')
        }

        const resolution = registry.resolve(input)
        calculations.push(resolution.calculator.calculate(input))
      }

      const results: any[] = await Promise.all(calculations)
      const endTime = Date.now()
      const avgTime = (endTime - startTime) / 10

      // All calculations should succeed
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.status).not.toBe(CalculationStatus.FAILED)
      })

      // Should complete efficiently (under 100ms average per calculation)
      expect(avgTime).toBeLessThan(100)
    })

    it('should utilize caching for repeated resolutions', () => {
      const input: CalculationInput = {
        assetId: 'equity-1',
        productType: AssetType.EQUITY,
        valuationDate: new Date('2024-01-01')
      }

      // First resolution
      const startTime1 = Date.now()
      const resolution1 = registry.resolve(input)
      const time1 = Date.now() - startTime1

      // Second resolution (should be cached)
      const startTime2 = Date.now()
      const resolution2 = registry.resolve(input)
      const time2 = Date.now() - startTime2

      expect(resolution1).toBe(resolution2) // Same object reference
      expect(time2).toBeLessThanOrEqual(time1) // Cached should be faster or equal
    })
  })
})

describe('Registry Health Monitoring Integration', () => {
  let mockDatabase: DatabaseService
  let registry: any

  beforeAll(() => {
    mockDatabase = createMockDatabaseService()
    registry = createCalculatorRegistry(mockDatabase, {
      enableHealthChecks: true,
      healthCheckIntervalMs: 1000 // 1 second for testing
    })
  })

  afterAll(() => {
    registry.destroy()
  })

  it('should perform health checks on all calculators', async () => {
    const healthResults = await registry.performHealthCheck()

    expect(Object.keys(healthResults)).toHaveLength(16)

    // All calculators should be healthy with mocked database
    Object.values(healthResults).forEach(isHealthy => {
      expect(isHealthy).toBe(true)
    })
  })

  it('should provide comprehensive registry metrics', () => {
    const metrics = registry.getMetrics()

    expect(metrics.totalRegistrations).toBe(16)
    expect(metrics.enabledCalculators).toBe(16)
    expect(metrics.resolutionStats).toBeDefined()
    expect(metrics.averageResolutionTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('should support calculator enable/disable operations', () => {
    const allCalculators = registry.getAllCalculators()
    const equityCalculator = allCalculators.find(calc => 
      calc.assetTypes.includes(AssetType.EQUITY)
    )

    expect(equityCalculator).toBeDefined()

    // Disable calculator
    const disabled = registry.setCalculatorEnabled(equityCalculator!.calculator, false)
    expect(disabled).toBe(true)
    expect(registry.getEnabledCalculators().length).toBe(15)

    // Re-enable calculator
    const enabled = registry.setCalculatorEnabled(equityCalculator!.calculator, true)
    expect(enabled).toBe(true)
    expect(registry.getEnabledCalculators().length).toBe(16)
  })
})
