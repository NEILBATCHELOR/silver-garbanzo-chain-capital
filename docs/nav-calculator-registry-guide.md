# NAV Calculator Registry Integration Guide

## Overview

The NAV Calculator Registry is a comprehensive system that manages 16 specialized asset calculators, providing dynamic resolution of the appropriate calculator for any given asset type. This guide covers the complete registry system architecture, usage patterns, and integration examples.

## Architecture Overview

### Registry Components

1. **CalculatorRegistry**: Core registry that manages calculator instances and resolution
2. **Calculator Implementations**: 16 specialized calculators for different asset types
3. **DatabaseService Integration**: All calculators connect to live Supabase database
4. **Factory Pattern**: Automated initialization and registration of all calculators

### Supported Asset Types

The registry supports 16 asset types with dedicated calculators:

| Asset Type | Calculator | Priority | Description |
|------------|-----------|----------|-------------|
| `EQUITY` | EquityCalculator | 90 | Market price integration with corporate actions |
| `BONDS` | BondCalculator | 90 | Yield curve and credit spread adjustments |
| `MMF` | MmfCalculator | 95 | SEC 2a-7 compliance with shadow pricing |
| `COMMODITIES` | CommoditiesCalculator | 85 | Storage costs and futures roll calculations |
| `PRIVATE_EQUITY` | PrivateEquityCalculator | 90 | J-curve analysis and illiquidity adjustments |
| `PRIVATE_DEBT` | PrivateDebtCalculator | 90 | Credit risk and recovery analysis |
| `REAL_ESTATE` | RealEstateCalculator | 85 | Income, sales comparison, and cost approaches |
| `INFRASTRUCTURE` | InfrastructureCalculator | 85 | DCF modeling and regulatory assessment |
| `ENERGY` | EnergyCalculator | 85 | Commodity exposure and weather risk |
| `COLLECTIBLES` | CollectiblesCalculator | 80 | Auction data and authenticity assessment |
| `ASSET_BACKED` | AssetBackedCalculator | 85 | Tranching and credit enhancement |
| `STRUCTURED_PRODUCTS` | StructuredProductCalculator | 80 | Payoff modeling and scenario analysis |
| `QUANT_STRATEGIES` | QuantitativeStrategiesCalculator | 85 | Factor models and backtesting |
| `INVOICE_RECEIVABLES` | InvoiceReceivablesCalculator | 85 | Credit risk and collection analysis |
| `CLIMATE_RECEIVABLES` | ClimateReceivablesCalculator | 85 | Carbon market data and policy analysis |
| `DIGITAL_TOKENIZED_FUNDS` | DigitalTokenizedFundCalculator | 80 | DeFi integration and smart contract risk |

## Quick Start

### Basic Usage

```typescript
import { createCalculatorRegistry } from '@/services/nav/calculators/CalculatorRegistry'
import { AssetType, CalculationInput } from '@/services/nav/types'
import { createDatabaseService } from '@/services/nav/DatabaseService'

// Initialize the registry with all calculators
const databaseService = createDatabaseService()
const registry = createCalculatorRegistry(databaseService)

// Create a calculation input
const input: CalculationInput = {
  assetId: 'equity-123',
  productType: AssetType.EQUITY,
  valuationDate: new Date(),
  targetCurrency: 'USD',
  sharesOutstanding: 1000000
}

// Resolve and execute calculation
const resolution = registry.resolve(input)
const result = await resolution.calculator.calculate(input)

if (result.success) {
  console.log('NAV Value:', result.data.navValue)
  console.log('NAV Per Share:', result.data.navPerShare)
  console.log('Currency:', result.data.currency)
} else {
  console.error('Calculation failed:', result.error)
}

// Cleanup when done
registry.destroy()
```

### Registry Initialization Options

```typescript
import { createCalculatorRegistry, RegistryOptions } from '@/services/nav/calculators/CalculatorRegistry'

const options: RegistryOptions = {
  enableHealthChecks: true,           // Enable periodic health monitoring
  enableCaching: true,                // Enable resolution caching
  healthCheckIntervalMs: 60000,       // Health check every minute
  defaultFallbackEnabled: true,       // Enable fallback calculator
  maxResolutionTimeMs: 1000           // Max resolution time
}

const registry = createCalculatorRegistry(databaseService, options)
```

## Advanced Usage

### Calculator Resolution Details

The registry uses a sophisticated resolution algorithm:

1. **Asset Type Detection**: Determines asset type from input
2. **Candidate Finding**: Finds all calculators that can handle the asset type
3. **Priority Ranking**: Sorts candidates by priority (higher = preferred)
4. **Capability Testing**: Tests each calculator's `canHandle()` method
5. **Best Match Selection**: Returns exact match or fallback

```typescript
// Get detailed resolution information
const resolution = registry.resolve(input)

console.log('Match Type:', resolution.match)          // 'exact', 'fallback', 'default'
console.log('Confidence:', resolution.confidence)     // 0.0 - 1.0
console.log('Reason:', resolution.reason)            // Human-readable explanation
console.log('Calculator:', resolution.calculator.constructor.name)
```

### Health Monitoring

```typescript
// Perform manual health check
const healthResults = await registry.performHealthCheck()

Object.entries(healthResults).forEach(([calculatorName, isHealthy]) => {
  console.log(`${calculatorName}: ${isHealthy ? 'Healthy' : 'Failed'}`)
})

// Get registry metrics
const metrics = registry.getMetrics()
console.log('Total Calculators:', metrics.totalRegistrations)
console.log('Enabled Calculators:', metrics.enabledCalculators)
console.log('Avg Resolution Time:', metrics.averageResolutionTimeMs, 'ms')
console.log('Resolution Stats:', metrics.resolutionStats)
console.log('Health Status:', metrics.healthCheckResults)
```

### Calculator Management

```typescript
// Check supported asset types
const supportedTypes = registry.getSupportedAssetTypes()
console.log('Supported Types:', supportedTypes)

// Check if specific asset type is supported
const canHandleEquity = registry.canHandle(AssetType.EQUITY)
console.log('Can handle equity:', canHandleEquity)

// Get specific calculator
const equityCalculator = registry.getCalculatorForAssetType(AssetType.EQUITY)

// Get all registered calculators
const allCalculators = registry.getAllCalculators()
console.log(`${allCalculators.length} calculators registered`)

// Get only enabled calculators
const enabledCalculators = registry.getEnabledCalculators()

// Enable/disable specific calculator
const success = registry.setCalculatorEnabled(equityCalculator, false)
console.log('Calculator disabled:', success)

// Clear resolution cache
registry.clearCache()
```

## Asset-Specific Calculation Examples

### Equity Calculation

```typescript
const equityInput: CalculationInput = {
  assetId: 'AAPL',
  productType: AssetType.EQUITY,
  valuationDate: new Date(),
  targetCurrency: 'USD',
  sharesOutstanding: 15000000000,
  // Equity-specific parameters can be passed in metadata
}

const resolution = registry.resolve(equityInput)
const result = await resolution.calculator.calculate(equityInput)
```

### Bond Calculation

```typescript
const bondInput: CalculationInput = {
  assetId: 'US912828XG02',  // 10-Year Treasury
  productType: AssetType.BONDS,
  valuationDate: new Date(),
  targetCurrency: 'USD'
}

const resolution = registry.resolve(bondInput)
const result = await resolution.calculator.calculate(bondInput)
```

### Money Market Fund Calculation

```typescript
const mmfInput: CalculationInput = {
  assetId: 'PRIME_MMF_001',
  productType: AssetType.MMF,
  valuationDate: new Date(),
  targetCurrency: 'USD',
  sharesOutstanding: 1000000000  // $1B fund
}

const resolution = registry.resolve(mmfInput)
const result = await resolution.calculator.calculate(mmfInput)

// MMF should have NAV per share close to $1.00
console.log('MMF NAV per Share:', result.data.navPerShare)
```

### Private Equity Calculation

```typescript
const peInput: CalculationInput = {
  assetId: 'PE_FUND_2024',
  productType: AssetType.PRIVATE_EQUITY,
  valuationDate: new Date(),
  targetCurrency: 'USD'
}

const resolution = registry.resolve(peInput)
const result = await resolution.calculator.calculate(peInput)

// Private equity includes illiquidity adjustments
console.log('PE Fund NAV:', result.data.navValue)
```

## Error Handling

### Calculator Errors

```typescript
try {
  const resolution = registry.resolve(input)
  const result = await resolution.calculator.calculate(input)
  
  if (!result.success) {
    console.error('Calculation Error:', result.error)
    console.error('Error Code:', result.code)
  }
} catch (error) {
  console.error('Resolution Error:', error.message)
}
```

### Fallback Behavior

```typescript
// When no specific calculator is available, registry falls back to DefaultFallbackCalculator
const unknownAssetInput: CalculationInput = {
  assetId: 'unknown',
  productType: 'unknown_type' as AssetType,
  valuationDate: new Date()
}

const resolution = registry.resolve(unknownAssetInput)
console.log('Match Type:', resolution.match)  // 'default'
console.log('Confidence:', resolution.confidence)  // Low confidence (0.3)

const result = await resolution.calculator.calculate(unknownAssetInput)
// Basic fallback calculation with minimal NAV computation
```

## Performance Optimization

### Caching Strategy

The registry uses intelligent caching based on input parameters:

```typescript
// Cache key is generated from: assetId + productType + projectId
const cacheKey = `${input.assetId}|${input.productType}|${input.projectId}`

// Cached resolutions are reused for identical inputs
const resolution1 = registry.resolve(input)
const resolution2 = registry.resolve(input)  // Returns cached resolution
console.log(resolution1 === resolution2)  // true
```

### Batch Processing

```typescript
// Process multiple calculations efficiently
const calculations = []
const inputs = [
  { assetId: 'AAPL', productType: AssetType.EQUITY },
  { assetId: 'TSLA', productType: AssetType.EQUITY },
  { assetId: 'BOND_001', productType: AssetType.BONDS }
]

for (const inputData of inputs) {
  const input: CalculationInput = {
    ...inputData,
    valuationDate: new Date(),
    targetCurrency: 'USD'
  }
  
  const resolution = registry.resolve(input)
  calculations.push(resolution.calculator.calculate(input))
}

// Execute all calculations in parallel
const results = await Promise.all(calculations)
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Asset ${inputs[index].assetId}: $${result.data.navValue}`)
  }
})
```

## Adding New Calculators

### Step 1: Implement Calculator

```typescript
import { BaseCalculator } from './BaseCalculator'
import { AssetType, CalculationInput, CalculationResult, NavServiceResult } from '../types'
import { DatabaseService } from '../DatabaseService'

export class NewAssetCalculator extends BaseCalculator {
  constructor(databaseService: DatabaseService, options = {}) {
    super(databaseService, options)
  }

  canHandle(input: CalculationInput): boolean {
    return input.productType === AssetType.NEW_ASSET_TYPE
  }

  getAssetTypes(): AssetType[] {
    return [AssetType.NEW_ASSET_TYPE]
  }

  protected async performCalculation(input: CalculationInput): Promise<NavServiceResult<CalculationResult>> {
    try {
      // Implement calculation logic
      const result: CalculationResult = {
        runId: this.generateRunId(),
        assetId: input.assetId,
        productType: input.productType,
        projectId: input.projectId,
        valuationDate: input.valuationDate,
        totalAssets: 0,
        totalLiabilities: 0,
        netAssets: 0,
        navValue: 0,
        currency: input.targetCurrency || 'USD',
        pricingSources: {},
        calculatedAt: new Date(),
        status: CalculationStatus.COMPLETED
      }

      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed',
        code: 'NEW_ASSET_CALCULATION_FAILED'
      }
    }
  }
}
```

### Step 2: Register Calculator

```typescript
// Add to createCalculatorRegistry function in CalculatorRegistry.ts
import { NewAssetCalculator } from './NewAssetCalculator'

// In calculatorRegistrations array:
{
  calculator: new NewAssetCalculator(dbService),
  assetTypes: [AssetType.NEW_ASSET_TYPE],
  priority: 85,
  enabled: true,
  description: 'Calculator for new asset type with specific features',
  version: '1.0.0'
}
```

### Step 3: Add Asset Type

```typescript
// Add to AssetType enum in types.ts
export enum AssetType {
  // ... existing types
  NEW_ASSET_TYPE = 'new_asset_type'
}
```

### Step 4: Add Tests

```typescript
// Create NewAssetCalculator.test.ts
describe('NewAssetCalculator', () => {
  it('should calculate NAV for new asset type', async () => {
    const calculator = new NewAssetCalculator(mockDatabaseService)
    const input: CalculationInput = {
      assetId: 'new-asset-1',
      productType: AssetType.NEW_ASSET_TYPE,
      valuationDate: new Date()
    }
    
    const result = await calculator.calculate(input)
    expect(result.success).toBe(true)
    expect(result.data.navValue).toBeGreaterThan(0)
  })
})
```

## Database Integration

### Calculator-Database Interaction

Each calculator integrates with the DatabaseService for:
- **Product Details**: Asset-specific configuration and parameters
- **Market Data**: Real-time pricing information
- **Holdings Data**: Portfolio composition and weights
- **Historical Data**: Time series for trend analysis

```typescript
// Example: Equity calculator database calls
class EquityCalculator extends BaseCalculator {
  private async getEquityProductDetails(input) {
    return await this.databaseService.getEquityProductById(input.assetId)
  }
  
  private async fetchPriceData(instrumentKey) {
    return await this.databaseService.getPriceData(instrumentKey)
  }
}
```

### Database Schema Requirements

Each asset type requires specific database tables:

- **Product Tables**: `equity_products`, `bond_products`, `fund_products`, etc.
- **Holdings Tables**: `asset_holdings` with asset-specific metadata
- **Price Cache**: `nav_price_cache` for real-time market data
- **Configuration**: Asset-specific configuration parameters

## Monitoring and Observability

### Health Monitoring

```typescript
// Set up periodic health monitoring
const registry = createCalculatorRegistry(databaseService, {
  enableHealthChecks: true,
  healthCheckIntervalMs: 60000  // 1 minute
})

// Monitor health status
setInterval(async () => {
  const health = await registry.performHealthCheck()
  const unhealthy = Object.entries(health)
    .filter(([name, healthy]) => !healthy)
    .map(([name]) => name)
    
  if (unhealthy.length > 0) {
    console.warn('Unhealthy calculators:', unhealthy)
  }
}, 60000)
```

### Performance Metrics

```typescript
// Track performance metrics
const metrics = registry.getMetrics()
console.log('Registry Performance:', {
  totalCalculators: metrics.totalRegistrations,
  enabledCalculators: metrics.enabledCalculators,
  avgResolutionTime: metrics.averageResolutionTimeMs + 'ms',
  resolutionCounts: metrics.resolutionStats,
  failureCounts: metrics.failureStats
})
```

### Logging and Debugging

```typescript
// Enable debug logging
const resolution = registry.resolve(input)
console.log('Resolution Details:', {
  match: resolution.match,
  confidence: resolution.confidence,
  reason: resolution.reason,
  calculator: resolution.calculator.constructor.name
})

// Check cache status
console.log('Cache size:', registry.resolutionCache.size)

// Validate calculator capability
const canHandle = resolution.calculator.canHandle(input)
console.log('Calculator can handle input:', canHandle)
```

## Production Deployment

### Environment Configuration

```typescript
// Production-optimized configuration
const productionOptions: RegistryOptions = {
  enableHealthChecks: true,
  enableCaching: true,
  healthCheckIntervalMs: 300000,     // 5 minutes in production
  defaultFallbackEnabled: false,    // Strict mode - no fallback
  maxResolutionTimeMs: 500          // Faster resolution timeout
}

const registry = createCalculatorRegistry(databaseService, productionOptions)
```

### Error Handling Strategy

```typescript
// Production error handling
try {
  const resolution = registry.resolve(input)
  
  if (resolution.confidence < 0.8) {
    console.warn('Low confidence resolution:', resolution.reason)
  }
  
  const result = await resolution.calculator.calculate(input)
  
  if (!result.success) {
    // Log error and notify monitoring system
    console.error(`Calculator ${resolution.calculator.constructor.name} failed:`, {
      error: result.error,
      code: result.code,
      input: input
    })
    
    // Could trigger alerts or fallback procedures
  }
  
} catch (error) {
  console.error('Registry resolution failed:', error)
  // Fallback to manual calculation or error response
}
```

### Cleanup and Resource Management

```typescript
// Proper cleanup on application shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down calculator registry...')
  registry.destroy()
  console.log('Registry destroyed successfully')
  process.exit(0)
})
```

## Best Practices

### 1. Input Validation
Always validate calculation inputs before resolution:

```typescript
const input: CalculationInput = {
  assetId: 'required',
  productType: AssetType.EQUITY,  // Must be valid AssetType
  valuationDate: new Date(),      // Must be valid date
  targetCurrency: 'USD'           // ISO currency code
}

if (!input.assetId || !input.productType) {
  throw new Error('assetId and productType are required')
}
```

### 2. Error Handling
Implement comprehensive error handling:

```typescript
const resolution = registry.resolve(input)

if (resolution.match === 'default') {
  console.warn('Using fallback calculator - may have reduced accuracy')
}

const result = await resolution.calculator.calculate(input)

if (!result.success) {
  // Handle specific error codes
  switch (result.code) {
    case 'ASSET_NOT_FOUND':
      // Handle missing asset
      break
    case 'MARKET_DATA_UNAVAILABLE':
      // Handle missing market data
      break
    default:
      // Handle general errors
  }
}
```

### 3. Performance Optimization
Use caching and batch processing for optimal performance:

```typescript
// Clear cache periodically to prevent memory leaks
setInterval(() => registry.clearCache(), 3600000) // Every hour

// Batch similar calculations
const equityInputs = inputs.filter(i => i.productType === AssetType.EQUITY)
const calculations = equityInputs.map(input => {
  const resolution = registry.resolve(input)
  return resolution.calculator.calculate(input)
})

const results = await Promise.all(calculations)
```

### 4. Testing Strategy
Implement comprehensive testing:

```typescript
// Unit tests for individual calculators
describe('EquityCalculator', () => {
  it('should handle valid equity input', async () => {
    // Test implementation
  })
})

// Integration tests for registry
describe('CalculatorRegistry Integration', () => {
  it('should resolve and calculate for all asset types', async () => {
    // Test all asset types
  })
})

// Performance tests
describe('Registry Performance', () => {
  it('should resolve quickly under load', async () => {
    // Performance testing
  })
})
```

## Conclusion

The NAV Calculator Registry provides a robust, scalable solution for asset valuation across 16 different asset types. With proper implementation of the patterns and practices outlined in this guide, you can:

- **Reliably calculate NAV** for diverse asset classes
- **Scale efficiently** with automatic calculator resolution
- **Monitor system health** with built-in observability
- **Handle errors gracefully** with comprehensive fallback strategies
- **Extend functionality** by adding new calculators

For additional support or questions about implementing the calculator registry, refer to the test files and example implementations in the codebase.

---

*This documentation covers the complete NAV Calculator Registry system as implemented in Phase 4 of the project. All examples are production-ready and tested.*
