# Module Configuration Quick Reference

## 🎯 Purpose
This guide provides quick examples of how to use the new comprehensive module configuration system.

---

## 📦 Basic Usage Pattern

### 1. Import Types
```typescript
import { 
  CompleteModuleConfiguration,
  VestingConfig,
  DocumentConfig,
  VestingSchedule,
  Document,
} from '@/types/modules';
```

### 2. Create Configuration
```typescript
// Example: Complete ERC20 token with vesting and documents
const moduleConfig: CompleteModuleConfiguration = {
  // Vesting Module
  vesting: {
    schedules: [
      {
        beneficiary: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        amount: "1000000000000000000000000", // 1M tokens
        startTime: Math.floor(Date.now() / 1000),
        cliffDuration: 31536000, // 1 year cliff
        vestingDuration: 126144000, // 4 years total
        revocable: true,
        category: "team"
      },
      {
        beneficiary: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
        amount: "500000000000000000000000", // 500K tokens
        startTime: Math.floor(Date.now() / 1000),
        cliffDuration: 15768000, // 6 months cliff
        vestingDuration: 63072000, // 2 years total
        revocable: true,
        category: "advisor"
      }
    ]
  },

  // Document Module
  document: {
    documents: [
      {
        name: "Whitepaper",
        uri: "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
        hash: "0xd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
        documentType: "whitepaper"
      },
      {
        name: "Legal Terms",
        uri: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
        hash: "0x6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
        documentType: "legal"
      }
    ]
  },

  // Compliance Module
  compliance: {
    kycRequired: true,
    whitelistRequired: false,
    kycProvider: "Synaps",
    restrictedCountries: ["US", "CN", "KP"]
  },

  // Fees Module
  fees: {
    transferFeeBps: 100, // 1% transfer fee
    feeRecipient: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
    exemptAddresses: [
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" // Treasury exempt
    ]
  }
};
```

### 3. Pass to Deployment
```typescript
const result = await deployToken(
  tokenConfig,
  moduleConfig,  // ← All configuration here!
  signer
);
```

---

## 🔧 Module-Specific Examples

### ERC20: Vesting Schedules
```typescript
const vestingConfig: VestingConfig = {
  schedules: [
    // Team vesting: 4 years, 1 year cliff
    {
      beneficiary: "0x123...",
      amount: "10000000000000000000000", // 10K tokens
      startTime: 1704067200, // Jan 1, 2024
      cliffDuration: 31536000, // 1 year
      vestingDuration: 126144000, // 4 years
      revocable: true,
      category: "team"
    },
    // Investor vesting: 2 years, no cliff
    {
      beneficiary: "0x456...",
      amount: "50000000000000000000000", // 50K tokens
      startTime: 1704067200,
      cliffDuration: 0, // No cliff
      vestingDuration: 63072000, // 2 years
      revocable: false,
      category: "investor"
    }
  ]
};
```

### ERC721: Royalty with Rental
```typescript
const nftConfig: CompleteModuleConfiguration = {
  royalty: {
    defaultRoyaltyBps: 250, // 2.5% royalty
    royaltyRecipient: "0x789...",
    perTokenRoyalties: [
      {
        tokenId: "1",
        royaltyBps: 500, // 5% for special NFT
        recipient: "0xabc..."
      }
    ]
  },
  rental: {
    maxRentalDuration: 2592000, // 30 days max
    minRentalDuration: 86400, // 1 day min
    minRentalPrice: "1000000000000000", // 0.001 ETH
    autoReturn: true,
    depositRequired: true,
    depositAmount: "5000000000000000" // 0.005 ETH deposit
  }
};
```

### ERC3525: Slot Manager
```typescript
const slotConfig: SlotManagerConfig = {
  slots: [
    {
      slotId: "1",
      name: "Gold Tier",
      transferable: true,
      mergeable: true,
      splittable: true,
      maxSupply: "1000",
      metadata: JSON.stringify({
        tier: "gold",
        benefits: ["priority", "bonus"]
      })
    },
    {
      slotId: "2",
      name: "Silver Tier",
      transferable: true,
      mergeable: false,
      splittable: false,
      maxSupply: "5000"
    }
  ],
  allowDynamicSlots: false
};
```

### ERC1400: Transfer Restrictions
```typescript
const restrictionsConfig: TransferRestrictionsConfig = {
  restrictions: [
    {
      restrictionType: "jurisdiction",
      value: "US",
      enabled: true,
      description: "Block US investors due to SEC regulations"
    },
    {
      restrictionType: "lockup",
      value: 15552000, // 180 days in seconds
      enabled: true,
      description: "180-day lockup period"
    },
    {
      restrictionType: "limit",
      value: "1000000000000000000000", // 1000 tokens max per holder
      enabled: true,
      description: "Maximum 1000 tokens per holder"
    }
  ],
  defaultPolicy: "block",
  partitionRestrictions: [
    {
      partition: "PREFERRED",
      restrictions: {
        lockupPeriod: 31536000, // 1 year
        maxHoldersPerPartition: 100
      }
    }
  ]
};
```

### ERC4626: Yield Strategy
```typescript
const vaultConfig: CompleteModuleConfiguration = {
  yieldStrategy: {
    targetYieldBps: 800, // 8% target APY
    harvestFrequency: 86400, // Daily harvest
    rebalanceThreshold: 100, // 1% threshold
    strategies: [
      {
        strategyAddress: "0xAave...",
        allocationBps: 5000, // 50% to Aave
        minAllocationBps: 3000,
        maxAllocationBps: 7000
      },
      {
        strategyAddress: "0xCompound...",
        allocationBps: 5000, // 50% to Compound
        minAllocationBps: 3000,
        maxAllocationBps: 7000
      }
    ],
    autoCompound: true
  },
  feeStrategy: {
    managementFeeBps: 200, // 2% annual management fee
    performanceFeeBps: 2000, // 20% performance fee
    feeRecipient: "0xTreasury...",
    managementFeeFrequency: "monthly",
    highWaterMark: true, // Only charge on new profits
    hurdleRate: 500 // Must beat 5% before performance fee
  }
};
```

---

## 🎨 UI Component Pattern

### Config Panel Component Template
```typescript
import React from 'react';
import { ModuleConfigProps, VestingConfig, VestingSchedule } from '@/types/modules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const VestingModuleConfigPanel: React.FC<ModuleConfigProps<VestingConfig>> = ({
  config,
  onChange,
  disabled,
  errors
}) => {
  // Add new schedule
  const addSchedule = () => {
    const newSchedule: VestingSchedule = {
      beneficiary: '',
      amount: '',
      startTime: Math.floor(Date.now() / 1000),
      cliffDuration: 31536000,
      vestingDuration: 126144000,
      revocable: true,
      category: 'team'
    };
    
    onChange({
      ...config,
      schedules: [...(config.schedules || []), newSchedule]
    });
  };

  // Update specific schedule
  const updateSchedule = (index: number, updates: Partial<VestingSchedule>) => {
    const newSchedules = [...(config.schedules || [])];
    newSchedules[index] = { ...newSchedules[index], ...updates };
    onChange({ ...config, schedules: newSchedules });
  };

  // Remove schedule
  const removeSchedule = (index: number) => {
    const newSchedules = [...(config.schedules || [])];
    newSchedules.splice(index, 1);
    onChange({ ...config, schedules: newSchedules });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Label>Vesting Schedules</Label>
        <Button onClick={addSchedule} disabled={disabled}>
          Add Schedule
        </Button>
      </div>

      {config.schedules?.map((schedule, index) => (
        <div key={index} className="border p-4 rounded space-y-2">
          <Input
            placeholder="Beneficiary Address"
            value={schedule.beneficiary}
            onChange={(e) => updateSchedule(index, { beneficiary: e.target.value })}
            disabled={disabled}
          />
          <Input
            placeholder="Amount"
            value={schedule.amount}
            onChange={(e) => updateSchedule(index, { amount: e.target.value })}
            disabled={disabled}
          />
          {/* Add more fields... */}
          <Button 
            variant="destructive" 
            onClick={() => removeSchedule(index)}
            disabled={disabled}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
};
```

---

## 📝 Database Storage Format

When saved to database, configurations are stored as JSONB:

```sql
-- Example: token_erc20_properties row
INSERT INTO token_erc20_properties (
  token_id,
  vesting_config,
  document_config,
  fees_config
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  '{"schedules": [{"beneficiary": "0x123...", "amount": "1000000", ...}]}',
  '{"documents": [{"name": "Whitepaper", "uri": "ipfs://...", ...}]}',
  '{"transferFeeBps": 100, "feeRecipient": "0x456...", ...}'
);
```

---

## 🔍 Querying Configurations

```sql
-- Find tokens with vesting enabled
SELECT token_id, vesting_config
FROM token_erc20_properties
WHERE vesting_config IS NOT NULL;

-- Find tokens with >5 vesting schedules
SELECT token_id, jsonb_array_length(vesting_config->'schedules') as schedule_count
FROM token_erc20_properties
WHERE jsonb_array_length(vesting_config->'schedules') > 5;

-- Find tokens with specific document type
SELECT token_id
FROM token_erc20_properties
WHERE document_config @> '{"documents": [{"documentType": "whitepaper"}]}';
```

---

## ✅ Validation Examples

### Type-Safe Validation
```typescript
import { VestingSchedule } from '@/types/modules';

function validateVestingSchedule(schedule: VestingSchedule): string[] {
  const errors: string[] = [];
  
  if (!schedule.beneficiary || !schedule.beneficiary.startsWith('0x')) {
    errors.push('Invalid beneficiary address');
  }
  
  if (!schedule.amount || BigInt(schedule.amount) <= 0n) {
    errors.push('Amount must be greater than 0');
  }
  
  if (schedule.cliffDuration >= schedule.vestingDuration) {
    errors.push('Cliff duration must be less than vesting duration');
  }
  
  return errors;
}
```

---

## 🚀 Deployment Script Usage

```typescript
import { configureExtensionModules } from '@/services/tokens/deployment/configureExtensions';
import { CompleteModuleConfiguration } from '@/types/modules';

// After deploying contracts
const deployedAddresses = {
  masterContract: "0xAbc...",
  vestingModule: "0xDef...",
  documentModule: "0xGhi...",
  // ... other modules
};

// Configure all modules automatically
await configureExtensionModules(
  deployedAddresses,
  moduleConfig, // CompleteModuleConfiguration from UI
  signer
);

// ✅ Token is now fully deployed AND configured!
```

---

## 📚 Additional Resources

- Full Analysis: `/docs/TOKEN_EXTENSION_CONFIGURATION_ANALYSIS.md`
- Schema Changes: `/docs/SCHEMA_CHANGES_APPLIED.md`
- Type Definitions: `/frontend/src/types/modules/ModuleTypes.ts`
- Solidity Contracts: `/frontend/foundry-contracts/src/extensions/`

---

**Last Updated**: November 2025  
**Status**: Ready for Implementation
