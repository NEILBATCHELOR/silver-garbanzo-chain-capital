# Universal Structured Product Framework - Phase 4 Complete

**Status:** ✅ Production Ready  
**Date:** January 27, 2026  
**Version:** 1.0.0

---

## 🎯 Overview

Phase 4 implements a complete UI component library and integration services for creating **any structured product** using a composable, configuration-driven approach. This framework allows you to build infinite product variations without writing new code.

### What's Included

✅ **6 UI Components** - Complete React component library  
✅ **Integration Service** - Seamless Token-2022 deployment  
✅ **Both Approaches Supported** - Enumeration AND Universal framework  
✅ **Type-Safe** - Full TypeScript support  
✅ **Validated** - Configuration validation before deployment  

---

## 📦 Components

### 1. Component Selector
**File:** `ComponentSelector.tsx`  
**Purpose:** Choose which features to include in the product

```tsx
import { ComponentSelector } from '@/components/solana/metadata/universal';

<ComponentSelector 
  value={componentSelection} 
  onChange={setComponentSelection} 
/>
```

**Features:**
- Toggle barriers on/off
- Toggle coupons on/off  
- Toggle callable features
- Toggle putable features
- Toggle capital protection
- Toggle participation/leverage

---

### 2. Underlying Builder
**File:** `UnderlyingBuilder.tsx`  
**Purpose:** Add and configure underlying assets

```tsx
import { UnderlyingBuilder } from '@/components/solana/metadata/universal';

<UnderlyingBuilder
  underlyings={underlyings}
  basket={basket}
  onChange={(u, b) => {
    setUnderlyings(u);
    setBasket(b);
  }}
/>
```

**Supports:**
- Single asset products
- Multi-asset baskets
- Worst-of/best-of configurations
- Oracle configuration per asset
- Weight configuration for baskets
- 10+ underlying types:
  - Equity single/index/basket
  - Interest rates
  - FX spot/forward
  - Commodities spot/futures
  - Volatility indices
  - Cryptocurrency

---

### 3. Barrier Configurator
**File:** `BarrierConfigurator.tsx`  
**Purpose:** Set up barrier features

```tsx
import { BarrierConfigurator } from '@/components/solana/metadata/universal';

<BarrierConfigurator 
  barriers={barriers} 
  onChange={setBarriers} 
/>
```

**Barrier Types:**
- Knock-in barriers (activates downside)
- Knock-out barriers (terminates product)
- Call barriers (early redemption trigger)
- Coupon barriers (determines payment)
- Protection barriers (capital protection threshold)
- Autocall barriers (autocallable trigger)

**Observation Methods:**
- Continuous monitoring
- Discrete observations
- Closing price only
- Intraday monitoring

---

### 4. Coupon Builder
**File:** `CouponBuilder.tsx`  
**Purpose:** Configure coupon structures

```tsx
import { CouponBuilder } from '@/components/solana/metadata/universal';

<CouponBuilder 
  coupons={coupons} 
  onChange={setCoupons} 
/>
```

**Coupon Types:**
- Fixed coupons (always pays)
- Conditional coupons (pays if condition met)
- Memory coupons (accumulates if not paid)
- Floating rate (SOFR + spread)
- Range accrual (accrues if in range)
- Digital (all-or-nothing)
- Step-up/Step-down

**Payment Frequencies:**
- Monthly, Quarterly, Semi-Annual, Annual
- At maturity

---

### 5. Settlement Configurator
**File:** `SettlementConfigurator.tsx`  
**Purpose:** Configure digital asset delivery options

```tsx
import { SettlementConfigurator } from '@/components/solana/metadata/universal';

<SettlementConfigurator 
  settlement={settlement} 
  onChange={setSettlement} 
/>
```

**Settlement Types:**
- **Cash Settlement** - Deliver USDC/stablecoins
- **Physical Delivery** - Deliver underlying SPL tokens
- **Hybrid** - Cash or physical (issuer choice)

**Settlement Methods:**
- **Automatic** - Clockwork keeper triggers settlement
- **Manual** - Issuer executes manually
- **Claim-Based** - Users claim redemption

**Configuration:**
- T+N settlement timing
- Settlement currency selection
- Vault address configuration
- Early settlement options
- Early settlement penalties

---

### 6. Universal Product Wizard
**File:** `UniversalProductWizard.tsx`  
**Purpose:** End-to-end product creation wizard

```tsx
import { UniversalProductWizard } from '@/components/solana/metadata/universal';

<UniversalProductWizard
  onComplete={(metadata) => {
    console.log('Product created:', metadata);
  }}
  onCancel={() => console.log('Cancelled')}
/>
```

**Wizard Steps:**
1. **Product Category** - Choose product type
2. **Components** - Select features to include
3. **Underlyings** - Add and configure assets
4. **Features** - Configure barriers & coupons
5. **Settlement** - Redemption setup
6. **Review** - Finalize & deploy

---

## 🔌 Integration

### Using Universal Framework Integration Service

```tsx
import { universalFrameworkIntegrationService } from '@/services/tokens/metadata/universal/UniversalFrameworkIntegrationService';
import type { UniversalStructuredProductMetadata } from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';

// 1. Build product metadata using UI components
const metadata: UniversalStructuredProductMetadata = {
  name: 'Autocallable S&P 500 Note 2028',
  symbol: 'ACSPX28',
  assetClass: 'structured_product',
  productCategory: 'autocallable',
  productSubtype: 'barrier_autocallable',
  
  underlyings: [{
    identifier: 'SPX',
    name: 'S&P 500 Index',
    type: 'equity_index',
    initialPrice: '5000',
    oracleAddress: 'GVXRSBjFk...',
    oracleProvider: 'pyth'
  }],
  
  barriers: {
    barriers: [{
      barrierType: 'autocall_barrier',
      level: '100',
      direction: 'up',
      observationType: 'discrete',
      breached: 'false'
    }]
  },
  
  coupons: {
    memoryFeature: 'true',
    coupons: [{
      couponType: 'conditional',
      rate: '8.5',
      frequency: 'quarterly',
      conditional: 'true',
      condition: {
        type: 'barrier',
        barrierLevel: '100',
        comparisonOperator: '>='
      }
    }]
  },
  
  settlement: {
    settlementType: 'cash',
    settlementMethod: 'automatic',
    settlementDays: '2',
    redemptionVault: 'HvYxUf1C7B...'
  },
  
  // ... other required fields
};

// 2. Validate configuration
const validation = universalFrameworkIntegrationService.validateProductConfiguration(metadata);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// 3. Check metadata size
const size = universalFrameworkIntegrationService.getMetadataSizeEstimate(metadata);
console.log(`On-chain metadata size: ${size} bytes`);

// 4. Deploy product
const result = await universalFrameworkIntegrationService.deployStructuredProduct({
  metadata,
  decimals: 9,
  initialSupply: 0,
  keeperAuthority: keeperAddress,
  network: 'mainnet-beta',
  projectId: 'my-project-id',
  userId: 'user-id',
  walletKeypair: walletKeyPair
});

console.log('Deployed mint:', result.mint);
console.log('Metadata URI:', result.metadataUri);
console.log('Transaction:', result.signature);
```

---

## 🎨 Example Products

### Example 1: Classic Autocallable

```tsx
const autocallable = {
  productCategory: 'autocallable',
  underlyings: [{ identifier: 'SPX', ... }],
  barriers: {
    barriers: [
      { barrierType: 'autocall_barrier', level: '100' },
      { barrierType: 'knock_in', level: '60' }
    ]
  },
  coupons: {
    memoryFeature: 'true',
    coupons: [{ couponType: 'conditional', rate: '8.5', frequency: 'quarterly' }]
  }
};
```

### Example 2: Worst-Of Autocallable

```tsx
const worstOf = {
  productCategory: 'autocallable',
  underlyings: [
    { identifier: 'AAPL', weight: '33.33', ... },
    { identifier: 'MSFT', weight: '33.33', ... },
    { identifier: 'GOOGL', weight: '33.34', ... }
  ],
  underlyingBasket: { basketType: 'worst_of' },
  barriers: {
    barriers: [
      { barrierType: 'autocall_barrier', level: '100', appliesTo: 'all' },
      { barrierType: 'knock_in', level: '60', appliesTo: 'worst_of' }
    ]
  }
};
```

### Example 3: Principal Protected Note

```tsx
const principalProtected = {
  productCategory: 'capital_guarantee',
  capitalProtection: {
    protectionType: 'hard',
    protectionLevel: '100'
  },
  participation: {
    upsideParticipation: '80',
    downsideParticipation: '0',
    cap: '200'
  }
};
```

---

## 🔄 Integration with Existing Services

### Both Approaches Coexist

The universal framework works **alongside** the existing enumeration approach:

**Enumeration Approach (Existing):**
```tsx
// Use specific forms for each asset class
import { AutocallableForm } from '@/components/solana/metadata/forms';
<AutocallableForm value={data} onChange={setData} />
```

**Universal Framework (New):**
```tsx
// Use composable components for any product
import { UniversalProductWizard } from '@/components/solana/metadata/universal';
<UniversalProductWizard onComplete={handleComplete} />
```

### Shared Services

Both approaches use the same underlying services:
- `Token2022DeploymentService` - Token minting
- `Token2022MetadataDeploymentService` - Metadata deployment
- Arweave upload - Permanent storage

---

## ✅ Validation

The integration service includes comprehensive validation:

```tsx
const validation = universalFrameworkIntegrationService.validateProductConfiguration(metadata);

if (!validation.valid) {
  // Display errors to user
  validation.errors.forEach(error => {
    console.error(error);
  });
}
```

**Validates:**
- Required fields (name, symbol, underlyings, redemption vault)
- Underlying asset configuration
- Barrier configuration
- Coupon configuration
- Settlement configuration
- On-chain metadata size (<1KB target)

---

## 📊 Metadata Size Optimization

Check metadata size before deployment:

```tsx
const size = universalFrameworkIntegrationService.getMetadataSizeEstimate(metadata);

if (size > 1024) {
  console.warn(`Metadata too large: ${size} bytes (target: <1KB)`);
}
```

**Size Optimization Tips:**
- Use abbreviations for field values
- Store detailed documentation in Arweave (via URI)
- Use concise date formats (ISO 8601)
- Avoid verbose descriptions in on-chain metadata

---

## 🚀 Deployment Workflow

1. **Create Product** - Use UI components or wizard
2. **Validate Configuration** - Check for errors
3. **Review Metadata Size** - Ensure <1KB
4. **Deploy Token-2022** - Mint with metadata extension
5. **Upload Full Metadata** - Store in Arweave
6. **Configure Keeper** - Set up automatic settlement (if enabled)
7. **Distribute Tokens** - Mint to investors

---

## 📚 Additional Resources

- **Universal Types:** `/services/tokens/metadata/universal/UniversalStructuredProductTypes.ts`
- **Metadata Builder:** `/services/tokens/metadata/universal/UniversalMetadataBuilder.ts`
- **Product Templates:** `/services/tokens/metadata/universal/ProductTemplates.ts`
- **Migration Adapter:** `/services/tokens/metadata/universal/MigrationAdapter.ts`

---

## 🎯 Benefits

### Single Implementation
- ONE metadata type covers ALL products
- ONE builder handles all structures  
- ONE deployment flow

### Infinite Flexibility
- Mix and match components
- Create new products without code changes
- Configure via UI, not hardcoding

### Maintainability
- Update once, affects all products
- No duplication
- Easy to extend

### Database Efficiency
- Single schema for all structured products
- JSONB fields for flexibility
- Consistent querying

---

## 🔮 Future Enhancements

- [ ] Product category selector UI
- [ ] Review step with visual summary
- [ ] Template library (pre-configured products)
- [ ] Product comparison tool
- [ ] Pricing calculator integration
- [ ] Risk metrics calculator
- [ ] Historical performance backtester

---

**Documentation Version:** 1.0.0  
**Last Updated:** January 27, 2026  
**Maintained By:** Chain Capital Engineering Team
