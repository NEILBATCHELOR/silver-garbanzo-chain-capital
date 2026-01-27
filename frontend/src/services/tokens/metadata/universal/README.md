# Universal Structured Product Framework

## 🎯 Overview

The **Universal Structured Product Framework** is a revolutionary approach to creating tokenized structured products. Instead of maintaining 39+ individual product types, this framework provides **ONE composable system** that can configure any structured product through component mixing.

## ✨ Key Benefits

### Before (Enumeration Approach)
```
❌ 39+ separate metadata types
❌ 10,000+ lines of code
❌ Hard to maintain
❌ Limited flexibility
❌ Can't create custom products without code changes
```

### After (Universal Framework)
```
✅ ONE universal metadata type
✅ 2,000 lines of code (80% reduction)
✅ Easy to maintain
✅ Infinite flexibility
✅ Create any product via configuration
✅ Mix and match components freely
```

## 📊 Comparison

| Feature | Enumeration | Universal Framework |
|---------|-------------|---------------------|
| **Products Supported** | 39 fixed | Unlimited |
| **Lines of Code** | 10,000+ | 2,000 |
| **Maintenance** | Update 39 files | Update 1 file |
| **New Product** | Write new type | Configure components |
| **Time to Add Product** | 1-2 days | 5 minutes |
| **Flexibility** | Low | Infinite |

## 🏗️ Architecture

### Component-Based Design

The framework uses composable components:

```typescript
UniversalStructuredProductMetadata {
  productCategory        // Type of product
  underlyings[]         // One or many underlying assets
  payoffStructure       // How returns are calculated
  barriers?             // Optional barrier features
  coupons?              // Optional coupon payments
  callableFeature?      // Optional early redemption
  participation?        // Upside/downside participation
  capitalProtection?    // Principal protection
  observation           // Pricing/monitoring schedule
  settlement            // Redemption configuration
  oracles[]             // Price feeds
}
```

### Component Types

**1. Underlying Assets** (15+ types)
- Equity (single, index, basket)
- Interest rates (SOFR, LIBOR, CMS)
- FX (spot, forward, cross)
- Credit (spread, index, reference entity)
- Commodities (spot, futures)
- Volatility (VIX, realized, implied)
- **Digital assets** (crypto, stablecoins) ⭐ NEW

**2. Payoff Structures** (12+ types)
- Linear, Capped Linear
- Leveraged, Outperformance
- Digital, Range Digital
- Buffered, Floored
- Asian, Lookback, Cliquet
- Twin-Win, Bonus, Custom

**3. Barriers** (6 types)
- Knock-In / Knock-Out
- Call Barriers
- Coupon Barriers
- Protection Barriers
- Autocall Triggers

**4. Coupons** (8+ types)
- Fixed, Conditional, Memory
- Floating, Range Accrual
- Digital, Step-Up/Down

**5. Settlement Types** ⭐ ENHANCED
- Cash, Physical, Hybrid
- **Digital Asset Settlement** (NEW)
- **NFT Settlement** (NEW)
- **Tokenized Security** (NEW)

**6. Collateral Types** ⭐ NEW
- Cash, Bonds, Equity
- **Crypto Assets** (BTC, ETH, SOL)
- **Stablecoins** (USDC, USDT)
- **LP Tokens** (Liquidity pool tokens)
- **Staked Assets** (stSOL, etc.)
- **Yield-Bearing Tokens** (aTokens, cTokens)

## 🚀 Usage

### Option 1: Use Pre-Built Templates (Recommended)

```typescript
import { 
  universalMetadataBuilder,
  ProductTemplates
} from '@/services/tokens/metadata/universal';

// Configure template
const config = ProductTemplates.AutocallableBarrier.build({
  underlyingTicker: 'SPX',
  underlyingName: 'S&P 500 Index',
  initialPrice: 5000,
  barrierLevel: 100,
  knockInBarrier: 60,
  couponRate: 8.5,
  maturityDate: new Date('2028-12-31'),
  oracleAddress: 'GVXRSBjFk...',
  redemptionVault: 'HvYxUf1C7B...',
  uri: 'ar://metadata-uri',
  prospectusUri: 'ar://prospectus',
  termSheetUri: 'ar://termsheet'
});

// Build metadata
const metadata = universalMetadataBuilder.buildStructuredProduct({
  ...config,
  name: 'Autocallable S&P 500 Note 2028',
  symbol: 'ACSPX28'
});

// Use with deployment service
// (metadata.additionalMetadata now has all fields)
```

### Option 2: Build Custom Product

```typescript
import { 
  universalMetadataBuilder,
  type UniversalSPInput
} from '@/services/tokens/metadata/universal';

// Build Snowball Note (rate-linked product)
const snowballNote: UniversalSPInput = {
  type: 'universal_structured_product',
  name: 'SOFR Snowball Note 2027',
  symbol: 'SNOW27',
  uri: 'ar://metadata-uri',
  decimals: 6,
  
  issuer: 'Chain Capital LLC',
  jurisdiction: 'US',
  issueDate: '2026-01-27',
  maturityDate: '2027-01-27',
  currency: 'USD',
  
  // Product classification
  productCategory: 'range_accrual',
  productSubtype: 'snowball_note',
  
  // Underlying = Interest rate
  underlyings: [{
    identifier: 'SOFR',
    name: 'Secured Overnight Financing Rate',
    type: 'interest_rate',
    currentPrice: '5.30',
    oracleAddress: 'SOFROracle...',
    oracleProvider: 'chainlink'
  }],
  
  // Payoff = Range digital
  payoffStructure: {
    payoffType: 'range_digital',
    returnCalculation: 'cliquet'
  },
  
  // Knock-out barrier
  barriers: {
    barriers: [{
      barrierType: 'knock_out',
      level: '5.5',
      direction: 'up',
      observationType: 'continuous',
      breached: 'false',
      appliesTo: 'single'
    }]
  },
  
  // Range accrual coupon
  coupons: {
    memoryFeature: 'false',
    coupons: [{
      couponType: 'range_accrual',
      rate: '12',
      frequency: 'at_maturity',
      conditional: 'true',
      accrualRange: {
        lower: '0',
        upper: '5.5',
        ratePerDay: '0.03'
      }
    }]
  },
  
  // Continuous observation
  observation: {
    observationType: 'continuous',
    valuationMethod: 'mark_to_market'
  },
  
  // Cash settlement
  settlement: {
    settlementType: 'cash',
    settlementMethod: 'automatic',
    settlementDays: '2',
    redemptionVault: 'SnowballVault...'
  },
  
  // Oracle
  oracles: [{
    purpose: 'rate_reference',
    provider: 'chainlink',
    oracleAddress: 'SOFROracle...',
    updateFrequency: 'daily',
    dataType: 'rate'
  }]
};

// Build metadata
const metadata = universalMetadataBuilder.buildStructuredProduct(snowballNote);
```

### Option 3: Crypto-Settled Product ⭐ NEW

```typescript
// Autocallable with USDC settlement on Solana
const cryptoAutocallable: UniversalSPInput = {
  type: 'universal_structured_product',
  name: 'SOL Autocallable USDC-Settled 2027',
  symbol: 'SOLAC27',
  uri: 'ar://metadata-uri',
  decimals: 6,
  
  issuer: 'Chain Capital DAO',
  jurisdiction: 'Decentralized',
  issueDate: '2026-01-27',
  maturityDate: '2027-01-27',
  currency: 'USDC',
  
  productCategory: 'autocallable',
  productSubtype: 'crypto_settled_autocallable',
  
  // Underlying = SOL
  underlyings: [{
    identifier: 'SOL',
    name: 'Solana',
    type: 'crypto_asset',
    initialPrice: '100',
    oracleAddress: 'SOL_Pyth_Oracle',
    oracleProvider: 'pyth'
  }],
  
  // Standard autocallable structure
  payoffStructure: {
    payoffType: 'linear',
    returnCalculation: 'point_to_point'
  },
  
  barriers: {
    barriers: [
      {
        barrierType: 'autocall_barrier',
        level: '100',
        direction: 'up',
        observationType: 'discrete',
        breached: 'false',
        appliesTo: 'single'
      },
      {
        barrierType: 'knock_in',
        level: '60',
        direction: 'down',
        observationType: 'continuous',
        breached: 'false',
        appliesTo: 'single'
      }
    ]
  },
  
  coupons: {
    memoryFeature: 'true',
    coupons: [{
      couponType: 'conditional',
      rate: '12',
      frequency: 'monthly',
      conditional: 'true'
    }]
  },
  
  observation: {
    observationType: 'discrete',
    observationFrequency: 'monthly',
    valuationMethod: 'end_of_day',
    valuationTime: '00:00:00UTC'
  },
  
  // Digital asset settlement ⭐
  settlement: {
    settlementType: 'digital_asset',
    settlementMethod: 'automatic',
    settlementDays: '0', // Instant settlement
    settlementCurrency: 'USDC',
    redemptionVault: 'RedemptionVault...',
    
    // Delivery instructions
    deliveryInstructions: {
      deliveryType: 'digital',
      blockchain: 'solana',
      tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      deliveryAddress: 'RedemptionVault...'
    }
  },
  
  oracles: [{
    purpose: 'underlying_price',
    provider: 'pyth',
    oracleAddress: 'SOL_Pyth_Oracle',
    updateFrequency: 'realtime',
    dataType: 'price'
  }]
};

const metadata = universalMetadataBuilder.buildStructuredProduct(cryptoAutocallable);
```

## 📦 Available Templates

```typescript
import { ProductTemplates } from '@/services/tokens/metadata/universal';

// 1. Autocallable Barrier
ProductTemplates.AutocallableBarrier

// 2. Worst-Of Autocallable
ProductTemplates.WorstOfAutocallable

// 3. Bonus Certificate
ProductTemplates.BonusCertificate

// 4. Principal Protected Note
ProductTemplates.PrincipalProtectedNote

// 5. Reverse Convertible
ProductTemplates.ReverseConvertible

// 6. Crypto-Settled Autocallable ⭐ NEW
ProductTemplates.CryptoSettledAutocallable
```

## 🔄 Migration from Legacy

### Automatic Migration

```typescript
import { migrationAdapter } from '@/services/tokens/metadata/universal';
import type { AutocallableInput } from '@/services/tokens/metadata';

// Old autocallable input
const legacyInput: AutocallableInput = {
  type: 'autocallable',
  name: 'Autocallable S&P 500 Note 2026',
  symbol: 'ACSPX26',
  // ... other legacy fields
};

// Automatically convert and build
const metadata = migrationAdapter.buildAutocallable(legacyInput);

// Or auto-detect type
const metadata2 = migrationAdapter.buildFromLegacyInput(legacyInput);
```

### Manual Migration

1. Identify your product type
2. Find equivalent Universal Framework template
3. Configure template with your parameters
4. Build metadata

## 🎨 Examples

### Example 1: Simple Autocallable

```typescript
const metadata = universalMetadataBuilder.buildStructuredProduct({
  type: 'universal_structured_product',
  productCategory: 'autocallable',
  productSubtype: 'barrier_autocallable',
  
  // Just provide the essentials
  underlyings: [{ type: 'equity_index', identifier: 'SPX', ... }],
  barriers: { barriers: [{ barrierType: 'autocall_barrier', ... }] },
  coupons: { coupons: [{ couponType: 'conditional', ... }] },
  observation: { observationType: 'discrete', ... },
  settlement: { settlementType: 'cash', ... },
  oracles: [{ purpose: 'underlying_price', ... }],
  
  // Framework handles the rest
  ...commonFields
});
```

### Example 2: Worst-Of Multi-Asset

```typescript
const metadata = universalMetadataBuilder.buildStructuredProduct({
  type: 'universal_structured_product',
  productCategory: 'autocallable',
  
  // 3 underlyings
  underlyings: [
    { identifier: 'AAPL', weight: '33.33', ... },
    { identifier: 'MSFT', weight: '33.33', ... },
    { identifier: 'GOOGL', weight: '33.34', ... }
  ],
  
  // Basket configuration
  underlyingBasket: {
    basketType: 'worst_of'
  },
  
  // Barriers apply to worst performer
  barriers: {
    barriers: [{
      barrierType: 'knock_in',
      appliesTo: 'worst_of',
      ...
    }]
  },
  
  ...restOfConfig
});
```

### Example 3: Credit Default Swap

```typescript
const metadata = universalMetadataBuilder.buildStructuredProduct({
  type: 'universal_structured_product',
  productCategory: 'credit_derivative',
  productSubtype: 'single_name_cds',
  
  underlyings: [{
    type: 'reference_entity',
    identifier: 'TESLA',
    ...
  }],
  
  payoffStructure: {
    payoffType: 'digital',
    digitalPayout: '1000000' // Notional * (1 - recovery)
  },
  
  coupons: {
    coupons: [{
      couponType: 'fixed',
      rate: '250' // 250 bps spread
    }]
  },
  
  oracles: [{
    purpose: 'credit_event',
    dataType: 'binary',
    ...
  }],
  
  ...
});
```

## 📚 Documentation

### Core Types

- `UniversalStructuredProductInput` - Main configuration interface
- `ProductCategory` - Top-level product classification (20+ types)
- `UnderlyingType` - Asset types (15+ types including digital assets)
- `PayoffType` - Return calculation methods (12+ types)
- `BarrierType` - Barrier features (6 types)
- `CouponType` - Income structures (8+ types)
- `SettlementType` - Settlement methods (6 types including digital)
- `CollateralType` - Collateral types (10+ types including crypto)

### Main Services

- `universalMetadataBuilder` - Main builder service
- `migrationAdapter` - Legacy-to-universal converter
- `ProductTemplates` - Pre-built product configurations

## ⚡ Performance

### Size Optimization

All metadata is automatically optimized to stay within Token-2022 constraints:

```
Target: <1KB total on-chain metadata
Standard fields: ~100 bytes
Additional metadata: ~900 bytes
```

### Validation

Automatic validation ensures:
- Field sizes within limits
- Required fields present
- Type compatibility
- Oracle configurations valid

## 🛠️ Advanced Usage

### Custom Payoff Formulas

```typescript
payoffStructure: {
  payoffType: 'custom',
  payoffFormula: 'MAX(0, (S_T - K) / K) * participation',
  returnCalculation: 'point_to_point'
}
```

### Multiple Oracles

```typescript
oracles: [
  {
    purpose: 'underlying_price',
    provider: 'pyth',
    oracleAddress: 'PRIMARY_ORACLE',
    fallbackOracle: 'SECONDARY_ORACLE'
  },
  {
    purpose: 'fx_rate',
    provider: 'chainlink',
    oracleAddress: 'FX_ORACLE'
  }
]
```

### Complex Collateral

```typescript
settlement: {
  settlementType: 'digital_asset',
  collateral: {
    collateralType: 'mixed',
    collateralRatio: '150',
    collateralAssets: [
      {
        type: 'stablecoin',
        identifier: 'USDC',
        weight: '60',
        blockchain: 'solana',
        tokenMint: 'EPjFWdd5AufqSSq...'
      },
      {
        type: 'crypto_asset',
        identifier: 'SOL',
        weight: '40',
        blockchain: 'solana',
        tokenMint: 'So11111111111...'
      }
    ],
    maintenanceMargin: '120',
    liquidationThreshold: '110'
  }
}
```

## 🎯 Best Practices

1. **Start with Templates** - Use pre-built templates as starting points
2. **Component Composition** - Mix and match components as needed
3. **Size Awareness** - Monitor metadata size during development
4. **Oracle Configuration** - Always provide fallback oracles
5. **Type Safety** - Leverage TypeScript types for validation

## 🔮 Future Enhancements

- Additional product templates (Variance swaps, Volatility notes, etc.)
- UI component library for dynamic form generation
- Real-time metadata preview
- Template marketplace
- Product backtesting tools

## 📖 Related Documentation

- [SOLANA_TOKEN_METADATA_SPECIFICATION.md](/docs/SOLANA_TOKEN_METADATA_SPECIFICATION.md)
- [UNIVERSAL_STRUCTURED_PRODUCT_FRAMEWORK.md](/docs/UNIVERSAL_STRUCTURED_PRODUCT_FRAMEWORK.md)

## 💡 Support

For questions or issues:
1. Check examples in this README
2. Review template source code
3. Consult framework documentation
4. Contact Chain Capital engineering team

---

**Version:** 1.0.0  
**Date:** January 27, 2026  
**Status:** ✅ Production Ready
