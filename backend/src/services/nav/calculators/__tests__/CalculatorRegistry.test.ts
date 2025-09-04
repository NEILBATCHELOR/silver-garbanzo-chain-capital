/**
 * CalculatorRegistry Tests
 * Comprehensive tests for the NAV calculator registry system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  CalculatorRegistry, 
  createCalculatorRegistry, 
  CalculatorRegistration, 
  CalculatorResolution 
} from '../CalculatorRegistry'
import { AssetType, CalculationInput, CalculationStatus } from '../../types'
import { DatabaseService } from '../../DatabaseService'
import { BaseCalculator } from '../BaseCalculator'

// Mock DatabaseService
const mockDatabaseService = {
  getEquityProductById: vi.fn(),
  getBondProductById: vi.fn(),
  getMmfProductById: vi.fn(),
  getCommoditiesProductById: vi.fn(),
  getPriceData: vi.fn(),
  getAssetHoldings: vi.fn(),
  // Add other required methods as needed
} as unknown as DatabaseService

describe('CalculatorRegistry', () => {
  let registry: CalculatorRegistry

  beforeEach(() => {
    registry = new CalculatorRegistry(mockDatabaseService)
  })

  afterEach(() => {
    registry.destroy()
  })

  describe('Basic Registry Operations', () => {
    it('should initialize with empty registry', () => {
      expect(registry.getAllCalculators()).toHaveLength(0)
      expect(registry.getSupportedAssetTypes()).toHaveLength(0)
      expect(registry.getMetrics().totalRegistrations).toBe(0)
    })

    it('should register a single calculator', () => {
      const mockCalculator = new MockCalculator(mockDatabaseService)
      const registration: CalculatorRegistration = {
        calculator: mockCalculator,
        assetTypes: [AssetType.EQUITY],
        priority: 90,
        enabled: true,
        description: 'Test equity calculator',
        version: '1.0.0'
      }

      registry.register(registration)

      expect(registry.getAllCalculators()).toHaveLength(1)
      expect(registry.getSupportedAssetTypes()).toContain(AssetType.EQUITY)
      expect(registry.getMetrics().totalRegistrations).toBe(1)
      expect(registry.getMetrics().enabledCalculators).toBe(1)
    })

    it('should register multiple calculators', () => {
      const registrations: CalculatorRegistration[] = [
        {
          calculator: new MockEquityCalculator(mockDatabaseService),
          assetTypes: [AssetType.EQUITY],
          priority: 90,
          enabled: true,
          description: 'Equity calculator',
          version: '1.0.0'
        },
        {
          calculator: new MockBondCalculator(mockDatabaseService),
          assetTypes: [AssetType.BONDS],
          priority: 85,
          enabled: true,
          description: 'Bond calculator',
          version: '1.0.0'
        }
      ]

      registry.registerAll(registrations)

      expect(registry.getAllCalculators()).toHaveLength(2)
      expect(registry.getSupportedAssetTypes()).toContain(AssetType.EQUITY)
      expect(registry.getSupportedAssetTypes()).toContain(AssetType.BONDS)
      expect(registry.getMetrics().totalRegistrations).toBe(2)
    })

    it('should unregister calculators', () => {
      const calculator = new MockCalculator(mockDatabaseService)
      const registration: CalculatorRegistration = {
        calculator,
        assetTypes: [AssetType.EQUITY],
        priority: 90,
        enabled: true,
        description: 'Test calculator',
        version: '1.0.0'
      }

      registry.register(registration)
      expect(registry.getAllCalculators()).toHaveLength(1)

      const wasRemoved = registry.unregister(calculator)
      expect(wasRemoved).toBe(true)
      expect(registry.getAllCalculators()).toHaveLength(0)
    })
  })

  describe('Calculator Resolution', () => {
    beforeEach(() => {
      // Register test calculators
      const equityCalculator = new MockEquityCalculator(mockDatabaseService)
      const bondCalculator = new MockBondCalculator(mockDatabaseService)
      const mmfCalculator = new MockMMFCalculator(mockDatabaseService)

      const registrations: CalculatorRegistration[] = [
        {
          calculator: equityCalculator,
          assetTypes: [AssetType.EQUITY],
          priority: 90,
          enabled: true,
          description: 'Equity calculator',
          version: '1.0.0'
        },
        {
          calculator: bondCalculator,
          assetTypes: [AssetType.BONDS],
          priority: 85,
          enabled: true,
          description: 'Bond calculator',
          version: '1.0.0'
        },
        {
          calculator: mmfCalculator,
          assetTypes: [AssetType.MMF],
          priority: 95,
          enabled: true,
          description: 'MMF calculator',
          version: '1.0.0'
        }
      ]

      registry.registerAll(registrations)
    })

    it('should resolve calculator for specific asset type', () => {
      const input: CalculationInput = {
        productType: AssetType.EQUITY,
        valuationDate: new Date()
      }

      const resolution = registry.resolve(input)

      expect(resolution).toBeDefined()
      expect(resolution.match).toBe('exact')
      expect(resolution.confidence).toBe(1.0)
      expect(resolution.calculator.getAssetTypes()).toContain(AssetType.EQUITY)
    })

    it('should resolve highest priority calculator for asset type', () => {
      // Add second equity calculator with different priority
      const highPriorityEquity = new MockEquityCalculator(mockDatabaseService)
      registry.register({
        calculator: highPriorityEquity,
        assetTypes: [AssetType.EQUITY],
        priority: 95, // Higher than existing equity calculator
        enabled: true,
        description: 'High priority equity calculator',
        version: '1.1.0'
      })

      const input: CalculationInput = {
        productType: AssetType.EQUITY,
        valuationDate: new Date()
      }

      const resolution = registry.resolve(input)

      expect(resolution.calculator).toBe(highPriorityEquity)
    })

    it('should handle fallback when no exact match', () => {
      const input: CalculationInput = {
        productType: 'unknown_asset_type' as AssetType,
        valuationDate: new Date()
      }

      const resolution = registry.resolve(input)

      expect(resolution).toBeDefined()
      expect(resolution.match).toBe('default')
      expect(resolution.confidence).toBeLessThan(1.0)
    })

    it('should not resolve disabled calculators', () => {
      // Disable all calculators
      registry.getAllCalculators().forEach(reg => {
        registry.setCalculatorEnabled(reg.calculator, false)
      })

      const input: CalculationInput = {
        productType: AssetType.EQUITY,
        valuationDate: new Date()
      }

      const resolution = registry.resolve(input)

      // Should fall back to default calculator
      expect(resolution.match).toBe('default')
    })
  })

  describe('Health Checks', () => {
    it('should perform health checks on all calculators', async () => {
      const calculator = new MockCalculator(mockDatabaseService)
      registry.register({
        calculator,
        assetTypes: [AssetType.EQUITY],
        priority: 90,
        enabled: true,
        description: 'Test calculator',
        version: '1.0.0'
      })

      const healthResults = await registry.performHealthCheck()
      const calculatorId = Object.keys(healthResults)[0]

      expect(healthResults).toBeDefined()
      expect(Object.keys(healthResults)).toHaveLength(1)
      expect(healthResults[calculatorId]).toBe(true)
    })

    it('should disable calculators that fail health checks', async () => {
      const faultyCalculator = new MockCalculator(mockDatabaseService)
      // Make canHandle throw an error
      vi.spyOn(faultyCalculator, 'canHandle').mockImplementation(() => {
        throw new Error('Health check failure')
      })

      registry.register({
        calculator: faultyCalculator,
        assetTypes: [AssetType.EQUITY],
        priority: 90,
        enabled: true,
        description: 'Faulty calculator',
        version: '1.0.0'
      })

      const healthResults = await registry.performHealthCheck()
      const calculatorId = Object.keys(healthResults)[0]

      expect(healthResults[calculatorId]).toBe(false)
      expect(registry.getEnabledCalculators()).toHaveLength(0)
    })
  })

  describe('Caching', () => {
    beforeEach(() => {
      const calculator = new MockCalculator(mockDatabaseService, [AssetType.EQUITY])
      registry.register({
        calculator,
        assetTypes: [AssetType.EQUITY],
        priority: 90,
        enabled: true,
        description: 'Test calculator',
        version: '1.0.0'
      })
    })

    it('should cache resolution results', () => {
      const input: CalculationInput = {
        productType: AssetType.EQUITY,
        valuationDate: new Date(),
        assetId: 'test-asset'
      }

      const resolution1 = registry.resolve(input)
      const resolution2 = registry.resolve(input)

      // Should return same resolution from cache
      expect(resolution1).toBe(resolution2)
    })

    it('should clear cache when requested', () => {
      const input: CalculationInput = {
        productType: AssetType.EQUITY,
        valuationDate: new Date(),
        assetId: 'test-asset'
      }

      registry.resolve(input)
      registry.clearCache()

      // Subsequent resolve should create new resolution
      const resolution = registry.resolve(input)
      expect(resolution).toBeDefined()
    })
  })

  describe('Utility Methods', () => {
    beforeEach(() => {
      const registrations: CalculatorRegistration[] = [
        {
          calculator: new MockEquityCalculator(mockDatabaseService),
          assetTypes: [AssetType.EQUITY],
          priority: 90,
          enabled: true,
          description: 'Equity calculator',
          version: '1.0.0'
        },
        {
          calculator: new MockBondCalculator(mockDatabaseService),
          assetTypes: [AssetType.BONDS],
          priority: 85,
          enabled: false, // Disabled
          description: 'Bond calculator',
          version: '1.0.0'
        }
      ]
      registry.registerAll(registrations)
    })

    it('should return all calculators', () => {
      expect(registry.getAllCalculators()).toHaveLength(2)
    })

    it('should return only enabled calculators', () => {
      expect(registry.getEnabledCalculators()).toHaveLength(1)
      expect(registry.getEnabledCalculators()[0].assetTypes).toContain(AssetType.EQUITY)
    })

    it('should check if asset type can be handled', () => {
      expect(registry.canHandle(AssetType.EQUITY)).toBe(true)
      expect(registry.canHandle(AssetType.BONDS)).toBe(false) // Disabled
      expect(registry.canHandle(AssetType.COMMODITIES)).toBe(false) // Not registered
    })

    it('should get calculator for specific asset type', () => {
      const calculator = registry.getCalculatorForAssetType(AssetType.EQUITY)
      expect(calculator).toBeDefined()
      expect(calculator!.getAssetTypes()).toContain(AssetType.EQUITY)
    })

    it('should return supported asset types', () => {
      const supportedTypes = registry.getSupportedAssetTypes()
      expect(supportedTypes).toContain(AssetType.EQUITY)
      expect(supportedTypes).not.toContain(AssetType.BONDS) // Disabled
    })

    it('should provide metrics', () => {
      const metrics = registry.getMetrics()
      expect(metrics.totalRegistrations).toBe(2)
      expect(metrics.enabledCalculators).toBe(1)
      expect(metrics.resolutionStats).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle registration validation errors', () => {
      expect(() => {
        registry.register({
          calculator: null as any,
          assetTypes: [AssetType.EQUITY],
          priority: 90,
          enabled: true,
          description: 'Invalid calculator',
          version: '1.0.0'
        })
      }).toThrow('Calculator is required')
    })

    it('should handle invalid priority values', () => {
      expect(() => {
        registry.register({
          calculator: new MockCalculator(mockDatabaseService),
          assetTypes: [AssetType.EQUITY],
          priority: 150, // Invalid priority
          enabled: true,
          description: 'Invalid priority calculator',
          version: '1.0.0'
        })
      }).toThrow('Priority must be between 0 and 100')
    })

    it('should handle empty asset types', () => {
      expect(() => {
        registry.register({
          calculator: new MockCalculator(mockDatabaseService),
          assetTypes: [], // Empty asset types
          priority: 90,
          enabled: true,
          description: 'No asset types calculator',
          version: '1.0.0'
        })
      }).toThrow('At least one asset type must be specified')
    })
  })
})

describe('Factory Function Integration', () => {
  let registry: CalculatorRegistry

  beforeEach(() => {
    registry = createCalculatorRegistry(mockDatabaseService)
  })

  afterEach(() => {
    registry.destroy()
  })

  it('should create registry with all calculators registered', () => {
    const allCalculators = registry.getAllCalculators()
    
    // Should have all 16 calculators
    expect(allCalculators.length).toBe(16)
    
    // Verify specific calculators are registered
    const supportedTypes = registry.getSupportedAssetTypes()
    expect(supportedTypes).toContain(AssetType.EQUITY)
    expect(supportedTypes).toContain(AssetType.BONDS)
    expect(supportedTypes).toContain(AssetType.MMF)
    expect(supportedTypes).toContain(AssetType.COMMODITIES)
    expect(supportedTypes).toContain(AssetType.PRIVATE_EQUITY)
    expect(supportedTypes).toContain(AssetType.PRIVATE_DEBT)
    expect(supportedTypes).toContain(AssetType.REAL_ESTATE)
    expect(supportedTypes).toContain(AssetType.INFRASTRUCTURE)
    expect(supportedTypes).toContain(AssetType.ENERGY)
    expect(supportedTypes).toContain(AssetType.COLLECTIBLES)
    expect(supportedTypes).toContain(AssetType.ASSET_BACKED)
    expect(supportedTypes).toContain(AssetType.STRUCTURED_PRODUCTS)
    expect(supportedTypes).toContain(AssetType.QUANT_STRATEGIES)
    expect(supportedTypes).toContain(AssetType.INVOICE_RECEIVABLES)
    expect(supportedTypes).toContain(AssetType.CLIMATE_RECEIVABLES)
    expect(supportedTypes).toContain(AssetType.DIGITAL_TOKENIZED_FUNDS)
  })

  it('should resolve calculators for all supported asset types', () => {
    const testAssetTypes = [
      AssetType.EQUITY,
      AssetType.BONDS,
      AssetType.MMF,
      AssetType.COMMODITIES,
      AssetType.PRIVATE_EQUITY,
      AssetType.REAL_ESTATE,
      AssetType.ENERGY
    ]

    testAssetTypes.forEach(assetType => {
      const input: CalculationInput = {
        productType: assetType,
        valuationDate: new Date()
      }

      const resolution = registry.resolve(input)
      expect(resolution).toBeDefined()
      expect(resolution.calculator.getAssetTypes()).toContain(assetType)
      expect(resolution.match).toBe('exact')
    })
  })

  it('should handle resolution performance efficiently', () => {
    const input: CalculationInput = {
      productType: AssetType.EQUITY,
      valuationDate: new Date()
    }

    const startTime = Date.now()
    
    // Perform multiple resolutions
    for (let i = 0; i < 100; i++) {
      registry.resolve({ ...input, assetId: `asset-${i}` })
    }
    
    const endTime = Date.now()
    const avgTime = (endTime - startTime) / 100

    // Should resolve quickly (under 10ms average)
    expect(avgTime).toBeLessThan(10)
  })
})

// Mock Calculator for Testing
class MockCalculator extends BaseCalculator {
  private supportedAssetTypes: AssetType[]
  private calculatorName: string

  constructor(databaseService: DatabaseService, assetTypes: AssetType[] = [AssetType.EQUITY], name?: string) {
    super(databaseService)
    this.supportedAssetTypes = assetTypes
    this.calculatorName = name || 'MockCalculator'
    // Override constructor name for unique IDs
    Object.defineProperty(this.constructor, 'name', {
      value: this.calculatorName + '_' + Math.random().toString(36).substring(2, 8)
    })
  }

  canHandle(input: any): boolean {
    if (!input.productType) return false
    return this.supportedAssetTypes.includes(input.productType as AssetType)
  }

  getAssetTypes(): AssetType[] {
    return this.supportedAssetTypes
  }

  protected async performCalculation(input: any): Promise<any> {
    return {
      success: true,
      data: {
        runId: this.generateRunId(),
        assetId: input.assetId,
        productType: input.productType,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: 100,
        totalLiabilities: 0,
        netAssets: 100,
        navValue: 100,
        currency: 'USD',
        pricingSources: {},
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED
      }
    }
  }
}

// Create specific calculator classes for testing
class MockEquityCalculator extends MockCalculator {
  constructor(databaseService: DatabaseService) {
    super(databaseService, [AssetType.EQUITY], 'MockEquityCalculator')
  }
}

class MockBondCalculator extends MockCalculator {
  constructor(databaseService: DatabaseService) {
    super(databaseService, [AssetType.BONDS], 'MockBondCalculator')
  }
}

class MockMMFCalculator extends MockCalculator {
  constructor(databaseService: DatabaseService) {
    super(databaseService, [AssetType.MMF], 'MockMMFCalculator')
  }
}
